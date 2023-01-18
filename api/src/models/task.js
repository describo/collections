"use strict";

export default function (sequelize, DataTypes) {
    let Task = sequelize.define(
        "task",
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            status: {
                type: DataTypes.ENUM("in progress", "done", "failed"),
                defaultValue: "in progress",
            },
            resource: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            data: {
                type: DataTypes.JSON,
                allowNull: true,
            },
        },
        {
            timestamps: true,
        }
    );
    Task.associate = function (models) {
        Task.belongsTo(models.item);
    };

    return Task;
}
