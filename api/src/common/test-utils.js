import { loadConfiguration } from "./configuration.js";
import fsExtraPkg from "fs-extra";
const { writeJSON } = fsExtraPkg;
import models from "../models/index.js";
import Chance from "chance";
const chance = Chance();
import lodashPkg from "lodash";
const { range, cloneDeep } = lodashPkg;
import { createItem } from "../lib/item.js";
import { createCollection } from "../lib/collection.js";
import { getS3Handle } from "./getS3Handle.js";

const bucketName = "testing";
export const host = `http://localhost:8080`;

export function headers(session) {
    return {
        authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        testing: true,
    };
}

export class TestSetup {
    constructor() {
        this.originalConfiguration = {};
    }

    async setupBeforeAll() {
        const userEmail = chance.email();
        const adminEmail = chance.email();
        let configuration = await loadConfiguration();

        let { s3, bucket } = await getS3Handle({ configuration });
        return { userEmail, adminEmail, configuration, bucket };
    }

    async setupUsers({ emails = [], adminEmails = [] }) {
        let users = [];
        for (let email of emails) {
            let user = await models.user.create({
                email: email,
                provider: "unset",
                locked: false,
                upload: false,
                administrator: false,
            });
            users.push(user);
        }
        for (let email of adminEmails) {
            let user = await models.user.create({
                email: email,
                provider: "unset",
                locked: false,
                upload: false,
                administrator: true,
            });
            users.push(user);
        }
        return users;
    }

    async purgeUsers({ users = [] }) {
        for (let user of users) {
            await user.destroy();
        }
    }

    async teardownAfterAll(configuration) {
        await models.log.truncate();
        await models.collection.destroy({ where: {} });
        await models.item.destroy({ where: {} });
        await models.user.destroy({ where: {} });
        models.sequelize.close();
    }
}

export async function generateLogs(info, warn, error) {
    for (let i in range(info)) {
        await models.log.create({ level: "info", owner: chance.email(), text: chance.sentence() });
    }
    for (let i in range(warn)) {
        await models.log.create({ level: "warn", owner: chance.email(), text: chance.sentence() });
    }
    for (let i in range(error)) {
        await models.log.create({ level: "error", owner: chance.email(), text: chance.sentence() });
    }
}

export async function setupTestItem({ identifier, store, user }) {
    let item = await createItem({ identifier, userId: user.id });
    await store.put({
        batch: [
            {
                json: { some: "thing" },
                target: `${identifier}-01.json`,
            },
            {
                content: "text",
                target: `${identifier}-01.txt`,
            },
            {
                json: { some: "thing" },
                target: `${identifier}-02.json`,
            },
            {
                content: "text",
                target: `${identifier}-02.txt`,
            },
        ],
    });
    return { item };
}

export async function setupTestCollection({ identifier, user }) {
    let collection = await createCollection({ identifier, userId: user.id });
    return { collection };
}
