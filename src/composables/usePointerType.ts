import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'

/**
 * 感知当前设备的指针类型与悬停能力。
 *
 * isTouchPrimary  — 主要指针为触屏（coarse），如手机、平板
 * hasHover        — 设备支持精确悬停（hover: hover），如鼠标
 * isMousePrimary  — 主要指针为鼠标（fine + hover 均满足）
 *
 * 用于在组件 JS 层根据指针类型切换交互行为（如长按 vs 右键菜单）。
 * 纯样式层的交互差异请优先使用 CSS @media (pointer/hover) 处理。
 */
export function usePointerType() {
  const isTouchPrimary = useMediaQuery('(pointer: coarse)')
  const hasHover = useMediaQuery('(hover: hover)')
  const isMousePrimary = computed(() => !isTouchPrimary.value && hasHover.value)

  return { isTouchPrimary, hasHover, isMousePrimary }
}
