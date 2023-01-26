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

    const entitiesByDescriboId = {};
    const entitiesByAtId = {};
    const rootDescriptor = crate["@graph"].filter((e) => e["@id"] === "ro-crate-metadata.json")[0];
    console.log(`Assigning identifiers`, new Date());
    for (let entity of crate["@graph"]) {
        if (entity["@id"] === rootDescriptor.about["@id"]) entity.label = "RootDescriptor";
        entity.describoId = createId();
        entitiesByDescriboId[entity.describoId] = entity;
        entitiesByAtId[entity["@id"]] = entity;
    }

    console.time();
    console.log(`Preparing the inserts`, new Date());
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
                    // console.log(property, instance, isPlainObject(instance));
                    if (isString(instance)) {
                        // console.log(
                        //     `PropertyId: '${createId()}' Property: '${property}' sourceEntityId: '${
                        //         entity.describoId
                        //     }', value: '${instance}'`
                        // );
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
                            // console.log(
                            //     `PropertyId: '${createId()}' Property: '${property}' sourceEntityId: '${
                            //         entity.describoId
                            //     }', targetEntityId: '${targetEntity.describoId}'`
                            // );
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
            // console.log(property);
        }
    }
    console.log("inserting db records");
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
        console.log(`inserted ${records.length} entity records`, new Date());
        await models.entity.bulkCreate(records);
    }

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
        console.log(`inserted ${records.length} property records`, new Date());
        await models.property.bulkCreate(records);
    }

    console.log("n entities", await models.entity.count({ where: { collectionId } }));
    console.log("n properties", await models.property.count({ where: { collectionId } }));

    console.timeEnd();
    // group entity graph by '@id'
    // walk the graph rewriting all @id ref's to point to describoId
    // ingest the graph
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
        if (p.value) properties[p.property].push({ id: p.id, value: p.value });
        if (p.valueStringified)
            properties[p.property].push({ id: p.id, value: JSON.parse(p.value) });
        if (p.targetEntity)
            properties[p.property].push({
                ...p.targetEntity.get(),
                etype: JSON.parse(p.targetEntity.etype),
            });
    }
    let entityData = entity.get();
    delete entityData.properties;
    entityData = {
        ...entityData,
        etype: JSON.parse(entity.etype),
        ...properties,
    };
    return { entity: entityData };
}
