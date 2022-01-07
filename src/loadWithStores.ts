import type { LoadInput } from '@sveltejs/kit'
import type { Readable } from 'svelte/store'
import type { IsolatedStore } from './defineStore'
import type { Expand } from './expandType'

type IsolatedStores = {
    [key: string]: IsolatedStore<Readable<unknown>>
}

type SessionStores<T> = Expand<{
    [key in keyof T]: T[key] extends IsolatedStore<infer ValueType> ? ValueType : never
}>

export function loadWithStores<T extends IsolatedStores>(
    isolatedStores: T,
    fn: (input: LoadInput, stores: SessionStores<T>) => unknown,
) {
    return (input: LoadInput) => {
        const stores = Object.fromEntries(
            Object.entries(isolatedStores).map(([key, store]) => [key, store(input)]),
        ) as SessionStores<T>
        return fn(input, stores)
    }
}
