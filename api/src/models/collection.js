"use strict";

export default function (sequelize, DataTypes) {
    let Collection = sequelize.define(
        "collection",
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
    Collection.associate = function (models) {
        Collection.belongsToMany(models.user, {
            through: "collection_users",
        });
        Collection.belongsToMany(Collection, {
            as: "subCollection",
            through: "collection_subcollections",
        });
        Collection.belongsToMany(models.item, { through: "collection_items" });
    };

    return Collection;
}
