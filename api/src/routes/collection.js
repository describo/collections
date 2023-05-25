import { demandAuthenticatedUser } from "../common/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import { Op } from "sequelize";
import models from "../models/index.js";
import { init } from "@paralleldrive/cuid2";
import lodashPkg from "lodash";
import profile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
const { isArray, intersection, cloneDeep, isPlainObject, isString, chunk, groupBy } = lodashPkg;
const createId = init({ length: 32 });

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get("/collections", getCollectionsHandler);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireCollectionAccess);
        fastify.get("/collections/:code/profile", getCollectionProfileHandler);
        // fastify.get("/collections/:code/load", collectionLoadHandler);
        fastify.get("/collections/:code/entities", getEntities);
        fastify.get("/collections/:code/types", getEntityTypesHandler);
        fastify.get("/collections/:code/entities/:entityId", loadEntity);
        fastify.post("/collections/:code/entities/:entityId", createEntityHandler);
        fastify.delete("/collections/:code/entities/:entityId", deleteEntityHandler);
        fastify.put("/collections/:code/entities/:entityId", updateEntityHandler);
        fastify.post("/collections/:code/entities/:entityId/properties", addPropertyHandler);
        fastify.put("/collections/:code/properties/:propertyId", updatePropertyHandler);
        fastify.delete("/collections/:code/properties/:propertyId", deletePropertyHandler);
        done();
    });
    done();
}

// TODO: this code does not have tests yet
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

// TODO this code does not have tests yet
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
    return { collections: collections.map((c) => c.get()), total };
}

// TODO this code does not have tests yet
async function getCollectionProfileHandler(req) {
    let collection = await models.collection.findOne({ where: { id: req.session.collection.id } });
    return { profile: collection.profile ?? {} };
}

// // TODO this code does not have tests
// async function collectionLoadHandler(req, res) {
//     const collectionsCode = req.params.code;
//     const dataPath = "/srv/data";
//     const crateFile = path.join(dataPath, collectionsCode, "ro-crate-metadata.json");

//     const collectionId = req.session.collection.id;

//     // delete the collection data if there's already some loaded and we're in development
//     if (process.env.NODE_ENV === "development") {
//         req.io
//             .to(req.query.clientId)
//             .emit("load-collection-data", { msg: `Deleting existing data`, date: new Date() });
//         await this.models.entity.destroy({
//             where: { collectionId },
//             truncate: true,
//             cascade: true,
//         });
//         await this.models.type.destroy({ where: { collectionId }, truncate: true, cascade: true });
//     } else {
//         // complain loudly and bail if this collection already has data
//         let entityCount = await models.entity.count({
//             where: { collectionId },
//         });
//         if (entityCount !== 0) return {};
//     }

//     // return if no crate file found
//     if (!(await pathExists(crateFile))) return {};

//     // load the crate file
//     let crate = await readJSON(crateFile);

//     // assign identifier to all entities
//     const entitiesByDescriboId = {};
//     const entitiesByAtId = {};
//     let rootDescriptor;
//     for (let [i, e] of crate["@graph"].entries()) {
//         if (e["@id"] === "ro-crate-metadata.json") {
//             rootDescriptor = { ...e };
//             break;
//         }
//     }

//     req.io
//         .to(req.query.clientId)
//         .emit("load-collection-data", { msg: `Assigning entity identifiers`, date: new Date() });

//     let types = {};
//     for (let entity of crate["@graph"]) {
//         if (entity["@id"] === "ro-crate-metadata.json") entity.label = "RootDescriptor";
//         if (entity["@id"] === rootDescriptor.about["@id"]) entity.label = "RootDataset";
//         entity.describoId = createId();
//         entity["@type"] = asArray(entity["@type"]);
//         entity["@type"].forEach((type) => (types[type] = true));
//         entitiesByDescriboId[entity.describoId] = entity;
//         entitiesByAtId[entity["@id"]] = entity;
//     }

//     const typeInserts = Object.keys(types).map((type) => {
//         return {
//             id: createId(),
//             name: type,
//             collectionId,
//         };
//     });
//     const typeNameToIdMapping = groupBy(typeInserts, "name");
//     await this.models.type.bulkCreate(typeInserts);

//     // prepare the entity and property DB inserts
//     req.io.to(req.query.clientId).emit("load-collection-data", {
//         msg: `Preparing entity and property inserts`,
//         date: new Date(),
//     });
//     await new Promise((resolve) => setTimeout(resolve, 100));
//     const entityMainProperties = ["@id", "@type", "name", "label", "describoId"];
//     let entityInserts = [];
//     let propertyInserts = [];
//     let entityTypeInserts = [];
//     for (let entity of crate["@graph"]) {
//         entityInserts.push({
//             id: entity.describoId,
//             eid: entity["@id"],
//             name: entity?.name,
//             label: entity.label,
//             collectionId,
//         });

//         entity["@type"].forEach((type) => {
//             entityTypeInserts.push({
//                 entityId: entity.describoId,
//                 typeId: typeNameToIdMapping[type][0].id,
//             });
//         });

//         for (let property of Object.keys(entity)) {
//             if (!isArray(entity[property]) && property !== "describoId") {
//                 entity[property] = [entity[property]];
//             }
//             if (!entity[property]) continue;
//             for (let instance of entity[property]) {
//                 if (!entityMainProperties.includes(property)) {
//                     if (isString(instance)) {
//                         propertyInserts.push({
//                             id: createId(),
//                             property,
//                             entityId: entity.describoId,
//                             value: instance,
//                             collectionId,
//                         });
//                     } else if (isPlainObject(instance)) {
//                         let targetEntity = entitiesByAtId[instance["@id"]];
//                         if (targetEntity) {
//                             propertyInserts.push({
//                                 id: createId(),
//                                 property,
//                                 entityId: entity.describoId,
//                                 targetEntityId: targetEntity.describoId,
//                                 collectionId,
//                             });
//                         } else {
//                             propertyInserts.push({
//                                 id: createId(),
//                                 property,
//                                 entityId: entity.describoId,
//                                 valueStringified: JSON.stringify(instance),
//                                 collectionId,
//                             });
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     // console.log(JSON.stringify(entityInserts, null, 2));
//     // console.log(JSON.stringify(entityTypeInserts, null, 2));

//     await new Promise((resolve) => setTimeout(resolve, 100));

//     // insert entities into the DB
//     req.io
//         .to(req.query.clientId)
//         .emit("load-collection-data", { msg: `Inserting DB records`, date: new Date() });
//     let chunkSize = getChunkSize(entityInserts);
//     for (let records of chunk(entityInserts, chunkSize)) {
//         const total = records.length;
//         await this.models.entity.bulkCreate(records, {
//             // include: [{ model: this.models.type, as: "etype" }],
//         });
//         req.io.to(req.query.clientId).emit("load-collection-data", {
//             msg: `Inserted ${total} entity records`,
//             date: new Date(),
//         });
//         await new Promise((resolve) => setTimeout(resolve, 100));
//     }

//     // create entity -> type associations
//     chunkSize = getChunkSize(entityTypeInserts);
//     for (let records of chunk(entityTypeInserts, chunkSize)) {
//         const total = records.length;
//         await this.models.entity_types.bulkCreate(records, { ignoreDuplicates: true });
//         req.io.to(req.query.clientId).emit("load-collection-data", {
//             msg: `Inserted ${total} entity type associations`,
//             date: new Date(),
//         });
//         await new Promise((resolve) => setTimeout(resolve, 100));
//     }

//     // insert properties into the DB
//     chunkSize = getChunkSize(propertyInserts);
//     for (let records of chunk(propertyInserts, chunkSize)) {
//         const total = records.length;
//         await this.models.property.bulkCreate(records);
//         req.io.to(req.query.clientId).emit("load-collection-data", {
//             msg: `Inserted ${total} property records`,
//             date: new Date(),
//         });
//         await new Promise((resolve) => setTimeout(resolve, 100));
//     }

//     const nEntities = await models.entity.count({ where: { collectionId } });
//     const nProperties = await models.property.count({ where: { collectionId } });
//     req.io.to(req.query.clientId).emit("load-collection-data", {
//         msg: `Done: loaded ${nEntities} entities and ${nProperties} properties into the DB`,
//         date: new Date(),
//     });

//     return {};

//     function getChunkSize(inserts) {
//         let chunkSize = 100;
//         if (inserts.length < 10000) {
//             chunkSize = 5000;
//         } else if (inserts.length < 100000) {
//             chunkSize = 20000;
//         } else if (inserts.length < 1000000) {
//             chunkSize = 50000;
//         } else {
//             chunkSize = 50000;
//         }
//         return chunkSize;
//     }
// }

// TODO this code does not have tests
async function getEntities(req) {
    const queryString = req.query.queryString;
    const type = req.query.type;
    let matches, total;
    if (queryString) {
        ({ rows: matches, count: total } = await models.entity.findAndCountAll({
            where: {
                collectionId: req.session.collection.id,
                [Op.or]: [
                    {
                        eid: {
                            [Op.iLike]: `%${queryString}%`,
                        },
                    },
                    {
                        name: {
                            [Op.iLike]: `%${queryString}%`,
                        },
                    },
                ],
            },
            include: [{ model: models.type, as: "etype" }],
            limit: 10,
        }));
    } else if (type) {
        const limit = req.query.limit ?? 10;
        const offset = req.query.offset ?? 0;
        matches = await models.type.findAll({
            where: { name: type },
            include: [
                {
                    model: models.entity,
                    as: "entities",
                    include: [{ model: models.type, as: "etype", where: { name: type } }],
                },
            ],
        });
        total = matches[0].entities.length;
        matches = matches[0].entities.slice(offset, offset + limit);
    }
    matches = matches.map((m) => ({
        describoId: m.id,
        "@id": m.eid,
        "@type": m.etype.map((type) => type.name).join(", "),
        name: m.name,
    }));
    return { matches, total };
}

// TODO this code does not have tests yet
async function getEntityTypesHandler(req) {
    let types = await models.type.findAll({
        where: {
            collectionId: req.session.collection.id,
        },
        order: [["name", "ASC"]],
        attributes: ["id", "name"],
        raw: true,
    });
    return { types };
}

async function getEntity({ id, collectionId, withProperties = true }) {
    const query = {
        where: {
            [Op.and]: [
                {
                    [Op.or]: [{ id }, { label: id }],
                },
                {
                    collectionId,
                },
            ],
        },
        include: [
            {
                model: models.type,
                as: "etype",
            },
        ],
    };
    if (withProperties) {
        query.include.push({
            required: false,
            where: { entityId: id },
            model: models.property,
            include: [
                {
                    model: models.entity,
                    as: "targetEntity",
                    include: [{ model: models.type, as: "etype" }],
                },
            ],
        });
    }

    let entity = await models.entity.findOne(query);
    if (withProperties) {
        let reverse = await models.property.findAll({
            where: { targetEntityId: id },
            include: [{ model: models.entity }],
        });
        entity.reverseConnections = reverse.map((r) => {
            return {
                property: r.property,
                propertyId: r.id,
                srcEntityId: r.entityId,
                tgtEntityId: r.targetEntityId,
                tgtEntity: r.entity.get(),
            };
        });
    }
    return entity;
}

// TODO this code does not have tests yet
async function loadEntity(req) {
    console.time(`entity load time: ${req.params.entityId}`);
    let entity = await getEntity({
        id: req.params.entityId,
        collectionId: req.session.collection.id,
    });
    const reverseConnections = cloneDeep(entity.reverseConnections);
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
        if (p.targetEntity) {
            const tgtEntity = {
                describoId: p.targetEntity.id,
                "@id": p.targetEntity.eid,
                "@type": p.targetEntity.etype.map((type) => type.name).join(", "),
                name: p.targetEntity.name,
                associations: [],
            };
            const typesToResolve = Object.keys(profile.resolve);
            const type = tgtEntity["@type"]?.split(",").map((t) => t.trim());
            const specificTypesToResolve = intersection(typesToResolve, type);

            let associations = [];
            for (let type of specificTypesToResolve) {
                const propertiesToResolve = profile.resolve[type];
                let e = await getEntity({
                    id: tgtEntity.describoId,
                    collectionId: req.session.collection.id,
                });
                let properties = e.properties;
                for (let entityProperty of properties) {
                    if (propertiesToResolve.includes(entityProperty.property)) {
                        let entity = await getEntity({
                            id: entityProperty.targetEntityId,
                            collectionId: req.session.collection.id,
                            withProperties: false,
                        });
                        associations.push({
                            property: entityProperty.property,
                            entity: {
                                describoId: entity.id,
                                "@id": entity.eid,
                                "@type": entity.etype.map((type) => type.name).join(", "),
                                name: entity.name,
                            },
                        });
                    }
                }
            }
            tgtEntity.associations = associations;
            properties[p.property].push({
                propertyId: p.id,
                srcEntityId: p.entityId,
                property: p.property,
                tgtEntityId: p.targetEntityId,
                tgtEntity,
            });
        }
    }
    let entityData = entity.get();
    delete entityData.properties;
    entityData = {
        describoId: entity.id,
        "@id": entity.eid,
        "@type": entity.etype.map((type) => type.name),
        name: entity.name,
        properties,
        reverseConnections: groupBy(reverseConnections, "property"),
    };
    console.timeEnd(`entity load time: ${req.params.entityId}`);
    return { entity: entityData };
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
            id: createId(),
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
        id: createId(),
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
        id: createId(),
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
