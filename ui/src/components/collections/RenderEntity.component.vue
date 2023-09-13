<template>
    <div class="flex flex-col" v-if="data.entity?.['@id']">
        <div class="bg-stone-200 sticky top-0 z-10 p-4 flex flex-row space-x-2">
            <div class="flex flex-col">
                <div class="text-sm">
                    {{ data.entity["@type"].join(", ") }}
                </div>
                <div class="text-lg">
                    {{ data.entity.name }}
                </div>
            </div>
            <div class="flex-grow"></div>
            <div v-if="data.entity['@type'].includes('File')">
                <el-button @click="data.showPreviewDrawer = !data.showPreviewDrawer"
                    ><i class="fa-regular fa-eye"></i
                ></el-button>
            </div>
            <div>
                <el-popconfirm
                    title="Are you sure you want to delete this entity?"
                    width="350"
                    @confirm="deleteEntity"
                >
                    <template #reference>
                        <el-button type="danger">Delete this entity</el-button>
                    </template>
                </el-popconfirm>
            </div>
        </div>
        <div class="overflow-scroll pt-4" :class="panelHeight">
            <!-- <pre>{{ data.entity }}</pre> -->
            <DescriboCrateBuilderComponent
                :entity="data.entity"
                :profile="data.crateManager.profile"
                :crateManager="data.crateManager"
                mode="online"
                :configuration="data.configuration"
                @load:entity="loadEntity"
                @create:property="createProperty"
                @save:property="saveProperty"
                @delete:property="deleteProperty"
                @create:entity="ingestEntity"
                @ingest:entity="ingestEntity"
                @link:entity="linkEntity"
                @unlink:entity="unlinkEntity"
                @update:entity="updateEntity"
            />
        </div>
        <el-drawer
            v-model="data.showPreviewDrawer"
            destroy-on-close
            title=""
            direction="rtl"
            size="50%"
        >
            <ContentViewerComponent :file="data.entity['@id']" class="" />
        </el-drawer>
    </div>
</template>

<script setup>
import { ElMessage, ElButton, ElPopconfirm, ElDrawer } from "element-plus";
// import DescriboCrateBuilderComponent from "@describo/crate-builder-component/src/crate-builder/RenderEntity/Shell.component.vue";
import DescriboCrateBuilderComponent from "/srv/describo/src/crate-builder/RenderEntity/Shell.component.vue";
import { $t, i18next } from "/srv/describo/src/crate-builder/i18n.js";
i18next.changeLanguage("en");

import ContentViewerComponent from "./ContentViewer/Shell.component.vue";

import { reactive, inject, computed, watch, onBeforeMount, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { getCollectionInformation, getProfile } from "./lib.js";
import { debounce } from "lodash";
const $http = inject("$http");
const $route = useRoute();
const $router = useRouter();
const $store = useStore();
const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

const data = reactive({
    showPreviewDrawer: false,
    entity: {},
    crateManager: {
        lookup: new (class {
            async entityTemplates({ type = undefined, queryString = undefined, limit = 5 }) {}
            async entities({
                type = undefined,
                queryString = undefined,
                datapack = undefined,
                limit = 10,
            }) {
                let response = await $http.get({
                    route: `/collections/${$route.params.code}/entities`,
                    params: {
                        type,
                        queryString,
                        limit,
                    },
                });
                response = await response.json();
                return { total: response.total, documents: response.entities };
            }
            async dataPacks({
                type = undefined,
                queryString = undefined,
                datapack = undefined,
                limit = 10,
            }) {
                // let response = await $http.get({
                //     route: `/collections/${$route.params.code}/entities`,
                //     params: {
                //         type,
                //         queryString,
                //         limit,
                //     },
                // });
                // response = await response.json();
                // return { total: response.total, documents: response.entities };
                return { total: 0, documents: [] };
            }
        })(),
    },
    configuration: {
        enableContextEditor: false,
        enableCratePreview: false,
        enableBrowseEntities: false,
        enableTemplateSave: false,
        readonly: false,
        enableTemplateLookups: false,
        enableDataPackLookups: false,
        enableReverseLinkBrowser: false,
        tabLocation: "left",
        resetTabOnEntityChange: true,
        mode: "online",
    },
    debouncedLoadEntity: debounce(loadEntity, 300),
    watcher: undefined,
});
let panelHeight = computed(() => ({ "max-height": `${window.innerHeight - 150}px` }));

onBeforeMount(async () => {
    await getCollectionInformation({ $http, $route, $store });
    const { profile, profileManager } = await getProfile({ $http, $route });
    data.crateManager.profile = profile;
    data.crateManager.profileManager = profileManager;
    await loadEntity({ id: $route.query.id });
});
onMounted(async () => {
    data.watcher = watch(
        () => $route.query.id,
        (n, o) => {
            if (data.entity.id !== $route.query.id && $route.query.id)
                data.debouncedLoadEntity({ id: $route.query.id });
        }
    );
});

onBeforeUnmount(() => {
    data.watcher();
});

async function refresh() {
    await loadEntity({ id: $route.query.id });
}

async function loadEntity({ id }) {
    if (base64regex.test(id)) id = atob(id);
    let response = await $http.get({
        route: `/collections/${$route.params.code}/entities/${encodeURIComponent(id)}`,
    });
    if (response.status !== 200) {
        // handle the error
    }
    response = await response.json();
    data.entity = response.entity;
    $router.push({ query: { id: btoa(id) } });
}

// IMPLEMENTED
async function ingestEntity({ id, property, json }) {
    // console.log("ingest:entity", id, property, { ...json });
    let response = await $http.post({
        route: `/collections/${$route.params.code}/entities/${encodeURIComponent(id)}`,
        body: { entity: json, property },
    });
    if (response.status === 200) {
        refresh();
    } else {
        ElMessage.error(`There was a problem updating that property`);
    }
}

function linkEntity(data) {
    console.log("link:entity", data);
}

// IMPLEMENTED
async function unlinkEntity({ id, property, tgtEntityId }) {
    // console.log("unlink:entity", id, property, tgtEntityId);
    let response = await $http.put({
        route: `/collections/${$route.params.code}/entities/${encodeURIComponent(id)}/unlink`,
        body: { property, tgtEntityId },
    });
    if (response.status === 200) {
        refresh();
    } else {
        ElMessage.error(`There was a problem updating that property`);
    }
}

// IMPLEMENTED
async function updateEntity({ id, property, value }) {
    // console.log("update:entity", id, property, value);
    let response = await $http.put({
        route: `/collections/${$route.params.code}/entities/${encodeURIComponent(id)}`,
        body: { [property]: value },
    });
    if (response.status === 200) {
        if (property === "@id") {
            response = await response.json();
            let entity = response.entity;
            loadEntity({ id: entity["@id"] });
        } else {
            refresh();
        }
    } else {
        ElMessage.error(`There was a problem updating that property`);
    }
}

// IMPLEMENTED
async function deleteEntity() {
    // console.log("delete:entity", data.entity["@id"]);
    let response = await $http.delete({
        route: `/collections/${$route.params.code}/entities/${encodeURIComponent(
            data.entity["@id"]
        )}`,
    });
    if (response.status === 200) {
        $router.push(`/collections/${$route.params.code}`);
    } else {
        ElMessage.error(`There was a problem deleting the entity`);
    }
}

// IMPLEMENTED
async function createProperty({ id, property, value }) {
    // console.log("create:property", id, property, value);
    let response = await $http.post({
        route: `/collections/${$route.params.code}/entities/${encodeURIComponent(id)}/properties`,
        body: { property, value },
    });
    if (response.status === 200) {
        refresh();
    } else {
        ElMessage.error(`There was a problem updating that property`);
    }
}

// IMPLEMENTED
async function saveProperty({ idx: propertyId, value }) {
    // console.log("save:property", propertyId, value);
    let response = await $http.put({
        route: `/collections/${$route.params.code}/properties/${propertyId}`,
        body: { value },
    });
    if (response.status === 200) {
        refresh();
    } else {
        ElMessage.error(`There was a problem updating that property`);
    }
}

// IMPLEMENTED
async function deleteProperty({ id: propertyId }) {
    // console.log("delete:property", propertyId);
    let response = await $http.delete({
        route: `/collections/${$route.params.code}/properties/${propertyId}`,
    });
    if (response.status === 200) {
        refresh();
    } else {
        ElMessage.error(`There was a problem updating that property`);
    }
}
</script>
