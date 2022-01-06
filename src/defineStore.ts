import { useSession } from './useSession'
import { writable, readable, StartStopNotifier, Writable, Readable } from 'svelte/store'

type IsolatedStore<T extends object> = (() => T) & T

export function defineStore<T extends object>(fn: () => T): IsolatedStore<T> {
    function getStore(): T {
        // Get stores for session
        const { sessionData } = useSession()
        const { stores } = sessionData

        // Get requested store from session stores, create if not exists
        if (!stores.has(fn)) {
            stores.set(fn, fn())
        }
        return stores.get(fn) as T
    }

    // NOTE: We do not access this dymmy object and we make it a function so it
    //       is callable
    const dummy = (() => {}) as T

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

export function defineWritable<T>(value?: T, start?: StartStopNotifier<T>): Writable<T> {
    return defineStore(() => writable(value, start))
}

export function defineReadable<T>(value?: T, start?: StartStopNotifier<T>): Readable<T> {
    return defineStore(() => readable(value, start))
}
