jest.mock(
    '$app/stores',
    () => {
        return {}
    },
    { virtual: true },
)

jest.mock(
    '$app/env',
    () => {
        return {}
    },
    { virtual: true },
)

export {}
