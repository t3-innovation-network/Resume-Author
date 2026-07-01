type FlushFn = () => void

const flushRegistry = new Set<FlushFn>()

export function registerSectionFlush(flush: FlushFn): () => void {
  flushRegistry.add(flush)
  return () => {
    flushRegistry.delete(flush)
  }
}

export function flushAllSectionUpdates(): void {
  flushRegistry.forEach(flush => flush())
}
