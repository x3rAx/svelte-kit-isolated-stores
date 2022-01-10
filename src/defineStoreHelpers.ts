import {
    writable,
    readable,
    StartStopNotifier,
    Writable,
    Readable,
    derived,
    Unsubscriber,
} from 'svelte/store'
import { defineStore, IsolatedStore } from './defineStore'

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

type StoresMap = { [key: string]: Readable<unknown> }
type Stores =
    | Readable<unknown>
    | [Readable<unknown>, ...Array<Readable<unknown>>]
    | Array<Readable<unknown>>
    | StoresMap
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
export function defineDerived<S extends Stores, T>(
    stores: S,
    fn: (values: StoresValues<S>) => T,
): IsolatedStore<Readable<T>>
export function defineDerived<S extends Stores, T>(
    stores: S,
    fn: any,
    createInitialValue: () => T = () => undefined,
): IsolatedStore<Readable<T>> {
    if (Array.isArray(stores)) {
        return defineStore(() => derived(stores, fn, createInitialValue()))
    }

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

    return defineStore(() => derived(storeValues, callback, createInitialValue()))
}
