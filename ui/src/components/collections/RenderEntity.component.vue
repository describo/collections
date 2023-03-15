<template>
    <div class="flex flex-col">
        <div class="bg-blue-100 sticky top-0 z-10 p-4 flex flex-col" v-if="data.entity.describoId">
            <div class="text-sm">
                {{ data.entity["@type"].join(", ") }}
            </div>
            <div class="text-lg">
                {{ data.entity.name }}
            </div>
        </div>
        <div class="overflow-scroll" :class="panelHeight">
            <!-- <pre>{{ data.entity }}</pre> -->
            <DescriboCrateBuilderComponent
                v-if="data.entity.describoId"
                :entity="data.entity"
                :crateManager="data.crateManager"
                :mode="data.configuration.mode"
                :configuration="data.configuration"
                @load:entity="loadEntity"
                @add:property="addProperty"
                @save:property="saveProperty"
                @delete:property="deleteProperty"
                @ingest:entity="ingestEntity"
                @link:entity="linkEntity"
                @update:entity="updateEntity"
                @delete:entity="deleteEntity"
            />
        </div>
    </div>
</template>

<script setup>
import DescriboCrateBuilderComponent from "@describo/crate-builder-component/src/crate-builder/RenderEntity/Shell.component.vue";
import { reactive, inject, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { debounce } from "lodash";
const $route = useRoute();
const $router = useRouter();
const $store = useStore();
const $http = inject("$http");

const data = reactive({
    entity: {},
    crateManager: {
        profile: {},
        lookup: new (class {
            async entityTemplates({ type = undefined, queryString = undefined, limit = 5 }) {}
            async dataPacks({
                type = undefined,
                queryString = undefined,
                datapack = undefined,
                limit = 10,
            }) {
                console.log(type, queryString, datapack, limit);
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
        mode: "online",
    },
    debouncedLoadEntity: debounce(loadEntity, 300),
});
let panelHeight = computed(() => ({ "max-height": `${window.innerHeight - 150}px` }));
watch(
    () => $route.query.describoId,
    (n, o) => {
        if (data.entity.describoId !== $route.query.describoId && $route.query.describoId)
            data.debouncedLoadEntity({ describoId: $route.query.describoId });
    }
);
onMounted(() => {
    loadEntity({ describoId: $route.query.describoId });
});

function refresh() {
    loadEntity({ describoId: $route.query.describoId });
}
async function loadEntity({ describoId, label }) {
    let response = await $http.get({
        route: `/collections/${$route.params.code}/entities/${describoId ?? label}`,
    });
    if (response.status !== 200) {
        // handle the error
    }
    response = await response.json();
    data.entity = { ...response.entity };
    $router.push({ query: { describoId } });
}
// IMPLEMENTED
async function saveProperty({ propertyId, value }) {
    // console.log("save:property", data);
    let response = await $http.put({
        route: `/collections/${$route.params.code}/properties/${propertyId}`,
        body: { value },
    });
    if (response.status !== 200) {
        // handle the error
    }
}
// IMPLEMENTED
async function deleteProperty({ propertyId }) {
    // console.log("delete:property", data);
    let response = await $http.delete({
        route: `/collections/${$route.params.code}/properties/${propertyId}`,
    });
    if (response.status !== 200) {
        // handle the error
    }
    refresh();
}
// IMPLEMENTED
async function addProperty({ entityId, property, value }) {
    // console.log("add:property", data);
    let response = await $http.post({
        route: `/collections/${$route.params.code}/entities/${entityId}/properties`,
        body: { property, value },
    });
    if (response.status !== 200) {
        // handle the error
    }
    refresh();
}
// IMPLEMENTED
async function ingestEntity({ entityId, json, property }) {
    // console.log("ingest:entity", data);

    let response = await $http.post({
        route: `/collections/${$route.params.code}/entities/${entityId}`,
        body: { entity: json, property },
    });
    if (response.status !== 200) {
        // handle the error
    }
    refresh();
}
function linkEntity(data) {
    console.log("link:entity", data);
}
// IMPLEMENTED
async function updateEntity({ entityId, property, value }) {
    // console.log("update:entity", data);
    let response = await $http.put({
        route: `/collections/${$route.params.code}/entities/${entityId}`,
        body: { [property]: value },
    });
    if (response.status !== 200) {
        // handle the error
    }
    refresh();
}
// IMPLEMENTED
async function deleteEntity({ describoId }) {
    // console.log("delete:entity", data);
    let response = await $http.delete({
        route: `/collections/${$route.params.code}/entities/${describoId}`,
    });
    if (response.status !== 200) {
        // handle the error
    }
    data.entity = {};
}
</script>
