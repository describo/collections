<template>
    <el-card>
        <template #header>
            <div class="card-header">
                <span>Create a new Entity</span>
            </div>
        </template>
        <el-form :model="data.form" label-width="120px">
            <el-form-item label="Entity name">
                <el-input v-model="data.form.name" />
            </el-form-item>
            <el-form-item>
                <el-button type="success" @click="createEntity">
                    <i class="fa-solid fa-plus"></i>&nbsp;Create this entity
                </el-button>
            </el-form-item>
        </el-form>
    </el-card>
</template>

<script setup>
import { ElInput, ElButton } from "element-plus";
import { reactive, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
const $http = inject("$http");
const $route = useRoute();
const $router = useRouter();

const data = reactive({
    form: {
        name: undefined,
    },
    classes: [],
});

async function createEntity() {
    let response = await $http.post({
        route: `/collections/${$route.params.code}/entities`,
        body: {
            name: data.form.name,
            "@type": ["Thing"],
        },
    });
    if (response.status === 200) {
        let { entity } = await response.json();
        $router.push({ name: "collections.entity", query: { id: btoa(entity["@id"]) } });
    }
}
</script>
