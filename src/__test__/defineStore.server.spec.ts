import 'jest'
import { writable } from 'svelte/store'
import { defineStore } from '../defineStore'
import commonTests from './defineStore._common_'

jest.mock('$app/env', () => ({
    browser: false,
}))

describe(`${defineStore.name} (on server)`, () => {
    commonTests()

    it('should not save the session when not in the browser', async () => {
        const store = defineStore<any>(() => writable(() => 0))

        const sessionObj = {}

        // Initialize store. Isolation wrapper should NOT save session object
        store({ session: sessionObj })

        expect(() => store.subscribe).toThrow()
    })
})
