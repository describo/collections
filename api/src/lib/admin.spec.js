import "regenerator-runtime";
import fetch from "node-fetch";
import { createUser } from "../lib/user";
const chance = require("chance").Chance();
import {
    getStoreHandle,
    TestSetup,
    headers,
    host,
    loadConfiguration,
    generateToken,
} from "../common/index.js";
import {
    createNewCollection,
    getAllCollections,
    getCollectionUsers,
    attachUserToCollection,
    detachUserFromCollection,
} from "./admin.js";
import models from "../models/index.js";

describe("Test the admin endpoints", () => {
    test("it should be able to create new collections", async () => {
        let data = [0, 1, 2, 3].map((r) => {
            return {
                user: {
                    email: chance.email(),
                    provider: chance.word(),
                    locked: false,
                    upload: true,
                    administrator: true,
                },
                collection: { name: chance.sentence(), code: chance.word() },
            };
        });
        let cleanup = [];
        for (let d of data) {
            const user = await models.user.create({ ...d.user });
            let collection = await createNewCollection({
                ...d.collection,
                user,
            });
            expect(collection.get()).toMatchObject(d.collection);
            expect(await collection.getUsers()).toMatchObject([d.user]);
            cleanup.push(user);
            cleanup.push(collection);
        }
        for (let m of cleanup) await m.destroy();
    });
    test("it should not create a new collection with the same code as an existing one", async () => {
        const user = await models.user.create({
            email: "a@example.com",
            provider: "b",
            locked: false,
            upload: true,
            administrator: true,
        });
        let collection = await createNewCollection({
            name: "x",
            code: "y",
            user,
        });

        let collection2 = await createNewCollection({
            name: "x",
            code: "y",
            user,
        });
        let collections = await models.collection.findAll();
        expect(collections.length).toEqual(1);
        await user.destroy();
        await collection.destroy();
        await collection2.destroy();
    });
    test("it should be able to get all collections", async () => {
        // setup a bunch of collections
        let data = [0, 1, 2, 3, 4, 5, 6, 7].map((r) => {
            return {
                user: {
                    email: chance.email(),
                    provider: chance.word(),
                    locked: false,
                    upload: true,
                    administrator: true,
                },
                collection: { name: chance.sentence(), code: chance.word() },
            };
        });
        let cleanup = [];
        for (let d of data) {
            const user = await models.user.create({ ...d.user });
            let collection = await createNewCollection({
                ...d.collection,
                user,
            });
            expect(collection.get()).toMatchObject(d.collection);
            expect(await collection.getUsers()).toMatchObject([d.user]);
            cleanup.push(user);
            cleanup.push(collection);
        }

        // test getting all collections
        let { total, collections } = await getAllCollections({});
        expect(total).toEqual(8);
        expect(collections.length).toEqual(8);

        // test getting a subset with limit
        ({ total, collections } = await getAllCollections({ limit: 4 }));
        expect(total).toEqual(8);
        expect(collections.length).toEqual(4);

        // test getting a subset with limit at an offset
        ({ total, collections } = await getAllCollections({ limit: 2, offset: 4 }));
        expect(total).toEqual(8);
        expect(collections.length).toEqual(2);

        for (let m of cleanup) await m.destroy();
    });
    test("it should be able to retrieve the users of a collection", async () => {
        const data = {
            user: {
                email: chance.email(),
                provider: chance.word(),
                locked: false,
                upload: true,
                administrator: true,
            },
            collection: { name: chance.sentence(), code: chance.word() },
        };
        const user = await models.user.create({ ...data.user });
        let collection = await createNewCollection({
            ...data.collection,
            user,
        });
        expect(collection.get()).toMatchObject(data.collection);
        expect(await collection.getUsers()).toMatchObject([data.user]);

        let { users } = await getCollectionUsers({ collectionId: collection.id });
        expect(users.length).toEqual(1);

        await collection.destroy();
        await user.destroy();
    });
    test("it should be able to attach and detach users from a collection", async () => {
        const data = {
            user: {
                email: chance.email(),
                provider: chance.word(),
                locked: false,
                upload: true,
                administrator: true,
            },
            collection: { name: chance.sentence(), code: chance.word() },
        };
        const user = await models.user.create({ ...data.user });
        let collection = await createNewCollection({
            ...data.collection,
            user,
        });
        expect(collection.get()).toMatchObject(data.collection);
        expect(await collection.getUsers()).toMatchObject([data.user]);

        await detachUserFromCollection({ collectionId: collection.id, userId: user.id });
        let { users } = await getCollectionUsers({ collectionId: collection.id });
        expect(users.length).toEqual(0);

        await attachUserToCollection({ collectionId: collection.id, userId: user.id });
        ({ users } = await getCollectionUsers({ collectionId: collection.id }));
        expect(users.length).toEqual(1);

        await collection.destroy();
        await user.destroy();
    });
    test("it should be able to load a very basic ro crate into a collection", async () => {});
});
