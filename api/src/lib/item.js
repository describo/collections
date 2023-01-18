import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import {
    loadConfiguration,
    getS3Handle,
    getStoreHandle,
    completedResources,
    specialFiles,
    imageExtensions,
} from "../common/index.js";
import path from "path";
import lodashPkg from "lodash";
const { compact, groupBy, uniq, isNumber } = lodashPkg;

export async function lookupItemByIdentifier({ identifier, userId }) {
    let clause = {
        where: { identifier },
    };
    if (userId) {
        clause.include = [
            { model: models.user, where: { id: userId }, attributes: ["id"], raw: true },
        ];
    }
    return await models.item.findOne(clause);
}

export async function getItems({ userId, offset = 0, limit = 10, match, publicationStatus }) {
    const query = {
        order: [[seqFn("lower", seqCol("item.identifier")), "ASC"]],
    };
    let include = [{ model: models.collection }];
    if (userId) include.push({ model: models.user, where: { id: userId } });
    if (limit) {
        query.offset = offset;
        query.limit = limit;
    }
    query.where = {};
    if (match) {
        query.where.identifier = {
            [Op.startsWith]: match,
        };
    }
    if (publicationStatus) {
        query.where.publicationStatus = publicationStatus;
    }
    query.include = include;

    return await models.item.findAndCountAll(query);
}

export async function createItem({ identifier, userId }) {
    let item = await models.item.findOne({ where: { identifier } });
    if (item) {
        throw new Error("An item with that identifier already exists.");
    }
    let collection = await models.collection.findOne({ where: { identifier } });
    if (collection) {
        throw new Error("The item identifier clashes with a collection identifier.");
    }

    item = await models.item.create({ identifier });
    await linkItemToUser({ itemId: item.id, userId });
    await createItemLocationInObjectStore({ identifier });
    return item;
}

export async function deleteItem({ id }) {
    await models.item.destroy({ where: { id } });
}

export async function linkItemToUser({ itemId, userId }) {
    let item = await models.item.findOne({ where: { id: itemId } });
    let user = await models.user.findOne({ where: { id: userId } });
    await user.addItems([item]);
}

export async function createItemLocationInObjectStore({ identifier }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    let exists = await store.exists();
    if (!exists) {
        await store.createObject();
    }
}

export async function itemResourceExists({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    let stat = await store.stat({ path: resource });

    return stat;
}

export async function getItemResource({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    if (!(await store.pathExists({ path: resource }))) {
        throw new Error(`Not found`);
    } else {
        return await store.get({ target: resource });
    }
}

export async function deleteItemResource({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    await store.delete({ prefix: resource });
    await markResourceComplete({ identifier, resource, complete: false });
}

export async function putItemResource({
    identifier,
    resource,
    localPath = undefined,
    content = undefined,
    json,
}) {
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    await store.put({ target: resource, localPath, content, json });
}

export async function getItemResourceLink({ identifier, resource, download }) {
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    if (!(await store.pathExists({ path: resource }))) {
        throw new Error("Not found");
    } else {
        return await store.getPresignedUrl({ target: resource, download });
    }
}

export async function listItemResources({ identifier, offset = 0, limit }) {
    const configuration = await loadConfiguration();
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    let files = await store.listResources();
    ({ files } = filterSpecialFiles({ files }));

    let resources = getResourceNames({ identifier, files, naming: configuration.api.filenaming });
    let total = resources.length;
    resources = resources.map((r, i) => {
        let previous = i === 0 ? undefined : resources[i - 1];
        let next = i === resources.length ? undefined : resources[i + 1];
        return {
            previous,
            name: r,
            next,
            page: i + 1,
            total: resources.length,
        };
    });
    if (isNumber(offset) && isNumber(limit)) {
        resources = resources.slice(offset, offset + limit);
    }
    return { resources, total };
}

export async function listItemResourceFiles({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    // let { bucket } = await getS3Handle();
    let files;
    try {
        files = await store.listResources();
        ({ files } = filterSpecialFiles({ files }));
        files = files.filter((f) => f.match(resource));
    } catch (error) {
        files = [];
    }
    return { files };
}

function filterSpecialFiles({ files }) {
    files = files.map((f) => f.Key);
    files = files.filter((f) => !f.match(/^\./));
    files = files.filter((f) => {
        let matches = specialFiles.map((sf) => {
            let re = new RegExp(sf);
            return f.match(re) ? true : false;
        });
        return !matches.includes(true) ? f : null;
    });
    files = compact(files);
    return { files };
}

export function getResourceNames({ identifier, files, naming }) {
    let resources = [];
    for (let filename of files) {
        let ext = path.extname(filename).replace(".", "");
        let basename = path.basename(filename, `.${ext}`);
        let identifierSegments = basename
            .split(`-${naming.adminTag}`)[0]
            .split(naming.resourceQualifierSeparator)[0]
            .split("-");
        resources.push(identifierSegments.pop());
    }
    return uniq(resources)
        .map((r) => `${identifier}-${r}`)
        .sort();
}

export function groupFilesByResource({ identifier, files, naming }) {
    let resources = [];
    for (let filename of files) {
        let ext = path.extname(filename).replace(".", "");
        let basename = path.basename(filename, `.${ext}`);
        let identifierSegments = basename
            .split(`-${naming.adminTag}`)[0]
            .split(naming.resourceQualifierSeparator)[0]
            .split("-");

        let adminLabel = path.basename(filename, ext).split(naming.adminTag)[1];

        let type;
        imageExtensions.forEach((t) => {
            let re = new RegExp(t);
            type = ext.match(re) ? "image" : type;
        });

        let data = naming.identifierSegments[identifierSegments.length]
            .map((segmentName, i) => ({
                [segmentName]: identifierSegments[i],
            }))
            .reduce((acc, cv) => ({ ...acc, ...cv }));

        resources.push({
            file: path.join(identifier, filename),
            basename,
            name: filename,
            path: identifier,
            ext,
            adminLabel,
            type,
            ...data,
        });
    }

    return { files: groupBy(resources, "resourceId") };
}

export async function getResourceProcessingStatus({ itemId, resources, dateFrom }) {
    let dateTo = new Date();
    return await models.task.findAll({
        where: {
            [Op.and]: {
                itemId,
                updatedAt: {
                    [Op.between]: [dateFrom, dateTo],
                },
                [Op.or]: { resource: resources },
            },
        },
        order: [["updatedAt", "DESC"]],
    });
}

export async function statItemFile({ identifier, file }) {
    let { bucket } = await getS3Handle();

    let fileStat = await bucket.stat({ path: path.join(identifier, file) });
    return fileStat?.$metadata?.httpStatusCode === 200 ? true : false;
}

export async function markResourceComplete({ identifier, resource, complete = false }) {
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    let status = {};
    try {
        status = JSON.parse(await store.get({ target: completedResources }));
    } catch (error) {}
    resource = path.join(identifier, resource);
    status[resource] = String(complete) === "true";

    await store.put({ json: status, target: completedResources, registerFile: false });
}

export async function markAllResourcesComplete({ identifier, resources, complete = true }) {
    let store = await getStoreHandle({ id: identifier, className: "item" });
    if (!(await store.itemExists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    let status = {};
    try {
        status = JSON.parse(await store.get({ target: completedResources }));
    } catch (error) {}
    for (let resource of resources) {
        resource = path.join(identifier, resource);
        status[resource] = String(complete) === "true";
    }

    await store.put({ json: status, target: completedResources, registerFile: false });
}

export async function isResourceComplete({ identifier, resource }) {
    let status = {};
    try {
        status = JSON.parse(await getItemResource({ identifier, resource: completedResources }));
    } catch (error) {}
    resource = path.join(identifier, resource);
    return status[resource] ? status[resource] : false;
}
