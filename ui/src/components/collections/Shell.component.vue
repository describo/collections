<template>
    <div class="flex flex-col h-screen overflow-scroll">
        <div class="bg-stone-200 p-8 text-2xl text-slate-800">{{ collection.name }}</div>

        <div class="p-4 flex flex-col space-y-2">
            <BrowseCollectionComponent />
            <FileManagerComponent />
        </div>
    </div>
</template>

<script setup>
import BrowseCollectionComponent from "./BrowseCollection.component.vue";
import FileManagerComponent from "./FileManager.component.vue";
import { inject, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
const $route = useRoute();
const $store = useStore();
const $http = inject("$http");

onMounted(async () => {
    await getCollectionInformation();
});
const collection = computed(() => $store.state.currentCollection);

async function getCollectionInformation() {
    let response = await $http.get({ route: `/collections/${$route.params.code}` });
    let { collection } = await response.json();
    $store.commit("setCurrentCollection", collection);
}
</script>
