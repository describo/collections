<template>
    <div class="flex flex-col space-y-4">
        <el-card>
            <template #header>Create a new Collection</template>
            <el-form :model="data.form" label-width="200px">
                <el-form-item label="Collection Name">
                    <el-input v-model="data.form.name" />
                    <div class="text-sm">A descriptive name for this collection.</div>
                </el-form-item>
                <el-form-item label="Collection Project Code">
                    <el-input v-model="data.form.code" minlength="4" maxlength="4" />
                    <div class="text-sm">A unique 4 letter code to identify this collection.</div>
                </el-form-item>
                <el-form-item label="Bucket name">
                    <el-input v-model="data.form.bucket" minlength="3" maxlength="63" />
                    <div class="text-sm">
                        The name of the AWS bucket to use for this collection. The administrator of
                        the Describo Collections service must provision this for you.
                    </div>
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
import { ElForm, ElFormItem, ElInput, ElButton, ElCard, ElMessage } from "element-plus";
import { reactive, ref, computed, inject } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
const $http = inject("$http");
const $store = useStore();
const $router = useRouter();

const data = reactive({
    form: {
        name: undefined,
        code: undefined,
        bucket: undefined,
    },
});

const disableSubmit = computed(() => {
    return data.form.name && data.form.code && data.form.bucket ? false : true;
});

async function onSubmit() {
    let response = await $http.post({ route: "/admin/collections/create", body: data.form });
    if (response.status === 200) {
        const collectionCode = data.form.code;
        data.form = { name: undefined, code: undefined };
        $store.dispatch("getMyCollections");
        ElMessage.success(`The collection was created`);
        // $router.push(`/collections/${collectionCode}`);
    } else {
        ElMessage.error(`The was a problem creating that collection`);
    }
}
</script>
