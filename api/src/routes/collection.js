import { demandAuthenticatedUser, getS3Handle, getLogger } from "../common/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import { Op } from "sequelize";
import models from "../models/index.js";
import lodashPkg from "lodash";
import profile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
const { isArray, uniqBy, groupBy, intersection, cloneDeep, isPlainObject, isString, chunk } =
    lodashPkg;
const log = getLogger();
import path from "path";

import { getEntityTypes, getEntities, loadEntity } from "../lib/collection.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get("/collections", getCollectionsHandler);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireCollectionAccess);
        // fastify.post("/collections/:code/entities/:entityId", createEntityHandler);
        // fastify.delete("/collections/:code/entities/:entityId", deleteEntityHandler);
        // fastify.put("/collections/:code/entities/:entityId", updateEntityHandler);
        // fastify.post("/collections/:code/entities/:entityId/properties", addPropertyHandler);
        // fastify.put("/collections/:code/properties/:propertyId", updatePropertyHandler);
        // fastify.delete("/collections/:code/properties/:propertyId", deletePropertyHandler);

        fastify.get("/collections/:code", getCollectionHandler);

        fastify.get("/collections/:code/folder", getCollectionListFolderHandler);
        fastify.put("/collections/:code/folder", putCollectionCreateFolderHandler);
        fastify.put("/collections/:code/file", putCollectionCreateFileHandler);
        fastify.delete("/collections/:code/folder", deleteCollectionDeleteFolderHandler);
        fastify.get("/collections/:code/file/link", getCollectionFileLinkHandler);

        fastify.get("/collections/:code/profile", getCollectionProfileHandler);
        fastify.get("/collections/:code/types", getEntityTypesHandler);
        fastify.get("/collections/:code/entities", getEntitiesHandler);
        fastify.get("/collections/:code/entities/:entityId", loadEntityHandler);
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
        target: `${req.session.configuration.api.repositoryPath}${req.query.path}`,
    });
    return { link };
}

async function getCollectionProfileHandler(req) {
    let collection = await models.collection.findOne({ where: { id: req.session.collection.id } });
    return { profile: collection.profile ?? {} };
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
    const { stub } = req.query;
    let entity = await loadEntity({
        collectionId: req.session.collection.id,
        id: decodeURIComponent(entityId),
        stub,
    });
    return { entity };
}

// TODO this code does not have tests yet
async function createEntityHandler(req) {
    let { entity, property } = req.body;

    // create the new entity
    entity = await this.models.entity.findOrCreate({
        where: {
            collectionId: req.session.collection.id,
            eid: entity["@id"],
        },
        defaults: {
            entityId: req.params.entityId,
            collectionId: req.session.collection.id,
            eid: entity["@id"],
            etype: concat(entity["@type"]),
            name: entity.name,
        },
    });
    entity = entity[0];

    // associate it to the parent entity
    await this.models.property.create({
        property: property,
        collectionId: req.session.collection.id,
        entityId: req.params.entityId,
        targetEntityId: entity.id,
    });
}

// TODO this code does not have tests yet
async function deleteEntityHandler(req) {
    // delete the new entity
    await this.models.entity.destroy({
        where: {
            collectionId: req.session.collection.id,
            id: req.params.entityId,
        },
    });
}

// TODO this code does not have tests yet
async function updateEntityHandler(req) {
    let entity = await this.models.entity.findOne({
        where: { id: req.params.entityId, collectionId: req.session.collection.id },
    });
    if (req.body.name) entity.name = req.body.name;
    if (req.body["@id"]) entity.eid = req.body["@id"];
    await entity.save();
}

// TODO this code does not have tests yet
async function addPropertyHandler(req) {
    await this.models.property.create({
        property: req.body.property,
        collectionId: req.session.collection.id,
        entityId: req.params.entityId,
        value: req.body.value,
    });
}

// TODO this code does not have tests yet
async function updatePropertyHandler(req) {
    let property = await this.models.property.findOne({
        where: { id: req.params.propertyId, collectionId: req.session.collection.id },
    });
    property.value = req.body.value;
    await property.save();
}

// TODO this code does not have tests yet
async function deletePropertyHandler(req) {
    let property = await this.models.property.findOne({
        where: { id: req.params.propertyId, collectionId: req.session.collection.id },
    });
    if (property?.targetEntityId) {
        let count = await this.models.property.count({
            where: { targetEntityId: property.targetEntityId },
        });
        if (count <= 1) {
            await this.models.entity.destroy({ where: { id: property.targetEntityId } });
        }
    }
    await property.destroy();
}

function asArray(value) {
    return !isArray(value) ? [value] : value;
}

function concat(value) {
    return asArray(value).join(", ");
}
