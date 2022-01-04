import { useSession } from './useSession'

export function defineStore<T>(fn: () => T): () => T {
    return () => {
        const { sessionData } = useSession()

        if (!sessionData.stores.has(fn)) {
            sessionData.stores.set(fn, fn())
        }

        return sessionData.stores.get(fn) as T
    }
}
