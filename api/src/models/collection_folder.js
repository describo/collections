"use strict";

export default function (sequelize, DataTypes) {
    let CollectionFolder = sequelize.define(
        "collection_folder",
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
        },
        {
            timestamps: true,
        }
    );
    CollectionFolder.associate = function (models) {
        CollectionFolder.belongsTo(models.collection);
        CollectionFolder.hasMany(models.collection_file, { as: "file" });
        CollectionFolder.belongsToMany(models.collection_folder, {
            through: "collection_folder_children",
            as: "childFolders",
        });
    };

    return CollectionFolder;
}
