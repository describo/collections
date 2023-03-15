<template>
    <div class="flex flex-col space-y-4">
        <el-card>
            <template #header>Create a new Collection</template>
            <el-form :model="data.form" label-width="200px">
                <el-form-item label="Collection Name">
                    <el-input v-model="data.form.name" />
                    <div class="text-sm">
                        The name of the project to which this collection belongs.
                    </div>
                </el-form-item>
                <el-form-item label="Project Code">
                    <el-input v-model="data.form.code" minlength="4" maxlength="4" />
                    <div class="text-sm">
                        The 4 letter project code associated with this collection.
                    </div>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="onSubmit" :disabled="disableSubmit"
                        >Create</el-button
                    >
                    <el-button>Cancel</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card>
            <template #header>Connect to Collection</template>
            <ConnectToCollectionComponent :refresh="data.refresh" @updated="data.refresh = false" />
        </el-card>

        <el-card>
            <template #header>Load Collection Data</template>
            <div class="flex flex-row space-x-2">
                <div class="flex flex-col w-1/2">
                    <div>Select an RO Crate file to upload</div>
                    <input
                        ref="upload"
                        type="file"
                        placeholder="Select an RO Crate file to upload"
                    />
                </div>

                <div class="flex flex-col w-1/2">
                    <div>Select the collection to load it into</div>
                    <el-select
                        v-loading="data.loading"
                        v-model="data.selectedCollection"
                        placeholder="Select a collection to load"
                        clearable
                        @change="loadCollection"
                        class="w-full"
                    >
                        <el-option
                            v-for="item in myCollections"
                            :key="item.code"
                            :label="item.name"
                            :value="item.code"
                        />
                    </el-select>
                </div>
            </div>
            <el-table
                :data="data.collectionDataLoadingLogs"
                v-if="data.collectionDataLoadingLogs.length"
            >
                <el-table-column prop="msg" label="Message" />
                <el-table-column prop="date" label="Date" width="250" />
            </el-table>
        </el-card>
    </div>
</template>

<script setup>
import ConnectToCollectionComponent from "./ConnectToCollection.component.vue";
import { reactive, ref, computed, inject } from "vue";
import { useStore } from "vuex";
import { io } from "socket.io-client";
import { parseISO, format } from "date-fns";
const $http = inject("$http");
const $store = useStore();
const $socket = io();
$socket.on("load-collection-data", ({ msg, date }) => {
    data.collectionDataLoadingLogs.push({ msg, date: format(parseISO(date), "PPpp") });
});
const upload = ref(null);

const data = reactive({
    fileList: undefined,
    loading: false,
    form: {
        name: undefined,
        code: undefined,
    },
    selectedCollection: undefined,
    collectionDataLoadingLogs: [],
});

const disableSubmit = computed(() => {
    return data.form.name && data.form.code ? false : true;
});
let myCollections = computed(() => $store.state.myCollections);

async function onSubmit() {
    await $http.post({ route: "/admin/collections/create", body: data.form });
    data.refresh = true;
    $store.dispatch("getMyCollections");
}
async function loadCollection(code) {
    data.collectionDataLoadingLogs = [];
    if (!code) return;
    const [file] = upload.value.files;
    if (file && code) {
        let fileData = await readFile(file);
        await $http.post({
            route: `/admin/collections/${code}/load-data`,
            params: { clientId: $socket.id },
            body: { crate: fileData },
        });
    }
}

async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            let filedata = reader.result;
            resolve(JSON.parse(filedata));
        });
        reader.readAsText(file);
    });
}
</script>
