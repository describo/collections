<template>
    <div class="flex flex-col space-y-6">
        <el-card>
            <template #header>Step 1: Select a collection</template>
            <div class="flex flex-row">
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
        </el-card>

        <el-card v-if="data.selectedCollectionId">
            <template #header>Step 2: Define the classes in this collection</template>

            <div class="flex flex-col space-y-4">
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
        </el-card>

        <el-card v-if="data.selectedCollectionId">
            <template #header>
                <div class="flex flex-col">
                    <div>Step 3: Associate classes to a parent class</div>
                    <div class="text-sm">
                        If you've loaded data into the collection they will also be listed here
                        along with any that you create in Step 2.
                    </div>
                </div>
            </template>

            <div class="flex flex-col">
                <!-- <pre>{{ data.entitiesGroupedByType }}</pre> -->
                <div class="flex flex-col space-y-4">
                    <div>Select classes from the list. You can select multiple entries.</div>
                    <el-select
                        v-model="data.selectedEntities"
                        multiple
                        filterable
                        placeholder="Select"
                        size="large"
                    >
                        <el-option
                            v-for="item in data.entitiesGroupedByType.ungrouped"
                            :key="item"
                            :label="item"
                            :value="item"
                        />
                    </el-select>

                    <div v-if="data.selectedEntities.length">
                        Associate these classes to a parent.
                    </div>
                    <div class="flex flex-col space-y-2" v-if="data.selectedEntities.length">
                        <div class="">
                            <el-select
                                clearable
                                v-model="data.parentClass"
                                @change="setParentClass"
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
                </div>
            </div>
        </el-card>
        <el-card v-if="data.selectedCollectionId">
            <template #header>
                <div class="flex flex-row">
                    <div>The collection domain</div>
                    <div class="flex-grow"></div>
                    <div>
                        <el-button @click="saveProfile" type="primary">
                            Save this profile to the collection
                        </el-button>
                    </div>
                </div>
            </template>

            <div v-for="(value, key) in data.entitiesGroupedByType">
                <div v-if="key !== 'ungrouped'" class="flex flex-col">
                    <div class="pt-2">
                        {{ key }}
                    </div>
                    <div class="flex flex-row space-x-2 flex-wrap">
                        <div
                            v-for="entity of value"
                            class="bg-blue-200 rounded m-1 p-2 hover:cursor-pointer hover:bg-red-500"
                            @click="dissociate(key, entity)"
                        >
                            {{ entity }}
                        </div>
                    </div>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ElButton, ElInput, ElSelect, ElOption } from "element-plus";
import { inject, reactive, onMounted } from "vue";
import difference from "lodash-es/difference";
import groupBy from "lodash-es/groupBy";
const $http = inject("$http");

const data = reactive({
    selectedCollectionId: undefined,
    collections: [],
    input: undefined,
    entityTypes: {},
    entitiesGroupedByType: {
        ungrouped: [],
    },
    defaultProfile: {},
    profile: {},
    collectionProfile: {},
    selectedEntities: [],
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

    data.entitiesGroupedByType = {
        ungrouped: [],
    };
    // set up the groups
    Object.keys(data.defaultProfile.classes).forEach(
        (type) => (data.entitiesGroupedByType[type] = [])
    );

    let { profile } = await response.json();
    difference(Object.keys(profile.classes), Object.keys(data.defaultProfile.classes)).forEach(
        (entity) => {
            // data.entityTypes[entity] = { parent: profile.classes[entity].subClassOf[0] };
            try {
                data.entitiesGroupedByType[profile.classes[entity].subClassOf[0]].push(entity);
            } catch (error) {
                data.entitiesGroupedByType.ungrouped.push(entity);
            }
        }
    );

    Object.keys(data.entitiesGroupedByType).forEach((key) => {
        data.entitiesGroupedByType[key] = data.entitiesGroupedByType[key].sort();
    });
}

function addClasses() {
    data.input
        .split(",")
        .map((i) => i.trim())
        .forEach((i) => {
            data.entitiesGroupedByType.ungrouped.push(i);
        });
    data.input = undefined;
}

function setParentClass() {
    if (!data.parentClass || !data.selectedEntities.length) return;
    for (let entity of data.selectedEntities) {
        data.entitiesGroupedByType[data.parentClass].push(entity);
    }
    data.entitiesGroupedByType.ungrouped = difference(
        data.entitiesGroupedByType.ungrouped,
        data.selectedEntities
    );
    data.selectedEntities = [];
    data.parentClass = undefined;
}

function dissociate(type, entity) {
    data.entitiesGroupedByType[type] = difference(data.entitiesGroupedByType[type], [entity]);
    data.entitiesGroupedByType.ungrouped.push(entity);
}

function configureEntityDefinition(entity) {
    data.selectedEntity = entity;
}

async function saveProfile() {
    let profile = {
        ...data.defaultProfile,
    };
    profile.metadata.name = `Profile for '${data.selectedCollectionId}'`;
    profile.metadata.description = `Profile for '${data.selectedCollectionId}'; based on the default OHRM profile.`;
    for (let type of Object.keys(data.entitiesGroupedByType)) {
        if (type === "ungrouped") continue;
        for (let entity of data.entitiesGroupedByType[type]) {
            profile.classes[entity] = {
                definition: "override",
                subClassOf: [type],
                inputs: data.defaultProfile.classes[type].inputs,
            };
        }
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
