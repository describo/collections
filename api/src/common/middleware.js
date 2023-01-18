import { getLogger } from "./logger.js";
import { getUser } from "../lib/user.js";
import { verifyToken } from "./jwt.js";
const log = getLogger();

export async function demandAuthenticatedUser(req, res) {
    if (!req.headers.authorization) {
        return res.unauthorized();
    }
    try {
        let user = await verifyToken({
            token: req.headers.authorization.split("Bearer ")[1],
            configuration: req.session.configuration,
        });
        user = await getUser({ userId: user.id });
        if (!user) {
            return res.unauthorized();
        }
        req.session.user = user;
    } catch (error) {
        return res.unauthorized();
    }
}

export async function demandAdministrator(req, res) {
    if (!req.session.user.administrator) {
        return res.forbidden();
    }
}
