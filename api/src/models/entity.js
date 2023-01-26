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
            etype: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            name: {
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
                    fields: ["collectionId", "etype"],
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
    };

    return Entity;
}
