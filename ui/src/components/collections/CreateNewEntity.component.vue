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
                <el-button type="success"
                    ><i class="fa-solid fa-plus"></i>&nbsp;Create this entity</el-button
                >
            </el-form-item>
        </el-form>
    </el-card>
</template>

<script setup>
import { ElInput, ElButton } from "element-plus";
import { reactive } from "vue";

const data = reactive({
    form: {
        name: undefined,
    },
});
</script>
