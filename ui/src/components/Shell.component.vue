<template>
    <div class="flex flex-row">
        <div class="h-screen sidebar-width bg-stone-300">
            <sidebar-component class="h-full" />
        </div>
        <div class="h-screen w-full overflow-scroll">
            <router-view />
        </div>
    </div>
</template>

<script setup>
import { tokenSessionKey, getLocalStorage } from "./storage.js";
import SidebarComponent from "./Sidebar.component.vue";
import { onMounted, inject, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
const $http = inject("$http");
const $route = useRoute();
const $router = useRouter();
const $store = useStore();

onMounted(() => {
    init();
});

watch(
    () => $route.path,
    () => {
        if ($route.path === "/dashboard") $store.commit("setCurrentCollection", {});
    }
);

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
