"use strict";

export default function (sequelize, DataTypes) {
    let Property = sequelize.define(
        "property",
        {
            id: {
                primaryKey: true,
                type: DataTypes.STRING(32),
                allowNull: false,
            },
            property: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            value: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            valueStringified: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            timestamps: true,
            indexes: [
                {
                    fields: ["entityId"],
                },
                {
                    fields: ["targetEntityId"],
                },
            ],
        }
    );
    Property.associate = function (models) {
        Property.belongsTo(models.entity);
        Property.belongsTo(models.entity, { as: "targetEntity" });
        Property.belongsTo(models.collection);
    };

    return Property;
}
