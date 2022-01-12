import { SessionData, useSession } from './useSession'
import type { Readable } from 'svelte/store'
import type { LoadInput } from '@sveltejs/kit'
import { LOAD_WITH_STORES_HINT } from './loadWithStoresHint'

type SvelteKitFetch = (info: RequestInfo, init?: RequestInit) => Promise<Response>
type SessionStoreFn<T> = (input?: LoadInput) => T
export type StoreInput = { fetch: SvelteKitFetch }
export type IsolatedStore<T extends Readable<unknown>> = SessionStoreFn<T> & T

const IS_ISOLATED_STORE = Symbol('IS_ISOLATED_STORE')
export function isIsolatedStore(store: any) {
    return typeof store === 'function' && store[IS_ISOLATED_STORE]
}

export function defineStore<T extends Readable<unknown>>(
    fn: (storeInput: StoreInput) => T,
): IsolatedStore<T> {
    function getStore(input?: LoadInput): T {
        // Get stores for session
        const { sessionData } = useSession(input)
        const { stores } = sessionData

        // Get requested store from session stores, create if not exists
        if (!stores.has(fn)) {
            const storeInput = createStoreInput(sessionData)
            stores.set(fn, fn(storeInput))
        }
        return stores.get(fn) as T
    }

    // NOTE: We do not access this dymmy object but we make it a function so
    //       the proxy is callable
    const isolatedStore = (_input: LoadInput) => {}

    return new Proxy(isolatedStore, {
        // The main part: Redirect property getter to session store
        get(_target, prop, _receiver) {
            if (prop === IS_ISOLATED_STORE) {
                return true
            }
            const store = getStore()
            return store[prop]
        },

        // Some magic: Call the store to get the session store
        apply(_target, thisArg, argArray) {
            return Reflect.apply(getStore, thisArg, argArray)
        },

        // Redirect everything else to the session store

        construct(_target, argArray, newTarget) {
            return Reflect.construct(getStore().constructor, argArray, newTarget)
        },
        defineProperty(_target, prop, attributes) {
            return Reflect.defineProperty(getStore(), prop, attributes)
        },
        deleteProperty(_target, prop) {
            return Reflect.deleteProperty(getStore(), prop)
        },
        getOwnPropertyDescriptor(_target, prop) {
            return Reflect.getOwnPropertyDescriptor(getStore(), prop)
        },
        getPrototypeOf(_target) {
            return Reflect.getPrototypeOf(getStore())
        },
        has(_target, prop) {
            return Reflect.has(getStore(), prop)
        },
        isExtensible(_target) {
            return Reflect.isExtensible(getStore())
        },
        ownKeys(_target) {
            return Reflect.ownKeys(getStore())
        },
        preventExtensions(_target) {
            return Reflect.preventExtensions(getStore())
        },
        set(_target, prop, value, receiver) {
            return Reflect.set(getStore(), prop, value, receiver)
        },
        setPrototypeOf(_target, proto) {
            return Reflect.setPrototypeOf(getStore(), proto)
        },
    }) as IsolatedStore<T>
}

function createStoreInput(sessionData: SessionData): StoreInput {
    return {
        get fetch() {
            if (!sessionData.fetch) {
                throw new Error(
                    `\`fetch\` is not available to store without previous initialization. ${LOAD_WITH_STORES_HINT}`,
                )
            }
            return sessionData.fetch
        },
    }
}
