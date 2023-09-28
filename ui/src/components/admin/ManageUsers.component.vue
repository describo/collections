<template>
    <div class="flex flex-col space-y-10">
        <div class="flex flex-row">
            <div class="w-64">Select a collection:</div>
            <el-select
                v-model="data.selectedCollection"
                value-key="name"
                clearable
                class="w-full"
                @change="loadCollectionUsers"
            >
                <el-option
                    v-for="item in data.collections"
                    :key="item.code"
                    :label="item.name"
                    :value="item"
                    :value-key="item.code"
                >
                    {{ item.name }} ({{ item.code }})</el-option
                >
            </el-select>
        </div>

        <div class="flex flex-row" v-if="data.selectedCollection">
            <div class="w-64">Add user:</div>
            <el-select
                v-model="data.selectedUser"
                clearable
                filterable
                class="w-full"
                @change="addUserToCollection"
            >
                <el-option
                    v-for="item in data.allUsers"
                    :key="item.id"
                    :value="item"
                    :value-key="item.id"
                >
                    {{ item.givenName }} {{ item.familyName }} ({{ item.email }})
                </el-option>
            </el-select>
        </div>
        <div v-if="data.selectedCollection">
            <div class="w-64">Collection users:</div>

            <el-table :data="data.users">
                <el-table-column prop="givenName" label="Given Name" width="250" />
                <el-table-column prop="familyName" label="Family Name" width="250" />
                <el-table-column prop="email" label="Email" width="250" />
                <el-table-column prop="" label="Actions" width="100">
                    <template #default="scope">
                        <div v-if="scope.row.id !== data.self.id">
                            <el-button type="danger" @click="removeUserFromCollection(scope.row)"
                                ><i class="fas fa-trash"></i
                            ></el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script setup>
import { ElButton, ElSelect, ElOption, ElTable, ElTableColumn } from "element-plus";
import { reactive, inject, onBeforeMount } from "vue";
import { useStore } from "vuex";
const $http = inject("$http");
const $store = useStore();

const data = reactive({
    selectedCollection: undefined,
    collections: [],
    users: [],
    allUsers: [],
    self: $store.state.user,
});

onBeforeMount(async () => {
    await loadCollections();
    await loadAllUsers();
});

async function loadCollections() {
    let response = await $http.get({ route: "/admin/collections" });
    if (response.status === 200) {
        response = await response.json();
        data.collections = response.collections;
    }
}

async function loadAllUsers() {
    let response = await $http.get({ route: "/admin/users" });
    if (response.status === 200) {
        response = await response.json();
        data.allUsers = response.users.filter((u) => u.id !== data.self.id);
    }
}

async function loadCollectionUsers() {
    let response = await $http.get({
        route: `/admin/collections/${data.selectedCollection.code}/users`,
        body: data.form,
    });
    if (response.status === 200) {
        response = await response.json();
        data.users = response.users;
    }
}

async function addUserToCollection(user) {
    let response = await $http.post({
        route: `/admin/collections/${data.selectedCollection.code}/attach-user/${user.id}`,
        body: {},
    });
    if (response.status === 200) {
        await loadCollectionUsers();
    }
}

async function removeUserFromCollection(user) {
    let response = await $http.post({
        route: `/admin/collections/${data.selectedCollection.code}/detach-user/${user.id}`,
        body: {},
    });
    if (response.status === 200) {
        await loadCollectionUsers();
    }
}
</script>
