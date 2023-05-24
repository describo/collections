<template>
    <div class="flex flex-col space-y-6">
        <div class="flex flex-row">
            <div class="w-64">Select a collection:</div>
            <el-select
                v-model="data.selectedCollectionId"
                clearable
                @change="getCollectionProfile"
                class="w-full"
            >
                <el-option
                    v-for="item in data.collections"
                    :key="item.code"
                    :label="item.name"
                    :value="item.id"
                />
            </el-select>
        </div>

        <div v-if="data.selectedCollectionId" class="flex flex-col space-y-6">
            <div>
                <div class="p-6 bg-slate-200">
                    Define a class or set of classes, separated by comma. In this context, a class
                    is an entity and it should be a noun, singular and capitalised. For example,
                    "Person" rather than "people". If you're not sure, have a look at
                    <a href="https://schema.org/docs/full.html" target="_blank">schema.org</a>.
                </div>
                <div class="flex flex-row">
                    <el-input v-model="data.input" placeholder="Add entities to the profile" />
                    <el-button @click="addClasses" type="primary">Add these classes</el-button>
                </div>
            </div>

            <div class="flex flex-col space-y-4">
                <div class="flex flex-row space-x-2" v-if="data.selectedEntity">
                    <div class="pt-1">Select the parent class for '{{ data.selectedEntity }}'</div>

                    <div class="">
                        <el-select
                            v-if="data.selectedEntity"
                            v-model="data.entityTypes[data.selectedEntity].parent"
                            placeholder="Select the parent class"
                        >
                            <el-option
                                v-for="item in Object.keys(data.defaultProfile.classes)"
                                :key="item"
                                :label="item"
                                :value="item"
                            />
                        </el-select>
                    </div>
                </div>
                <div class="flex flex-row space-x-2 flex-wrap">
                    <div
                        v-for="(config, entity, idx) of data.entityTypes"
                        :key="idx"
                        class="bg-blue-200 p-2 m-2 rounded hover:cursor-pointer"
                        :class="{ 'bg-orange-200': data.selectedEntity === entity }"
                        @click="configureEntityDefinition(entity)"
                    >
                        <span v-if="config.parent">{{ config.parent }} -></span>
                        {{ entity }}
                    </div>
                </div>
            </div>

            <div>
                <el-button @click="generateProfile" type="primary">
                    Generate collection profile
                </el-button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ElButton, ElInput, ElSelect, ElOption, ElMessage } from "element-plus";
import { inject, reactive, onMounted } from "vue";
import difference from "lodash-es/difference";
const $http = inject("$http");

const data = reactive({
    selectedCollectionId: undefined,
    collections: [],
    input: undefined,
    entityTypes: {},
    defaultProfile: {},
    profile: {},
    collectionProfile: {},
    selectedEntity: "",
});

onMounted(async () => {
    await getDefaultProfile();
    await loadCollections();
});

async function loadCollections() {
    let response = await $http.get({ route: "/admin/collections" });
    if (response.status === 200) {
        response = await response.json();
        data.collections = response.collections;
    }
}

async function getDefaultProfile() {
    let response = await $http.get({
        route: `/profile/default`,
    });
    if (response.status !== 200) {
        // handle the error
    }
    response = await response.json();
    data.defaultProfile = response.profile;
}

async function getCollectionProfile() {
    if (!data.selectedCollectionId) return;
    let response = await $http.get({
        route: `/profile/${data.selectedCollectionId}`,
    });
    if (response.status !== 200) {
        // handle the error
    }
    let { profile } = await response.json();
    difference(Object.keys(profile.classes), Object.keys(data.defaultProfile.classes)).forEach(
        (entity) => {
            data.entityTypes[entity] = { parent: profile.classes[entity].subClassOf[0] };
        }
    );
}

function addClasses() {
    data.input
        .split(",")
        .map((i) => i.trim())
        .forEach((i) => {
            data.entityTypes[i] = {};
        });
    data.input = undefined;
}

function configureEntityDefinition(entity) {
    data.selectedEntity = entity;
}

async function generateProfile() {
    //  check every entity has been assigned a super class
    for (let entity of Object.keys(data.entityTypes)) {
        const config = data.entityTypes[entity];
        if (!config.parent) {
            ElMessage({
                message: `Every entity must be a sub class of one of the default types: '${entity}' has not been configured.`,
                type: "error",
            });
            break;
        }
    }

    let profile = {
        ...data.defaultProfile,
    };
    profile.metadata.name = `Profile for '${data.selectedCollectionId}'`;
    profile.metadata.description = `Profile for '${data.selectedCollectionId}'; based on the default OHRM profile.`;
    for (let entity of Object.keys(data.entityTypes)) {
        const config = data.entityTypes[entity];
        profile.classes[entity] = {
            definition: "override",
            subClassOf: [config.parent],
            inputs: [],
        };
    }

    let response = await $http.post({
        route: `/profile/${data.selectedCollectionId}`,
        body: { profile },
    });
    if (response.status !== 200) {
        // handle the error
    }
    data.profile = profile;
}
</script>
