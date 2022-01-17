import svelteKitEnv from '$app/env'

jest.mock(
    '$app/stores',
    () => ({
        session: {
            subscribe: jest.fn(),
        },
    }),
    { virtual: true },
)

jest.mock(
    '$app/env',
    () => ({
        browser: false,
        __setBrowser(val) {
            this.browser = val
        },
    }),
    { virtual: true },
)

export {}
