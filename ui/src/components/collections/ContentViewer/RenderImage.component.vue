<template>
    <div class="relative">
        <div
            class="absolute cursor-pointer"
            style="
                top: 100px;
                width: 50px;
                height: 50px;
                right: 0px;
                z-index: 10;
                background-color: rgba(255, 255, 255, 0.9);
            "
            @click="update"
        >
            <span
                class="text-gray-500"
                style="
                    position: absolute;
                    top: 55%;
                    left: 43%;
                    transform: translate(-50%, -50%);
                    width: 12px;
                "
            >
                <i class="fa-solid fa-sync"></i>
            </span>
        </div>
        <div id="image" :data-zoomist-src="props.link" :style="maxHeight" v-if="props.link" />
    </div>
</template>

<script setup>
import Zoomist from "zoomist";
import { ref, onMounted, computed } from "vue";

const props = defineProps({
    link: {
        required: true,
    },
});

let zoomist = ref();

let maxHeight = computed(() => {
    return { "max-height": `${window.innerHeight - 350}px` };
});

onMounted(() => {
    init();
});
function init() {
    if (props.link) {
        zoomist.value = new Zoomist("#image", {
            fill: "contain",
            maxRatio: 10,
            slider: true,
            zoomer: true,
            height: window.innerHeight - 150,
        });
    }
}

function update() {
    zoomist.value.update();
}
</script>
