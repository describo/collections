<template>
    <div class="flex flex-col h-screen overflow-scroll">
        <div class="bg-stone-200 p-8 text-2xl text-slate-800">{{ collection.name }}</div>

        <div class="p-4 flex flex-col space-y-2">
            <LoadRootDatasetComponent />

            <div class="flex flex-col space-y-2 xl:flex-row xl:space-y-0 xl:space-x-2">
                <CreateNewEntityComponent class="w-full xl:w-2/5" />
                <BrowseCollectionComponent class="w-full xl:w-3/5" />
            </div>
            <FileManagerComponent />
        </div>
    </div>
</template>

<script setup>
import LoadRootDatasetComponent from "./LoadRootDataset.component.vue";
import BrowseCollectionComponent from "./BrowseCollection.component.vue";
import FileManagerComponent from "./FileManager.component.vue";
import CreateNewEntityComponent from "./CreateNewEntity.component.vue";
import { inject, onBeforeMount, computed } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { getCollectionInformation } from "./lib.js";
const $route = useRoute();
const $store = useStore();
const $http = inject("$http");

onBeforeMount(async () => {
    await getCollectionInformation({ $http, $route, $store });
});
const collection = computed(() => $store.state.currentCollection);
</script>
