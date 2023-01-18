"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.addColumn("items", "publicationStatus", {
            type: Sequelize.DataTypes.ENUM(
                "inProgress",
                "awaitingReview",
                "published",
                "needsWork"
            ),
            allowNull: true,
        });
        await queryInterface.addColumn("items", "publicationStatusLogs", {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
        });
        await queryInterface.addColumn("items", "accessType", {
            type: Sequelize.DataTypes.ENUM("open", "restricted"),
            allowNull: true,
        });
        await queryInterface.addColumn("items", "accessNarrative", {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
        });
        await queryInterface.addColumn("items", "accessControlList", {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
        });
        await queryInterface.addColumn("collections", "publicationStatus", {
            type: Sequelize.DataTypes.ENUM(
                "inProgress",
                "awaitingReview",
                "published",
                "needsWork"
            ),
            allowNull: true,
        });
        await queryInterface.addColumn("collections", "publicationStatusLogs", {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
        });
        await queryInterface.addColumn("collections", "accessType", {
            type: Sequelize.DataTypes.ENUM("open", "restricted"),
            allowNull: true,
        });
        await queryInterface.addColumn("collections", "accessNarrative", {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
        });
        await queryInterface.addColumn("collections", "accessControlList", {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.removeColumn("items", "publicationStatus");
        await queryInterface.removeColumn("items", "publicationStatusLogs");
        await queryInterface.removeColumn("items", "accessType");
        await queryInterface.removeColumn("items", "accessNarrative");
        await queryInterface.removeColumn("items", "accessControlList");
        await queryInterface.sequelize.query('DROP TYPE "enum_items_publicationStatus";');
        await queryInterface.sequelize.query('DROP TYPE "enum_items_accessType";');
        await queryInterface.removeColumn("collections", "publicationStatus");
        await queryInterface.removeColumn("collections", "publicationStatusLogs");
        await queryInterface.removeColumn("collections", "accessType");
        await queryInterface.removeColumn("collections", "accessNarrative");
        await queryInterface.removeColumn("collections", "accessControlList");
        await queryInterface.sequelize.query('DROP TYPE "enum_collections_publicationStatus";');
        await queryInterface.sequelize.query('DROP TYPE "enum_collections_accessType";');
    },
};
