<template>
    <div class="flex flex-row relative">
        <div class="relative bg-violet-400 h-screen sidebar-width">
            <sidebar-component class="w-full bg-stone-300 h-screen" v-show="data.expanded" />
        </div>
        <div class="w-full relative">
            <router-view />
        </div>
    </div>
</template>

<script setup>
import { tokenSessionKey, getLocalStorage } from "./storage.js";
import SidebarComponent from "./Sidebar.component.vue";
import { reactive, onMounted, inject, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { round } from "lodash";
const $http = inject("$http");
const $route = useRoute();
const $router = useRouter();
const $store = useStore();
const data = reactive({
    expanded: true,
});
onMounted(() => {
    init();
});

async function init() {
    let response = await $http.get({ route: "/authenticated" });
    if (response.status === 200) {
        let { token } = getLocalStorage({ key: tokenSessionKey });
        let user = JSON.parse(atob(token.split(".")[1]));
        $store.commit("setUserData", user);
        if ($route.path === "/") $router.push("/dashboard");
    } else {
        $router.push("/login");
    }
}
</script>

<style>
.sidebar-width {
    min-width: 250px;
}
</style>
