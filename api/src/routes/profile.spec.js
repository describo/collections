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

describe("Test the profile route endpoints", () => {
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

    test("it should be able to retrieve the default profile", async () => {
        const user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/profile/default`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        let { profile } = await response.json();
        expect(profile).toMatchObject({
            metadata: {
                name: "OHRM Default Profile",
                description: "A default OHRM profile for Describo Collections",
                version: 0.1,
                warnMissingProperty: true,
            },
            context: [
                "https://w3id.org/ro/crate/1.1/context",
                { ohrm: "http://ohrm.ontology.somewhere" },
            ],
            resolve: [
                {
                    types: ["Relationship", "Related"],
                    properties: ["source", "target"],
                },
            ],
        });
    });
});
