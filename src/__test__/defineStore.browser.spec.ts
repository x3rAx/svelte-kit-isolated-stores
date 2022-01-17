import 'jest'
import { writable } from 'svelte/store'
import { defineStore } from '../defineStore'
import commonTests from './defineStore._common_'
import { __USE_ONLY_IN_TESTING__resetBrowserSession } from '../useSession'

jest.mock('$app/env', () => ({
    browser: true,
    mode: 'TESTING',
}))

describe(`${defineStore.name} (in browser)`, () => {
    beforeEach(() => {
        __USE_ONLY_IN_TESTING__resetBrowserSession()
    })

    commonTests()

    it('should save the session when in the browser', async () => {
        const store = defineStore<any>(() => writable(() => 0))

        const sessionObj = {}

        // Initialize store. Isolation wrapper should save session object
        store({ session: sessionObj })

        expect(() => store.subscribe).not.toThrow()
    })
})
