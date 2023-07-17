<template>
    <div class="flex flex-col space-y-2 text-lg">
        <div class="text-center py-6">
            <router-link to="/dashboard" class="text-xl text-gray-800">{{
                data.siteName
            }}</router-link>
        </div>
        <div class="flex-grow"></div>
        <div v-if="user.administrator">
            <div class="border-b border-white pt-20"></div>
            <div class="flex flex-col space-y-4 pl-4">
                <div>Administrators</div>
                <div v-for="(control, idx) of data.adminControls" :key="idx">
                    <div
                        @click="$router.push(control.path)"
                        class="cursor-pointer"
                        :class="{ 'text-blue-600': current === control.path }"
                    >
                        <i :class="control.icon"></i>
                        {{ control.name }}
                    </div>
                </div>
            </div>
        </div>
        <div class="border-b border-white pt-20"></div>
        <div class="flex flex-col space-y-4 pl-4">
            <who-am-i-component />
            <div @click="logout" class="cursor-pointer">
                <i class="fa-solid fa-sign-out-alt"></i>
                logout
            </div>
        </div>
        <div class="h-10"></div>
    </div>
</template>

<script setup>
import WhoAmIComponent from "./WhoAmI.component.vue";
import { reactive, computed, inject } from "vue";
import { tokenSessionKey, removeLocalStorage } from "./storage.js";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
const $route = useRoute();
const $router = useRouter();
const $store = useStore();
const $http = inject("$http");

const data = reactive({
    siteName: $store.state.configuration.ui.siteName,
    adminControls: [
        {
            name: "Manage Collections",
            path: "/admin/collection/manage",
            icon: "fa-solid fa-layer-group",
        },
        {
            name: "Permitted Users",
            path: "/admin/users/permitted",
            icon: "fa-solid fa-user-tag",
        },
        { name: "Manage Users", path: "/admin/users", icon: "fa-solid fa-users" },
        { name: "System Logs", path: "/admin/logs", icon: "fa-solid fa-clipboard-list" },
    ],
});
let user = computed(() => $store.state.user);
let current = computed(() => $route.path);

async function logout() {
    await $http.get({ route: "/logout" });
    removeLocalStorage({ key: tokenSessionKey });
    $router.push("/login");
}
</script>
