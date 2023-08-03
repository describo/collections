import models from "../models/index.js";

export async function createNewCollection({ name, code, bucket, user }) {
    let collection = await models.collection.findOrCreate({
        where: { code },
        defaults: { name, code, bucket },
    });
    collection = collection[0];
    await collection.addUser(user);
    return collection;
}

export async function getAllCollections({ limit = 10, offset = 0 }) {
    let { rows: collections, count: total } = await models.collection.findAndCountAll({
        attributes: ["id", "name", "code"],
        limit,
        offset,
    });
    return { collections: collections.map((c) => c.get()), total };
}

export async function getCollectionUsers({ collectionId }) {
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    let users = await collection.getUsers({
        attributes: ["id", "email", "givenName", "familyName"],
    });
    return { users };
}

export async function attachUserToCollection({ collectionId, userId }) {
    let user = await models.user.findOne({ where: { id: userId } });
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    await collection.addUser(user);
    return {};
}

export async function detachUserFromCollection({ collectionId, userId }) {
    let user = await models.user.findOne({ where: { id: userId } });
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    await collection.removeUser(user);
    return {};
}
