import { demandAuthenticatedUser } from "../common/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import sequelize from "sequelize";
import { Op } from "sequelize";
import models from "../models/index.js";
import profile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
import lodashPkg from "lodash";
const { orderBy, groupBy, intersection, flattenDeep } = lodashPkg;

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
    resolveLinkedEntityAssociations = false,
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
            "@id": entity.eid,
            "@type": entity.etype.map((t) => t.name),
            name: entity.name,
        };
    }

    // otherwise, fully reconstruct the entity along with the associations
    try {
        let reverse = await assembleEntityReverseConnections({ entity });
        entity = assembleEntity({ collectionId, entity, profile });
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

async function resolveLinkedEntityAssociations({ collectionId, entity, profile }) {
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

    // console.log(query);

    // get the entity data from the db
    for (let property of Object.keys(entity["@properties"])) {
        for (let instance of entity["@properties"][property]) {
            if (!instance.tgtEntity) return instance;

            // for all entities linked of the source entity
            //   if the type matches the `resolveConfiguration`
            const specificTypesToResolve = intersection(
                typesToResolve,
                instance.tgtEntity["@type"]
            );
            const resolveAssociations = specificTypesToResolve.length > 0;
            if (resolveAssociations) {
                // lookup the full entity
                // let instanceFullEntity = this.getEntity({
                //     id: instance.tgtEntity["@id"],
                //     resolveLinkedEntityAssociations: false,
                // });
                // let instanceFullEntity = await models.entity.findOne({
                //     where: { eid: instance.tgtEntity["@id"], collectionId },
                //     include: [
                //         {
                //             model: models.type,
                //             as: "etype",
                //         },
                //     ],
                // });
                // // get the list of properties to resolve
                // const propertiesToResolve = flattenDeep(
                //     specificTypesToResolve.map((type) => resolvers[type])
                // );
                // // for each property, resolve all the attached entities
                // //  and store in the associations array on the source
                // propertiesToResolve.forEach((property) => {
                //     instance.tgtEntity.associations.push(
                //         ...instanceFullEntity["@properties"][property].map((e) => ({
                //             property,
                //             entity: e.tgtEntity,
                //         }))
                //     );
                // });
            }
            return instance;
        }
    }
}
