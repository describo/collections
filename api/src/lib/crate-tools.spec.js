import "regenerator-runtime";
import { readJSON } from "fs-extra";
const chance = require("chance").Chance();
import { createNewCollection } from "./admin.js";
import { loadCrateIntoDatabase, isMatchingEntity } from "./crate-tools";
import path from "path";
import models from "../models/index.js";

describe("Test the crate tools methods", () => {
    test("it should be able load a very basic crate into the database ", async () => {
        const user = await models.user.create({
            email: chance.email(),
            provider: chance.word(),
            locked: false,
            upload: true,
            administrator: true,
        });
        const collection = await createNewCollection({
            name: "x",
            code: "y",
            user,
        });
        const collectionId = collection.id;
        const crate = await readJSON(
            path.join(__dirname, "../../../data/TEST/ro-crate-metadata.json")
        );
        await loadCrateIntoDatabase({ collectionId, crate });

        const entities = (await models.entity.findAll({ where: { collectionId } })).map((e) =>
            e.get()
        );
        expect(entities.length).toEqual(8);

        const properties = (await models.property.findAll({ where: { collectionId } })).map((e) =>
            e.get()
        );
        expect(properties.length).toEqual(4);

        const types = (await models.type.findAll({ where: { collectionId } })).map((e) => e.get());
        expect(types.length).toEqual(8);

        await models.entity.destroy({ where: { collectionId } });
        await models.property.destroy({ where: { collectionId } });
        await models.type.destroy({ where: { collectionId } });
        await collection.destroy();
        await user.destroy();
    });
    test("it should be able to determine if two entities match or not", () => {
        // they match
        let a = { "@id": "x", "@type": "Person" };
        let b = { "@id": "x", "@type": "Person" };
        expect(isMatchingEntity(a, b)).toEqual(true);

        // they match
        a = { "@id": "x", "@type": "Person" };
        b = { "@id": "x", "@type": ["Person"] };
        expect(isMatchingEntity(a, b)).toEqual(true);

        // they match
        a = { "@id": "x", "@type": ["Person", "Tall"] };
        b = { "@id": "x", "@type": ["Tall", "Person"] };
        expect(isMatchingEntity(a, b)).toEqual(true);

        // they don't match
        a = { "@id": "x", "@type": ["Person", "Tall"] };
        b = { "@id": "y", "@type": ["Tall", "Person"] };
        expect(isMatchingEntity(a, b)).toEqual(false);

        // they don't match
        a = { "@id": "x", "@type": "Person" };
        b = { "@id": "x", "@type": ["Tall", "Person"] };
        expect(isMatchingEntity(a, b)).toEqual(false);
    });
});
