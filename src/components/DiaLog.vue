<template>
    <div class="dialog" v-if="showDialog">
        <div class="dialog-content">
            <!-- 弹窗内容 -->
            <slot></slot>
            <button @click="closeDialog">关闭</button>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    props: {
        showDialog: Boolean, // 控制弹窗显示与隐藏的 prop
    },
    methods: {
        closeDialog() {
            // 关闭弹窗
            this.$emit('close');
            this.$router.go(0)
        },
    },
};
// defineProps({
//     showDialog: Boolean
// })
// const emit = defineEmits<{
//     (event: 'close'): void
// }>();
// const closeDialog = () => {
//     emit('close')
// }
</script>

<style scoped>
.dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
    /* 确保在其他内容之上显示 */
}

.dialog-content {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>