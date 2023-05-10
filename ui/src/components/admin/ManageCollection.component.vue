<template>
    <el-tabs v-model="data.activeTab">
        <el-tab-pane label="Create" name="create">
            <CreateCollectionComponent v-if="data.activeTab === 'create'" />
        </el-tab-pane>
        <el-tab-pane label="Load Data" name="load">
            <LoadCollectionDataComponent v-if="data.activeTab === 'load'" />
        </el-tab-pane>
        <el-tab-pane label="Manage users" name="users">
            <ManageUsersComponent v-if="data.activeTab === 'users'" />
        </el-tab-pane>
        <el-tab-pane label="Manage profile" name="profile">
            <ManageProfileComponent v-if="data.activeTab === 'profile'" />
        </el-tab-pane>
    </el-tabs>
</template>

<script setup>
import { ElTabs, ElTabPane } from "element-plus";
import CreateCollectionComponent from "./CreateCollection.component.vue";
import LoadCollectionDataComponent from "./LoadCollectionData.component.vue";
import ManageUsersComponent from "./ManageUsers.component.vue";
import ManageProfileComponent from "./ManageProfile.component.vue";
import { reactive } from "vue";

const data = reactive({
    activeTab: "create",
});
</script>
