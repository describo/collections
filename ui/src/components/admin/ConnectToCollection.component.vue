<template>
    <el-table :data="data.collections">
        <el-table-column prop="code" label="Code" />
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="" label="actions">
            <template #default="scope">
                <el-button @click="connectToCollection(scope.row)" type="primary"
                    >Connect</el-button
                >
            </template>
        </el-table-column>
    </el-table>
</template>

<script setup>
import { reactive, inject } from "vue";
const $http = inject("$http");

const data = reactive({
    collections: [],
});
getCollections();

async function getCollections() {
    let response = await $http.get({ route: "/collections" });
    if (response.status === 200) data.collections = (await response.json()).collections;
}

async function connectToCollection(collection) {
    await $http.post({ route: `/admin/collections/${collection.id}/attach-self` });
    console.log(collection);
}
</script>
