require("regenerator-runtime");
import { createUser } from "../lib/user";
import models from "../models";
const chance = require("chance").Chance();
import fetch from "node-fetch";
import { createSession } from "../lib/session";
import { TestSetup, headers, host } from "../common";

describe("User management route tests as admin", () => {
    let users, userEmail, adminEmail;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
    });
    it("a user should be able to get own information ", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        let response = await fetch(`${host}/users/self`, {
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.user.email).toEqual(user.email);
    });
    it("should be able to get a list of users", async () => {
        // expect to find two users
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        let response = await fetch(`${host}/admin/users`, {
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.users.length).toEqual(2);
    });
    it("should be able to invite users", async () => {
        let email = chance.email();

        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin/users`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({ emails: [email] }),
        });
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/admin/users`, {
            headers: headers(session),
        });
        response = await response.json();
        await models.user.destroy({ where: { email } });
    });
    it("should be able to toggle a user capability", async () => {
        let user = users.filter((u) => u.administrator)[0];
        let user2 = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        let response = await fetch(`${host}/admin/users/${user2.id}/upload`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({}),
        });
        expect(response.status).toEqual(200);
        user = await models.user.findOne({ where: { id: user.id } });
        expect(user.upload).toEqual(false);
    });
    it("should be able to delete a user", async () => {
        let user = users.filter((u) => u.administrator)[0];
        let user2 = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin/users/${user2.id}`, {
            method: "DELETE",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        user = await models.user.findOne({ where: { id: user2.id } });
        expect(user).toEqual(null);
    });
});
