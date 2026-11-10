import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** Tracks an element's rendered width so SVG charts can lay out crisply at any size. */
export function useElementWidth(target: Ref<HTMLElement | null>, fallback = 640) {
  const width = ref(fallback)
  let observer: ResizeObserver | undefined

  onMounted(() => {
    const el = target.value
    if (!el) return
    width.value = Math.max(240, Math.round(el.clientWidth || fallback))
    if (typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(([entry]) => {
      if (entry) width.value = Math.max(240, Math.round(entry.contentRect.width))
    })
    observer.observe(el)
  })

  onBeforeUnmount(() => observer?.disconnect())
  return width
}
