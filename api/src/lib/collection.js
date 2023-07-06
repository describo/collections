import { demandAuthenticatedUser } from "../common/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import { Op } from "sequelize";
import models from "../models/index.js";
import lodashPkg from "lodash";
import profile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
const { isArray, intersection, cloneDeep, isPlainObject, isString, chunk, groupBy } = lodashPkg;

// TODO: this code does not have tests yet
// async function requireCollectionAccess(req, res) {
//     let collection = await models.collection.findOne({
//         where: { id: req.params.collectionId },
//         include: [{ model: models.user, where: { id: req.session.user.id }, attributes: [] }],
//     });
//     if (!collection) {
//         return res.forbidden(`You don't have permission to access this endpoint`);
//     }
//     req.session.collection = collection;
// }

// TODO this code does not have tests yet
// async function getCollectionsHandler(req) {
//     let { limit, offset } = req.query;
//     limit = limit ?? 10;
//     offset = offset ?? 0;
//     let { rows: collections, count: total } = await models.collection.findAndCountAll({
//         attributes: ["id", "name", "code"],
//         include: [{ model: models.user, where: { id: req.session.user.id }, attributes: [] }],
//         limit,
//         offset,
//     });
//     return { collections: collections.map((c) => c.get()), total };
// }

// TODO this code does not have tests yet
// async function getCollectionProfileHandler(req) {
//     let collection = await models.collection.findOne({ where: { id: req.session.collection.id } });
//     return { profile: collection.profile ?? {} };
// }

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

// async function getEntity({ id, collectionId, withProperties = true }) {
//     const query = {
//         where: {
//             [Op.and]: [
//                 {
//                     [Op.or]: [{ id }, { label: id }],
//                 },
//                 {
//                     collectionId,
//                 },
//             ],
//         },
//         include: [
//             {
//                 model: models.type,
//                 as: "etype",
//             },
//         ],
//     };
//     if (withProperties) {
//         query.include.push({
//             required: false,
//             where: { entityId: id },
//             model: models.property,
//             include: [
//                 {
//                     model: models.entity,
//                     as: "targetEntity",
//                     include: [{ model: models.type, as: "etype" }],
//                 },
//             ],
//         });
//     }

//     let entity = await models.entity.findOne(query);
//     if (withProperties) {
//         let reverse = await models.property.findAll({
//             where: { targetEntityId: id },
//             include: [{ model: models.entity }],
//         });
//         entity.reverseConnections = reverse.map((r) => {
//             return {
//                 property: r.property,
//                 propertyId: r.id,
//                 srcEntityId: r.entityId,
//                 tgtEntityId: r.targetEntityId,
//                 tgtEntity: r.entity.get(),
//             };
//         });
//     }
//     return entity;
// }

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
