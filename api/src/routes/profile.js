import { demandAuthenticatedUser } from "../common/index.js";

import models from "../models/index.js";
import defaultProfile from "../../../configuration/profiles/ohrm-default-profile.json" assert { type: "json" };
import lodashPkg from "lodash";
const { cloneDeep } = lodashPkg;

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    // fastify.get("/collections", getCollectionsHandler);
    fastify.get("/profile/default", getDefaultProfileHandler);
    fastify.get("/profile/:collectionId", getProfileHandler);
    fastify.post("/profile/:collectionId", postProfileHandler);
    done();
}

// TODO: this code does not have tests yet
async function getDefaultProfileHandler(req) {
    return { profile: cloneDeep(defaultProfile) };
}

// TODO: this code does not have tests yet
async function getProfileHandler(req) {
    const { collectionId } = req.params;
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    let types = await models.type.findAll({
        where: { collectionId },
        attributes: ["name"],
        raw: true,
    });
    let profile = collection.profile ?? cloneDeep(defaultProfile);
    types = types.map((type) => type.name);
    types = types.sort();
    types.forEach((type) => {
        if (!profile.classes[type]?.subClassOf?.length) {
            profile.classes[type] = {
                definition: "override",
                subClassOf: [],
                inputs: [],
                // inputs: [...defaultProfile.classes["Entity"].inputs],
            };
        }
    });
    // console.log(profile.classes);
    return { profile };
}

// TODO: this code does not have tests yet
async function postProfileHandler(req) {
    const { collectionId } = req.params;
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    collection.profile = req.body.profile;
    await collection.save();
    return {};
}
