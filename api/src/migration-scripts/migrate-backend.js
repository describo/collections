import { getS3Handle, getStoreHandle } from "../common";
import { groupBy } from "lodash";
import path from "path";

main();

async function main() {
    const { bucket } = await getS3Handle();
    let files = await listResources(bucket);

    //  remove .item / .collection files in new hierarchy
    // for (let file of files) {
    //     if (!file.match(/^nyingarn.net/)) continue
    //     if (file.match(/\.item/)) console.log(file)
    //     // if (file.match(/\.item/)) await bucket.removeObjects({ keys: [file]})
    //     if (file.match(/\.collection/)) console.log(file)
    //     // if (file.match(/\.collection/)) await bucket.removeObjects({ keys: [file]})
    // }


    // copy files from old hierarchy to new
    // files = groupBy(files, (file) => path.dirname(file));
    // let items = {};
    // let collections = {};
    // Object.keys(files).forEach((identifier) => {
    //     if (identifier.match(/nyingarn.net/)) return;
    //     if (files[identifier].includes(`${identifier}/.item`))
    //         items[identifier] = files[identifier];
    //     if (files[identifier].includes(`${identifier}/.collection`))
    //         collections[identifier] = files[identifier];
    // });
    // for (let identifier of Object.keys(collections)) {
    //     console.log(`Migrating collection: ${identifier}`);
    //     let store = await getStoreHandle({ id: identifier, className: "collection" });
    //     if (!(await store.itemExists())) {
    //         await store.createItem();
    //     }
    //     for (let file of collections[identifier]) {
    //         console.log(
    //             `Copying '${file} to ${path.join(store.getItemPath(), path.basename(file))}`
    //         );
    //         await bucket.copy({
    //             source: file,
    //             target: path.join(store.getItemPath(), path.basename(file)),
    //         });
    //     }
    // }
    // for (let identifier of Object.keys(items)) {
    //     console.log(`Migrating item: ${identifier}`);
    //     let store = await getStoreHandle({ id: identifier, className: "item" });
    //     if (!(await store.itemExists())) {
    //         await store.createItem();
    //     }
    //     for (let file of items[identifier]) {
    //         console.log(
    //             `Copying '${file} to ${path.join(store.getItemPath(), path.basename(file))}`
    //         );
    //         await bucket.copy({
    //             source: file,
    //             target: path.join(store.getItemPath(), path.basename(file)),
    //         });
    //     }
    // }
}

async function listResources(bucket) {
    listItemResources = listItemResources.bind(this);
    let resources = await listItemResources({});
    resources = resources.map((r) => r.Key);
    return resources;

    async function listItemResources({ continuationToken }) {
        let resources = await bucket.listObjects({
            continuationToken,
        });
        if (resources.NextContinuationToken) {
            return [
                ...resources.Contents,
                ...(await listItemResources({
                    continuationToken: resources.NextContinuationToken,
                })),
            ];
        } else {
            return resources.Contents;
        }
    }
}
