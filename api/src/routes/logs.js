import { demandAuthenticatedUser, demandAdministrator } from "../common/index.js";
import { getLogs } from "../lib/logs.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", demandAdministrator);

    fastify.get("/admin/logs", getLogsRouteHandler);
    done();
}

export async function getLogsRouteHandler(req) {
    let { limit, offset, level, dateFrom, dateTo } = req.query;
    let logs = await getLogs({ limit, offset, level, dateFrom, dateTo });
    logs.rows = logs.rows.map((r) => r.get());
    return { logs };
}
