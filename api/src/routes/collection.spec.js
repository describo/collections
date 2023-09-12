import "regenerator-runtime";
import fetch from "node-fetch";
import { TestSetup, headers, host, getS3Handle } from "../common";
import { createSession } from "../lib/session";
import { createNewCollection } from "../lib/admin.js";
import { loadCrateIntoDatabase } from "../lib/crate-tools.js";
import models from "../models/index.js";
import { isEmpty } from "lodash";
import { readJSON } from "fs-extra";
import path from "path";
const chance = require("chance").Chance();

describe("Test the collection route endpoints", () => {
    let collection, collectionId, user;

    let users, userEmail, adminEmail, configuration, bucket;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });

        user = users.filter((u) => u.administrator);
        const code = chance.word();
        collection = await createNewCollection({
            ...{ name: chance.sentence(), code, bucket: code },
            user,
        });
        collectionId = collection.id;

        const crate = await readJSON(
            path.join(__dirname, "../../../data/TEST/ro-crate-metadata.json")
        );
        await loadCrateIntoDatabase({ collectionId, crate });
    });
    afterAll(async () => {
        for (let user of users) {
            await models.user.destroy({ where: { id: user.id } });
        }
        await models.type.destroy({ where: { collectionId } });
        await models.property.destroy({ where: { collectionId } });
        await models.entity.destroy({ where: { collectionId } });
        await models.collection_file.destroy({ where: { collectionId } });
        await models.collection_folder.destroy({ where: { collectionId } });
        await collection.destroy();
    });

    test("it should be able to get the collection profile (also checks collection access middleware)", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/collections/${collection.code}/profile`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        let { profile } = await response.json();
        expect(isEmpty(profile)).toBe(false);
        expect(Object.keys(profile.classes).sort()).toEqual([
            "ArchivalResource",
            "ArchivalResourceRelationship",
            "CreativeWork",
            "Dataset",
            "DigitalObject",
            "DigitalObjectRelationship",
            "DigitalObjectVersion",
            "Entity",
            "Function",
            "FunctionRelationship",
            "Hotel",
            "Organisation",
            "Person",
            "PublishedResource",
            "Relationship",
            "Thing",
            "URL",
        ]);
    });
    test("it should be able to the users' collections", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/collections`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        let { collections, total } = await response.json();
        expect(total).toEqual(1);
        expect(collections.length).toEqual(1);
    });
    test("it should be able to get all of the entity types in a crate", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/collections/${collection.code}/types`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        let { types } = await response.json();
        types = types.map((t) => t.name).sort();
        expect(types).toEqual([
            "CreativeWork",
            "Dataset",
            "Entity",
            "Hotel",
            "Organisation",
            "Person",
            "Thing",
            "URL",
        ]);
    });
    test("it should be able to lookup entities in the crate", async () => {
        // empty query params
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/collections/${collection.code}/entities`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        let { entities, total } = await response.json();
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(11);
        expect(entities).toEqual([
            "#AAAA",
            "#BBBB",
            "#Hotel",
            "#Organisation",
            "#Person",
            "./",
            "https://w3id.org/ro/crate/1.1",
            "ro-crate-metadata.json",
        ]);

        response = await fetch(`${host}/collections/${collection.code}/entities?limit=2&offset=3`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(11);

        // entities of type = Person only
        response = await fetch(`${host}/collections/${collection.code}/entities?type=Person`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(2);

        // entities matching a query string of Per
        response = await fetch(`${host}/collections/${collection.code}/entities?queryString=Per`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(1);

        // match type = Person and query string AAA
        response = await fetch(
            `${host}/collections/${collection.code}/entities?type=Person&queryString=Per`,
            {
                method: "GET",
                headers: headers(session),
            }
        );
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(1);

        // match type = Person and query string AAA, limit 1, offset 1
        response = await fetch(
            `${host}/collections/${collection.code}/entities?type=Person&queryString=Per&limit=1&offset=1`,
            {
                method: "GET",
                headers: headers(session),
            }
        );
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(1);
        expect(entities).toEqual([]);
    });
    test("it should be able to lookup entities in the crate", async () => {
        // empty query params
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(
            `${host}/collections/${collection.code}/entities/${encodeURIComponent("./")}`,
            {
                method: "GET",
                headers: headers(session),
            }
        );
        expect(response.status).toEqual(200);
        let { entity } = await response.json();
        expect(entity).toMatchObject({
            "@id": "./",
            "@type": ["Dataset"],
            name: "My Research Object Crate",
        });

        response = await fetch(
            `${host}/collections/${collection.code}/entities/${encodeURIComponent("#AAAA")}`,
            {
                method: "GET",
                headers: headers(session),
            }
        );
        expect(response.status).toEqual(200);
        ({ entity } = await response.json());

        expect(entity).toMatchObject({
            "@id": "#AAAA",
            "@type": ["Entity", "Person"],
            name: "AAAA",
        });
    });
    test("it should be able to create and lookup folders in the collection", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a root folder
        let response = await fetch(`${host}/collections/${collection.code}/folder`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({ path: "/" }),
        });

        // create a child folder /aa
        response = await fetch(`${host}/collections/${collection.code}/folder`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({ path: "/aa" }),
        });

        // create a child folder /aa/bb
        response = await fetch(`${host}/collections/${collection.code}/folder`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({ path: "/aa/bb" }),
        });

        // create some file entries
        //  - these are the DB entries of files that have been uploaded
        response = await fetch(`${host}/collections/${collection.code}/file`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({ path: "/file.json" }),
        });
        response = await fetch(`${host}/collections/${collection.code}/file`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({ path: "/aa/file.json" }),
        });
        response = await fetch(`${host}/collections/${collection.code}/file`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({ path: "/aa/bb/file.json" }),
        });

        // query the root folder
        response = await fetch(`${host}/collections/${collection.code}/folder?path=/`, {
            method: "GET",
            headers: headers(session),
        });
        expect(await response.json()).toEqual({
            path: "/",
            children: [
                { name: "aa", type: "folder" },
                { name: "file.json", type: "file" },
            ],
        });

        // query /aa
        response = await fetch(`${host}/collections/${collection.code}/folder?path=/aa`, {
            method: "GET",
            headers: headers(session),
        });
        expect(await response.json()).toEqual({
            path: "/aa",
            children: [
                { name: "bb", type: "folder" },
                { name: "file.json", type: "file" },
            ],
        });

        // query /aa/bb
        response = await fetch(`${host}/collections/${collection.code}/folder?path=/aa/bb`, {
            method: "GET",
            headers: headers(session),
        });
        expect(await response.json()).toEqual({
            path: "/aa/bb",
            children: [{ name: "file.json", type: "file" }],
        });

        // delete folder /aa
        response = await fetch(`${host}/collections/${collection.code}/folder?path=/aa`, {
            method: "DELETE",
            headers: headers(session),
        });

        // query the root folder
        response = await fetch(`${host}/collections/${collection.code}/folder?path=/`, {
            method: "GET",
            headers: headers(session),
        });
        expect(await response.json()).toEqual({
            path: "/",
            children: [{ name: "file.json", type: "file" }],
        });

        // query /aa
        response = await fetch(`${host}/collections/${collection.code}/folder?path=/aa`, {
            method: "GET",
            headers: headers(session),
        });
        expect(await response.status).toEqual(400);
    });
    test.skip("it should be able to store / get a profile for a collection", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // get the default profile
        let response = await fetch(`${host}/profile/default`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        let { profile } = await response.json();

        // set it as the collection profile
        response = await fetch(`${host}/profile/${collection.code}`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({ profile }),
        });
        expect(response.status).toEqual(200);

        //  then retrieve it and confirm it's the same as what we put in
        response = await fetch(`${host}/profile/${collection.code}`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.profile).toMatchObject(profile);
    });
});
