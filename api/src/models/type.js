"use strict";

export default function (sequelize, DataTypes) {
    let Type = sequelize.define(
        "type",
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
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
                    fields: ["collectionId", "name"],
                },
            ],
        }
    );
    Type.associate = function (models) {
        Type.belongsTo(models.collection);
        Type.belongsToMany(models.entity, {
            through: "entity_types",
            as: "entities",
            onDelete: "CASCADE",
        });
    };

    return Type;
}
