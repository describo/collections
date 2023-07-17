<template>
    <div class="flex flex-col space-y-4">
        <el-card>
            <template #header>Create a new Collection</template>
            <el-form :model="data.form" label-width="200px">
                <el-form-item label="Collection Name">
                    <el-input v-model="data.form.name" />
                    <div class="text-sm">A descriptive name for this collection.</div>
                </el-form-item>
                <el-form-item label="Project Code">
                    <el-input v-model="data.form.code" minlength="4" maxlength="4" />
                    <div class="text-sm">A unique 4 letter code to identify this collection.</div>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="onSubmit" :disabled="disableSubmit">
                        Create
                    </el-button>
                    <el-button>Cancel</el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup>
import { ElForm, ElFormItem, ElInput, ElButton, ElCard } from "element-plus";
import { reactive, ref, computed, inject } from "vue";
import { useStore } from "vuex";
const $http = inject("$http");
const $store = useStore();

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
    let response = await $http.post({ route: "/admin/collections/create", body: data.form });
    if (response.status === 200) {
        data.form = { name: undefined, code: undefined };
        $store.dispatch("getMyCollections");
    }
}
</script>
