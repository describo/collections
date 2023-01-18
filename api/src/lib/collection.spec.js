require("regenerator-runtime");
import {
    createCollection,
    getCollections,
    lookupCollectionByIdentifier,
    linkCollectionToUser,
    deleteCollection,
    toggleCollectionVisibility,
} from "./collection";
const chance = require("chance").Chance();
import { getStoreHandle, TestSetup } from "../common";

describe("Collection management tests", () => {
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
            className: "collection",
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

    it("should be able to create a new collection", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let collection = await createCollection({ identifier, userId: user.id });
        expect(collection.identifier).toEqual(identifier);
        let files = await store.listResources({});
        expect(files.length).toEqual(3);
        files = files.map((c) => c.Key).sort();
        expect(files).toEqual([
            "nocfl.identifier.json",
            "nocfl.inventory.json",
            "ro-crate-metadata.json",
        ]);
        await collection.destroy();
    });
    it("should fail to create a new collection - identifier conflict", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let collection = await createCollection({ identifier, userId: user.id });

        // conflicting collection identifier
        try {
            collection = await createCollection({ identifier, userId: user.id });
        } catch (error) {
            expect(error.message).toEqual(`A collection with that identifier already exists.`);
        }
        await collection.destroy();
    });
    it("should be able to list my collections", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let collection = await createCollection({ identifier, userId: user.id });

        let collections = await getCollections({ userId: user.id });
        expect(collections.count).toEqual(1);

        await collection.destroy();
    });
    it("should be able to lookup a collection by identifier", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let collection = await createCollection({ identifier, userId: user.id });

        collection = await lookupCollectionByIdentifier({ identifier });
        expect(collection.identifier).toEqual(identifier);

        collection = await lookupCollectionByIdentifier({ identifier, userId: user.id });
        expect(collection.identifier).toEqual(identifier);

        await collection.destroy();
    });
    it("should be able to link a collection to another user", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let collection = await createCollection({ identifier, userId: user.id });

        await linkCollectionToUser({ collectionId: collection.id, userId: users[1].id });
        collection = await lookupCollectionByIdentifier({ identifier });
        expect(collection.users[0].email).toEqual(users[0].email);
        expect(collection.users[1].email).toEqual(users[1].email);

        await collection.destroy();
    });
    it("should be able to delete a collection", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let collection = await createCollection({ identifier, userId: user.id });
        await deleteCollection({ id: collection.id });

        collection = await lookupCollectionByIdentifier({ identifier });
        expect(collection).toBeNull;
    });
    it("should be able to toggle collection visibility", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let collection = await createCollection({ identifier, userId: user.id });
        expect(collection.identifier).toEqual(identifier);
        expect(collection.data.private).toBeTrue;
        await toggleCollectionVisibility({ collectionId: collection.id });
        await collection.reload();
        expect(collection.data.private).toBeFalse;

        await collection.destroy();
    });
});
