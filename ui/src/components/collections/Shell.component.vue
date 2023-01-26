<template>
    <div class="flex flex-col">
        <div>{{ data.code }} Collection</div>

        <div><el-button @click="loadDataset">load dataset</el-button></div>
    </div>
</template>

<script setup>
import { reactive } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
const $route = useRoute();
const $store = useStore();

const data = reactive({
    ...$route.params,
});
function loadDataset() {
    $store.dispatch("loadCollectionData", { code: $route.params.code });
}
</script>
