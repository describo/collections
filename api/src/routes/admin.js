import { demandAdministrator, demandAuthenticatedUser } from "../common/index.js";
import models from "../models/index.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", demandAdministrator);

    fastify.get("/admin", async (req, res) => {});
    fastify.post("/admin/collections/create", postCreateCollectionHandler);
    done();
}

// TODO this code does not have tests
async function postCreateCollectionHandler(req) {
    let { name, code } = req.body;
    let user = req.session.user;
    let collection = await models.collection.findOrCreate({
        where: { code },
        defaults: { name, code },
    });
    collection = collection[0];
    await collection.addUser(user);
}
