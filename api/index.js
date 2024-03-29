import("regenerator-runtime");
import models from "./src/models/index.js";
import { loadConfiguration, log } from "./src/common/index.js";
import { setupRoutes as setupAdminRoutes } from "./src/routes/admin.js";
import { setupRoutes as setupAuthRoutes } from "./src/routes/auth.js";
import { setupRoutes as setupBaseRoutes } from "./src/routes/base.js";
import { setupRoutes as setupCollectionRoutes } from "./src/routes/collection.js";
import { setupRoutes as setupLogRoutes } from "./src/routes/logs.js";
import { setupRoutes as setupUserRoutes } from "./src/routes/user.js";
import { setupRoutes as setupProfileRoutes } from "./src/routes/profile.js";

import Fastify from "fastify";
import fastifyTusS3Plugin from "@paradisec-platform/fastify-tus-s3-plugin";
import fastifyCompress from "@fastify/compress";
import cors from "@fastify/cors";
import fastifySensible from "@fastify/sensible";
import fastifyIO from "fastify-socket.io";
const envToLogger = {
    development: {
        transport: {
            target: "@fastify/one-line-logger",
            // target: "pino-pretty",
            // options: { ignore: "reqId,req.hostname,req.remoteAddress,req.remotePort" },
        },
    },
    // development: true,
    production: true,
    test: false,
};
const fastify = Fastify({
    logger: envToLogger[process.env.NODE_ENV],
    bodyLimit: 256 * 1024 * 1024,
});

main();
async function main() {
    let configuration;
    try {
        configuration = await loadConfiguration();
    } catch (error) {
        log.error("configuration.json not found - stopping now");
        process.exit();
    }

    await fastify.register(cors, {
        origin: "*",
        methods: ["OPTIONS", "GET", "HEAD", "PATCH", "POST", "DELETE"],
        allowedHeaders: [
            "content-type",
            "upload-length",
            "content-length",
            "upload-offset",
            "upload-expires",
            "location",
            "upload-metadata",
            "tus-resumable",
            "tus-version",
            "tus-max-size",
            "tus-extension",
        ],
        exposedHeaders: [
            "content-type",
            "upload-length",
            "content-length",
            "upload-offset",
            "upload-expires",
            "location",
            "upload-metadata",
            "tus-resumable",
            "tus-version",
            "tus-max-size",
            "tus-extension",
        ],
    });
    fastify.register(fastifySensible);
    fastify.register(fastifyIO);
    fastify.register(fastifyCompress);
    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", async (req, res) => {
            // fake middleware checking the caller is authorised
            if (req.headers.authorization !== "Bearer secret") res.badRequest();
        });
        fastify.register(fastifyTusS3Plugin, {
            awsAccessKeyId: configuration.api.services.s3.awsAccessKeyId,
            awsSecretAccessKey: configuration.api.services.s3.awsSecretAccessKey,
            endpoint: configuration.api.services.s3.endpointUrl,
            forcePathStyle: configuration.api.services.s3.forcePathStyle,
            cachePath: "./.cache",
            uploadRoutePath: "/files",
            defaultUploadExpiration: { hours: 6 }, // https://date-fnsorg/v2.29.3/docs/add
        });
        done();
    });

    fastify.decorateRequest("models", "");
    fastify.addHook("onRequest", async (req, res) => {
        configuration = await loadConfiguration();
        req.io = fastify.io;
        req.session = {
            configuration,
        };
        global.testing = req.headers.testing;
    });
    fastify.addHook("onReady", async () => {
        await models.sequelize.sync();
        fastify.decorate("models", models);
    });
    fastify.register(setupAdminRoutes);
    fastify.register(setupAuthRoutes);
    fastify.register(setupBaseRoutes);
    fastify.register(setupCollectionRoutes);
    fastify.register(setupLogRoutes);
    fastify.register(setupUserRoutes);
    fastify.register(setupProfileRoutes);

    fastify.listen({ port: 8080, host: "0.0.0.0" }, function (err, address) {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
}
