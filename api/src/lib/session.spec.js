require("regenerator-runtime");
const { getSession, createSession, destroySession } = require("./session");
const { createUser } = require("./user");
const chance = require("chance").Chance();
import { TestSetup } from "../common";

describe("Session management tests", () => {
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
        try {
            await store.deleteItem();
        } catch (error) {}
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });
    it("should be able to create a session", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        expect(session.token).toBeDefined();
        await session.destroy();
    });
    it("should be able to get a session", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        let s = await getSession({ userId: user.id });
        expect(s.token).toEqual(session.token);

        s = await getSession({ sessionId: session.id });
        expect(s.token).toEqual(session.token);

        await session.destroy();
    });
    it("should be able to destroy a session", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        await destroySession({ sessionId: session.id });

        let s = await getSession({ sessionId: session.id });
        expect(s).toBeNull;
        await session.destroy();
    });
});
