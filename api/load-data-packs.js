import { IndexDataPacks } from "@describo/data-packs";

main();
async function main() {
    const index = new IndexDataPacks({ elasticUrl: "http://elastic:9200", log: true });
    await index.load();
}
