import { useSession } from './useSession'
import { writable, readable, StartStopNotifier, Writable, Readable } from 'svelte/store'
import { browser } from '$app/env'
import type { LoadInput } from '@sveltejs/kit'

export type IsolatedStore<T extends Readable<unknown>> = (() => T) & T

export function defineStore<T extends Readable<unknown>>(fn: () => T): IsolatedStore<T> {
    function getStore(input?: LoadInput): T {
        // Get stores for session
        const { sessionData } = useSession(input)
        const { stores } = sessionData

        // Get requested store from session stores, create if not exists
        if (!stores.has(fn)) {
            stores.set(fn, fn())
        }
        return stores.get(fn) as T
    }

    if (browser) {
        const store = fn()
        // The magic function, that returns the session store on the server
        // should just return the store when in the browser
        const magic = () => store
        return Object.assign(magic, store)
    }

    // NOTE: We do not access this dymmy object but we make it a function so
    //       the proxy is callable
    const dummy = (input: LoadInput) => {}

    return new Proxy(dummy, {
        // The main part: Redirect property getter to session store
        get(target, prop, receiver) {
            // Get stores for session
            const { sessionData } = useSession()
            const { stores } = sessionData

            // Get requested store from session stores, create if not exists
            if (!stores.has(fn)) {
                stores.set(fn, fn())
            }
            const store = stores.get(fn) as T
            return store[prop]
        },

        // Some magic: Call the store to get the session store
        apply(target, thisArg, argArray) {
            return Reflect.apply(getStore, undefined, argArray)
        },

        // Redirect everything else to the session store

        construct(target, argArray, newTarget) {
            return Reflect.construct(getStore().constructor, argArray, newTarget)
        },
        defineProperty(target, prop, attributes) {
            return Reflect.defineProperty(getStore(), prop, attributes)
        },
        deleteProperty(target, prop) {
            return Reflect.deleteProperty(getStore(), prop)
        },
        getOwnPropertyDescriptor(target, prop) {
            return Reflect.getOwnPropertyDescriptor(getStore(), prop)
        },
        getPrototypeOf(target) {
            return Reflect.getPrototypeOf(getStore())
        },
        has(target, prop) {
            return Reflect.has(getStore(), prop)
        },
        isExtensible(target) {
            return Reflect.isExtensible(getStore())
        },
        ownKeys(target) {
            return Reflect.ownKeys(getStore())
        },
        preventExtensions(target) {
            return Reflect.preventExtensions(getStore())
        },
        set(target, prop, value, receiver) {
            return Reflect.set(getStore(), prop, value, receiver)
        },
        setPrototypeOf(target, proto) {
            return Reflect.setPrototypeOf(getStore(), proto)
        },
    }) as IsolatedStore<T>
}

export function defineWritable<T>(createValue?: ()=>T, start?: StartStopNotifier<T>): IsolatedStore<Writable<T>> {
    return defineStore(() => writable(createValue(), start))
}

export function defineReadable<T>(createValue?: ()=>T, start?: StartStopNotifier<T>): IsolatedStore<Readable<T>> {
    return defineStore(() => readable(createValue(), start))
}
