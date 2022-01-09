import type { Load, LoadInput } from '@sveltejs/kit'
import type { Readable } from 'svelte/store'
import type { IsolatedStore } from './defineStore'
import type { Expand } from './expandType'
import { useSession } from './useSession'

type IsolatedStores = {
    [key: string]: IsolatedStore<Readable<unknown>>
}

type SessionStores<T> = Expand<{
    [key in keyof T]: T[key] extends IsolatedStore<infer ValueType> ? ValueType : never
}>

type LoadFn = (input: LoadInput) => unknown
type LoadFnWithStores<T> = (input: LoadInput, stores: SessionStores<T>) => unknown

export function loadWithStores(): Load
export function loadWithStores(fn: LoadFn): Load
export function loadWithStores<T extends IsolatedStores>(
    isolatedStores: T,
    fn: LoadFnWithStores<T>,
): Load
export function loadWithStores<T extends IsolatedStores>(
    fn_OR_isolatedStores?: LoadFn | T,
    undefined_OR_fn?: LoadFnWithStores<T>,
): Load {
    return (input: LoadInput) => {
        // Populate sessionMap
        useSession(input)

        if (typeof fn_OR_isolatedStores === 'undefined') {
            // Return empty object to prevent 404
            return {}
        }

        if (typeof fn_OR_isolatedStores === 'function') {
            const fn = fn_OR_isolatedStores as LoadFn

            // Execute load function
            return fn(input)
        }

        const isolatedStores = fn_OR_isolatedStores as IsolatedStores
        const fn = undefined_OR_fn as LoadFnWithStores<T>

        // Initialize requested stores with session
        let stores: SessionStores<T>
        if (isolatedStores) {
            stores = Object.fromEntries(
                Object.entries(isolatedStores).map(([key, store]) => [key, store(input)]),
            ) as SessionStores<T>
        }

        // Execute load function with stores
        return fn(input, stores)
    }
}
