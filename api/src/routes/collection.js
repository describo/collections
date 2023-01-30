import { demandAuthenticatedUser } from "../common/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import path from "path";
import { ROCrate } from "ro-crate";
import { Op } from "sequelize";
import models from "../models/index.js";
import { v4 as uuidv4 } from "uuid";
import { init } from "@paralleldrive/cuid2";
import lodashPkg from "lodash";
const { isArray, isPlainObject, isString, chunk } = lodashPkg;

const createId = init({ length: 32 });

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get("/collections", getCollectionsHandler);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireCollectionAccess);
        fastify.get("/collections/:code/load", getCollectionsLoadHandler);
        fastify.get("/collections/:code/entities", lookupEntities);
        fastify.get("/collections/:code/entities/:entityId", loadEntity);
        done();
    });
    done();
}

// TODO: this code does not have tests
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

// TODO this code does not have tests
async function getCollectionsHandler(req) {
    let collections = await models.collection.findAll({
        attributes: ["id", "name", "code"],
        include: [{ model: models.user, where: { id: req.session.user.id }, attributes: [] }],
    });
    return { collections: collections.map((c) => c.get()) };
}

// TODO this code does not have tests
async function getCollectionsLoadHandler(req, res) {
    const collectionsCode = req.params.code;
    const dataPath = "/srv/data";
    const crateFile = path.join(dataPath, collectionsCode, "ro-crate-metadata.json");

    // return if collection already has entities
    const collectionId = req.session.collection.id;
    let entityCount = await models.entity.count({
        where: { collectionId },
    });
    if (entityCount !== 0) return {};

    // return if no crate file found
    if (!(await pathExists(crateFile))) return {};

    // load the crate file
    let crate = await readJSON(crateFile);

    // assign identifier to all entities
    const entitiesByDescriboId = {};
    const entitiesByAtId = {};
    const rootDescriptor = crate["@graph"].filter((e) => e["@id"] === "ro-crate-metadata.json")[0];
    req.io
        .to(req.query.clientId)
        .emit("load-collection-data", { msg: `Assigning identifiers`, date: new Date() });
    for (let entity of crate["@graph"]) {
        if (entity["@id"] === rootDescriptor.about["@id"]) entity.label = "RootDescriptor";
        entity.describoId = createId();
        entitiesByDescriboId[entity.describoId] = entity;
        entitiesByAtId[entity["@id"]] = entity;
    }

    // prepare the entity and property DB inserts
    req.io
        .to(req.query.clientId)
        .emit("load-collection-data", { msg: `Preparing inserts`, date: new Date() });
    const entityMainProperties = ["@id", "@type", "name", "label", "describoId"];
    let entityInserts = [];
    let propertyInserts = [];
    for (let entity of crate["@graph"]) {
        entityInserts.push({
            id: entity.describoId,
            eid: entity["@id"],
            etype: JSON.stringify(entity["@type"]),
            name: entity?.name,
            collectionId,
        });
        for (let property of Object.keys(entity)) {
            if (!isArray(entity[property]) && property !== "describoId") {
                entity[property] = [entity[property]];
            }
            if (!entity[property]) continue;
            for (let instance of entity[property]) {
                if (!entityMainProperties.includes(property)) {
                    if (isString(instance)) {
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

    // insert entities into the DB
    req.io
        .to(req.query.clientId)
        .emit("load-collection-data", { msg: `Inserting DB records`, date: new Date() });
    let chunkSize = 100;
    if (entityInserts.length < 10000) {
        chunkSize = 5000;
    } else if (entityInserts.length < 100000) {
        chunkSize = 20000;
    } else if (entityInserts.length < 1000000) {
        chunkSize = 50000;
    } else {
        chunkSize = 50000;
    }
    for (let records of chunk(entityInserts, chunkSize)) {
        const total = records.length;
        await models.entity.bulkCreate(records);
        req.io.to(req.query.clientId).emit("load-collection-data", {
            msg: `Inserted ${total} entity records`,
            date: new Date(),
        });
    }

    // insert properties into the DB
    chunkSize = 100;
    if (propertyInserts.length < 10000) {
        chunkSize = 5000;
    } else if (propertyInserts.length < 100000) {
        chunkSize = 20000;
    } else if (propertyInserts.length < 1000000) {
        chunkSize = 50000;
    } else {
        chunkSize = 50000;
    }
    for (let records of chunk(propertyInserts, chunkSize)) {
        const total = records.length;
        await models.property.bulkCreate(records);
        req.io.to(req.query.clientId).emit("load-collection-data", {
            msg: `Inserted ${total} property records`,
            date: new Date(),
        });
    }

    const nEntities = await models.entity.count({ where: { collectionId } });
    const nProperties = await models.property.count({ where: { collectionId } });
    req.io.to(req.query.clientId).emit("load-collection-data", {
        msg: `Done: loaded ${nEntities} entities and ${nProperties} properties into the DB`,
        date: new Date(),
    });

    return {};
}

async function lookupEntities(req) {
    // console.log(req.session.collection);
    const queryString = req.query.queryString;
    let matches = await models.entity.findAll({
        where: {
            collectionId: req.session.collection.id,
            [Op.or]: [
                {
                    eid: {
                        [Op.iLike]: `${queryString}%`,
                    },
                },
                {
                    name: {
                        [Op.iLike]: `${queryString}%`,
                    },
                },
            ],
        },
        limit: 10,
    });

    return { matches: matches.map((m) => ({ ...m.get(), etype: JSON.parse(m.etype) })) };
}

async function loadEntity(req) {
    let entity = await models.entity.findOne({
        where: { id: req.params.entityId, collectionId: req.session.collection.id },
        include: [
            {
                model: models.property,
                include: [{ model: models.entity, as: "targetEntity" }],
            },
        ],
    });
    let properties = {};
    for (let p of entity.properties) properties[p.property] = [];
    for (let p of entity.properties) {
        if (p.value)
            properties[p.property].push({
                propertyId: p.id,
                srcEntityId: p.entityId,
                property: p.property,
                value: p.value,
            });
        if (p.valueStringified)
            properties[p.property].push({
                propertyId: p.id,
                srcEntityId: p.entityId,
                property: p.property,
                value: JSON.parse(p.value),
            });
        if (p.targetEntity)
            properties[p.property].push({
                propertyId: p.id,
                srcEntityId: p.entityId,
                property: p.property,
                tgtEntityId: p.targetEntityId,
                tgtEntity: {
                    "@id": p.targetEntity.eid,
                    "@type": JSON.parse(p.targetEntity.etype),
                    name: p.targetEntity.name,
                },
            });
    }
    let entityData = entity.get();
    delete entityData.properties;
    entityData = {
        describoId: entity.id,
        "@id": entity.eid,
        "@type": JSON.parse(entity.etype),
        name: entity.name,
        properties,
    };
    return { entity: entityData };
}
