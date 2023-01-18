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
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            code: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            profile: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
        },
        {
            timestamps: true,
        }
    );
    Collection.associate = function (models) {
        Collection.belongsToMany(models.user, { through: "user_collection" });
        Collection.belongsToMany(models.entity, { through: "entity_collection" });
    };

    return Collection;
}
