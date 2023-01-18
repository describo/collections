<template>
    <div class="flex flex-row relative">
        <div class="relative bg-violet-400 h-screen sidebar-width">
            <sidebar-component class="w-full bg-stone-300 h-screen" />
        </div>
        <div class="w-full relative">
            <router-view class="p-2" />
        </div>
    </div>
</template>

<script setup>
import { tokenSessionKey, getLocalStorage } from "./storage.js";
import SidebarComponent from "./Sidebar.component.vue";
import { onMounted, inject, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
const $http = inject("$http");
const $route = useRoute();
const $router = useRouter();
const $store = useStore();

onMounted(() => {
    init();
});

async function init() {
    let response = await $http.get({ route: "/authenticated" });
    if (response.status !== 200) {
        $router.push("/login");
    }
    let { token } = getLocalStorage({ key: tokenSessionKey });
    let user = JSON.parse(atob(token.split(".")[1]));
    $store.commit("setUserData", user);
    if ($route.path === "/") $router.push("/dashboard");

    $store.dispatch("getMyCollections");
}
</script>

<style>
.sidebar-width {
    min-width: 250px;
}
</style>
