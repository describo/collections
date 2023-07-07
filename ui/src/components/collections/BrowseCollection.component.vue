<template>
    <div class="flex flex-col space-y-4 flex-grow">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>Search for an entity by type</span>
                </div>
            </template>
            <div class="flex flex-row">
                <el-select v-model="data.selectedEntityType" clearable filterable>
                    <el-option
                        v-for="item in data.entityTypes"
                        :key="item.id"
                        :label="item.name"
                        :value="item.name"
                    />
                </el-select>

                <el-autocomplete
                    class="w-full flex-grow"
                    v-model="data.queryString"
                    :fetch-suggestions="getEntities"
                    clearable
                    placeholder="Search for an entity to work with"
                    :debounce="500"
                    @select="loadEntity"
                >
                    <template #default="{ item }">
                        {{ item["@id"] }} {{ item["@type"] }}: {{ item.name }}
                    </template>
                </el-autocomplete>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ElCard, ElAutocomplete, ElSelect, ElOption } from "element-plus";
import { reactive, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
const $route = useRoute();
const $router = useRouter();
const $http = inject("$http");

const data = reactive({
    queryString: "",
    selectedEntityType: undefined,
    entityTypes: [],
    entities: [],
    page: 1,
    limit: 10,
    total: 0,
});

getEntityTypes();

async function getEntityTypes() {
    let response = await $http.get({
        route: `/collections/${$route.params.collectionId}/types`,
    });
    if (response.status !== 200) return;
    response = await response.json();
    data.entityTypes = response.types;
}

async function getEntities(query, cb) {
    // if (query.length < 3) return cb([]);
    let offset = (data.page - 1) * data.limit;
    let response = await $http.get({
        route: `/collections/${$route.params.collectionId}/entities`,
        params: {
            type: data.selectedEntityType,
            queryString: query,
            offset,
            limit: data.limit,
        },
    });
    if (response.status !== 200) return;
    response = await response.json();
    data.entities = response.entities;
    data.total = response.total;
    cb(data.entities);
}
async function loadEntity(entity) {
    $router.push({ name: "collections.entity", query: { id: btoa(entity["@id"]) } });
}
</script>
