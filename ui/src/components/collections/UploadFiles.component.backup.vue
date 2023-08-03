<template>
    <el-card>
        <template #header>
            <div class="card-header">
                <span>Upload content to this collection</span>
            </div>
        </template>
        <div class="flex flex-row space-x-6">
            <div class="flex flex-col">
                <div class="text-lg text-center my-2">Select a folder to upload to</div>
                <el-tree
                    class="my-2"
                    ref="tree"
                    :data="data.tree"
                    node-key="path"
                    show-checkbox
                    default-expand-all
                    check-strictly
                    @check-change="handleSelection"
                    @node-click="loadTree"
                >
                    <template #default="{ node, data }">
                        <div class="flex flex-col text-xl">
                            <div>{{ node.label }}</div>
                        </div>
                    </template>
                </el-tree>
                <div class="flex flex-row space-x-4">
                    <div>
                        <el-button @click="data.showNewFolderDialog = true" type="primary">
                            <i class="fa-solid fa-plus"></i>&nbsp;New Folder
                        </el-button>
                    </div>
                    <div class="flex-grow"></div>
                    <div>
                        <el-popconfirm
                            width="400"
                            title="Are you sure you want to delete the selected folder?"
                            @confirm="deleteFolder"
                        >
                            <template #reference>
                                <el-button type="danger" :disabled="isRootFolder">
                                    Delete Selected Folder
                                </el-button>
                            </template>
                        </el-popconfirm>
                    </div>
                </div>
            </div>
            <div class="flex flex-col">
                <div class="text-lg my-2 text-center">Specify the files to upload</div>
                <div ref="dashboard"></div>
            </div>
        </div>

        <el-dialog v-model="data.showNewFolderDialog" title="Create new folder" width="30%">
            <el-input
                v-model="data.newFolderName"
                placeholder="The name of a folder to create here"
            ></el-input>
            <div>
                {{ data.selectedFolder.path }}{{ data.selectedFolder.path === "/" ? "" : "/"
                }}{{ data.newFolderName }}
            </div>
            <div v-if="isSlashPath">You can't create a new folder with '/' in the name</div>
            <template #footer>
                <el-button @click="closeDialog">Cancel</el-button>
                <el-button type="primary" @click="newFolder" :disabled="isSlashPath">
                    Confirm
                </el-button>
            </template>
        </el-dialog>
    </el-card>
</template>

<script setup>
import { ElInput, ElButton, ElTree } from "element-plus";
import { ref, reactive, onMounted, inject, computed } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
import Dashboard from "@uppy/dashboard";
import Tus from "@uppy/tus";
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import Uppy from "@uppy/core";
const dashboard = ref(null);
const $store = useStore();
const $route = useRoute();
const $http = inject("$http");
const tree = ref(null);

let uppy;
const data = reactive({
    showNewFolderDialog: false,
    selectedFolder: {},
    newFolderName: undefined,
    tree: [],
    handleSelection: true,
});
let isRootFolder = computed(() => {
    return data.selectedFolder?.path?.match(/^\/$/) ? true : false;
});
let isSlashPath = computed(() => {
    return data.newFolderName?.match(/\//) ? true : false;
});
onMounted(async () => {
    await loadTree();
    data.selectedFolder = data.tree[0];
    handleSelection(data.selectedFolder, true);
    uppy = new Uppy({
        debug: false,
        autoProceed: false,
        onBeforeFileAdded: (file) => {
            file.meta.filename =
                data.selectedFolder.path === "/"
                    ? `/${$store.state.configuration.repositoryPath}/${file.name}`
                    : `/${$store.state.configuration.repositoryPath}${data.selectedFolder.path}/${file.name}`;
            file.meta.bucket = $store.state.currentCollection.bucket;
            file.meta.overwrite = true;
        },
    });
    uppy.on("upload-error", (error) => console.error(error));
    uppy.use(Dashboard, {
        target: dashboard.value,
        inline: true,
        width: 500,
        height: 300,
    });
    uppy.use(Tus, {
        endpoint: `${window.location.origin}${$store.state.configuration.ui.tusEndpoint}`,
        retryDelays: null,
        chunkSize: 64 * 1024 * 1024,
        headers: {
            authorization: "Bearer secret",
        },
    });
});

async function loadTree() {
    let response = await $http.get({
        route: `/collections/${$route.params.code}/folder`,
    });
    response = await response.json();
    data.tree = response.tree;
}
async function newFolder() {
    const path =
        data.selectedFolder.path === "/"
            ? `/${data.newFolderName}`
            : `${data.selectedFolder.path}/${data.newFolderName}`;
    data.selectedFolder.children.push({
        path,
        label: data.newFolderName,
        children: [],
    });
    let response = await $http.put({
        route: `/collections/${$route.params.code}/folder`,
        body: { tree: data.tree },
    });
    // await loadTree();
    data.newFolderName = undefined;
    data.selectedFolder = tree.value.getNode(path).data;
    handleSelection(data.selectedFolder, true);
    closeDialog();
}
async function deleteFolder() {
    tree.value.remove(data.selectedFolder.path);
    let response = await $http.put({
        route: `/collections/${$route.params.code}/folder`,
        body: { tree: data.tree },
    });
    response = await $http.delete({
        route: `/collections/${$route.params.code}/folder`,
        params: { path: data.selectedFolder.path },
    });

    data.selectedFolder = data.tree[0];
    handleSelection(data.selectedFolder, true);
}
function handleSelection(folder, isSelected, subtree) {
    if (!isSelected) {
        folder = { path: "/" };
        isSelected = true;
    }
    if (data.handleSelection && isSelected) {
        // as soon as we setCheckedNodes we trigger this method again
        //   so, we need to disable it to prevent that happening
        //
        // the reason for setting the checked nodes manually is so that we
        //   can guarantee that only one node is checked at any time

        data.handleSelection = false;
        tree.value.setCheckedNodes([folder]);
        data.selectedFolder = folder;
        setTimeout(() => {
            data.handleSelection = true;
        }, 200);
    }
}
function closeDialog() {
    data.newFolderName = undefined;
    data.showNewFolderDialog = false;
}
</script>
