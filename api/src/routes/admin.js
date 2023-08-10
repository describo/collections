import { demandAdministrator, demandAuthenticatedUser } from "../common/index.js";
import models from "../models/index.js";
import fsExtraPkg from "fs-extra";
const { pathExists, readJSON } = fsExtraPkg;
import lodashPkg from "lodash";
const { isArray, isPlainObject, isString, chunk, groupBy, uniqBy } = lodashPkg;
// const createId = init({ length: 32 });
import { loadCrateIntoDatabase } from "../lib/crate-tools.js";
import {
    createNewCollection,
    getAllCollections,
    getCollectionUsers,
    attachUserToCollection,
    detachUserFromCollection,
} from "../lib/admin.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", demandAdministrator);

    fastify.get("/admin", async (req, res) => {});
    fastify.get("/admin/collections", getCollectionsHandler);
    fastify.post("/admin/collections/create", postCreateCollectionHandler);
    fastify.get("/admin/collections/:code/users", getCollectionUsersHandler);
    fastify.post("/admin/collections/:code/attach-user/:userId", postAttachUserToCollectionHandler);
    fastify.post(
        "/admin/collections/:code/detach-user/:userId",
        postDetachUserFromCollectionHandler
    );
    fastify.post("/admin/collections/:code/load-data", postLoadDataIntoCollectionHandler);
    done();
}

async function postCreateCollectionHandler(req) {
    let { name, code, bucket } = req.body;
    let collection = await createNewCollection({ name, code, bucket, user: req.session.user });
    await models.collection_folder.create({
        collectionId: collection.id,
        name: "/",
    });
    return { collection: collection.get() };
}

async function getCollectionsHandler(req) {
    let { limit, offset } = req.query;
    let { total, collections } = await getAllCollections({ limit, offset });
    return { total, collections };
}

async function getCollectionUsersHandler(req) {
    const { code } = req.params;
    let collection = await models.collection.findOne({ where: { code } });
    let { users } = await getCollectionUsers({ collectionId: collection.id });
    return { users };
}

async function postAttachUserToCollectionHandler(req) {
    const { code, userId } = req.params;
    let collection = await models.collection.findOne({ where: { code } });
    await attachUserToCollection({ collectionId: collection.id, userId });
    return {};
}

async function postDetachUserFromCollectionHandler(req) {
    const { code, userId } = req.params;
    let collection = await models.collection.findOne({ where: { code } });
    await detachUserFromCollection({ collectionId: collection.id, userId });
    return {};
}

async function postLoadDataIntoCollectionHandler(req, res) {
    const crate = req.body.crate;
    const code = req.params.code;
    const clientId = req.query.clientId;
    let collection = await models.collection.findOne({ where: { code } });
    await loadCrateIntoDatabase({ crate, collectionId: collection.id, io: req.io, clientId });
    return {};
}
