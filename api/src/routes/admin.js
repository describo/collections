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
    fastify.get("/admin/collections/:collectionId/users", getCollectionUsersHandler);
    fastify.post(
        "/admin/collections/:collectionId/attach-user/:userId",
        postAttachUserToCollectionHandler
    );
    fastify.post(
        "/admin/collections/:collectionId/detach-user/:userId",
        postDetachUserFromCollectionHandler
    );
    fastify.post("/admin/collections/:collectionId/load-data", postLoadDataIntoCollectionHandler);
    done();
}

async function postCreateCollectionHandler(req) {
    let { name, code } = req.body;
    let collection = await createNewCollection({ name, code, user: req.session.user });
    return { collection: collection.get() };
}

async function getCollectionsHandler(req) {
    let { limit, offset } = req.query;
    let { total, collections } = await getAllCollections({ limit, offset });
    return { total, collections };
}

async function getCollectionUsersHandler(req) {
    const { collectionId } = req.params;
    let { users } = await getCollectionUsers({ collectionId });
    return { users };
}

async function postAttachUserToCollectionHandler(req) {
    const { collectionId, userId } = req.params;
    await attachUserToCollection({ collectionId, userId });
    return {};
}

async function postDetachUserFromCollectionHandler(req) {
    const { collectionId, userId } = req.params;
    await detachUserFromCollection({ collectionId, userId });
    return {};
}

async function postLoadDataIntoCollectionHandler(req, res) {
    const crate = req.body.crate;
    const collectionId = req.params.collectionId;
    const clientId = req.query.clientId;
    await loadCrateIntoDatabase({ crate, collectionId, io: req.io, clientId });
    return {};
}
