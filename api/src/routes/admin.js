import { demandAdministrator, demandAuthenticatedUser } from "../common/index.js";
import models from "../models/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import { init } from "@paralleldrive/cuid2";
import lodashPkg from "lodash";
const { isArray, isPlainObject, isString, chunk, groupBy, uniqBy } = lodashPkg;
const createId = init({ length: 32 });

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", demandAdministrator);

    fastify.get("/admin", async (req, res) => {});
    fastify.get("/admin/collections", getCollectionsHandler);
    fastify.post("/admin/collections/create", postCreateCollectionHandler);
    fastify.get("/admin/collections/:code/users", getCollectionUsersHandler);
    fastify.post("/admin/collections/:code/attach-user/:userId", postAttachUserToCollectionHandler);
    fastify.post(
        "/admin/collections/:code/detach-user/:userId",
        postDetachUserFromCollectionHandler
    );
    fastify.post("/admin/collections/:code/load-data", postLoadDataIntoCollectionHandler);
    done();
}

// TODO this code does not have tests
async function postCreateCollectionHandler(req) {
    let { name, code } = req.body;
    let user = req.session.user;
    let collection = await models.collection.findOrCreate({
        where: { code },
        defaults: { name, code },
    });
    collection = collection[0];
    await collection.addUser(user);
}

// TODO this code does not have tests
async function getCollectionsHandler(req) {
    let { limit, offset } = req.query;
    limit = limit ?? 10;
    offset = offset ?? 0;
    let { rows: collections, count: total } = await models.collection.findAndCountAll({
        attributes: ["id", "name", "code"],
        limit,
        offset,
    });
    return { collections: collections.map((c) => c.get()), total };
}

// TODO this code does not have tests
async function getCollectionUsersHandler(req) {
    const { code } = req.params;
    let collection = await models.collection.findOne({ where: { code } });
    let users = await collection.getUsers({
        attributes: ["id", "email", "givenName", "familyName"],
    });
    return { users };
}

// TODO this code does not have tests
async function postAttachUserToCollectionHandler(req) {
    const { code, userId } = req.params;
    let user = await models.user.findOne({ where: { id: userId } });
    let collection = await models.collection.findOne({ where: { code } });
    await collection.addUser(user);
    return {};
}

// TODO this code does not have tests
async function postDetachUserFromCollectionHandler(req) {
    const { code, userId } = req.params;
    let user = await models.user.findOne({ where: { id: userId } });
    let collection = await models.collection.findOne({ where: { code } });
    await collection.removeUser(user);
    return {};
}

// TODO this code does not have tests
async function postLoadDataIntoCollectionHandler(req, res) {
    const crate = req.body.crate;
    let collection = await models.collection.findOne({
        where: { code: req.params.code },
    });
    const collectionId = collection.id;

    // delete the collection data if there's already some loaded and we're in development
    if (process.env.NODE_ENV === "development") {
        req.io
            .to(req.query.clientId)
            .emit("load-collection-data", { msg: `Deleting existing data`, date: new Date() });
        await this.models.property.destroy({
            where: { collectionId },
            truncate: true,
            cascade: true,
        });
        await this.models.entity.destroy({
            where: { collectionId },
            truncate: true,
            cascade: true,
        });
        await this.models.type.destroy({
            where: { collectionId },
            truncate: true,
            cascade: true,
        });
    } else {
        // complain loudly and bail if this collection already has data
        let entityCount = await models.entity.count({
            where: { collectionId },
        });
        if (entityCount !== 0) return {};
    }

    // assign identifier to all entities
    const entitiesByDescriboId = {};
    const entitiesByAtId = {};
    let rootDescriptor;
    for (let [i, e] of crate["@graph"].entries()) {
        if (e["@id"] === "ro-crate-metadata.json") {
            rootDescriptor = { ...e };
            break;
        }
    }

    req.io.to(req.query.clientId).emit("load-collection-data", {
        msg: `Assigning entity identifiers`,
        date: new Date(),
    });

    let types = {};
    for (let entity of crate["@graph"]) {
        if (entity["@id"] === "ro-crate-metadata.json") entity.label = "RootDescriptor";
        if (entity["@id"] === rootDescriptor.about["@id"]) {
            entity.label = "RootDataset";
            entity.describoId = "RootDataset";
        } else {
            entity.describoId = createId();
        }
        entity["@type"] = asArray(entity["@type"]);
        entity["@type"].forEach((type) => (types[type] = true));
        entitiesByDescriboId[entity.describoId] = entity;
        entitiesByAtId[entity["@id"]] = entity;
    }

    let typeInserts = Object.keys(types).map((type) => {
        return {
            id: createId(),
            name: type,
            collectionId,
        };
    });
    typeInserts = uniqBy(typeInserts, "name");
    const typeNameToIdMapping = groupBy(typeInserts, "name");
    await this.models.type.bulkCreate(typeInserts);

    // prepare the entity and property DB inserts
    req.io.to(req.query.clientId).emit("load-collection-data", {
        msg: `Preparing entity and property inserts`,
        date: new Date(),
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const entityMainProperties = ["@id", "@type", "name", "label", "describoId"];
    let entityInserts = [];
    let propertyInserts = [];
    let entityTypeInserts = [];
    for (let entity of crate["@graph"]) {
        entityInserts.push({
            id: entity.describoId,
            eid: entity["@id"],
            name: entity?.name,
            label: entity.label,
            collectionId,
        });

        entity["@type"].forEach((type) => {
            entityTypeInserts.push({
                entityId: entity.describoId,
                typeId: typeNameToIdMapping[type][0].id,
            });
        });

        for (let property of Object.keys(entity)) {
            if (!isArray(entity[property]) && property !== "describoId") {
                entity[property] = [entity[property]];
            }
            if (!entity[property]) continue;
            for (let instance of entity[property]) {
                if (!entityMainProperties.includes(property)) {
                    if (!isArray(instance) && !isPlainObject(instance)) {
                        propertyInserts.push({
                            id: createId(),
                            property,
                            entityId: entity.describoId,
                            value: instance,
                            collectionId,
                        });
                    } else if (isPlainObject(instance)) {
                        let targetEntity = entitiesByAtId[instance["@id"]];
                        if (targetEntity) {
                            propertyInserts.push({
                                id: createId(),
                                property,
                                entityId: entity.describoId,
                                targetEntityId: targetEntity.describoId,
                                collectionId,
                            });
                        } else {
                            propertyInserts.push({
                                id: createId(),
                                property,
                                entityId: entity.describoId,
                                valueStringified: JSON.stringify(instance),
                                collectionId,
                            });
                        }
                    }
                }
            }
        }
    }
    // console.log(JSON.stringify(entityInserts, null, 2));
    // console.log(JSON.stringify(entityTypeInserts, null, 2));

    await new Promise((resolve) => setTimeout(resolve, 100));

    // insert entities into the DB
    req.io
        .to(req.query.clientId)
        .emit("load-collection-data", { msg: `Inserting DB records`, date: new Date() });
    let chunkSize = getChunkSize(entityInserts);
    for (let records of chunk(entityInserts, chunkSize)) {
        const total = records.length;
        await this.models.entity.bulkCreate(records, {
            // include: [{ model: this.models.type, as: "etype" }],
        });
        req.io.to(req.query.clientId).emit("load-collection-data", {
            msg: `Inserted ${total} entity records`,
            date: new Date(),
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // create entity -> type associations
    chunkSize = getChunkSize(entityTypeInserts);
    for (let records of chunk(entityTypeInserts, chunkSize)) {
        const total = records.length;
        await this.models.entity_types.bulkCreate(records, { ignoreDuplicates: true });
        req.io.to(req.query.clientId).emit("load-collection-data", {
            msg: `Inserted ${total} entity type associations`,
            date: new Date(),
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // insert properties into the DB
    chunkSize = getChunkSize(propertyInserts);
    for (let records of chunk(propertyInserts, chunkSize)) {
        const total = records.length;
        await this.models.property.bulkCreate(records);
        req.io.to(req.query.clientId).emit("load-collection-data", {
            msg: `Inserted ${total} property records`,
            date: new Date(),
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

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
