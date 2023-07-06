import "regenerator-runtime";
import fetch from "node-fetch";
import { TestSetup, headers, host } from "../common";
import { createSession } from "../lib/session";
import models from "../models/index.js";
import { readJSON } from "fs-extra";
import path from "path";

describe("Test the admin endpoints", () => {
    let users, userEmail, adminEmail, configuration, bucket;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    afterAll(async () => {
        for (let user of users) {
            await models.user.destroy({ where: { id: user.id } });
        }
    });
    test("it should be able to create new collections without duplicates", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let response = await fetch(`${host}/admin/collections/create`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                name: "x",
                code: "y",
            }),
        });
        expect(response.status).toEqual(200);

        let { collection } = await response.json();
        expect(collection).toMatchObject({ name: "x", code: "y" });

        // create it again
        response = await fetch(`${host}/admin/collections/create`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                name: "x",
                code: "y",
            }),
        });
        expect(response.status).toEqual(200);
        let collections = await models.collection.findAll();
        expect(collections.length).toEqual(1);

        // create a different collection
        response = await fetch(`${host}/admin/collections/create`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                name: "a",
                code: "b",
            }),
        });
        expect(response.status).toEqual(200);
        collections = await models.collection.findAll();
        expect(collections.length).toEqual(2);

        for (let collection of collections) {
            await models.collection.destroy({ where: { id: collection.id } });
        }
    });
    test("it should be able to get all collections", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let response = await fetch(`${host}/admin/collections/create`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                name: "x",
                code: "y",
            }),
        });
        expect(response.status).toEqual(200);

        // test getting all collections
        response = await fetch(`${host}/admin/collections`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

        let { total, collections } = await response.json();
        expect(total).toEqual(1);
        expect(collections.length).toEqual(1);

        // test getting a subset with limit
        response = await fetch(`${host}/admin/collections?limit=0`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        ({ total, collections } = await response.json());
        expect(total).toEqual(1);
        expect(collections.length).toEqual(0);

        // test getting a subset with limit at an offset
        // test getting a subset with limit
        response = await fetch(`${host}/admin/collections?limit=0&offset=10`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        ({ total, collections } = await response.json());
        expect(total).toEqual(1);
        expect(collections.length).toEqual(0);

        await models.collection.destroy({ where: { name: "x" } });
    });
    test("it should be able to retrieve the users of a collection", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let response = await fetch(`${host}/admin/collections/create`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                name: "x",
                code: "y",
            }),
        });
        expect(response.status).toEqual(200);
        let { collection } = await response.json();

        response = await fetch(`${host}/admin/collections/${collection.id}/users`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.users.length).toEqual(1);

        await models.collection.destroy({ where: { id: collection.id } });
    });
    test("it should be able to attach and detach users from a collection", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let response = await fetch(`${host}/admin/collections/create`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                name: "x",
                code: "y",
            }),
        });
        expect(response.status).toEqual(200);
        let { collection } = await response.json();

        // detach the admin user
        response = await fetch(
            `${host}/admin/collections/${collection.id}/detach-user/${user.id}`,
            {
                method: "POST",
                headers: headers(session),
                body: JSON.stringify({}),
            }
        );
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/admin/collections/${collection.id}/users`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.users.length).toEqual(0);

        // attach the admin user
        response = await fetch(
            `${host}/admin/collections/${collection.id}/attach-user/${user.id}`,
            {
                method: "POST",
                headers: headers(session),
                body: JSON.stringify({}),
            }
        );
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/admin/collections/${collection.id}/users`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.users.length).toEqual(1);

        await models.collection.destroy({ where: { id: collection.id } });
    });
    test.only("it should be able to load a very basic ro crate into a collection", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let response = await fetch(`${host}/admin/collections/create`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                name: "x",
                code: "y",
            }),
        });
        expect(response.status).toEqual(200);
        let { collection } = await response.json();
        const collectionId = collection.id;

        const crate = await readJSON(
            path.join(__dirname, "../../../data/TEST/ro-crate-metadata.json")
        );

        response = await fetch(`${host}/admin/collections/${collectionId}/load-data`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({ crate }),
        });
        expect(response.status).toEqual(200);

        let entities = await models.entity.findAll({ where: { collectionId } });
        expect(entities.length).toEqual(8);

        await models.type.destroy({ where: { collectionId } });
        await models.property.destroy({ where: { collectionId } });
        await models.entity.destroy({ where: { collectionId } });
        await models.collection.destroy({ where: { id: collection.id } });
    });
});
