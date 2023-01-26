import { demandAuthenticatedUser } from "../common/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import path from "path";
import { ROCrate } from "ro-crate";
import models from "../models/index.js";
import { v4 as uuidv4 } from "uuid";
import { init } from "@paralleldrive/cuid2";
import lodashPkg from "lodash";
const { isPlainObject, isString, chunk } = lodashPkg;

const createId = init({ length: 32 });

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get("/collections", getCollectionsHandler);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireCollectionAccess);
        fastify.get("/collections/:code/load", getCollectionsLoadHandler);
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
    if (!(await pathExists(crateFile))) return;

    // TODO: disabled for now
    let crate = await readJSON(crateFile);
    // console.log(JSON.stringify(crate, null, 2));
    try {
        console.time();
        console.log("ingesting into rocrate js");
        crate = new ROCrate(crate, { array: true });
        console.log("ingesting into rocrate js");
        console.timeEnd();
    } catch (error) {
        return res.badRequestError();
    }

    // let crate = {
    //     "@context": [
    //         "https://w3id.org/ro/crate/1.1/context",
    //         {
    //             "@base": null,
    //         },
    //     ],
    //     "@graph": [
    //         {
    //             "@id": "ro-crate-metadata.json",
    //             "@type": "CreativeWork",
    //             conformsTo: {
    //                 "@id": "https://w3id.org/ro/crate/1.1",
    //             },
    //             about: {
    //                 "@id": "./",
    //             },
    //         },
    //         {
    //             "@id": "./",
    //             "@type": "Dataset",
    //             "@reverse": {},
    //             name: "My Research Object Crate",
    //             person: [
    //                 {
    //                     "@id": "P1",
    //                 },
    //             ],
    //         },
    //         {
    //             "@id": "P1",
    //             "@type": "Entity",
    //             entityType: [{ "@id": "ET1" }, { "@id": "ET2" }],
    //             ohrmID: { "@id": "O1" },
    //             name: "Person 1",
    //             something: "value",
    //         },
    //         { "@id": "ET1", "@type": "EntityType", name: "Person" },
    //         { "@id": "ET2", "@type": "EntityType", name: "School" },
    //         { "@id": "O1", "@type": "OHRMID", name: "P1" },
    //         {
    //             "@id": "S1",
    //             "@type": "Entity",
    //             entityType: [{ "@id": "ET3" }],
    //             name: "School 1",
    //         },
    //         { "@id": "ET3", "@type": "EntityType", name: "School" },
    //         { "@id": "R1", "@type": "EntityType", entityType: { "@id": "ET4" }, name: "P1 => S1" },
    //         {
    //             "@id": "ET4",
    //             "@type": "Relationship",
    //             name: "PS => S1 relationship",
    //             relationshipSubject: { "@id": "P1" },
    //             relationshipObject: { "@id": "S1" },
    //         },
    //     ],
    // };
    const collectionId = req.session.collection.id;
    console.log("***", req.session.collection.get());

    const entitiesByDescriboId = {};
    const entitiesByAtId = {};
    // console.log(crate.toJSON());
    crate.rootDataset.label = "rootDataset";
    console.log(`Assigning identifiers`, new Date());
    for (let entity of crate.entities()) {
        entity.describoId = createId();
        entitiesByDescriboId[entity.describoId] = entity.toJSON();
        entitiesByAtId[entity["@id"]] = entity.toJSON();
        // console.log(entity.toJSON());
    }
    // console.log(entitiesByAtId);

    // console.log(entitiesByAtId);
    // const crate = {
    //     '@context': '',
    //     '@graph',
    // }
    // console.log(req.session.collection);
    // for (let entity of crate.entities()) {
    //     entity.describoId = uuidv4();
    // }
    // for (let entity of crate.entities()) {
    //     console.log(entity.toJSON());
    // }

    console.time();
    console.log(`Preparing the inserts`, new Date());
    const entityMainProperties = ["@id", "@type", "name", "label", "describoId"];
    let entityInserts = [];
    let propertyInserts = [];
    for (let entity of crate.entities()) {
        entityInserts.push({
            id: entity.describoId[0],
            eid: entity["@id"],
            etype: JSON.stringify(entity["@type"]),
            name: entity?.name?.[0],
            collectionId,
        });
        for (let property of Object.keys(entity)) {
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
                            entityId: entity.describoId[0],
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
                                entityId: entity.describoId[0],
                                targetEntityId: targetEntity.describoId,
                                collectionId,
                            });
                        } else {
                            propertyInserts.push({
                                id: createId(),
                                property,
                                entityId: entity.describoId[0],
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
        chunkSize = 1000;
    } else if (entityInserts.length < 100000) {
        chunkSize = 10000;
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
        chunkSize = 1000;
    } else if (propertyInserts.length < 100000) {
        chunkSize = 10000;
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
