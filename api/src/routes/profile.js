import { demandAuthenticatedUser } from "../common/index.js";

import models from "../models/index.js";
import defaultProfile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
import lodashPkg from "lodash";
const { cloneDeep } = lodashPkg;

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get("/profile/default", getDefaultProfileHandler);
    done();
}

async function getDefaultProfileHandler(req) {
    return { profile: cloneDeep(defaultProfile) };
}
