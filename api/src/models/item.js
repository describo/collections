"use strict";

export default function (sequelize, DataTypes) {
    let Item = sequelize.define(
        "item",
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            identifier: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            data: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            publicationStatus: {
                type: DataTypes.ENUM("inProgress", "awaitingReview", "published", "needsWork"),
                allowNull: true,
                defaultValue: "inProgress",
            },
            publicationStatusLogs: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            accessType: {
                type: DataTypes.ENUM("open", "restricted"),
                allowNull: true,
            },
            accessNarrative: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            accessControlList: {
                type: DataTypes.JSON,
                allowNull: true,
            },
        },
        {
            timestamps: true,
        }
    );
    Item.associate = function (models) {
        Item.belongsToMany(models.user, {
            through: "item_users",
        });
        Item.hasMany(models.task, { onDelete: "cascade", hooks: true });
        Item.belongsToMany(models.collection, { through: "collection_items" });
    };

    return Item;
}
