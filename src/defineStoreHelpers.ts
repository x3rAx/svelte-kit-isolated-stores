import {
    writable,
    readable,
    StartStopNotifier,
    Writable,
    Readable,
    derived,
    Unsubscriber,
} from 'svelte/store'
import { defineStore, IsolatedStore, isIsolatedStore } from './defineStore'

export function defineWritable<T>(
    createValue?: () => T,
    start?: StartStopNotifier<T>,
): IsolatedStore<Writable<T>> {
    return defineStore(() => writable(createValue(), start))
}

export function defineReadable<T>(
    createValue?: () => T,
    start?: StartStopNotifier<T>,
): IsolatedStore<Readable<T>> {
    return defineStore(() => readable(createValue(), start))
}

type Stores =
    | Readable<unknown>
    | [Readable<unknown>, ...Array<Readable<unknown>>]
    | Array<Readable<unknown>>
type StoresMap = { [key: string]: Readable<unknown> }

type StoresValues<T> = T extends Readable<infer U>
    ? U
    : T extends StoresMap
    ? { [K in keyof T as `$${string & K}`]: T[K] extends Readable<infer U> ? U : never }
    : { [K in keyof T]: T[K] extends Readable<infer U> ? U : never }

export function defineDerived<S extends Stores, T>(
    stores: S,
    fn: (values: StoresValues<S>, set: (value: T) => void) => Unsubscriber | void,
    createInitialValue?: () => T,
): IsolatedStore<Readable<T>>
export function defineDerived<S extends Stores, T>(
    stores: S,
    fn: (values: StoresValues<S>) => T,
    createInitialValue?: () => T,
): IsolatedStore<Readable<T>>
export function defineDerived<S extends StoresMap, T>(
    stores: S,
    fn: (values: StoresValues<S>, set: (value: T) => void) => Unsubscriber | void,
    createInitialValue?: () => T,
): IsolatedStore<Readable<T>>
export function defineDerived<S extends StoresMap, T>(
    stores: S,
    fn: (values: StoresValues<S>) => T,
    createInitialValue?: () => T,
): IsolatedStore<Readable<T>>
export function defineDerived<S extends Stores | StoresMap, T>(
    stores: S,
    fn: CallableFunction,
    createInitialValue: () => T = () => undefined,
): IsolatedStore<Readable<T>> {
    function overload_1(
        stores: Stores,
        fn: CallableFunction,
        createInitialValue: () => T = () => undefined,
    ) {
        return defineStore(() => {
            return derived(stores, fn as any, createInitialValue())
        })
    }

    function overload_2(
        stores: StoresMap,
        fn: CallableFunction,
        createInitialValue: () => T = () => undefined,
    ) {
        // Get keys and values of `stores`, make sure their order matches by
        // converting the object entries
        const [storeNames, storeValues] = Object.entries(stores).reduce(
            ([keys, vals], [key, val]) => [
                [...keys, key],
                [...vals, val],
            ],
            [[], []],
        )

        let fnWithObj = (values, set) => {
            const entries = storeNames.map((key, i) => [`$${key}`, values[i]])
            const storesObj = Object.fromEntries(entries)
            return fn(storesObj, set)
        }

        let callback = fnWithObj
        if (fn.length == 1) {
            // Remove argument from callback to match argument count of `fn` because
            // `derived` behaves differently depending on the number of arguments
            callback = (values) => fnWithObj(values, undefined)
        }

        return defineDerived(storeValues, callback, createInitialValue)
    }

    if (Array.isArray(stores) || isIsolatedStore(stores)) {
        return overload_1(stores as Stores, fn, createInitialValue)
    }
    return overload_2(stores as StoresMap, fn, createInitialValue)
}
