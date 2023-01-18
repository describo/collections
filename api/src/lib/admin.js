import {
    listObjects,
    demandAdministrator,
    demandAuthenticatedUser,
    getStoreHandle,
    getS3Handle,
    authorisedUsersFile,
} from "../common/index.js";
import { lookupItemByIdentifier, linkItemToUser } from "../lib/item.js";
import { lookupCollectionByIdentifier, linkCollectionToUser } from "../lib/collection.js";
import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import lodashPkg from "lodash";
const { groupBy } = lodashPkg;
import { ROCrate } from "ro-crate";
import { getContext } from "../lib/crate-tools.js";
import path from "path";

export async function getAdminItems({ user, prefix, offset }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    if (!offset) offset = 0;
    const limit = 10;

    let where = {};
    if (prefix) {
        where.identifier = {
            [Op.startsWith]: prefix,
        };
    }
    let myItems = await models.item.findAll({
        where,
        include: [{ model: models.user, where: { id: user.id } }],
        attributes: ["identifier"],
        raw: true,
    });
    myItems = groupBy(myItems, "identifier");

    let { count, rows: items } = await models.item.findAndCountAll({
        where,
        offset,
        limit,
        order: [[seqFn("lower", seqCol("identifier")), "ASC"]],
        attributes: ["identifier"],
        raw: true,
    });

    items = items.map((i) => ({ ...i, connected: myItems[i.identifier]?.length ? true : false }));
    return { items, total: count };
}

export async function getAdminCollections({ user, prefix, offset }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    if (!offset) offset = 0;
    const limit = 10;

    let where = {};
    if (prefix) {
        where.identifier = {
            [Op.startsWith]: prefix,
        };
    }
    let myCollections = await models.collection.findAll({
        where,
        include: [{ model: models.user, where: { id: user.id } }],
        attributes: ["identifier"],
        raw: true,
    });
    myCollections = groupBy(myCollections, "identifier");

    let { count, rows: collections } = await models.collection.findAndCountAll({
        where,
        offset,
        limit,
        order: [[seqFn("lower", seqCol("identifier")), "ASC"]],
        attributes: ["identifier"],
        raw: true,
    });

    collections = collections.map((i) => ({
        ...i,
        connected: myCollections[i.identifier]?.length ? true : false,
    }));
    return { collections, total: count };
}

export async function importItemsFromStorageIntoTheDb({ user, configuration }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let items =
        (await listObjects({ prefix: `/${configuration.api.domain}/workspace/item` })) || [];
    items = items.map((i) => ({ identifier: i }));

    // insert any items found on the backend storage not already in the DB
    for (let item of items) {
        await models.item.findOrCreate({
            where: { identifier: item.identifier },
        });
    }

    // ensure all existing items and collections have a publicationStatus
    await models.item.update(
        { publicationStatus: "inProgress" },
        { where: { publicationStatus: null } }
    );
    return {};
}

export async function importCollectionsFromStorageIntoTheDb({ user, configuration }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let collections =
        (await listObjects({ prefix: `/${configuration.api.domain}/workspace/collection` })) || [];
    collections = collections.map((i) => ({ identifier: i }));

    // insert any collections found on the backend storage not already in the DB
    for (let collection of collections) {
        await models.collection.findOrCreate({
            where: { identifier: collection.identifier },
        });
    }

    // ensure all existing items and collections have a publicationStatus
    await models.collection.update(
        { publicationStatus: "inProgress" },
        { where: { publicationStatus: null } }
    );
    return {};
}

export async function connectAdminToItem({ identifier, user }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let item = await lookupItemByIdentifier({ identifier: identifier });
    await linkItemToUser({ itemId: item.id, userId: user.id });
    return {};
}

export async function connectAdminToCollection({ identifier, user }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let collection = await lookupCollectionByIdentifier({ identifier: identifier });
    await linkCollectionToUser({ collectionId: collection.id, userId: user.id });
    return {};
}

export async function getItemsAwaitingReview({ user }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let items = await models.item.findAll({
        where: { publicationStatus: "awaitingReview" },
        attributes: ["identifier", "publicationStatus", "publicationStatusLogs"],
    });
    if (items) {
        items = items.map((item) => item.get());
        return { items };
    } else {
        return [];
    }
}

export async function getCollectionsAwaitingReview({ user }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let collections = await models.collection.findAll({
        where: { publicationStatus: "awaitingReview" },
        attributes: ["identifier", "publicationStatus", "publicationStatusLogs"],
    });
    if (collections) {
        collections = collections.map((collection) => collection.get());
        return { collections };
    } else {
        return [];
    }
}

export async function publishObject({ user, type, identifier, configuration }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    const className = type === "items" ? "item" : "collection";
    let store = await getStoreHandle({
        id: identifier,
        className,
    });

    let crate;
    try {
        crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });
    } catch (error) {
        console.log("**", error);
        throw new Error(`Error getting / handling RO Crate file`);
    }

    let licence;
    if (className === "collection") {
        const collection = await lookupCollectionByIdentifier({ identifier });
        collection.publicationStatus = "published";
        await collection.save();

        // write the metadata into the crate
        licence = {
            "@id": configuration.api.licence,
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: [
                { "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms" },
            ],
        };
    } else if (className === "item") {
        const item = await lookupItemByIdentifier({ identifier });
        item.publicationStatus = "published";
        await item.save();

        licence = {
            "@id": configuration.api.licence,
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: [
                { "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms" },
            ],
        };
        if (item.accessType === "restricted") {
            licence.description = item.accessNarrative.text;
            licence.restrictedUntil = item.accessNarrative?.restrictedUntil;
            licence.access = {
                "@id": "http://purl.archive.org/language-data-commons/terms#AuthorizedAccess",
            };
            licence.authorizationWorkflow.push({
                "@id": "http://purl.archive.org/language-data-commons/terms#AccessControlList",
            });
            licence.accessControlList = `file://${authorisedUsersFile}`;
        }
    }

    if (crate.getEntity(licence["@id"])) crate.deleteEntity(licence["@id"]);
    crate.addEntity(licence);
    crate.rootDataset.licence = licence;
    crate = crate.toJSON();
    crate["@context"] = getContext();
    await store.put({ target: "ro-crate-metadata.json", json: crate });
    await store.put({
        target: configuration.api.licence,
        localPath: path.join(`/srv/configuration/${configuration.api.licence}`),
        registerFile: false,
    });

    return {};
}

export async function objectRequiresMoreWork({ user, type, identifier }) {
    const className = type === "items" ? "item" : "collection";

    if (className === "collection") {
        const collection = await lookupCollectionByIdentifier({ identifier });
        collection.publicationStatus = "needsWork";
        await collection.save();
    } else if (className === "item") {
        const item = await lookupItemByIdentifier({ identifier });
        item.publicationStatus = "needsWork";
        await item.save();
    }
}

async function migrateBackend(req) {
    console.log("migrate backend not implemented");
    // console.log("migrate backend storage");
    // let { bucket } = await getS3Handle();
    // await migrate({});

    // async function migrate({ continuationToken }) {
    //     let resources = await bucket.listObjects({
    //         continuationToken,
    //     });
    //     console.log(resources.Contents.length);
    //     for (let resource of resources.Contents) {
    //         const source = resource.Key;
    //         const target = resource.Key.replace(/nyingarn.net/, "nyingarn.net/workspace");
    //         if (source !== target) {
    //             console.log(`Copying ${source} -> ${target}`);
    //             await bucket.copy({ source, target });
    //         }
    //         // console.log({
    //         //     source: resource.Key,
    //         //     target: resource.Key.replace(/nyingarn.net/, "nyingarn.net/workspace"),
    //         // });
    //     }
    //     if (resources.NextContinuationToken) {
    //         await migrate({
    //             continuationToken: resources.NextContinuationToken,
    //         });
    //     }
    // }
}

export async function depositObjectIntoRepository({ type, identifier }) {
    const objectWorkspace = await getStoreHandle({ identifier, type });
    const objectRepository = await getStoreHandle({
        identifier,
        type,
        location: "repository",
    });

    if (!(await objectRepository.itemExists())) {
        // create the object location in the repo
        await objectRepository.createItem();
    }

    // copy over all of the files from the workspace entry
    let resources = await objectWorkspace.listResources();
    resources = resources.map((resource) => {
        return {
            file: resource.Key,

            path: objectWorkspace.resolvePath({ path: resource.Key }),
        };
    });
    console.log(resources);

    // delete the files from the workspace entry

    //   copy all files into the repo item
    //
    //   it is: version all the files n the repo copy that need to be versioned
    //   perform a copy of all files from the workspace to the repo
}
