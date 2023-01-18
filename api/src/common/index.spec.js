import { getUserTempLocation } from "./";
import { remove } from "fs-extra";

describe("common tests", () => {
    it(`should be able to get a temp location for a user`, async () => {
        let tempdir = await getUserTempLocation({ userId: "xxx" });
        expect(tempdir).toEqual("/srv/tmp/xxx");
        await remove(tempdir);
    });
    it(`should throw trying to get a temp location for a user`, async () => {
        try {
            let tempdir = await getUserTempLocation({});
        } catch (error) {
            expect(error.message).toEqual(`'userId' must be provided`);
        }
    });
});
