<template>
    <button class="flex-grow flex flex-row space-x-2" @click="login">
        <div><img :src="imageFile" class="h-10" /></div>
        <div class="text-gray-600 text-lg leading-relaxed pt-1">
            {{ props.buttonText }}
        </div>
    </button>
</template>

<script setup>
import { reactive, computed, inject } from "vue";
import { loginSessionKey, putLocalStorage } from "../storage.js";
import GoogleIcon from "../../assets/google.png";
import AafIcon from "../../assets/aaf.png";
import { useStore } from "vuex";
const $store = useStore();
const $http = inject("$http");

const props = defineProps({
    provider: {
        type: String,
        required: true,
    },
    buttonText: {
        type: String,
        required: true,
    },
});
const data = reactive({
    configuration: $store.state.configuration.authentication[props.provider],
    scope: "openid profile email",
    loggingIn: false,
});
const imageFile = computed(() => {
    switch (props.provider) {
        case "aaf":
            return AafIcon;
            break;
        case "google":
            return GoogleIcon;
            break;
    }
});
async function login() {
    data.loggingIn = true;
    let response = await $http.get({ route: `/auth/${props.provider}/login` });
    if (response.status !== 200) {
        // disabled this login type for now
    }
    let { url, code_verifier } = await response.json();
    putLocalStorage({ key: loginSessionKey, data: { code_verifier } });
    window.location.href = url;
}
</script>
