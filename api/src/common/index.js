export { loadConfiguration, loadProfile, filterPrivateInformation } from "./configuration.js";
export { getLogger, logEvent, log } from "./logger.js";
export { submitTask, registerTask } from "./task.js";
export { getS3Handle, getStoreHandle } from "./getS3Handle.js";
export {
    demandAuthenticatedUser,
    demandAdministrator,
    requireCollectionAccess,
    requireItemAccess,
} from "./middleware.js";
export { generateToken, verifyToken } from "./jwt.js";
export {
    host,
    headers,
    TestSetup,
    generateLogs,
    setupTestItem,
    setupTestCollection,
} from "./test-utils.js";

export const completedResources = ".completed-resources.json";
export const specialFiles = [
    "LICENCE.md",
    "LICENCE.txt",
    "LICENCE",
    "ro-crate-metadata.json",
    "-digivol.csv",
    "-tei.xml",
    "nocfl.identifier.json",
    "nocfl.inventory.json",
    completedResources,
];
export const imageExtensions = ["jpe?g", "png", "webp", "tif{1,2}"];
export const webFormats = [{ ext: "jpg", match: "jpe?g" }, "webp"];
export const authorisedUsersFile = ".authorised-users.json";

import path from "path";
import { getS3Handle } from "./getS3Handle.js";
import { ensureDir } from "fs-extra";

export async function getUserTempLocation({ userId }) {
    if (!userId) {
        throw new Error(`'userId' must be provided`);
    }
    let tempdir = path.join("/srv", "tmp", userId);
    await ensureDir(tempdir);
    return tempdir;
}

export async function loadFiles({ prefix, continuationToken }) {
    let { bucket } = await getS3Handle();
    let resources = await bucket.listObjects({ prefix, continuationToken });
    if (resources.NextContinuationToken) {
        return [
            ...resources.Contents,
            ...(await loadFiles({ prefix, continuationToken: resources.NextContinuationToken })),
        ];
    } else {
        return resources.Contents;
    }
}

export async function listObjects({ prefix, continuationToken }) {
    let { bucket } = await getS3Handle();
    let resources = await bucket.listObjects({ prefix, continuationToken });
    if (resources.NextContinuationToken) {
        return [
            ...resources.Contents?.filter((r) => r.Key.match(/nocfl\.identifier\.json/)).map(
                (r) => {
                    return path.basename(path.dirname(r.Key));
                }
            ),
            ...(await listObjects({ prefix, continuationToken: resources.NextContinuationToken })),
        ];
    } else {
        return resources.Contents?.filter((r) => r.Key.match(/nocfl\.identifier\.json/)).map(
            (r) => {
                return path.basename(path.dirname(r.Key));
            }
        );
    }
}
