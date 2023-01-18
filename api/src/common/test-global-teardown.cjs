const { copy, pathExists, remove } = require("fs-extra");
module.exports = async () => {
    if (await pathExists("/srv/configuration/development-configuration.json.backup")) {
        await copy(
            "/srv/configuration/development-configuration.json.backup",
            "/srv/configuration/development-configuration.json"
        );
    }
    await remove("/srv/configuration/development-configuration.json.backup");
};
