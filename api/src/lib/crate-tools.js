// import { specialFiles } from "../common/index.js";
import path from "path";
import mime from "mime-types";
import lodashPkg from "lodash";
const {
    difference,
    isString,
    isNumber,
    isArray,
    isBoolean,
    isEqual,
    isUndefined,
    isEmpty,
    groupBy,
    chunk,
    round,
} = lodashPkg;
import validatorPkg from "validator";
const { isURL: validatorIsURL } = validatorPkg;
// import validateIriPkg from "validate-iri";
import validateIriPkg from "./validate-iri.js";
import models from "../models/index.js";
import { v4 as uuidv4 } from "uuid";
const urlProtocols = ["http", "https", "ftp", "ftps"];

// TODO: this code does not have tests
export async function registerAllFiles({ store, crate }) {
    // get list of files in the bucket
    let files = (await store.listResources()).filter((file) => {
        return !specialFiles.includes(file.Key);
    });
    files = files.filter((file) => !file.Key.match(/^\./));
    if (!files.length) return crate;

    // determine which files not already registered in the crate
    const filesInBucket = files.map((file) => file.Key);
    const filesInCrate = crate["@graph"]
        .filter((entity) => entity["@type"] === "File")
        .map((entity) => entity["@id"]);
    const filesToAdd = difference(filesInBucket, filesInCrate);

    // add an entry for each missing file
    for (let file of filesToAdd) {
        file = files.filter((f) => f.Key === file)[0];
        let entity = {
            "@id": file.Key,
            "@type": "File",
            name: file.Key,
            contentSize: file.Size,
            dateModified: file.LastModified,
            "@reverse": {
                hasPart: [{ "@id": "./" }],
            },
        };
        crate.addEntity(entity);
        let parts = crate.rootDataset.hasPart;
        parts.push({ "@id": entity["@id"] });
        crate.rootDataset.hasPart = parts;
    }

    // set the mimetype on all files in the crate
    let entities = crate.entities();
    for (let entity of entities) {
        if (crate.hasType(entity, "File")) {
            entity = { encodingFormat: getMimeType(entity["@id"]), ...entity };
            crate.addEntity(entity, true);
        }
    }

    // upload the new crate file
    return crate;

    function getMimeType(filename) {
        let mimetype = mime.lookup(filename);
        if (!mimetype) {
            switch (path.extname(filename)) {
                case "eaf":
                case "flextext":
                case "trs":
                case "ixt":
                    mimetype = "applcation/xml";
            }
        }
        return mimetype;
    }
}

export function getContext() {
    return [
        "https://w3id.org/ro/crate/1.1/context",
        "http://purl.archive.org/language-data-commons/context.json",
        {
            "@vocab": "http://schema.org/",
        },
        {
            "@base": null,
        },
    ];
}

export async function loadCrateIntoDatabase({ crate, collectionId, io, clientId }) {
    function message({ text, data, percent }) {
        if (io && clientId) {
            io.to(clientId).emit("load-collection-data", {
                msg: { text, data, percent },
                date: new Date(),
            });
        }
    }
    let entityCount = await models.entity.count({
        where: { collectionId },
    });
    if (entityCount !== 0) {
        message({ text: `The collection is not empty so that crate can't be loaded into it` });
        return;
    }

    message({ text: `Preparing the data inserts` });
    let { errors, entityInserts, entityTypeInserts, propertyInserts } = await prepareDataInserts({
        collectionId,
        crate,
    });
    if (errors) {
        console.log("errors", errors);
        message(`There are problems with that RO Crate. It can't be loaded`);
        return;
    }

    // console.log("entityInserts", entityInserts);
    // console.log("entityTypeInserts", entityTypeInserts);
    // console.log("propertyInserts", propertyInserts);

    message({ text: `Inserting the crate data into the database` });
    let totalInserts = entityInserts.length + entityTypeInserts.length + propertyInserts.length;
    let recordsInserted = 0;
    let percent = 0;

    let chunkSize = getChunkSize(entityInserts);
    // insert entity records
    for (let records of chunk(entityInserts, chunkSize)) {
        try {
            await models.entity.bulkCreate(records, {});
        } catch (error) {
            for (records of chunk(records, 10)) {
                try {
                    await models.entity.bulkCreate(records, {});
                } catch (error) {
                    console.log(records);
                }
            }
            continue;
        }
        recordsInserted += records.length;
        percent = round((recordsInserted / totalInserts) * 100, 0);
        message({ percent });
    }

    // create entity -> type associations
    chunkSize = getChunkSize(entityTypeInserts);
    for (let records of chunk(entityTypeInserts, chunkSize)) {
        try {
            await models.entity_types.bulkCreate(records, {});
        } catch (error) {
            for (records of chunk(records, 10)) {
                try {
                    await models.entity_types.bulkCreate(records, {});
                } catch (error) {
                    console.log(records);
                }
            }
            continue;
        }
        recordsInserted += records.length;
        percent = round((recordsInserted / totalInserts) * 100, 0);
        message({ percent });
    }

    //  insert property records
    chunkSize = getChunkSize(propertyInserts);
    for (let records of chunk(propertyInserts, chunkSize)) {
        try {
            await models.property.bulkCreate(records);
        } catch (error) {
            for (records of chunk(records, 10)) {
                try {
                    await models.property.bulkCreate(records, {});
                } catch (error) {
                    console.log(records);
                }
            }
            continue;
        }
        recordsInserted += records.length;
        percent = round((recordsInserted / totalInserts) * 100, 0);
        message({ percent });
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    message({ text: `The crate has been loaded into the database` });

    function getChunkSize(inserts) {
        // let chunkSize = 100;
        // if (inserts.length < 10000) {
        //     chunkSize = 5000;
        // } else if (inserts.length < 100000) {
        //     chunkSize = 20000;
        // } else if (inserts.length < 1000000) {
        //     chunkSize = 50000;
        // } else {
        //     chunkSize = 50000;
        // }
        let chunkSize = 5000;
        return chunkSize;
    }
}

async function prepareDataInserts({ collectionId, crate }) {
    let rootDescriptorIdentifier;
    let errors = [];
    let entities = [];
    let types = {
        Thing: true,
        URL: "true",
    };
    for (let i = 0; i < crate["@graph"].length; i++) {
        let entity = crate["@graph"][i];

        if (entity["@id"] === "ro-crate-metadata.json") {
            //  store the original root descriptor id so we can identify the root dataset later
            rootDescriptorIdentifier = entity.about["@id"];

            // and update the root descriptor with the expected id
            entity.about["@id"] = "./";
        }

        // confirm a type is defined
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

        entity = normalise(entity, `e${uuidv4()}`);
        // entity = confirmNoClash(entity);

        // set all properties as array
        for (let property of Object.keys(entity)) {
            if (["@id", "name", "@reverse"].includes(property)) continue;
            entity[property] = asArray(entity[property]);
            if (property === "@type") {
                entity["@type"].forEach((type) => (types[type] = true));
            }
        }
        entities.push(entity);
    }
    if (errors.length) {
        return { errors };
    }
    // console.log("entities", JSON.stringify(entities, null, 2));

    let typeInserts = Object.keys(types).map((type) => {
        return {
            id: uuidv4(),
            name: type,
            collectionId,
        };
    });
    types = await models.type.bulkCreate(typeInserts);
    types = types.map((t) => t.get());
    types = groupBy(types, "name");
    for (let type of Object.keys(types)) {
        types[type] = types[type][0];
    }

    // preparing the bulk inserts
    let mapAtIdToEntityUUID = {};
    let entityInserts = [];
    let entityTypeInserts = [];
    for (let entity of entities) {
        if (entity["@id"] === rootDescriptorIdentifier) {
            entity["@id"] = "./";
        }

        // prepare the entity inserts
        const id = uuidv4();
        entityInserts.push({
            id,
            eid: entity["@id"],
            name: entity?.name,
            collectionId,
        });
        mapAtIdToEntityUUID[entity["@id"]] = id;

        // prepare the entity -> type inserts
        for (let [index, type] of entity["@type"].entries()) {
            entityTypeInserts.push({
                entityId: mapAtIdToEntityUUID[entity["@id"]],
                typeId: types[type].id,
                order: index,
            });
        }
    }

    //  prepare the property inserts
    let propertyInserts = [];
    for (let entity of entities) {
        for (let property of Object.keys(entity)) {
            if (["@id", "@type", "name", "@reverse"].includes(property)) continue;
            // console.log(entity["@id"], property, entity[property]);

            for (let instance of entity[property]) {
                if (instance?.["@id"]) {
                    let targetEntityId = mapAtIdToEntityUUID[instance["@id"]];

                    if (targetEntityId) {
                        propertyInserts.push({
                            id: uuidv4(),
                            property,
                            entityId: mapAtIdToEntityUUID[entity["@id"]],
                            targetEntityId: mapAtIdToEntityUUID[instance["@id"]],
                            collectionId,
                        });
                    } else {
                        // a link to something not defined in the crate
                        //   typically this is a URL pointing to a resource outside of the crate

                        // create the target entity
                        const id = uuidv4();
                        entityInserts.push({
                            id,
                            eid: instance["@id"],
                            name: instance["@id"],
                            collectionId,
                        });
                        mapAtIdToEntityUUID[instance["@id"]] = id;
                        const type = isURL(instance["@id"]) ? "URL" : "Thing";
                        entityTypeInserts.push({
                            entityId: id,
                            typeId: types[type].id,
                            order: 0,
                        });

                        // and then link it
                        propertyInserts.push({
                            id: uuidv4(),
                            property,
                            entityId: mapAtIdToEntityUUID[entity["@id"]],
                            targetEntityId: id,
                            collectionId,
                        });
                    }
                } else {
                    // string data of some sort
                    propertyInserts.push({
                        id: uuidv4(),
                        property,
                        entityId: mapAtIdToEntityUUID[entity["@id"]],
                        value: instance,
                        collectionId,
                    });
                }
            }
        }
    }
    // console.log(entityInserts);
    // console.log(typeInserts);
    // console.log(entityTypeInserts);
    // console.log(propertyInserts);

    return { entityInserts, entityTypeInserts, propertyInserts };
}

export function createDefaultROCrateFile({ name }) {
    return {
        "@context": getContext(),
        "@graph": [
            {
                "@id": "ro-crate-metadata.json",
                "@type": "CreativeWork",
                conformsTo: {
                    "@id": "https://w3id.org/ro/crate/1.1/context",
                },
                about: {
                    "@id": "./",
                },
            },
            {
                "@id": "./",
                "@type": "Dataset",
                name: name,
            },
        ],
    };
}

export function isMatchingEntity(source, target) {
    if (!source || !target) return false;
    let sourceType = asArray(source["@type"]).sort();
    let targetType = asArray(target["@type"]).sort();
    return source["@id"] === target["@id"] && isEqual(sourceType, targetType);
}

export function isURL(value) {
    if (!value) return false;
    if (isNumber(value)) return false;
    if (isBoolean(value)) return false;
    if (value.match(/arcp:\/\/name,.*/)) return true;
    if (value.match(/arcp:\/\/uuid,.*/)) return true;
    if (value.match(/arcp:\/\/ni,sha-256;,.*/)) return true;
    return validatorIsURL(value, {
        require_protocol: true,
        protocols: urlProtocols,
    });
}

export function validateId({ id, type }) {
    if (!id) {
        return { isValid: false };
    }
    if (type) {
        // if type matches File then whatever is provided is valid
        type = isArray(type) ? type.join(", ") : type;
        if (type.match(/file/i)) return { isValid: true };
    }

    // @id is the ro crate root descriptor
    if (id === "ro-crate-metadata.json") return { isValid: true };

    // @id is relative
    if (id.match(/^\/.*/)) return { isValid: true };

    // @id starting with . is valid
    if (id.match(/^\..*/)) return { isValid: true };

    // @id starting with # is valid
    if (id.match(/^\#.*/)) return { isValid: true };

    // @id with blank node is valid
    if (id.match(/^\_:.*/)) return { isValid: true };

    // arcp URI's are valid
    if (id.match(/arcp:\/\/name,.*/)) return { isValid: true };
    if (id.match(/arcp:\/\/uuid,.*/)) return { isValid: true };
    if (id.match(/arcp:\/\/ni,sha-256;,.*/)) return { isValid: true };

    // otherwise check that the id is a valid IRI
    let result = validateIriPkg.validateIri(id, validateIriPkg.IriValidationStrategy.Strict);
    if (!result) {
        // it's valid
        return { isValid: true };
    } else if (result?.message?.match(/Invalid IRI according to RFC 3987:/)) {
        // otherwise
        const message = `${result.message.replace(
            /Invalid IRI according to RFC 3987:/,
            "Invalid identifier"
        )}. See https://github.com/describo/crate-builder-component/blob/master/README.identifiers.md for more information.`;
        return { isValid: false, message };
    }
}

export function normalise(entity, id) {
    if (!isString(entity["@type"]) && !isArray(entity["@type"]) && !isUndefined(entity["@type"])) {
        throw new Error(`'@type' property must be a string or an array or not defined at all`);
    }
    if (isUndefined(entity["@id"])) {
        // set it to the generated id
        entity["@id"] = `#${id}`;
    } else if (!isString(entity["@id"])) {
        throw new Error(`'@id' property must be a string`);
    }

    //  normalise the entity['@type']
    entity = normaliseEntityType({ entity });

    // there is an @id - is it valid?
    let { isValid } = validateId({ id: entity["@id"], type: entity["@type"] });
    if (!isValid) entity["@id"] = `#${encodeURIComponent(entity["@id"])}`;

    // is there a name?
    if (!entity.name) entity.name = entity["@id"].replace(/^#/, "");

    // if the name is an array join it back into a string
    if (isArray(entity.name)) entity.name = entity.name.join(" ");

    return entity;
}

export function normaliseEntityType({ entity }) {
    if (!entity["@type"]) entity["@type"] = isURL(entity["@id"]) ? ["URL"] : ["Thing"];

    if (isArray(entity["@type"])) return entity;
    if (isBoolean(entity["@type"] || isNumber(entity["@type"]))) {
        entity["@type"] = ["" + entity["@type"]];
    }
    if (isString(entity["@type"]))
        entity["@type"] = entity["@type"].split(",").map((t) => t.trim());
    return entity;
}

function asArray(value) {
    return !isArray(value) ? [value] : value;
}

function concat(value) {
    return asArray(value).join(", ");
}
