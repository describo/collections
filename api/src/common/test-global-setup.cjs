const { copy, pathExists } = require("fs-extra");

module.exports = async () => {
    if (!(await pathExists("/srv/configuration/development-configuration.json.backup"))) {
        await copy(
            "/srv/configuration/development-configuration.json",
            "/srv/configuration/development-configuration.json.backup"
        );
    }
    await copy(
        "/srv/configuration/testing-configuration.json",
        "/srv/configuration/development-configuration.json"
    );
};
