<template>
    <div class="flex flex-col space-y-4">
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
import { ElCard, ElSelect, ElOption, ElTable, ElTableColumn } from "element-plus";
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
    form: {
        name: undefined,
        code: undefined,
    },
    selectedCollection: undefined,
    collectionDataLoadingLogs: [],
});

let myCollections = computed(() => $store.state.myCollections);

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
