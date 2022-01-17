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
    }),
    { virtual: true },
)

export {}
