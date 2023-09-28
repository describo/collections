import { demandAuthenticatedUser } from "../common/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import sequelize from "sequelize";
import { Op } from "sequelize";
import models from "../models/index.js";
import profile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
import lodashPkg from "lodash";
const { orderBy, groupBy, intersection, isArray, flattenDeep, uniqBy } = lodashPkg;
import { validateId } from "../lib/crate-tools.js";

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

export async function loadEntity({
    collectionId,
    profile,
    id,
    stub = false,
    resolveLinkedEntityAssociations = true,
}) {
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
    entity.etype = orderBy(entity.etype, (e) => e.entity_types.updatedAt);

    // if we need just a stub entry then return it here
    if (stub) {
        return {
            id: entity.id,
            "@id": entity.eid,
            "@type": entity.etype.map((t) => t.name),
            name: entity.name,
        };
    }

    // otherwise, fully reconstruct the entity along with the associations
    try {
        let reverse = await assembleEntityReverseConnections({ entity });
        entity = assembleEntity({ collectionId, entity, profile });
        if (resolveLinkedEntityAssociations && id !== "./") {
            console.log("resolve associations");
            await resolveAssociations({ collectionId, entity, profile });
        }
        entity["@reverse"] = reverse;
        return entity;
    } catch (error) {
        console.log(error);
        return {};
    }
}

function assembleEntity({ entity }) {
    let e = {
        id: entity.id,
        "@id": entity.eid,
        "@type": assembleEntityType(entity.etype),
        name: entity.name,
    };
    let properties = [];
    for (let p of entity.properties) {
        if (p?.value) {
            properties.push({
                idx: p.id,
                property: p.property,
                value: p.value,
                createdAt: p.createdAt,
            });
        } else if (p.targetEntityId) {
            const tgtEntity = {
                "@id": p.targetEntity.eid,
                "@type": assembleEntityType(p.targetEntity.etype),
                name: p.targetEntity.name,
                associations: [],
            };
            properties.push({
                idx: p.id,
                property: p.property,
                tgtEntity,
                createdAt: p.createdAt,
            });
        }
    }
    properties = orderBy(properties, "createdAt", "desc ");
    properties = groupBy(properties, "property");
    for (let property of Object.keys(properties)) {
        properties[property] = properties[property].map((p) => {
            // delete p.property;
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

async function resolveAssociations({ collectionId, entity, profile }) {
    // associations
    // {
    //     "property": "source",
    //     "entity": {
    //     "@id": "#person1",
    //     "@type": [
    //         "Person"
    //     ],
    //     "name": "person1",
    //     "associations": []
    //     }
    // },
    let resolveConfiguration = profile?.resolve;
    if (!resolveConfiguration) return;
    const resolvers = {};
    resolveConfiguration.forEach((c) => {
        c.types.forEach((type) => {
            resolvers[type] = c.properties;
        });
    });
    const typesToResolve = Object.keys(resolvers);

    // get the entity data from the db
    for (let property of Object.keys(entity["@properties"])) {
        for (let instance of entity["@properties"][property]) {
            if (!instance.tgtEntity) continue;

            // for all entities linked off the source entity
            //   if the type matches the `resolveConfiguration`
            const specificTypesToResolve = intersection(
                typesToResolve,
                instance.tgtEntity["@type"]
            );
            const resolveAssociations = specificTypesToResolve.length > 0;
            if (resolveAssociations) {
                // lookup the full entity
                let instanceFullEntity = await loadEntity({
                    collectionId,
                    id: instance.tgtEntity["@id"],
                    profile,
                    resolveLinkedEntityAssociations: false,
                });
                const propertiesToResolve = flattenDeep(
                    specificTypesToResolve.map((type) => resolvers[type])
                );
                // for each property, resolve all the attached entities
                //  and store in the associations array on the source
                let associations = [];
                propertiesToResolve.forEach((property) => {
                    associations.push(
                        ...instanceFullEntity["@properties"][property].map((e) => ({
                            property,
                            entity: e.tgtEntity,
                        }))
                    );
                });
                instance.tgtEntity.associations = uniqBy(associations, (e) => e.entity["@id"]);
            }
        }
    }
}

// TODO none of this is tested yet
export async function createEntity({ collectionId, entity }) {
    let entityModel = await models.entity.findOrCreate({
        where: {
            collectionId,
            eid: entity["@id"],
        },
        defaults: {
            collectionId,
            eid: entity["@id"],
            name: entity.name,
        },
    });
    entityModel = entityModel[0];

    let types = asArray(entity["@type"]);
    for (let type of types) {
        type = await models.type.findOrCreate({
            where: { collectionId, name: type },
            defaults: {
                collectionId,
                name: type,
            },
        });
        type = type[0];
        await entityModel.addEtype(type);
    }
    return entityModel;
}

export async function linkEntities({ collectionId, sourceEntity, property, targetEntity }) {
    if (!sourceEntity.id || !property || !targetEntity.id) {
        throw new Error(`'linkEntities' missing required params`);
    }
    property = await models.property.create({
        property: property,
        collectionId,
        entityId: sourceEntity.id,
        targetEntityId: targetEntity.id,
    });
}

export async function deleteEntity({ collectionId, entityId }) {
    // delete the new entity
    await models.entity.destroy({
        where: {
            collectionId,
            eid: entityId,
        },
    });
    return {};
}

export async function updateEntity({
    collectionId,
    entityId,
    name = undefined,
    id = undefined,
    type = undefined,
}) {
    let entity = await models.entity.findOne({
        where: { eid: entityId, collectionId },
        include: [{ model: models.type, as: "etype" }],
    });
    entity["@type"] = entity.etype.map((t) => t.name);

    if (name) {
        entity.name = name;
        await entity.save();
    } else if (id) {
        let { isValid } = validateId({ id, type: entity["@type"] });
        if (!isValid) id = `#${encodeURIComponent(id)}`;
        entity.eid = id;
        await entity.save();
    } else if (type) {
        // remove all existing type associations
        for (let type of entity.etype) {
            await entity.removeEtype(type);
        }

        // create the new state
        for (let t of asArray(type)) {
            let typeModel = await models.type.findOne({ where: { name: t } });
            if (!typeModel) {
                typeModel = await models.type.create({ name: t, collectionId });
            }
            await entity.addEtype(typeModel);
        }
    }

    return { entity: { "@id": entity.eid } };
}

export async function createProperty({ collectionId, entityId, property, value }) {
    const entity = await models.entity.findOne({ where: { collectionId, eid: entityId } });
    property = await models.property.create({
        property,
        value,
        collectionId,
        entityId: entity.id,
    });
    return {};
}

export async function updateProperty({ collectionId, propertyId, value }) {
    let property = await models.property.findOne({
        where: { id: propertyId, collectionId },
    });
    property.value = value;
    await property.save();
    return {};
}

export async function deleteProperty({ collectionId, propertyId }) {
    let property = await models.property.findOne({
        where: { id: propertyId, collectionId },
    });
    // if by deleting this property we end up with a dangling entity
    //   do we automatically delete that entity or leave it lying around?
    //   need to think about this some more
    // if (property?.targetEntityId) {
    //     let count = await this.models.property.count({
    //         where: { targetEntityId: property.targetEntityId },
    //     });
    //     if (count <= 1) {
    //         await this.models.entity.destroy({ where: { id: property.targetEntityId } });
    //     }
    // }
    await property.destroy();
    return {};
}

function asArray(value) {
    return !isArray(value) ? [value] : value;
}
