<template>
    <div class="flex flex-col">
        <div>My Collections</div>
        <div v-for="collection of data.collections" :key="collection.id">
            <router-link :to="collectionLink(collection.code)" class="text-xl text-gray-800">
                {{ collection.code }}
            </router-link>
        </div>
    </div>
</template>

<script setup>
import { reactive, onMounted, inject } from "vue";
const $http = inject("$http");

const data = reactive({
    collections: [],
});

onMounted(async () => {
    loadMyCollections();
});
async function loadMyCollections() {
    let response = await $http.get({ route: "/collections" });
    response = await response.json();
    data.collections = response.collections;
}

function collectionLink(code) {
    return `/collections/${code}`;
}
</script>
