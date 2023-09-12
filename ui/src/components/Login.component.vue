<template>
    <div class="flex h-screen">
        <div class="w-full m-auto">
            <div class="flex flex-row">
                <div
                    class="w-1/2 text-right pr-4 text-gray-600 text-4xl flex flex-col justify-center"
                >
                    <div>Describo Collections</div>
                </div>
                <div class="w-1/2 pl-4 flex flex-col space-y-4">
                    <div
                        v-for="provider of data.loginProviders"
                        :key="provider.name"
                        class="flex-grow"
                    >
                        <oauth-login-component
                            class="w-full border-l-4 border-solid p-4 cursor-pointer hover:border-yellow-400 hover:bg-yellow-100 focus:ring-2 focus:ring-yellow-100"
                            v-if="enableProvider(provider.name)"
                            :provider="provider.name"
                            :button-text="provider.text"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, defineAsyncComponent, computed } from "vue";
import { useStore } from "vuex";
const $store = useStore();

const OauthLoginComponent = defineAsyncComponent(() =>
    import("./authentication/OauthLogin.component.vue")
);
const data = reactive({
    loginProviders: [
        { name: "aaf", text: "Login with the AAF" },
        { name: "google", text: "Login with Google" },
    ],
});
function enableProvider(name) {
    return $store.state.configuration.authentication.includes(name);
}
</script>
