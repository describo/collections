import { logEvent, demandAdministrator, demandAuthenticatedUser } from "../common/index.js";
import {
    getUser,
    getUsers,
    deleteUser,
    toggleUserCapability,
    createAllowedUserStubAccounts,
} from "../lib/user.js";
import { createSession } from "../lib/session.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    // user routes
    fastify.get("/users/self", getUserSelfInformationHandler);
    fastify.put("/users/:userId/upload", putUsersUploadCapabilityRouteHandler);

    // admin user routes
    fastify.get(
        "/admin/users",
        { preHandler: [demandAuthenticatedUser, demandAdministrator] },
        getUsersRouteHandler
    );
    fastify.post(
        "/admin/users",
        { preHandler: [demandAuthenticatedUser, demandAdministrator] },
        postInviteUsersRouteHandler
    );
    fastify.put(
        "/admin/users/:userId/:capability",
        { preHandler: [demandAuthenticatedUser, demandAdministrator] },
        putUserToggleCapabilityRouteHandler
    );
    fastify.delete(
        "/admin/users/:userId",
        { preHandler: [demandAuthenticatedUser, demandAdministrator] },
        deleteUserRouteHandler
    );

    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
    done();
}

async function getUserSelfInformationHandler(req) {
    let user = await getUser({ userId: req.session.user.id });
    return { user };
}

async function putUsersUploadCapabilityRouteHandler(req, res) {
    let userId = req.session.user.id;
    let user;
    try {
        user = await toggleUserCapability({
            userId,
            capability: "upload",
        });
        logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User accepted terms and conditions of use. Enabling upload capability.`,
        });
    } catch (error) {
        logEvent({
            level: "error",
            owner: req.session.user.email,
            text: error.message,
        });
        return res.internalServerError();
    }

    let session = await createSession({ user });
    return { token: session.token };
}

async function getUsersRouteHandler(req) {
    let users = await getUsers({
        offset: req.query.offset,
        limit: req.query.limit,
        orderBy: req.query.orderBy,
    });
    return users;
}

async function postInviteUsersRouteHandler(req, res) {
    try {
        await createAllowedUserStubAccounts({ emails: req.body.emails });
        logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `Admin invited users to the workspace.`,
            data: { emails: req.body.emails },
        });
        return {};
    } catch (error) {
        logEvent({
            level: "error",
            owner: req.session.user.email,
            text: error.message,
        });
        return res.internalServerError();
    }
}

async function putUserToggleCapabilityRouteHandler(req, res) {
    try {
        await toggleUserCapability({
            userId: req.params.userId,
            capability: req.params.capability,
        });
        logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `Admin toggled capability '${req.params.capability}' for user '${req.params.userId}'.`,
        });
        return {};
    } catch (error) {
        console.log(error.message);
        logEvent({
            level: "error",
            owner: req.session.user.email,
            text: error.message,
        });
        return res.InternalServerError(error.message);
    }
}

async function deleteUserRouteHandler(req, res, next) {
    try {
        await deleteUser({ userId: req.params.userId });
        logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `Admin deleted user '${req.params.userId}'.`,
        });
        return {};
    } catch (error) {
        logEvent({
            level: "error",
            owner: req.session.user.email,
            text: error.message,
        });
        return res.InternalServerError();
    }
}
