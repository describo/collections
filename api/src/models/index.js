"use strict";

import Sequelize from "sequelize";
import user from "./user.js";
import session from "./session.js";
import item from "./item.js";
import collection from "./collection.js";
import task from "./task.js";
import log from "./log.js";
import itemUser from "./item_user.js";

const models = {};

let config = {
    db: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: "postgres",
        database: process.env.DB_DATABASE,
        logging: false,
    },
    pool: {
        max: 20,
        min: 10,
        acquire: 30000,
        idle: 10000,
    },
};

let sequelize = new Sequelize(
    config.db.database,
    config.db.username,
    config.db.password,
    config.db
);

let modules = [user, session, item, collection, task, log, itemUser];

// Initialize models
modules.forEach((module) => {
    const model = module(sequelize, Sequelize, config);
    models[model.name] = model;
});

// Apply associations
Object.keys(models).forEach((key) => {
    if ("associate" in models[key]) {
        models[key].associate(models);
    }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

export default models;
