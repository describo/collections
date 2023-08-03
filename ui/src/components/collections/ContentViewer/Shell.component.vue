<template>
    <div class="flex flex-col">
        <div class="text-lg mb-10">File: {{ props.file }}</div>
        <component v-bind:is="component" :link="data?.link" v-if="data.link"></component>
        <!-- <div class="text-center" v-if="!component">
            There is currently no viewer available to display this content.
        </div> -->
        <div v-if="data.error">The file preview is unavailable at this time.</div>
        <div class="mt-10">
            <el-button type="primary" @click="describeItem">Describe this item</el-button>
        </div>
    </div>
</template>

<script setup>
import { reactive, computed, onMounted, inject, ref } from "vue";
import { useStore } from "vuex";
import RenderImageComponent from "./RenderImage.component.vue";
import RenderAudioComponent from "./RenderAudio.component.vue";
import RenderVideoComponent from "./RenderVideo.component.vue";
import RenderDocumentComponent from "./RenderDocument.component.vue";
// import RenderXmlComponent from "./RenderXML.component.vue";
const $http = inject("$http");
const $store = useStore();

const props = defineProps({
    file: {
        type: String,
        required: true,
    },
});
const data = reactive({
    error: false,
    component: undefined,
    imageTypes: ["jpg", "jpeg", "png", "gif", "svg"],
    audioTypes: ["mp3", "wav"],
    videoTypes: ["mov", "mp4"],
    documentTypes: [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "xml",
        "eaf",
        "trs",
        "ixt",
        "flextext",
    ],
    transcriptionTypes: ["eaf", "trs", "ixt", "flextext"],
    xmlTypes: ["xml", "eaf", "trs", "ixt", "flextext"],
});
let component = computed(() => {
    const extension = props.file.split(".").pop();
    if (data.imageTypes.includes(extension)) {
        component = RenderImageComponent;
    } else if (data.audioTypes.includes(extension)) {
        component = RenderAudioComponent;
    } else if (data.videoTypes.includes(extension)) {
        component = RenderVideoComponent;
        // } else if (data.xmlTypes.includes(extension)) {
        //     component = RenderXmlComponent;
    } else if (data.documentTypes.includes(extension)) {
        component = RenderDocumentComponent;
    }
    return component;
});

onMounted(() => {
    getFileLink();
});

async function getFileLink() {
    let response = await $http.get({
        route: `/collections/${$store.state.currentCollection.code}/file/link`,
        params: { path: props.file },
    });
    if (response.status !== 200) {
        data.error = true;
        return;
    }
    let { link } = await response.json();
    data.link = link;
}
function describeItem() {}
</script>
