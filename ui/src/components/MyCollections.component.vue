<template>
    <div class="flex flex-col">
        <div v-for="collection of collections" :key="collection.id">
            <router-link
                :to="collectionLink(collection.id)"
                class="text-xl text-gray-800"
                :class="{ 'text-blue-600': activeCollection === collection.id }"
            >
                {{ collection.code }}
            </router-link>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
const $store = useStore();
const $route = useRoute();

let collections = computed(() => $store.state.myCollections);
let activeCollection = computed(() => $route.params.collectionId);

function collectionLink(collectionId) {
    return `/collections/${collectionId}/browse`;
}
</script>
