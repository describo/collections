require("regenerator-runtime");
import models from "../models";
import { createUser } from "../lib/user";
import { createSession } from "../lib/session";
import fetch from "node-fetch";
import { TestSetup, headers, generateLogs, host } from "../common";
const chance = require("chance").Chance();

describe("Log management tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        identifier = chance.word();
    });
    afterEach(async () => {
        await models.log.destroy({ where: {} });
        try {
            await store.deleteItem();
        } catch (error) {}
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });

    test("it should be able to get user logs out of the system", async () => {
        await generateLogs(1, 0, 0);
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin/logs`, {
            headers: headers(session),
        });
        let { logs } = await response.json();
        expect(logs.count).toBeGreaterThanOrEqual(1);
    });
    test("it should be able to page through logs", async () => {
        await generateLogs(1, 0, 0);
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin/logs`, {
            headers: headers(session),
        });
        let logs1 = (await response.json()).logs;

        await generateLogs(1, 0, 0);
        response = await fetch(`${host}/admin/logs?offset=0`, {
            headers: headers(session),
        });
        let logs2 = (await response.json()).logs;
        expect(logs1.rows[0].id).not.toEqual(logs2.rows[0].id);
    });
    test("it should be able to get logs of a defined level out", async () => {
        await generateLogs(1, 1, 1);
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin/logs?level=info`, {
            headers: headers(session),
        });
        let logs = (await response.json()).logs;
        expect(logs.count).toEqual(1);
        expect(logs.rows[0].level).toEqual("info");

        response = await fetch(`${host}/admin/logs?level=error`, {
            headers: headers(session),
        });
        logs = (await response.json()).logs;
        expect(logs.count).toEqual(1);
        expect(logs.rows[0].level).toEqual("error");
    });
});
