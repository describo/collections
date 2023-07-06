import "regenerator-runtime";
import { readJSON } from "fs-extra";
const chance = require("chance").Chance();
import { createNewCollection } from "./admin.js";
import { loadCrateIntoDatabase } from "./crate-tools";
import { getEntityTypes, getEntities } from "./collection.js";
import path from "path";
import models from "../models/index.js";

describe("Test the collection lib endpoints", () => {
    let collection, collectionId, user;
    beforeAll(async () => {
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
        user = await models.user.create({ ...data.user });
        collection = await createNewCollection({
            ...data.collection,
            user,
        });
        collectionId = collection.id;

        const crate = await readJSON(
            path.join(__dirname, "../../../data/TEST/ro-crate-metadata.json")
        );
        await loadCrateIntoDatabase({ collectionId, crate });
    });
    afterAll(async () => {
        await models.type.destroy({ where: { collectionId } });
        await models.property.destroy({ where: { collectionId } });
        await models.entity.destroy({ where: { collectionId } });
        await collection.destroy();
        await user.destroy();
    });
    test("it should be able to get all of the entity types in a crate", async () => {
        let { types } = await getEntityTypes({ collectionId });
        expect(types.length).toEqual(8);
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
        let { entities, total } = await getEntities({ collectionId });
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

        ({ entities, total } = await getEntities({ collectionId, limit: 2, offset: 3 }));
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(11);
        expect(entities).toEqual(["#BBBB", "#Person"]);

        // entities of type = Person only
        ({ entities, total } = await getEntities({ collectionId, type: "Person" }));
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(2);
        expect(entities).toEqual(["#AAAA", "#Person"]);

        // entities matching a query string of Per
        ({ entities, total } = await getEntities({ collectionId, queryString: "Per" }));
        entities = entities.map((e) => e["@id"]).sort();
        // console.log(entities);
        expect(total).toEqual(1);
        expect(entities).toEqual(["#Person"]);

        // match type = Person and query string AAA
        ({ entities, total } = await getEntities({
            collectionId,
            queryString: "Per",
            type: "Person",
        }));
        entities = entities.map((e) => e["@id"]).sort();
        // console.log(entities);
        expect(total).toEqual(1);
        expect(entities).toEqual(["#Person"]);

        // match type = Person and query string AAA, limit 1, offset 1
        ({ entities, total } = await getEntities({
            collectionId,
            queryString: "Per",
            type: "Person",
            limit: 1,
            offset: 1,
        }));
        entities = entities.map((e) => e["@id"]).sort();
        expect(total).toEqual(1);
        expect(entities).toEqual([]);
    });
});
