import { loadConfiguration } from "./configuration.js";
import { S3, Bucket } from "./s3.js";
// import { Store } from "@coedl/nocfl-js";

export async function getS3Handle({ bucket }) {
    const configuration = await loadConfiguration();
    let s3 = configuration.api.services.s3;

    let params = {
        accessKeyId: s3.awsAccessKeyId,
        secretAccessKey: s3.awsSecretAccessKey,
        region: s3.region,
    };
    if (s3.endpointUrl && s3.forcePathStyle) {
        params.endpoint = s3.endpointUrl;
        params.forcePathStyle = s3.forcePathStyle;
    }
    s3 = new S3(params);
    if (bucket) {
        params.bucket = bucket;
        bucket = new Bucket(params);
        return { s3, bucket };
    }
    if (configuration.api.services.s3.bucket) {
        params.bucket = configuration.api.services.s3.bucket;
        bucket = new Bucket(params);
        return { s3, bucket };
    }
    return { s3 };
}

// export async function getStoreHandle({ id, identifier, type, location = "repository" }) {
//     if (!id && !identifier) {
//         throw new Error(`'id' or 'identifier' must be defined`);
//     }
//     const configuration = await loadConfiguration();
//     let s3 = configuration.api.services.s3;
//     let credentials = {
//         bucket: s3.bucket,
//         accessKeyId: s3.awsAccessKeyId,
//         secretAccessKey: s3.awsSecretAccessKey,
//         region: s3.region,
//     };
//     if (s3.endpointUrl && s3.forcePathStyle) {
//         credentials.endpoint = s3.endpointUrl;
//         credentials.forcePathStyle = s3.forcePathStyle;
//     }
//     id = id ? id : identifier;
//     return new Store({
//         id,
//         type,
//         prefix: `${configuration.api.domain}/${location}`,
//         credentials,
//     });
// }
