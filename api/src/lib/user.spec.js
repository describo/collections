require("regenerator-runtime");
import {
    getUsers,
    getUser,
    createUser,
    deleteUser,
    toggleUserCapability,
    createAllowedUserStubAccounts,
} from "./user";
const chance = require("chance").Chance();
import { TestSetup } from "../common";
import models from "../models/index.js";

describe("User management tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        await models.user.destroy({ where: {} });

        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        identifier = chance.word();
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
    it("should be able to get a list of users", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        // expect to find two users
        let accounts = await getUsers({});
        expect(accounts.users.length).toEqual(2);
        expect(accounts.users[0].email).toEqual(user.email);

        // expect to find no users
        accounts = await getUsers({ offset: 10 });
        expect(accounts.users.length).toEqual(0);

        // // expect to find no users
        accounts = await getUsers({ age: 0, limit: 0 });
        expect(accounts.users.length).toEqual(0);
    });
    it("should be able to get a specified user", async () => {
        let userDef = users.filter((u) => !u.administrator)[0];
        let user = await getUser({ userId: userDef.id });
        expect(user.email).toEqual(userDef.email);

        user = await getUser({ email: userDef.email });
        expect(user.email).toEqual(userDef.email);

        user = await getUser({ email: chance.word() });
        expect(user).toBeNull;
    });
    it("should be able to set up a normal user account", async () => {
        //  create stub account
        let accounts = [
            {
                email: chance.email(),
                givenName: chance.word(),
                familyName: chance.word(),
            },
        ];
        let users = await createAllowedUserStubAccounts({ accounts });
        expect(users.length).toEqual(1);

        // expect(user.email).toEqual(accounts[0].email);
        let user = await createUser({
            email: accounts[0].email,
            provider: "unset",
            locked: false,
            upload: false,
            admin: false,
        });

        //  create a normal user ccount
        try {
            user = await createUser({
                email: chance.email(),
                givenName: chance.word(),
                familyName: chance.word(),
                provider: "unset",
                locked: false,
                upload: false,
                admin: false,
            });
        } catch (error) {
            expect(error.message).toEqual("Unauthorised");
        }
    });
    it("should be able to set up an admin user account", async () => {
        //  create admin user account
        let user = await createUser({
            email: adminEmail,
            provider: "unset",
            locked: false,
            upload: false,
        });
        expect(user.email).toEqual(adminEmail);
    });
    it("should be able to lock a user", async () => {
        let user = users.filter((u) => !u.administrator)[0];

        user = await toggleUserCapability({
            userId: user.id,
            capability: "lock",
        });
        expect(user.locked).toEqual(true);

        user = await toggleUserCapability({
            userId: user.id,
            capability: "lock",
        });
        expect(user.locked).toEqual(false);
    });
    it("should be able to toggle a user as an admin", async () => {
        let user = users.filter((u) => !u.administrator)[0];

        user = await toggleUserCapability({
            userId: user.id,
            capability: "upload",
        });
        expect(user.upload).toEqual(true);

        user = await toggleUserCapability({
            userId: user.id,
            capability: "upload",
        });
        expect(user.upload).toEqual(false);
    });
    it("should be able to toggle user upload privileges", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        user = await toggleUserCapability({
            userId: user.id,
            capability: "admin",
        });
        expect(user.administrator).toEqual(true);

        user = await toggleUserCapability({
            userId: user.id,
            capability: "admin",
        });
        expect(user.administrator).toEqual(false);
    });
    it("should be able to create user stub accounts", async () => {
        let accounts = [
            {
                email: chance.email(),
                givenName: chance.word(),
                familyName: chance.word(),
            },
        ];
        let users = await createAllowedUserStubAccounts({ accounts });
        expect(users.length).toEqual(1);
        expect(accounts[0].email).toEqual(users[0].email);
    });
});
