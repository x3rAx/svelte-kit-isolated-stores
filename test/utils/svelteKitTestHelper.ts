import { session as sessionStore } from '$app/stores'
import type { LoadInput } from '@sveltejs/kit'
import svelteKitEnv from '$app/env'

export function __asBrowser__(cb: CallableFunction) {
    const __setBrowser: (val: boolean) => void = (val) => (svelteKitEnv as any).__setBrowser(val)

    try {
        __setBrowser(true)
        cb()
    } finally {
        __setBrowser(false)
    }
}

export function createLoadInput(merge: Partial<LoadInput>): LoadInput {
    return {
        url: undefined,
        params: undefined,
        fetch: undefined,
        session: undefined,
        stuff: undefined,

        ...merge,
    }
}

export function mockSvelteKitSession(sessionObj: object) {
    const sessionStoreSubscribeMock = sessionStore.subscribe as unknown as jest.Mock
    sessionStoreSubscribeMock.mockReset()
    sessionStoreSubscribeMock.mockImplementation((cb) => {
        cb(sessionObj)
        return () => {}
    })
}
