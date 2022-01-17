import 'jest'

import { __asBrowser__ } from './svelteKitTestHelper'
import svelteKitEnv from '$app/env'

describe('SvelteKit Test Helper', () => {
    it('it should call the browser environment callback', () => {
        const cb = jest.fn(() => {
            expect(svelteKitEnv.browser).toBe(true)
        })
        __asBrowser__(cb)

        expect(cb).toHaveBeenCalledTimes(1)
    })

    it('it should set browser environment only inside the callback', () => {
        expect(svelteKitEnv.browser).toBe(false)

        __asBrowser__(() => {
            expect(svelteKitEnv.browser).toBe(true)
        })

        expect(svelteKitEnv.browser).toBe(false)
    })

    it('it should reset browser environment even when exception is thrown', () => {
        try {
            __asBrowser__(() => {
                throw new Error('DUMMY')
            })
        } catch {
            // do not restore the browser env manually
        }

        expect(svelteKitEnv.browser).toBe(false)
    })
})
