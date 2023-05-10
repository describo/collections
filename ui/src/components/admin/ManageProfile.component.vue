<template>
    <div>
        <pre class="text-sm">{{ data.profile }}</pre>
    </div>
</template>

<script setup>
import { inject, reactive } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    profile: {},
});

getProfile();
async function getProfile() {
    let response = await $http.get({
        route: `/profile/${$route.params.code}`,
    });
    if (response.status !== 200) {
        // handle the error
    }
    response = await response.json();
    data.profile = response.profile;
}
</script>
