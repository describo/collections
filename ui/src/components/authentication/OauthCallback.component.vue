<template>
    <div class="flex flex-col h-40" v-loading="data.loading"></div>
</template>

<script setup>
import {
    loginSessionKey,
    tokenSessionKey,
    putLocalStorage,
    getLocalStorage,
    removeLocalStorage,
} from "../storage.js";

import { reactive, onMounted, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
const $route = useRoute();
const $router = useRouter();
const $store = useStore();
const $http = inject("$http");

const data = reactive({
    error: false,
    loading: true,
});
onMounted(() => {
    login();
});
async function login() {
    const { code } = $route.query;
    let { code_verifier } = getLocalStorage({ key: loginSessionKey });
    removeLocalStorage({ key: loginSessionKey });
    let response = await $http.post({
        route: `/auth/${$route.query.state}/code`,
        body: { code, code_verifier },
    });
    if (response.status !== 200) {
        data.error = true;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await $router.push("/login");
    } else {
        let { token } = await response.json();
        let user = JSON.parse(atob(token.split(".")[1]));
        $store.commit("setUserData", user);

        putLocalStorage({ key: tokenSessionKey, data: { token } });
        await $router.push("/");
    }
}
</script>
