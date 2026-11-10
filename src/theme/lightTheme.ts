/**
 * The admin dashboard is light-only. This is the single place that enforces it.
 *
 * - CSS (`@custom-variant dark` in main.css) makes `dark:` utilities depend on a `.dark` ancestor.
 * - This module guarantees no `.dark` class (or dark data-theme) ever reaches <html>, even if a
 *   library, extension or old script tries to add one, and pins the native `color-scheme`.
 * - Stored theme preferences are never read to decide the appearance.
 */
const root = document.documentElement

function applyLight() {
  if (root.classList.contains('dark')) root.classList.remove('dark')
  if (root.dataset.theme !== 'light') root.dataset.theme = 'light'
  if (root.style.colorScheme !== 'light') root.style.colorScheme = 'light'
}

export function enforceLightTheme() {
  applyLight()
  // Re-assert immediately if anything changes the attributes we care about.
  new MutationObserver(applyLight).observe(root, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
}
