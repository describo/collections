import "regenerator-runtime";
import fetch from "node-fetch";
import { TestSetup, headers, host } from "../common";
import { createSession } from "../lib/session";
import { createNewCollection } from "../lib/admin.js";
import { loadCrateIntoDatabase } from "../lib/crate-tools.js";
import models from "../models/index.js";
import { readJSON } from "fs-extra";
import path from "path";
const chance = require("chance").Chance();

describe("Test the collection lib endpoints", () => {
    let collection, collectionId, user;

    let users, userEmail, adminEmail, configuration, bucket;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });

        user = users.filter((u) => u.administrator);
        collection = await createNewCollection({
            ...{ name: chance.sentence(), code: chance.word() },
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
        await collection.destroy();
    });

    test("it should be able to get all of the entity types in a crate", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/collections/${collectionId}/types`, {
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
        let response = await fetch(`${host}/collections/${collectionId}/entities`, {
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

        response = await fetch(`${host}/collections/${collectionId}/entities?limit=2&offset=3`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(11);
        expect(entities).toEqual(["#BBBB", "#Person"]);

        // entities of type = Person only
        response = await fetch(`${host}/collections/${collectionId}/entities?type=Person`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(2);
        expect(entities).toEqual(["#AAAA", "#Person"]);

        // entities matching a query string of Per
        response = await fetch(`${host}/collections/${collectionId}/entities?queryString=Per`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(1);
        expect(entities).toEqual(["#Person"]);

        // match type = Person and query string AAA
        response = await fetch(
            `${host}/collections/${collectionId}/entities?type=Person&queryString=Per`,
            {
                method: "GET",
                headers: headers(session),
            }
        );
        expect(response.status).toEqual(200);
        ({ entities, total } = await response.json());
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(1);
        expect(entities).toEqual(["#Person"]);

        // match type = Person and query string AAA, limit 1, offset 1
        response = await fetch(
            `${host}/collections/${collectionId}/entities?type=Person&queryString=Per&limit=1&offset=1`,
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
});
