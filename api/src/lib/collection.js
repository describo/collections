import { demandAuthenticatedUser } from "../common/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import { Op } from "sequelize";
import models from "../models/index.js";
import profile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
import lodashPkg from "lodash";
const { orderBy, groupBy } = lodashPkg;

export async function getEntities({ collectionId, type, queryString, limit = 10, offset = 0 }) {
    let where = {
        collectionId,
    };
    let include = [{ model: models.type, as: "etype" }];

    if (type) {
        include[0].where = { name: type };
    }
    if (queryString) {
        where[Op.or] = [
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
        ];
    }

    // console.log("where", where);
    // console.log("include", include);
    let { rows: entities, count: total } = await models.entity.findAndCountAll({
        where,
        include,
        limit,
        offset,
    });

    entities = entities.map((m) => ({
        "@id": m.eid,
        "@type": m.etype.map((type) => type.name).join(", "),
        name: m.name,
    }));

    return { entities, total };
}

export async function getEntityTypes({ collectionId }) {
    let types = await models.type.findAll({
        where: {
            collectionId,
        },
        order: [["name", "ASC"]],
        attributes: ["id", "name"],
        raw: true,
    });
    return { types };
}

export async function loadEntity({ collectionId, id, stub = false }) {
    const query = {
        where: { eid: id, collectionId },
        include: [
            {
                model: models.type,
                as: "etype",
            },
        ],
    };
    if (!stub) {
        query.include.push({
            required: false,
            model: models.property,
            include: [
                {
                    model: models.entity,
                    as: "targetEntity",
                    include: [{ model: models.type, as: "etype", order: [["order", "ASC"]] }],
                },
            ],
        });
    }
    // console.log(query);

    // get the entity data from the db
    let entity = await models.entity.findOne(query);

    // if we need just a stub entry then return it here
    if (stub) {
        return {
            "@id": entity.eid,
            "@type": entity.etype.map((t) => t.name),
            name: entity.name,
        };
    }

    // otherwise, fully reconstruct the entity along with the associations
    try {
        let reverse = await assembleEntityReverseConnections({ entity });
        entity = assembleEntity({ entity });
        entity["@reverse"] = reverse;
        return entity;
    } catch (error) {
        console.log(error);
        return {};
    }
}

function assembleEntity({ entity }) {
    let e = {
        "@id": entity.eid,
        "@type": assembleEntityType(entity.etype),
        name: entity.name,
    };
    let properties = entity.properties.map((p) => {
        if (p?.value) {
            return {
                idx: p.id,
                property: p.property,
                value: p.value,
            };
        } else if (p.targetEntityId) {
            return {
                idx: p.id,
                property: p.property,
                tgtEntity: {
                    "@id": p.targetEntity.eid,
                    "@type": assembleEntityType(p.targetEntity.etype),
                    name: p.targetEntity.name,
                    associations: [],
                },
            };
        }
    });
    properties = groupBy(properties, "property");
    for (let property of Object.keys(properties)) {
        properties[property] = properties[property].map((p) => {
            delete p.property;
            return p;
        });
    }
    e["@properties"] = properties;
    return e;
}

async function assembleEntityReverseConnections({ entity }) {
    let reverse = await models.property.findAll({
        where: { targetEntityId: entity.id },
        include: [
            {
                model: models.entity,
                include: [{ model: models.type, as: "etype", order: [["createdAt", "ASC"]] }],
            },
        ],
    });
    reverse = reverse.map((p) => {
        return {
            property: p.property,
            "@id": p.entity.eid,
            "@type": assembleEntityType(p.entity.etype),
            name: p.entity.name,
        };
    });
    reverse = groupBy(reverse, "property");
    for (let property of Object.keys(reverse)) {
        reverse[property] = reverse[property].map((p) => {
            delete p.property;
            return p;
        });
    }
    return reverse;
}

function assembleEntityType(types) {
    types = types.map((t) => ({ name: t.name, order: t.entity_types.order }));
    types = orderBy(types, "order");
    types = types.map((t) => t.name);
    return types;
}

// TODO this code does not have tests yet
// async function loadEntity(req) {
//     console.time(`entity load time: ${req.params.entityId}`);
//     let entity = await getEntity({
//         id: req.params.entityId,
//         collectionId: req.session.collection.id,
//     });
//     const reverseConnections = cloneDeep(entity.reverseConnections);
//     let properties = {};
//     for (let p of entity.properties) properties[p.property] = [];
//     for (let p of entity.properties) {
//         if (p.value)
//             properties[p.property].push({
//                 propertyId: p.id,
//                 srcEntityId: p.entityId,
//                 property: p.property,
//                 value: p.value,
//             });
//         if (p.valueStringified)
//             properties[p.property].push({
//                 propertyId: p.id,
//                 srcEntityId: p.entityId,
//                 property: p.property,
//                 value: JSON.parse(p.value),
//             });
//         if (p.targetEntity) {
//             const tgtEntity = {
//                 describoId: p.targetEntity.id,
//                 "@id": p.targetEntity.eid,
//                 "@type": p.targetEntity.etype.map((type) => type.name).join(", "),
//                 name: p.targetEntity.name,
//                 associations: [],
//             };
//             const typesToResolve = Object.keys(profile.resolve);
//             const type = tgtEntity["@type"]?.split(",").map((t) => t.trim());
//             const specificTypesToResolve = intersection(typesToResolve, type);

//             let associations = [];
//             for (let type of specificTypesToResolve) {
//                 const propertiesToResolve = profile.resolve[type];
//                 let e = await getEntity({
//                     id: tgtEntity.describoId,
//                     collectionId: req.session.collection.id,
//                 });
//                 let properties = e.properties;
//                 for (let entityProperty of properties) {
//                     if (propertiesToResolve.includes(entityProperty.property)) {
//                         let entity = await getEntity({
//                             id: entityProperty.targetEntityId,
//                             collectionId: req.session.collection.id,
//                             withProperties: false,
//                         });
//                         associations.push({
//                             property: entityProperty.property,
//                             entity: {
//                                 describoId: entity.id,
//                                 "@id": entity.eid,
//                                 "@type": entity.etype.map((type) => type.name).join(", "),
//                                 name: entity.name,
//                             },
//                         });
//                     }
//                 }
//             }
//             tgtEntity.associations = associations;
//             properties[p.property].push({
//                 propertyId: p.id,
//                 srcEntityId: p.entityId,
//                 property: p.property,
//                 tgtEntityId: p.targetEntityId,
//                 tgtEntity,
//             });
//         }
//     }
//     let entityData = entity.get();
//     delete entityData.properties;
//     entityData = {
//         describoId: entity.id,
//         "@id": entity.eid,
//         "@type": entity.etype.map((type) => type.name),
//         name: entity.name,
//         properties,
//         reverseConnections: groupBy(reverseConnections, "property"),
//     };
//     console.timeEnd(`entity load time: ${req.params.entityId}`);
//     return { entity: entityData };
// }

// TODO this code does not have tests yet
// async function createEntityHandler(req) {
//     let { entity, property } = req.body;

//     // create the new entity
//     entity = await this.models.entity.findOrCreate({
//         where: {
//             collectionId: req.session.collection.id,
//             eid: entity["@id"],
//         },
//         defaults: {
//             entityId: req.params.entityId,
//             collectionId: req.session.collection.id,
//             eid: entity["@id"],
//             etype: concat(entity["@type"]),
//             name: entity.name,
//         },
//     });
//     entity = entity[0];

//     // associate it to the parent entity
//     await this.models.property.create({
//         property: property,
//         collectionId: req.session.collection.id,
//         entityId: req.params.entityId,
//         targetEntityId: entity.id,
//     });
// }

// TODO this code does not have tests yet
// async function deleteEntityHandler(req) {
//     // delete the new entity
//     await this.models.entity.destroy({
//         where: {
//             collectionId: req.session.collection.id,
//             id: req.params.entityId,
//         },
//     });
// }

// TODO this code does not have tests yet
// async function updateEntityHandler(req) {
//     let entity = await this.models.entity.findOne({
//         where: { id: req.params.entityId, collectionId: req.session.collection.id },
//     });
//     if (req.body.name) entity.name = req.body.name;
//     if (req.body["@id"]) entity.eid = req.body["@id"];
//     await entity.save();
// }

// TODO this code does not have tests yet
// async function addPropertyHandler(req) {
//     await this.models.property.create({
//         property: req.body.property,
//         collectionId: req.session.collection.id,
//         entityId: req.params.entityId,
//         value: req.body.value,
//     });
// }

// TODO this code does not have tests yet
// async function updatePropertyHandler(req) {
//     let property = await this.models.property.findOne({
//         where: { id: req.params.propertyId, collectionId: req.session.collection.id },
//     });
//     property.value = req.body.value;
//     await property.save();
// }

// TODO this code does not have tests yet
// async function deletePropertyHandler(req) {
//     let property = await this.models.property.findOne({
//         where: { id: req.params.propertyId, collectionId: req.session.collection.id },
//     });
//     if (property?.targetEntityId) {
//         let count = await this.models.property.count({
//             where: { targetEntityId: property.targetEntityId },
//         });
//         if (count <= 1) {
//             await this.models.entity.destroy({ where: { id: property.targetEntityId } });
//         }
//     }
//     await property.destroy();
// }

// function asArray(value) {
//     return !isArray(value) ? [value] : value;
// }

// function concat(value) {
//     return asArray(value).join(", ");
// }
