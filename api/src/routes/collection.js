import { demandAuthenticatedUser, getS3Handle, getLogger } from "../common/index.js";
import models from "../models/index.js";
import lodashPkg from "lodash";
import defaultProfile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
const { isArray, cloneDeep, uniq } = lodashPkg;
import path from "path";
import {
    getEntityTypes,
    getEntities,
    loadEntity,
    createEntity,
    linkEntities,
    updateEntity,
    deleteEntity,
    createProperty,
    updateProperty,
    deleteProperty,
} from "../lib/collection.js";
import { createDefaultROCrateFile, loadCrateIntoDatabase } from "../lib/crate-tools.js";
const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get("/collections", getCollectionsHandler);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireCollectionAccess);

        fastify.get("/collections/:code", getCollectionHandler);

        fastify.get("/collections/:code/folder", getCollectionListFolderHandler);
        fastify.put("/collections/:code/folder", putCollectionCreateFolderHandler);
        fastify.put("/collections/:code/file", putCollectionCreateFileHandler);
        fastify.delete("/collections/:code/folder", deleteCollectionDeleteFolderHandler);
        fastify.get("/collections/:code/file/link", getCollectionFileLinkHandler);

        fastify.get("/collections/:code/profile", getCollectionProfileHandler);
        fastify.post("/collections/:code/profile", postCollectionProfileHandler);
        fastify.get("/collections/:code/types", getEntityTypesHandler);
        fastify.get("/collections/:code/entities", getEntitiesHandler);
        fastify.get("/collections/:code/entities/:entityId", loadEntityHandler);

        fastify.post("/collections/:code/entities", createEntityHandler);
        fastify.post("/collections/:code/entities/:entityId", createAndLinkEntityHandler);
        fastify.put("/collections/:code/entities/:entityId", updateEntityHandler);
        fastify.delete("/collections/:code/entities/:entityId", deleteEntityHandler);

        fastify.put("/collections/:code/entities/:entityId/link", linkEntityHandler);
        fastify.put("/collections/:code/entities/:entityId/unlink", unlinkEntityHandler);

        fastify.post("/collections/:code/entities/:entityId/properties", addPropertyHandler);
        fastify.put("/collections/:code/properties/:propertyId", updatePropertyHandler);
        fastify.delete("/collections/:code/properties/:propertyId", deletePropertyHandler);

        done();
    });
    done();
}

async function requireCollectionAccess(req, res) {
    let collection = await models.collection.findOne({
        where: { code: req.params.code },
        include: [{ model: models.user, where: { id: req.session.user.id }, attributes: [] }],
    });
    if (!collection) {
        return res.forbidden(`You don't have permission to access this endpoint`);
    }
    req.session.collection = collection;
}

async function getCollectionsHandler(req) {
    let { limit, offset } = req.query;
    limit = limit ?? 10;
    offset = offset ?? 0;
    let { rows: collections, count: total } = await models.collection.findAndCountAll({
        attributes: ["id", "name", "code"],
        include: [{ model: models.user, where: { id: req.session.user.id }, attributes: [] }],
        order: [["name", "ASC"]],
        limit,
        offset,
    });

    let data = [];
    for (let collection of collections) {
        let [userCount, entityCount, typeCount] = await Promise.all([
            collection.countUsers(),
            collection.countEntities(),
            collection.countTypes(),
        ]);
        data.push({
            ...collection.get(),
            userCount,
            entityCount,
            typeCount,
        });
    }
    return { collections: data, total };
}

async function getCollectionHandler(req) {
    return { collection: req.session.collection.get() };
}

async function getCollectionListFolderHandler(req, res) {
    let folder = await models.collection_folder.findOne({
        where: { name: req.query.path },
        include: [
            { model: models.collection_folder, as: "childFolders" },
            { model: models.collection_file, as: "file" },
        ],
    });
    if (!folder) {
        return res.badRequest();
    }

    return {
        path: req.query.path,
        children: [
            ...folder?.childFolders?.map((f) => ({
                name:
                    req.query.path === "/"
                        ? f.name.slice(1)
                        : f.name.replace(req.query.path, "").slice(1),
                type: "folder",
            })),
            ...folder?.file?.map((f) => ({ name: `${f.name.slice(1)}`, type: "file" })),
        ],
    };
}

async function putCollectionCreateFolderHandler(req) {
    let root = path.dirname(req.body.path);
    let child = path.basename(req.body.path);
    if (child && !child.match(/^\//)) child = `/${child}`;

    let folder = await models.collection_folder.findOrCreate({
        where: { name: root },
        defaults: {
            collectionId: req.session.collection.id,
            name: root,
        },
    });
    folder = folder[0];

    if (child) {
        child = await models.collection_folder.findOrCreate({
            where: { name: req.body.path },
            defaults: {
                collectionId: req.session.collection.id,
                name: req.body.path,
            },
        });
        child = child[0];
        await folder.addChildFolder(child);
    }

    return {};
}

async function putCollectionCreateFileHandler(req) {
    let root = path.dirname(req.body.path);
    let child = path.basename(req.body.path);
    if (child && !child.match(/^\//)) child = `/${child}`;

    let folder = await models.collection_folder.findOne({
        where: { name: root },
    });
    await models.collection_file.findOrCreate({
        where: { name: child, collectionFolderId: folder.id },
        defaults: {
            name: child,
            collectionId: req.session.collection.id,
            collectionFolderId: folder.id,
        },
    });
    return {};
}

async function deleteCollectionDeleteFolderHandler(req, res) {
    const folder = await models.collection_folder.findOne({ where: { name: req.query.path } });
    await destroyFolder(folder);

    let { bucket } = await getS3Handle({ bucket: req.session.collection.bucket });
    try {
        await bucket.removeObjects({
            prefix: `/${req.session.configuration.api.repositoryPath}${req.query.path}`,
        });
    } catch (error) {
        res.internalServerError(`There was a problem deleting the files on the backend storage`);
        log.error(error);
        return {};
    }

    async function destroyFolder(folder) {
        for (let file of await folder.getFile()) {
            await file.destroy();
        }
        for (let child of await folder.getChildFolders()) {
            await destroyFolder(child);
        }
        await folder.destroy();
    }
}

async function getCollectionFileLinkHandler(req) {
    let { bucket } = await getS3Handle({ bucket: req.session.collection.bucket });
    let link = await bucket.getPresignedUrl({
        target: path.normalize(
            `/${req.session.configuration.api.repositoryPath}/${req.query.path}`
        ),
    });
    return { link };
}

async function getCollectionProfileHandler(req) {
    let collection = req.session.collection;

    let types = await models.type.findAll({
        where: { collectionId: collection.id },
        attributes: ["name"],
        raw: true,
    });
    let profile = collection.profile ?? cloneDeep(defaultProfile);
    types = types.map((type) => type.name);
    types = [...types, ...Object.keys(defaultProfile.classes)];
    types = uniq(types);
    types = types.sort();
    types.forEach((type) => {
        if (!profile.classes[type]) {
            profile.classes[type] = {
                definition: "override",
                subClassOf: [],
                inputs: [],
            };
        }
    });
    return { profile };
}

async function postCollectionProfileHandler(req) {
    req.session.collection.profile = req.body.profile;
    await req.session.collection.save();
    return {};
}

async function getEntitiesHandler(req) {
    const { type, queryString, limit, offset } = req.query;
    return await getEntities({
        collectionId: req.session.collection.id,
        type,
        queryString,
        limit,
        offset,
    });
    return {};
}

async function getEntityTypesHandler(req) {
    return await getEntityTypes({ collectionId: req.session.collection.id });
}

async function loadEntityHandler(req) {
    const { entityId } = req.params;
    const id = decodeURIComponent(entityId);
    const { stub } = req.query;
    try {
        let entity = await loadEntity({
            collectionId: req.session.collection.id,
            profile: req.session.collection.profile,
            id,
            stub,
        });
        return { entity };
    } catch (error) {
        if (id === "./") {
            // if there's no root dataset it has to be because the collection is new
            //  and no data has been loaded in. So, create a root dataset and return that.
            let crate = createDefaultROCrateFile({ name: req.session.collection.name });
            await loadCrateIntoDatabase({ collectionId: req.session.collection.id, crate });
            let entity = await loadEntity({
                collectionId: req.session.collection.id,
                profile: req.session.collection.profile,
                id: "./",
            });
            return { entity };
        } else {
            console.error(id, error);
        }
    }
}

async function createEntityHandler(req) {
    const collectionId = req.session.collection.id;

    let entity = {
        "@id": req.body["@id"] ? req.body["@id"] : `#${encodeURIComponent(req.body.name)}`,
        "@type": req.body["@type"] ?? ["Thing"],
        name: req.body.name,
    };
    entity = await createEntity({ collectionId, entity });
    return { entity: { "@id": entity.eid } };
}

async function createAndLinkEntityHandler(req) {
    const collectionId = req.session.collection.id;

    // find the source entity
    const sourceEntityId = decodeURIComponent(req.params.entityId);
    let sourceEntity = await this.models.entity.findOne({
        where: { collectionId, eid: sourceEntityId },
    });

    // create the new entity
    let entity = { ...req.body.entity };
    entity = await createEntity({ collectionId, entity });

    // link them
    await linkEntities({
        collectionId,
        property: req.body.property,
        sourceEntity,
        targetEntity: entity,
    });
    return {};
}

async function updateEntityHandler(req) {
    const entityId = decodeURIComponent(req.params.entityId);
    const collectionId = req.session.collection.id;
    return await updateEntity({
        collectionId,
        entityId,
        id: req.body["@id"],
        type: req.body["@type"],
        name: req.body.name,
    });
}

async function deleteEntityHandler(req) {
    // delete the new entity
    await deleteEntity({
        collectionId: req.session.collection.id,
        entityId: decodeURIComponent(req.params.entityId),
    });
}

// TODO this code does not have tests yet
async function linkEntityHandler(req) {
    console.log(req.params, req.body);
    return {};
}

// TODO this code does not have tests yet
async function unlinkEntityHandler(req) {
    const sourceEntityId = decodeURIComponent(req.params.entityId);
    const sourceEntity = await this.models.entity.findOne({
        where: { collectionId: req.session.collection.id, eid: sourceEntityId },
    });

    const targetEntityId = req.body.tgtEntityId;
    const targetEntity = await this.models.entity.findOne({
        where: { collectionId: req.session.collection.id, eid: targetEntityId },
    });

    let property = await this.models.property.findOne({
        where: {
            property: req.body.property,
            entityId: sourceEntity.id,
            targetEntityId: targetEntity.id,
        },
    });
    await property.destroy();

    let isLinked = await this.models.property.findAll({
        where: { targetEntityId: targetEntity.id },
    });
    if (!isLinked.length) {
        // the entity is no longer linked to anything so get rid of it
        await targetEntity.destroy();
    }
    return {};
}

async function addPropertyHandler(req) {
    return await createProperty({
        collectionId: req.session.collection.id,
        entityId: decodeURIComponent(req.params.entityId),
        property: req.body.property,
        value: req.body.value,
    });
}

async function updatePropertyHandler(req) {
    return await updateProperty({
        collectionId: req.session.collection.id,
        propertyId: req.params.propertyId,
        value: req.body.value,
    });
}

async function deletePropertyHandler(req) {
    return await deleteProperty({
        collectionId: req.session.collection.id,
        propertyId: req.params.propertyId,
    });
}

function asArray(value) {
    return !isArray(value) ? [value] : value;
}

function concat(value) {
    return asArray(value).join(", ");
}
