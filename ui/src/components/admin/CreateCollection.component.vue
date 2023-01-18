<template>
    <el-form :model="data.form" label-width="200px">
        <el-form-item label="Collection Name">
            <el-input v-model="data.form.name" />
            <div class="text-sm">The name of the project to which this collection belongs.</div>
        </el-form-item>
        <el-form-item label="Project Code">
            <el-input v-model="data.form.code" minlength="4" maxlength="4" />
            <div class="text-sm">The 4 letter project code associated with this collection.</div>
        </el-form-item>
        <el-form-item>
            <el-button type="primary" @click="onSubmit" :disabled="disableSubmit">Create</el-button>
            <el-button>Cancel</el-button>
        </el-form-item>
    </el-form>
</template>
<script setup>
import { reactive, computed, inject } from "vue";
const $http = inject("$http");

const data = reactive({
    form: {
        name: undefined,
        code: undefined,
    },
});

const disableSubmit = computed(() => {
    return data.form.name && data.form.code ? false : true;
});

async function onSubmit() {
    await $http.post({ route: "/admin/collection/create", body: data.form });
}
</script>
