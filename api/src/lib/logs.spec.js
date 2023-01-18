require("regenerator-runtime");
import models from "../models";
const { getLogs } = require("./logs");
import { generateLogs } from "../common";

describe("Log management tests", () => {
    beforeAll(async () => {
        await models.log.destroy({ where: {} });
    });
    afterEach(async () => {
        await models.log.destroy({ where: {} });
    });
    afterAll(async () => {
        models.sequelize.close();
    });
    test("it should be able to get user logs out of the system", async () => {
        await generateLogs(1, 0, 0);
        let logs = await getLogs({});
        expect(logs.count).toBeGreaterThanOrEqual(1);
        await models.log.destroy({ where: {} });

        await generateLogs(5, 0, 0);
        logs = await getLogs({});
        expect(logs.count).toBeGreaterThanOrEqual(5);
    });
    test("it should be able to page through logs", async () => {
        await generateLogs(1, 0, 0);
        let page1 = await getLogs({});

        await generateLogs(1, 0, 0);
        let page2 = await getLogs({ offset: 0 });
        expect(page1.rows[0].id).not.toEqual(page2.rows[0].id);
    });
    test("it should be able to get logs in a given date range", async () => {
        let dateFrom = new Date().toISOString();
        await generateLogs(1, 0, 0);
        let logs = await getLogs({ dateFrom, dateTo });
        let dateTo = new Date().toISOString();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await generateLogs(1, 0, 0);
        let after = await getLogs({ dateFrom, dateTo });
        expect(logs.rows[0].id).toEqual(after.rows[0].id);
    });
    test("it should be able to get logs of a defined level out", async () => {
        await generateLogs(1, 1, 1);
        let logs = await getLogs({ level: "info" });
        expect(logs.count).toEqual(1);
        expect(logs.rows[0].level).toEqual("info");

        logs = await getLogs({ level: "warn" });
        expect(logs.count).toEqual(1);
        expect(logs.rows[0].level).toEqual("warn");

        logs = await getLogs({ level: "error" });
        expect(logs.count).toEqual(1);
        expect(logs.rows[0].level).toEqual("error");
    });
});
