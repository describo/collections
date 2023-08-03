export { loadConfiguration, loadProfile, filterPrivateInformation } from "./configuration.js";
export { getLogger, logEvent, log } from "./logger.js";
// export { getS3Handle, getStoreHandle } from "./getS3Handle.js";
export { getS3Handle } from "./getS3Handle.js";
export { demandAuthenticatedUser, demandAdministrator } from "./middleware.js";
export { generateToken, verifyToken } from "./jwt.js";
export { host, headers, TestSetup, generateLogs } from "./test-utils.js";

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
