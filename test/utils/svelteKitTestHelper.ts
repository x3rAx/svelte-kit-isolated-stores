import { session as sessionStore } from '$app/stores'
import type { LoadInput } from '@sveltejs/kit'

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
