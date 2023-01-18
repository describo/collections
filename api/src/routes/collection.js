import { demandAuthenticatedUser } from "../common/index.js";
import models from "../models/index.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get("/collections", getCollectionsHandler);
    done();
}

// TODO this code does not have tests
async function getCollectionsHandler(req) {
    let collections = await models.collection.findAll({
        attributes: ["id", "name", "code"],
        include: [{ model: models.user, where: { id: req.session.user.id }, attributes: [] }],
    });
    return { collections: collections.map((c) => c.get()) };
}
