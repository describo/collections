<template>
    <div class="flex flex-col">
        <!-- <div>
            <el-button @click="toggleFullScreen" type="primary">
                <i class="fas fa-expand"></i>
            </el-button>
        </div> -->
        <div class="mt-2">
            <img :src="props.link" class="object-fill m-auto" />
        </div>
    </div>
</template>

<script setup>
const { FullScreenViewer } = require("iv-viewer");

const props = defineProps({
    link: {
        required: true,
    },
});
function toggleFullScreen() {
    const viewer = new FullScreenViewer({});
    viewer.show(props.link);
}
</script>
