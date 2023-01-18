"use strict";

export default function (sequelize, DataTypes) {
    let Entity = sequelize.define(
        "entity",
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
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
                type: DataTypes.STRING,
                allowNull: true,
            },
            data: {
                type: DataTypes.JSONB,
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
    };

    return Entity;
}
