import { getLogger, logEvent } from "../common/index.js";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { Issuer, generators } from "openid-client";
import { createUser } from "../lib/user.js";
import { createSession } from "../lib/session.js";
import models from "../models/index.js";
const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.get("/auth/:provider/login", getLoginUrlRouteHandler);
    fastify.post("/auth/:provider/code", getOauthTokenRouteHandler);
    done();
}

async function getLoginUrlRouteHandler(req, res) {
    const provider = req.params.provider;

    // let configuration = await loadConfiguration();
    const configuration = req.session.configuration.api.authentication[provider];
    try {
    } catch (error) {
        return res.internalServerError();
    }
    let issuer = await Issuer.discover(configuration.discover);
    const client = new issuer.Client({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        redirect_uris: [configuration.redirectUri],
        response_types: ["code"],
    });
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);
    const code_challenge_method = "S256";
    const url = client.authorizationUrl({
        scope: "openid email profile",
        code_challenge,
        code_challenge_method,
        state: provider,
    });
    return { url, code_verifier };
}

async function getOauthTokenRouteHandler(req, res) {
    const provider = req.params.provider;
    if (!req.body.code) {
        return res.badRequest(`Code not provided`);
    }

    const configuration = req.session.configuration;
    let { token, jwks } = await getOauthToken({
        provider,
        code: req.body.code,
        code_verifier: req.body.code_verifier,
        configuration,
    });
    let userData = await extractUserDataFromIdToken({ configuration, provider, jwks, token });
    let user;

    if (configuration.api.administrators.includes(userData.email)) {
        // admin account - set it up and login
        try {
            user = await createUser(userData);
        } catch (error) {
            return res.unauthorized();
        }
    } else {
        // normal user account - are we allowing access
        user = await models.user.findOne({ where: { email: userData.email } });
        if (!user) {
            // no user found with that email - not whitelisted so deny access
            log.info(`The account for '${userData.email}' is not permitted. Denying user login.`);
            await logEvent({
                level: "info",
                owner: userData.email,
                text: `The account for '${userData.email}' is not permitted. Denying user login.`,
            });
            return res.unauthorized();
        }
        if (user?.locked) {
            log.info(`The account for '${user.email}' is locked. Denying user login.`);
            await logEvent({
                level: "info",
                owner: user.email,
                text: `The account for '${user.email}' is locked. Denying user login.`,
            });
            // user account exists but user is locked
            return res.unauthorized();
        }
        if (!user?.provider || !user.givenName) {
            // user account looks like a stub account - create it properly
            log.info(`The account for '${user.email}' is being setup.`);
            await logEvent({
                level: "info",
                owner: user.email,
                text: `The account for '${user.email}' is being setup.`,
            });
            try {
                user = await createUser(userData);
            } catch (error) {
                return res.unauthorized();
            }
        }
    }
    log.debug(`Creating session for ${user.email}`);
    let session = await createSession({ user });

    return { token: session.token };
}

async function getOauthToken({ provider, code, code_verifier, configuration }) {
    configuration = configuration.api.authentication[provider];
    let issuer = await Issuer.discover(configuration.discover);
    const client = new issuer.Client({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        redirect_uris: [configuration.redirectUri],
        response_types: ["code"],
    });
    let token = await client.callback(configuration.redirectUri, { code }, { code_verifier });
    return { token, jwks: issuer.jwks_uri };
}

export async function extractUserDataFromIdToken({ configuration, provider, jwks, token }) {
    configuration = configuration.api.authentication[provider];
    const JWKS = createRemoteJWKSet(new URL(jwks));
    let tokenData = await jwtVerify(token.id_token, JWKS, {
        audience: configuration.clientId,
    });
    let { email, given_name, family_name } = tokenData.payload;
    return { provider, email, givenName: given_name, familyName: family_name };
}
