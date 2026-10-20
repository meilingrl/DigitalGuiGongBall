<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
const props = defineProps<{ open: boolean; title: string; message: string; confirmLabel: string }>()
const emit = defineEmits<{ resolve: [confirmed: boolean] }>()
const dialog = ref<HTMLDialogElement | null>(null)
function sync() { if (props.open && !dialog.value?.open) dialog.value?.showModal(); else if (!props.open && dialog.value?.open) dialog.value.close() }
watch(() => props.open, sync, { flush: 'post' })
onMounted(sync)
</script>
<template>
  <dialog ref="dialog" class="studio-confirm" aria-labelledby="confirm-title" aria-describedby="confirm-message" @cancel.prevent="emit('resolve', false)">
    <p class="eyebrow">YOUR CREATIVE WORK</p><h2 id="confirm-title">{{ title }}</h2><p id="confirm-message">{{ message }}</p><div><button class="secondary-button" autofocus @click="emit('resolve', false)">取消</button><button class="primary-button" @click="emit('resolve', true)">{{ confirmLabel }}</button></div>
  </dialog>
</template>
<style scoped>
.studio-confirm{margin:auto;padding:30px;border:1px solid var(--studio-line);border-radius:8px;background:var(--studio-panel);color:var(--studio-ink);width:min(440px,calc(100% - 36px));box-shadow:0 20px 90px #0003}.studio-confirm::backdrop{background:#14281f77;backdrop-filter:blur(3px)}.studio-confirm h2{font:500 24px "Songti SC",Georgia,serif;margin:15px 0}.studio-confirm>p:not(.eyebrow){font-size:13px;line-height:1.9;color:var(--studio-muted)}.studio-confirm>div{display:flex;justify-content:flex-end;gap:12px;margin-top:25px}
</style>
