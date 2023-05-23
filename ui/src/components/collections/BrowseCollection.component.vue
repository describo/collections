<template>
    <div class="flex flex-col space-y-4 flex-grow">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>Search for an entity</span>
                </div>
            </template>
            <el-autocomplete
                class="w-full"
                v-model="data.queryString"
                :fetch-suggestions="lookupEntity"
                clearable
                placeholder="Search for an entity to work with"
                @select="loadEntity"
            >
                <template #default="{ item }">
                    {{ item["@id"] }} {{ item["@type"] }}: {{ item.name }}
                </template>
            </el-autocomplete>
        </el-card>
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <span>Browse Entities By Type</span>
                </div>
            </template>
            <div class="flex flex-row">
                <el-select
                    class="w-full"
                    v-model="data.selectedEntityType"
                    clearable
                    filterable
                    @change="getEntities"
                >
                    <el-option
                        v-for="item in data.entityTypes"
                        :key="item.id"
                        :label="item.name"
                        :value="item.name"
                    />
                </el-select>
                <div class="flex-grow"></div>
                <el-pagination
                    :page-size="data.limit"
                    layout="prev, pager, next, total"
                    :total="data.total"
                    @current-change="pageEntities"
                />
            </div>
            <el-table :data="data.entities" style="width: 100%" @row-click="loadEntity">
                <el-table-column prop="@id" label="@id" width="300">
                    <template #default="scope">
                        <div class="hover:cursor-pointer">{{ scope.row["@id"] }}</div>
                    </template>
                </el-table-column>
                <el-table-column prop="@type" label="@type" width="300">
                    <template #default="scope">
                        <div class="hover:cursor-pointer">{{ scope.row["@type"] }}</div>
                    </template>
                </el-table-column>
                <el-table-column prop="name" label="Name">
                    <template #default="scope">
                        <div class="hover:cursor-pointer">{{ scope.row.name }}</div>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<script setup>
import {
    ElCard,
    ElButton,
    ElAutocomplete,
    ElSelect,
    ElOption,
    ElPagination,
    ElTable,
    ElTableColumn,
} from "element-plus";
import { reactive, inject, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
// import { useStore } from "vuex";
// import { debounce } from "lodash";
const $route = useRoute();
const $router = useRouter();
// const $store = useStore();
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
        route: `/collections/${$route.params.code}/types`,
    });
    if (response.status !== 200) return;
    response = await response.json();
    data.entityTypes = [...response.types];
}

async function getEntities() {
    let offset = (data.page - 1) * data.limit;
    let response = await $http.get({
        route: `/collections/${$route.params.code}/entities`,
        params: {
            type: data.selectedEntityType,
            offset,
            limit: data.limit,
        },
    });
    if (response.status !== 200) return;
    response = await response.json();
    data.entities = [...response.matches];
    data.total = response.total;
}
function pageEntities(page) {
    data.page = page;
    getEntities();
}
async function lookupEntity(query, cb) {
    if (query.length < 4) return cb([]);
    let response = await $http.get({
        route: `/collections/${$route.params.code}/entities`,
        params: { queryString: query },
    });
    if (response.status !== 200) return cb([]);
    response = await response.json();
    return cb(response.matches);
}
async function loadEntity({ describoId, label }) {
    $router.push({ name: "collections.entity", query: { describoId } });
}
</script>
