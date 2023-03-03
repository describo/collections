"use strict";

export default function (sequelize, DataTypes) {
    let Entity = sequelize.define(
        "entity",
        {
            id: {
                primaryKey: true,
                type: DataTypes.STRING(32),
                allowNull: false,
            },
            eid: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            name: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            label: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ["collectionId", "eid"],
                },
                {
                    fields: ["collectionId", "name"],
                },
            ],
        }
    );
    Entity.associate = function (models) {
        Entity.belongsTo(models.collection);
        Entity.hasMany(models.property, {
            onDelete: "CASCADE",
            foreignKey: { allowNull: false },
            hooks: true,
        });
        Entity.belongsToMany(models.type, {
            through: "entity_types",
            as: "etype",
            onDelete: "CASCADE",
        });
    };

    return Entity;
}
