import 'jest'
import { writable } from 'svelte/store'
import { defineStore, isIsolatedStore } from '../defineStore'

describe(isIsolatedStore.name, () => {
    it('should return true if given an isolated store', () => {
        const store = defineStore<any>(() => writable(() => 0))

        expect(isIsolatedStore(store)).toBe(true)
    })

    it('should return false if given object is not an isolated store', () => {
        expect(isIsolatedStore({})).toBe(false)
        expect(isIsolatedStore(() => {})).toBe(false)
        expect(isIsolatedStore(1)).toBe(false)
        expect(isIsolatedStore('')).toBe(false)
    })
})
