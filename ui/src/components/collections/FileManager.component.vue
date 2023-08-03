<template>
    <el-card>
        <template #header>
            <div class="card-header">
                <span>Manage the content in this collection</span>
            </div>
        </template>
        <div class="flex flex-row space-x-6">
            <div class="flex flex-col w-1/2">
                <div class="flex flex-row mb-6">
                    <div class="text-lg">{{ data.path }}</div>
                    <div class="flex flex-grow"></div>
                    <div>
                        <el-pagination
                            layout="prev, pager, next"
                            :total="data.children.length"
                            @current-change="changePage"
                        />
                    </div>
                </div>
                <el-table
                    :data="data.children.slice((data.page - 1) * 10, (data.page - 1) * 10 + 10)"
                >
                    <el-table-column prop="name" label="name">
                        <template #default="scope">
                            <div v-if="scope.row.type === 'file'" class="text-lg">
                                <i class="fa-regular fa-file"></i>&nbsp;
                                {{ scope.row.name }}
                            </div>
                            <div
                                class="cursor-pointer flex flex-row space-x-2 text-lg"
                                @click="loadParentFolder()"
                                v-if="scope.row.type === 'folder' && scope.row.name === '..'"
                            >
                                <!-- <div>
                                    <i class="fa-solid fa-folder"></i>
                                </div> -->
                                <div>
                                    <i class="fa-solid fa-arrow-turn-up fa-flip-horizontal"></i>
                                </div>
                                <div class="pt-1">
                                    {{ scope.row.name }}
                                </div>
                            </div>
                            <div
                                class="cursor-pointer flex flex-row space-x-2 text-lg"
                                @click="loadChildFolder(scope.row.name)"
                                v-if="scope.row.type === 'folder' && scope.row.name !== '..'"
                            >
                                <div>
                                    <i class="fa-solid fa-folder"></i>
                                </div>
                                <div>
                                    {{ scope.row.name }}
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column prop="" label="Actions" width="80">
                        <template #default="scope">
                            <el-button
                                @click="preview(scope.row.name)"
                                v-if="scope.row.type === 'file'"
                                ><i class="fa-regular fa-eye"></i
                            ></el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <div class="flex flex-row space-x-4 mt-6">
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
                                <el-button type="danger"> Delete Selected Folder </el-button>
                            </template>
                        </el-popconfirm>
                    </div>
                </div>
            </div>
            <div class="flex flex-col">
                <div class="text-lg">Upload files to {{ data.path }}</div>
                <div ref="dashboard" class="my-4"></div>
            </div>
        </div>

        <el-dialog v-model="data.showNewFolderDialog" title="Create new folder" width="30%">
            <el-input
                v-model="data.newFolderName"
                placeholder="The name of a folder to create here"
            ></el-input>
            <div>{{ data.path }}{{ data.path === "/" ? "" : "/" }}{{ data.newFolderName }}</div>
            <div v-if="isSlashPath">You can't create a new folder with '/' in the name</div>
            <template #footer>
                <el-button @click="closeDialog">Cancel</el-button>
                <el-button type="primary" @click="newFolder" :disabled="isSlashPath">
                    Confirm
                </el-button>
            </template>
        </el-dialog>
        <el-drawer
            v-model="data.showPreviewDrawer"
            destroy-on-close
            title=""
            direction="rtl"
            size="50%"
        >
            <ContentViewerComponent :file="data.previewFile" class="" />
        </el-drawer>
    </el-card>
</template>

<script setup>
import {
    ElInput,
    ElButton,
    ElPagination,
    ElTable,
    ElTableColumn,
    ElPopconfirm,
    ElDrawer,
} from "element-plus";
import ContentViewerComponent from "./ContentViewer/Shell.component.vue";
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

let uppy;
const data = reactive({
    showNewFolderDialog: false,
    showPreviewDrawer: false,
    previewFile: undefined,
    path: "/",
    children: [],
    newFolderName: undefined,
    page: 1,
    uppy: {
        width: 600,
        height: 500,
    },
});
let isSlashPath = computed(() => {
    return data.newFolderName?.match(/\//) ? true : false;
});
onMounted(async () => {
    await loadFolderChildren();
    uppy = new Uppy({
        debug: false,
        autoProceed: false,
        onBeforeFileAdded: (file) => {
            file.meta.filename =
                data.path === "/"
                    ? `/${$store.state.configuration.repositoryPath}/${file.name}`
                    : `/${$store.state.configuration.repositoryPath}${data.path}/${file.name}`;
            file.meta.bucket = $store.state.currentCollection.bucket;
            file.meta.overwrite = true;
        },
    });
    uppy.on("upload-error", (error) => console.error(error));
    uppy.on("upload-success", async (file) => {
        let filename = file.meta.filename.replace($store.state.configuration.repositoryPath, "");
        filename = filename.slice(1);
        let response = await $http.put({
            route: `/collections/${$route.params.code}/file`,
            body: { path: filename },
        });
        loadFolderChildren();
    });
    uppy.use(Dashboard, {
        target: dashboard.value,
        inline: true,
        width: data.uppy.width,
        height: data.uppy.height,
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

async function loadFolderChildren() {
    let response = await $http.get({
        route: `/collections/${$route.params.code}/folder`,
        params: { path: data.path },
    });
    if (response.status === 200) {
        response = await response.json();
        data.children =
            data.path === "/"
                ? response.children
                : [{ type: "folder", name: ".." }, ...response.children];
    } else {
        if (data.path === "/") {
            data.children = [];
        }
    }
}

async function newFolder() {
    const path =
        data.path === "/" ? `/${data.newFolderName}` : `${data.path}/${data.newFolderName}`;
    let response = await $http.put({
        route: `/collections/${$route.params.code}/folder`,
        body: { path },
    });
    data.path = path;
    await loadFolderChildren();
    data.newFolderName = undefined;
    closeDialog();
}

async function deleteFolder() {
    let response = await $http.delete({
        route: `/collections/${$route.params.code}/folder`,
        params: { path: data.path },
    });
    loadParentFolder();
}

function closeDialog() {
    data.newFolderName = undefined;
    data.showNewFolderDialog = false;
}

function loadChildFolder(path) {
    data.path = data.path === "/" ? `/${path}` : `${data.path}/${path}`;
    loadFolderChildren();
}

function loadParentFolder() {
    let path = data.path.split("/").slice(1, -1);
    path = !path.length ? "/" : `/${path.join("/")}`;
    data.path = path;
    loadFolderChildren();
}

function changePage(page) {
    data.page = page;
}

function preview(file) {
    data.previewFile = data.path !== "/" ? `${data.path}/${file}` : `/${file}`;
    data.showPreviewDrawer = true;
}
</script>
