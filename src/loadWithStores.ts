import type { Load, LoadInput } from '@sveltejs/kit'
import type { Readable } from 'svelte/store'
import type { IsolatedStore } from './defineStore'
import type { Expand } from './expandType'
import { OverloadError } from './OverloadError'
import { useSession } from './useSession'

type IsolatedStores = {
    [key: string]: IsolatedStore<Readable<unknown>>
}

type SessionStores<T> = Expand<{
    [key in keyof T]: T[key] extends IsolatedStore<infer ValueType> ? ValueType : never
}>

type LoadFn = (input: LoadInput) => unknown
type LoadFnWithStores<T> = (stores: SessionStores<T>, input: LoadInput) => unknown

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

        function overload_1() {
            // Return empty object to prevent 404
            return {}
        }

        function overload_2(fn: LoadFn) {
            return fn(input)
        }

        function overload_3(isolatedStores: IsolatedStores, fn: LoadFnWithStores<T>) {
            // Initialize requested stores with session
            let stores: SessionStores<T>
            if (isolatedStores) {
                stores = Object.fromEntries(
                    Object.entries(isolatedStores).map(([key, store]) => [key, store(input)]),
                ) as SessionStores<T>
            }

            // Execute load function with stores
            return fn(stores, input)
        }

        if (typeof fn_OR_isolatedStores === 'undefined') {
            return overload_1()
        }
        if (typeof fn_OR_isolatedStores === 'function') {
            return overload_2(fn_OR_isolatedStores)
        }
        if (typeof fn_OR_isolatedStores === 'object' && typeof undefined_OR_fn === 'function') {
            return overload_3(fn_OR_isolatedStores, undefined_OR_fn)
        }
        throw new OverloadError()
    }
}
