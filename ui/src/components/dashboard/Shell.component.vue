<template>
    <div class="flex flex-col p-4 space-y-2">
        <div class="flex flex-row border-b border-solid py-2">
            <div class="text-2xl text-gray-800 tracking-wider">Your collections</div>
            <div class="flex-grow"></div>
            <el-pagination
                layout="prev, pager, next"
                :total="data.total"
                :current-page="data.currentPage"
                :page-size="data.limit"
                @current-change="changePage"
            ></el-pagination>
        </div>

        <div class="grid grid-cols-2 gap-2">
            <div v-for="collection of data.collections">
                <div
                    @click="navigateToCollection(collection)"
                    class="flex flex-col space-y-2 bg-blue-200 p-4 rounded cursor-pointer hover:bg-slate-800 hover:text-white"
                >
                    <div class="text-xl">{{ collection.name }}</div>
                    <div class="flex flex-row space-x-4">
                        <div><i class="fa-solid fa-user"></i>&nbsp;{{ collection.userCount }}</div>
                        <div>
                            <i class="fa-solid fa-file-lines"></i>&nbsp;{{ collection.entityCount }}
                        </div>
                        <div><i class="fa-solid fa-chess"></i>&nbsp;{{ collection.typeCount }}</div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="!data.collections.length" class="text-center p-4 bg-indigo-200 my-20 rounded">
            You haven't been granted access to any collections yet. See your administrator to get
            started.
        </div>
    </div>
</template>

<script setup>
import { reactive, inject, onMounted } from "vue";
import { useRouter } from "vue-router";
const $http = inject("$http");
const $router = useRouter();

let data = reactive({
    total: 0,
    limit: 10,
    offset: 0,
    currentPage: 1,
    collections: {},
});

onMounted(() => {
    getMyCollections();
});

async function getMyCollections() {
    const offset = (data.currentPage - 1) * data.limit;
    const limit = data.limit;
    let response = await $http.get({
        route: "/collections",
        params: { offset, limit },
    });
    let { collections, total } = await response.json();
    data.collections = collections;
    data.total = total;
}

async function changePage(page) {
    data.currentPage = page;
    await getMyCollections();
}
function navigateToCollection(collection) {
    $router.push(`/collections/${collection.code}`);
}
</script>
