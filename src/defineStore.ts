import { useSession } from './useSession'
import { writable, readable, StartStopNotifier, Writable, Readable } from 'svelte/store'

export function defineStore<T>(fn: () => T): () => T {
    return () => {
        const { sessionData } = useSession()

        if (!sessionData.stores.has(fn)) {
            sessionData.stores.set(fn, fn())
        }

        return sessionData.stores.get(fn) as T
    }
}

export function defineWritable<T>(
    value?: unknown,
    start?: StartStopNotifier<unknown>,
): () => Writable<unknown> {
    return defineStore(() => writable(value, start))
}

export function defineReadable<T>(
    value?: unknown,
    start?: StartStopNotifier<unknown>,
): () => Readable<unknown> {
    return defineStore(() => readable(value, start))
}
