// Shared GET work, bounded freshness, and mutation/session isolation.
export function createRequestCache<T>(ttl = 30_000) {
  let generation = 0
  const entries = new Map<string, { expires: number; value: T }>()
  const pending = new Map<string, Promise<T>>()
  function clear() {
    generation++
    entries.clear()
    pending.clear()
  }
  async function read(key: string, fetch: () => Promise<T>): Promise<T> {
    const cached = entries.get(key)
    if (cached && cached.expires > Date.now()) return cached.value
    const existing = pending.get(key)
    if (existing) return existing
    const started = generation
    const request = fetch()
      .then((value) => {
        if (started === generation) {
          if (entries.size >= 100) entries.delete(entries.keys().next().value!)
          entries.set(key, { value, expires: Date.now() + ttl })
        }
        return value
      })
      .finally(() => {
        if (pending.get(key) === request) pending.delete(key)
      })
    pending.set(key, request)
    return request
  }
  return { clear, read }
}
