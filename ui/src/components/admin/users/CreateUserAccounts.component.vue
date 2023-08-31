<template>
    <div class="flex flex-col space-y-4">
        <div class="text-gray-700">Create user accounts in the workspace.</div>
        <div class="flex flex-col space-y-6">
            <div v-for="(user, idx) of data.users">
                <div class="flex flex-row w-full space-x-1">
                    <div class="w-full">
                        <el-input v-model="user.givenName" placeholder="Given Name"></el-input>
                    </div>
                    <div class="w-full">
                        <el-input v-model="user.familyName" placeholder="Family Name"></el-input>
                    </div>
                    <div class="w-full">
                        <el-input type="email" v-model="user.email" placeholder="Email"></el-input>
                    </div>
                </div>
                <div
                    v-if="!user.givenName || !user.familyName || !user.email"
                    class="text-sm text-red-400"
                >
                    Fill in all fields to create this user account.
                </div>
            </div>
        </div>
        <div class="flex flex-row space-x-4">
            <div>
                <el-button @click="addUser" type="primary">
                    <i class="fa-solid fa-plus"></i>
                    &nbsp;add user
                </el-button>
            </div>
            <div>
                <el-button @click="createUserAccounts" type="primary">Allow these users</el-button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ElButton, ElInput, ElMessage } from "element-plus";
import { reactive, inject } from "vue";
const $http = inject("$http");

const data = reactive({
    error: false,
    users: [{ givenName: undefined, familyName: undefined, email: undefined }],
    emailRegex:
        /(?:[a-z0-9+!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
});
async function createUserAccounts() {
    const accounts = [];
    data.users.forEach((user) => {
        if (user.givenName && user.familyName && user.email && user.email.match(data.emailRegex)) {
            accounts.push(user);
        }
    });

    if (accounts.length) {
        let response = await $http.post({
            route: `/admin/users`,
            body: { accounts },
        });
        if (response.status !== 200) {
            ElMessage.error(`There was a problem creating the accounts.`);
            return;
        } else {
            ElMessage.success(`User accounts created`);
            data.users = [];
        }
    }
}

async function addUser() {
    data.users.push({ givenName: undefined, familyName: undefined, email: undefined });
}
</script>
