import { loadConfiguration } from "./configuration.js";
import models from "../models/index.js";

export async function registerTask({ itemId, status, resource, name, data }) {
    const statuses = ["in progress", "done", "failed"];
    if (!status || !statuses.includes(status)) {
        throw new Error(`'status' is required and must be one of '${statuses}'`);
    }
    if (!itemId) {
        throw new Error(`'itemId' is required`);
    }
    try {
        return (await models.task.create({ itemId, status, resource, name, data })).get();
    } catch (error) {
        console.log(error);
        log.error(`Couldn't update tasks table: ${status}: ${text}`);
    }
}

export async function submitTask({ rabbit, configuration, item, name, body }) {
    // let configuration = await loadConfiguration();
    let task = await registerTask({
        itemId: item.id,
        resource: body.resource,
        status: "in progress",
        name,
        data: { resource: body.resource },
    });
    rabbit.publish(configuration.api.processing.exchange, {
        type: name,
        body: { ...body, identifier: item.identifier, task },
    });
    return task;
}
