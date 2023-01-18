import { specialFiles } from "../common/index.js";
import path from "path";
import mime from "mime-types";
import lodashPkg from "lodash";
const { difference } = lodashPkg;

// TODO: this code does not have tests
export async function registerAllFiles({ store, crate }) {
    // get list of files in the bucket
    let files = (await store.listResources()).filter((file) => {
        return !specialFiles.includes(file.Key);
    });
    files = files.filter((file) => !file.Key.match(/^\./));
    if (!files.length) return crate;

    // determine which files not already registered in the crate
    const filesInBucket = files.map((file) => file.Key);
    const filesInCrate = crate["@graph"]
        .filter((entity) => entity["@type"] === "File")
        .map((entity) => entity["@id"]);
    const filesToAdd = difference(filesInBucket, filesInCrate);

    // add an entry for each missing file
    for (let file of filesToAdd) {
        file = files.filter((f) => f.Key === file)[0];
        let entity = {
            "@id": file.Key,
            "@type": "File",
            name: file.Key,
            contentSize: file.Size,
            dateModified: file.LastModified,
            "@reverse": {
                hasPart: [{ "@id": "./" }],
            },
        };
        crate.addEntity(entity);
        let parts = crate.rootDataset.hasPart;
        parts.push({ "@id": entity["@id"] });
        crate.rootDataset.hasPart = parts;
    }

    // set the mimetype on all files in the crate
    let entities = crate.entities();
    for (let entity of entities) {
        if (crate.hasType(entity, "File")) {
            entity = { encodingFormat: getMimeType(entity["@id"]), ...entity };
            crate.addEntity(entity, true);
        }
    }

    // upload the new crate file
    return crate;

    function getMimeType(filename) {
        let mimetype = mime.lookup(filename);
        if (!mimetype) {
            switch (path.extname(filename)) {
                case "eaf":
                case "flextext":
                case "trs":
                case "ixt":
                    mimetype = "applcation/xml";
            }
        }
        return mimetype;
    }
}

export function getContext() {
    return [
        "https://w3id.org/ro/crate/1.1/context",
        "http://purl.archive.org/language-data-commons/context.json",
        {
            "@vocab": "http://schema.org/",
        },
        {
            "@base": null,
        },
    ];
}

export function createDefaultROCrateFile({ name }) {
    return {
        "@context": getContext(),
        "@graph": [
            {
                "@id": "ro-crate-metadata.json",
                "@type": "CreativeWork",
                conformsTo: {
                    "@id": "https://w3id.org/ro/crate/1.1/context",
                },
                about: {
                    "@id": "./",
                },
            },
            {
                "@id": "./",
                "@type": "Dataset",
                name: name,
            },
        ],
    };
}
