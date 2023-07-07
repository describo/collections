"use strict";

export default function (sequelize, DataTypes) {
    let EntityType = sequelize.define("entity_types", {
        typeId: {
            type: DataTypes.STRING(32),
            allowNull: false,
        },
        entityId: {
            type: DataTypes.STRING(32),
            allowNull: false,
        },
        order: {
            type: DataTypes.INTEGER,
        },
    });
    EntityType.associate = function (models) {};

    return EntityType;
}
