<template>
    <div>
        <audio ref="mediaElement" controls class="w-full">
            <source :src="props.link" />
            Your browser does not support the <code>audio</code> element.
        </audio>
    </div>
</template>

<script setup>
const props = defineProps({
    link: {
        required: true,
    },
});
</script>
