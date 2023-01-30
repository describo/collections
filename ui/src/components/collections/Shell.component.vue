<template>
    <div class="flex flex-col space-y-4">
        <div class="flex flex-row space-x-4 bg-blue-200 p-6">
            <div class="pt-1">{{ code }}</div>

            <div class="flex-grow">
                <el-autocomplete
                    class="w-full"
                    v-model="data.queryString"
                    :fetch-suggestions="lookupEntity"
                    clearable
                    placeholder="Search for an entity to work with"
                    @select="loadEntity"
                >
                    <template #default="{ item }"> {{ item.eid }}: {{ item.name }} </template>
                </el-autocomplete>
            </div>
        </div>
    </div>
    <div class="overflow-scroll" :class="panelHeight">
        <DescriboCrateBuilderComponent
            v-if="data.entity.describoId"
            :entity="data.entity"
            :crateManager="data.crateManager"
            :mode="data.configuration.mode"
            :configuration="data.configuration"
        />
    </div>
</template>

<script setup>
import DescriboCrateBuilderComponent from "/srv/describo/src/crate-builder/RenderEntity/Shell.component.vue";
import { reactive, inject, computed } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
const $route = useRoute();
const $store = useStore();
const $http = inject("$http");

const data = reactive({
    queryString: "",
    entity: {},
    crateManager: {
        profile: {},
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
});
let code = computed(() => $route.params.code);
let panelHeight = computed(() => ({ "max-height": `${window.innerHeight - 50}px` }));

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

async function loadEntity(entity) {
    data.entity = {};
    let response = await $http.get({
        route: `/collections/${$route.params.code}/entities/${entity.id}`,
    });
    if (response.status !== 200) return;
    response = await response.json();
    data.entity = { ...response.entity };
}
</script>
