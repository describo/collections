<template>
    <div><router-view /></div>
</template>

<script setup>
import { useRoute, useRouter } from "vue-router";
const $route = useRoute();
const $router = useRouter();
if ($route.name === "browse") $router.push({ name: "collections.browse" });
</script>
