import models from "../models/index.js";
import { loadConfiguration } from "../common/index.js";
import lodashPkg from "lodash";
const { uniqBy } = lodashPkg;

export async function getUsers({ offset = 0, limit = 10, orderBy = "familyName" }) {
    let direction = orderBy === "upload" ? "DESC" : "ASC NULLS LAST";
    let users = await models.user.findAndCountAll({
        offset,
        limit,
        order: [[orderBy, direction]],
    });
    return { total: users.count, users: users.rows.map((u) => u.get()) };
}

export async function getUser({ userId, email, orderBy }) {
    let where = {};
    if (userId) where.id = userId;
    if (email) where.email = email;
    let user = await models.user.findOne({
        where,
    });
    return user;
}

export async function createUser(data) {
    const configuration = await loadConfiguration();
    if (!data.email) {
        throw new Error(`Email is a required property`);
    }
    if (!data.provider) {
        throw new Error(`Provider is a required property`);
    }

    // deny access if the user is not an admin and we don't
    //  have an entry for them as a result of an admin invitation.
    let user = await models.user.findOne({ where: { email: data.email } });
    if (!user && !configuration.api.administrators.includes(data.email)) {
        throw new Error(`Unauthorised`);
    }

    if (!user && configuration.api.administrators.includes(data.email)) {
        // no user account found but email in admin list
        data.locked = false;
        data.upload = true;
        data.administrator = true;
        data.provider = data.provider;
        data.givenName = data.givenName;
        data.familyName = data.familyName;
        user = (
            await models.user.findOrCreate({
                where: { email: data.email },
                defaults: data,
            })
        )[0];
    } else if (user && !configuration.api.administrators.includes(data.email)) {
        // user account found and not admin
        user.locked = false;
        user.upload = false;
        user.administrator = false;
        user.provider = data.provider;
        user.givenName = data.givenName;
        user.familyName = data.familyName;

        await user.save();
    }
    return user;
}

export async function deleteUser({ userId }) {
    let user = await models.user.findOne({ where: { id: userId } });
    await user.destroy();
}

export async function toggleUserCapability({ userId, capability }) {
    let user = await models.user.findOne({ where: { id: userId } });
    switch (capability) {
        case "lock":
            user.locked = !user.locked;
            break;
        case "admin":
            user.administrator = !user.administrator;
            break;
        case "upload":
            user.upload = !user.upload;
            break;
    }
    user = await user.save();
    return user;
}

export async function createAllowedUserStubAccounts({ emails }) {
    let users = emails.map((email) => {
        return {
            email,
            provider: "unset",
            locked: false,
            upload: false,
            administrator: false,
        };
    });
    users = await models.user.bulkCreate(users, { ignoreDuplicates: true });

    return uniqBy(users, "email");
}
