<template>
    <el-card class="box-card flex-grow">
        <template #header>
            <div class="card-header">
                <span>Root Dataset</span>
            </div>
        </template>
        <div class="flex flex-col lg:flex-row lg:space-x-2">
            <div class="text-xl">
                The root dataset is the entry point to the linked data structure:
            </div>
            <div>
                <el-button
                    type="primary"
                    class="bg-blue-200 text-4xl text-slate-700 p-4 rounded cursor-pointer"
                    @click="loadRootDataset"
                >
                    load the root dataset
                </el-button>
            </div>
        </div>
    </el-card>
</template>

<script setup>
import { ElButton } from "element-plus";
import { useRouter } from "vue-router";
const $router = useRouter();

function loadRootDataset() {
    $router.push({ name: "collections.entity", query: { id: btoa("./") } });
}
</script>
