<template>
    <div class="flex flex-col">
        <div v-for="collection of collections" :key="collection.id">
            <router-link
                :to="collectionLink(collection.code)"
                class="text-xl text-gray-800"
                :class="{ 'text-blue-600': activeCollection === collection.code }"
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
let activeCollection = computed(() => $route.params.code);

function collectionLink(code) {
    return `/collections/${code}`;
}
</script>
