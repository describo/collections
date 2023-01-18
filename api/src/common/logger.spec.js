import "regenerator-runtime";
import { logEvent } from "./logger";
import models from "../models";
describe("Logger tests", () => {
    it("should be able to log an event to the logs table", async () => {
        await models.log.destroy({ where: {} });
        await logEvent({ level: "info", owner: "person@user.com", text: "something or other" });

        let logs = await models.log.findAll();
        expect(logs.length).toEqual(1);
        expect(logs[0].owner).toEqual("person@user.com");
        await models.log.destroy({ where: {} });
    });
    it("should fail - incorrect level", async () => {
        try {
            await logEvent({ level: "nope", owner: "person@user.com", text: "something or other" });
        } catch (error) {
            expect(error.message).toEqual(
                `'level' is required and must be one of 'info,warn,error'`
            );
        }
    });
    it("should fail - text not provided", async () => {
        try {
            await logEvent({
                level: "info",
                owner: "person@user.com",
            });
        } catch (error) {
            expect(error.message).toEqual("'text' is required");
        }
    });
});
