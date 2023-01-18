"use strict";

export default function (sequelize, DataTypes) {
    let ItemUser = sequelize.define(
        "item_user",
        {
            itemId: DataTypes.UUID,
            userId: DataTypes.UUID,
        },
        {
            timestamps: false,
        }
    );
    ItemUser.associate = function (models) {};

    return ItemUser;
}
