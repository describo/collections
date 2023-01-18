<template>
    <div class="flex flex-col">
        <div v-for="collection of collections" :key="collection.id">
            <router-link :to="collectionLink(collection.code)" class="text-xl text-gray-800">
                {{ collection.code }}
            </router-link>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useStore } from "vuex";
const $store = useStore();

let collections = computed(() => $store.state.myCollections);

function collectionLink(code) {
    return `/collections/${code}`;
}
</script>
