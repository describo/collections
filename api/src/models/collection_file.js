"use strict";

export default function (sequelize, DataTypes) {
    let CollectionFile = sequelize.define(
        "collection_file",
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
            indexes: [
                {
                    unique: true,
                    fields: ["collectionFolderId", "name"],
                },
            ],
        }
    );
    CollectionFile.associate = function (models) {
        CollectionFile.belongsTo(models.collection);
        CollectionFile.belongsTo(models.collection_folder);
    };

    return CollectionFile;
}
