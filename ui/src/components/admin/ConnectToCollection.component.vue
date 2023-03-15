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
import { reactive, watch, inject } from "vue";
const $http = inject("$http");

const props = defineProps({
    refresh: {},
});
const $emit = defineEmits(["updated"]);
const data = reactive({
    collections: [],
});
getCollections();
watch(
    () => props.refresh,
    () => {
        getCollections();
    }
);

async function getCollections() {
    let response = await $http.get({ route: "/admin/collections" });
    if (response.status === 200) data.collections = (await response.json()).collections;
    $emit("updated");
}

async function connectToCollection(collection) {
    await $http.post({ route: `/admin/collections/${collection.code}/attach-self` });
}
</script>
