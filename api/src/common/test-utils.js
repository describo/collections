import { loadConfiguration } from "./configuration.js";
import fsExtraPkg from "fs-extra";
import models from "../models/index.js";
import Chance from "chance";
const chance = Chance();
import lodashPkg from "lodash";
const { range, cloneDeep } = lodashPkg;
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
