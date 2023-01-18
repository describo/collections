require("regenerator-runtime");
import { createUser } from "../lib/user";
import { generateToken, verifyToken } from "./jwt";
import { loadConfiguration } from "../common";
const chance = require("chance").Chance();
import MockDate from "mockdate";
import { copy, move, readJSON, writeJSON, readdir } from "fs-extra";
import { getStoreHandle, TestSetup, setupTestItem } from "../common";

describe("JWT tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        identifier = chance.word();
        store = await getStoreHandle({
            id: identifier,
            className: "item",
        });
    });
    afterEach(async () => {
        try {
            await store.deleteItem();
        } catch (error) {}
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });
    it("should be able to create a jwt", async () => {
        let user = users[0];
        let configuration = await loadConfiguration();
        let { token, expires } = await generateToken({ configuration, user });
        expect(token).toBeDefined;
        expect(expires).toBeDefined;

        await user.destroy();
    });
    it("should be able to verify a jwt", async () => {
        let user = users[0];
        let configuration = await loadConfiguration();
        let { token, expires } = await generateToken({ configuration, user });

        let data = await verifyToken({ token, configuration });
        expect(data.email).toEqual(user.email);

        await user.destroy();
    });
    it("should throw because the jwt is expired", async () => {
        let user = users[0];
        let configuration = await loadConfiguration();

        MockDate.set("2000-11-22");
        let { token, expires } = await generateToken({ configuration, user });
        MockDate.reset();

        try {
            let data = await verifyToken({ token, configuration });
        } catch (error) {
            expect(error.message).toBe("token expired");
        }

        await user.destroy();
    });
    it("should throw because the jwt is unverified", async () => {
        let user = users[0];
        let configuration = await loadConfiguration();
        let { token, expires } = await generateToken({ configuration, user });

        configuration.api.session.secret = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        try {
            let data = await verifyToken({ token, configuration });
        } catch (error) {
            expect(error.message).toBe("signature verification failed");
        }
        await user.destroy();
    });
});
