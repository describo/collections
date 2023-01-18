<template>
    <div id="app" class="flex flex-col h-screen">
        <router-view />
    </div>
</template>

<script setup>
import { useStore } from "vuex";
const $store = useStore();
$store.dispatch("getMyCollections");
</script>
