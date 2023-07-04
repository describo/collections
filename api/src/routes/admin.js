import { demandAdministrator, demandAuthenticatedUser } from "../common/index.js";
import models from "../models/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import { init } from "@paralleldrive/cuid2";
import lodashPkg from "lodash";
const { isArray, isPlainObject, isString, chunk, groupBy, uniqBy } = lodashPkg;
// const createId = init({ length: 32 });
import { isMatchingEntity, isURL, validateId, normaliseEntityType } from "../lib/crate-tools.js";
import {
    createNewCollection,
    getAllCollections,
    getCollectionUsers,
    attachUserToCollection,
    detachUserFromCollection,
} from "../lib/admin.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", demandAdministrator);

    fastify.get("/admin", async (req, res) => {});
    fastify.get("/admin/collections", getCollectionsHandler);
    fastify.post("/admin/collections/create", postCreateCollectionHandler);
    fastify.get("/admin/collections/:collectionId/users", getCollectionUsersHandler);
    fastify.post(
        "/admin/collections/:collectionId/attach-user/:userId",
        postAttachUserToCollectionHandler
    );
    fastify.post(
        "/admin/collections/:collectionId/detach-user/:userId",
        postDetachUserFromCollectionHandler
    );
    fastify.post("/admin/collections/:collectionId/load-data", postLoadDataIntoCollectionHandler);
    done();
}

// TODO this code does not have tests yet
async function postCreateCollectionHandler(req) {
    let { name, code } = req.body;
    let collection = await createNewCollection({ name, code, user: req.session.user });
    return { collection: collection.get() };
}

// TODO this code does not have tests yet
async function getCollectionsHandler(req) {
    let { limit, offset } = req.query;
    let { total, collections } = await getAllCollections({ limit, offset });
    return { total, collections };
}

// TODO this code does not have tests yet
async function getCollectionUsersHandler(req) {
    const { collectionId } = req.params;
    let { users } = await getCollectionUsers({ collectionId });
    return { users };
}

// TODO this code does not have tests yet
async function postAttachUserToCollectionHandler(req) {
    const { collectionId, userId } = req.params;
    await attachUserToCollection({ collectionId, userId });
    return {};
}

// TODO this code does not have tests yet
async function postDetachUserFromCollectionHandler(req) {
    const { collectionId, userId } = req.params;
    await detachUserFromCollection({ collectionId, userId });
    return {};
}

// TODO this code does not have tests yet
async function postLoadDataIntoCollectionHandler(req, res) {
    const crate = req.body.crate;
    let collection = await models.collection.findOne({
        where: { code: req.params.code },
    });
    const collectionId = collection.id;

    // delete the collection data if there's already some loaded and we're in development
    // if (process.env.NODE_ENV === "development") {
    //     req.io
    //         .to(req.query.clientId)
    //         .emit("load-collection-data", { msg: `Deleting existing data`, date: new Date() });
    //     await this.models.property.destroy({
    //         where: { collectionId },
    //         truncate: true,
    //         cascade: true,
    //     });
    //     await this.models.entity.destroy({
    //         where: { collectionId },
    //         truncate: true,
    //         cascade: true,
    //     });
    //     await this.models.type.destroy({
    //         where: { collectionId },
    //         truncate: true,
    //         cascade: true,
    //     });
    // } else {
    // complain loudly and bail if this collection already has data
    let entityCount = await models.entity.count({
        where: { collectionId },
    });
    if (entityCount !== 0) return {};
    // }

    // assign identifier to all entities
    const entitiesByDescriboId = {};
    const entitiesByAtId = {};
    let rootDescriptor;
    let errors = [];
    let entities = [];
    // console.log(crate["@graph"]);
    for (let i = 0; i < crate["@graph"].length; i++) {
        const entity = crate["@graph"][i];
        console.log(entity);

        if (entity["@id"] === "ro-crate-metadata.json") {
            rootDescriptor = { ...entity };
            break;
        }

        if (!entity?.["@type"]) {
            errors.push({
                message: `The entity does not have '@type' defined.`,
                entity,
            });
        }

        // then see if @id is a valid identifier
        let { isValid, message } = validateId({ id: entity["@id"], type: entity["@type"] });
        if (!isValid) {
            errors.push({
                message,
                entity,
            });
        }

        entity["@type"] = asArray(entity["@type"]);
        entity["@type"].forEach((type) => (types[type] = true));
        entities.push(entity);
    }
    console.log(errors);
    console.log(entities);

    req.io.to(req.query.clientId).emit("load-collection-data", {
        msg: `Assigning entity identifiers`,
        date: new Date(),
    });

    // let types = {};
    // for (let entity of crate["@graph"]) {
    //     if (entity["@id"] === rootDescriptor.about["@id"]) {
    //         entity.label = "RootDataset";
    //     } else {
    //         // entity.describoId = createId();
    //     }
    //     entity["@type"] = asArray(entity["@type"]);
    //     entity["@type"].forEach((type) => (types[type] = true));
    //     entitiesByDescriboId[entity.describoId] = entity;
    //     entitiesByAtId[entity["@id"]] = entity;
    // }

    // let typeInserts = Object.keys(types).map((type) => {
    //     return {
    //         // id: createId(),
    //         name: type,
    //         collectionId,
    //     };
    // });
    // typeInserts = uniqBy(typeInserts, "name");
    // console.log(typeInserts);
    // const typeNameToIdMapping = groupBy(typeInserts, "name");
    // await this.models.type.bulkCreate(typeInserts);

    // prepare the entity and property DB inserts
    // req.io.to(req.query.clientId).emit("load-collection-data", {
    //     msg: `Preparing entity and property inserts`,
    //     date: new Date(),
    // });
    // await new Promise((resolve) => setTimeout(resolve, 100));
    // const entityMainProperties = ["@id", "@type", "name", "label", "describoId"];
    // let entityInserts = [];
    // let propertyInserts = [];
    // let entityTypeInserts = [];
    // for (let entity of crate["@graph"]) {
    //     entityInserts.push({
    //         id: entity.describoId,
    //         eid: entity["@id"],
    //         name: entity?.name,
    //         label: entity.label,
    //         collectionId,
    //     });

    //     entity["@type"].forEach((type) => {
    //         entityTypeInserts.push({
    //             entityId: entity.describoId,
    //             typeId: typeNameToIdMapping[type][0].id,
    //         });
    //     });

    //     for (let property of Object.keys(entity)) {
    //         if (!isArray(entity[property]) && property !== "describoId") {
    //             entity[property] = [entity[property]];
    //         }
    //         if (!entity[property]) continue;
    //         for (let instance of entity[property]) {
    //             if (!entityMainProperties.includes(property)) {
    //                 if (!isArray(instance) && !isPlainObject(instance)) {
    //                     propertyInserts.push({
    //                         id: createId(),
    //                         property,
    //                         entityId: entity.describoId,
    //                         value: instance,
    //                         collectionId,
    //                     });
    //                 } else if (isPlainObject(instance)) {
    //                     let targetEntity = entitiesByAtId[instance["@id"]];
    //                     if (targetEntity) {
    //                         propertyInserts.push({
    //                             id: createId(),
    //                             property,
    //                             entityId: entity.describoId,
    //                             targetEntityId: targetEntity.describoId,
    //                             collectionId,
    //                         });
    //                     } else {
    //                         propertyInserts.push({
    //                             id: createId(),
    //                             property,
    //                             entityId: entity.describoId,
    //                             valueStringified: JSON.stringify(instance),
    //                             collectionId,
    //                         });
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }
    // console.log(JSON.stringify(entityInserts, null, 2));
    // console.log(JSON.stringify(entityTypeInserts, null, 2));

    // await new Promise((resolve) => setTimeout(resolve, 100));

    // insert entities into the DB
    // req.io
    //     .to(req.query.clientId)
    //     .emit("load-collection-data", { msg: `Inserting DB records`, date: new Date() });
    // let chunkSize = getChunkSize(entityInserts);
    // for (let records of chunk(entityInserts, chunkSize)) {
    //     const total = records.length;
    //     await this.models.entity.bulkCreate(records, {
    //         // include: [{ model: this.models.type, as: "etype" }],
    //     });
    //     req.io.to(req.query.clientId).emit("load-collection-data", {
    //         msg: `Inserted ${total} entity records`,
    //         date: new Date(),
    //     });
    //     await new Promise((resolve) => setTimeout(resolve, 100));
    // }

    // create entity -> type associations
    // chunkSize = getChunkSize(entityTypeInserts);
    // for (let records of chunk(entityTypeInserts, chunkSize)) {
    //     const total = records.length;
    //     await this.models.entity_types.bulkCreate(records, { ignoreDuplicates: true });
    //     req.io.to(req.query.clientId).emit("load-collection-data", {
    //         msg: `Inserted ${total} entity type associations`,
    //         date: new Date(),
    //     });
    //     await new Promise((resolve) => setTimeout(resolve, 100));
    // }

    // insert properties into the DB
    // chunkSize = getChunkSize(propertyInserts);
    // for (let records of chunk(propertyInserts, chunkSize)) {
    //     const total = records.length;
    //     await this.models.property.bulkCreate(records);
    //     req.io.to(req.query.clientId).emit("load-collection-data", {
    //         msg: `Inserted ${total} property records`,
    //         date: new Date(),
    //     });
    //     await new Promise((resolve) => setTimeout(resolve, 100));
    // }

    const nEntities = await models.entity.count({ where: { collectionId } });
    const nProperties = await models.property.count({ where: { collectionId } });
    req.io.to(req.query.clientId).emit("load-collection-data", {
        msg: `Done: loaded ${nEntities} entities and ${nProperties} properties into the DB`,
        date: new Date(),
    });

    return {};

    function getChunkSize(inserts) {
        let chunkSize = 100;
        if (inserts.length < 10000) {
            chunkSize = 5000;
        } else if (inserts.length < 100000) {
            chunkSize = 20000;
        } else if (inserts.length < 1000000) {
            chunkSize = 50000;
        } else {
            chunkSize = 50000;
        }
        return chunkSize;
    }
}

function asArray(value) {
    return !isArray(value) ? [value] : value;
}

function concat(value) {
    return asArray(value).join(", ");
}
