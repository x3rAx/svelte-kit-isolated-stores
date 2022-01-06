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
            console.log('GET', { prop, receiver })
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
            console.log('APPLY', { thisArg, argArray })
            const result = Reflect.apply(getStore, undefined, argArray)
            console.log('    result (APPLY):', result)
            return result
        },

        //// Redirect everything else to the session store

        construct(target, argArray, newTarget) {
            console.log('CONSTRUCT', { argArray, newTarget })
            const result = Reflect.construct(getStore().constructor, argArray, newTarget)
            console.log('    result (CONSTRUCT):', result)
            return result
        },
        defineProperty(target, prop, attributes) {
            console.log('DEFINE_PROPERTY', { prop, attributes })
            const result = Reflect.defineProperty(getStore(), prop, attributes)
            console.log('    result (DEFINE_PROPERTY):', result)
            return result
        },
        deleteProperty(target, prop) {
            console.log('DELETE_PROPERTY', { prop })
            const result = Reflect.deleteProperty(getStore(), prop)
            console.log('    result (DELETE_PROPERTY):', result)
            return result
        },
        getOwnPropertyDescriptor(target, prop) {
            console.log('GET_OWN_PROPERTY_DESCRIPTOR', { prop })
            const result = Reflect.getOwnPropertyDescriptor(getStore(), prop)
            console.log('    result (GET_OWN_PROPERTY_DESCRIPTOR):', result)
            return result
        },
        getPrototypeOf(target) {
            console.log('GET_PROPERTY_OF')
            const result = Reflect.getPrototypeOf(getStore())
            console.log('    result (GET_PROPERTY_OF):', result)
            return result
        },
        has(target, prop) {
            console.log('HAS', { prop })
            const result = Reflect.has(getStore(), prop)
            console.log('    result (HAS):', result)
            return result
        },
        isExtensible(target) {
            console.log('IS_EXTENSIBLE')
            const result = Reflect.isExtensible(getStore())
            console.log('    result (IS_EXTENSIBLE):', result)
            return result
        },
        ownKeys(target) {
            console.log('OWN_KEYS')
            const result = Reflect.ownKeys(getStore())
            console.log('    result (OWN_KEYS):', result)
            return result
        },
        preventExtensions(target) {
            console.log('PREVENT_EXTENSIONS')
            const result = Reflect.preventExtensions(getStore())
            console.log('    result (PREVENT_EXTENSIONS):', result)
            return result
        },
        set(target, prop, value, receiver) {
            console.log('SET', { prop, value, receiver })
            const result = Reflect.set(getStore(), prop, value, receiver)
            console.log('    result (SET):', result)
            return result
        },
        setPrototypeOf(target, proto) {
            console.log('SET_PROPERTY_OF', { proto })
            const result = Reflect.setPrototypeOf(getStore(), proto)
            console.log('    result (SET_PROPERTY_OF):', result)
            return result
        },
    }) as IsolatedStore<T>
}

export function defineWritable<T>(value?: T, start?: StartStopNotifier<T>): Writable<T> {
    return defineStore(() => writable(value, start))
}

export function defineReadable<T>(value?: T, start?: StartStopNotifier<T>): Readable<T> {
    return defineStore(() => readable(value, start))
}
