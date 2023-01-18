"use strict";

export default function (sequelize, DataTypes) {
    let User = sequelize.define(
        "user",
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isEmail: true,
                },
                unique: true,
            },
            givenName: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            familyName: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            identifier: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            provider: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            locked: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                default: false,
            },
            upload: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                default: false,
            },
            administrator: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                default: false,
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
    User.associate = function (models) {
        User.hasOne(models.session, { onDelete: "CASCADE" });
        User.belongsToMany(models.item, {
            through: "item_users",
        });
        User.belongsToMany(models.collection, {
            through: "collection_users",
        });
    };

    return User;
}
