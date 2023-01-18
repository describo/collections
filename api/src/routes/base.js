// these endpoints will only return data they are responsible for
//
import models from "../models/index.js";
import { demandAuthenticatedUser, filterPrivateInformation } from "../common/index.js";
export function setupRoutes(fastify, options, done) {
    fastify.get("/", () => ({}));
    fastify.get("/configuration", async (req) => {
        let configuration = req.session.configuration;
        configuration = filterPrivateInformation({ configuration });
        return {
            ui: configuration.ui,
            processing: configuration.api.processing,
            authentication: Object.keys(configuration.api.authentication),
        };
    });
    fastify.get(
        "/authenticated",
        {
            preHandler: demandAuthenticatedUser,
        },
        async () => ({})
    );
    fastify.get("/logout", async (req, res) => {
        let token = req.headers.authorization.split("Bearer ")[1];
        if (token) {
            let session = await models.session.findOne({ where: { token } });
            if (session) await session.destroy();
        }
        return res.unauthorized();
    });
    done();
}
