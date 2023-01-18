import models from "../models/index.js";
import { Op } from "sequelize";

export async function getLogs({ limit = 10, offset = 0, level, dateFrom, dateTo }) {
    let where = {};
    if (level) {
        where.level = level;
    }
    if (dateFrom && dateTo) {
        where.createdAt = {
            [Op.between]: [dateFrom, dateTo],
        };
    }
    let entries = await models.log.findAndCountAll({
        offset,
        limit,
        where,
        order: [["createdAt", "DESC"]],
    });
    return entries;
}
