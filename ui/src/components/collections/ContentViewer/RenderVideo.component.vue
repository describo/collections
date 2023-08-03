<template>
    <div>
        <video ref="mediaElement" controls class="w-full">
            <source :src="props.link" />
            Your browser does not support the <code>video</code> element.
        </video>
    </div>
</template>

<script setup>
const props = defineProps({
    link: {
        required: true,
    },
});
</script>

<style lang="scss" scoped></style>
