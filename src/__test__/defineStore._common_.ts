import 'jest'
import { writable } from 'svelte/store'
import { defineStore } from '../defineStore'
import { session as sessionStore } from '$app/stores'
import { LOAD_WITH_STORES_HINT } from '../loadWithStoresHint'
import {
    createLoadInput,
    mockSvelteKitSession,
} from '../../test/utils/svelteKitTestHelper'

export default function () {
    it('should fail if isolated store is accessed without a session', () => {
        const store = defineStore<any>(() => writable(() => 0))

        expect(() => store.subscribe).toThrowError(
            `Isolated store was used outside component initialization and without previous initialization. ${LOAD_WITH_STORES_HINT}`,
        )
    })

    it('should return one store instance per session', () => {
        const store = defineStore<any>(() => writable(() => 0))

        const sessionA = {}
        const sessionB = {}

        const realStoreA = store(createLoadInput({ session: sessionA }))
        const realStoreB = store(createLoadInput({ session: sessionB }))

        expect(realStoreA).toBeInstanceOf(Object)
        expect(realStoreB).toBeInstanceOf(Object)

        expect(realStoreA).not.toBe(realStoreB)
    })

    it('should use the session store to get the session when invoked', () => {
        const store = defineStore<any>(() => writable(() => 0))

        const sessionObj = {}
        mockSvelteKitSession(sessionObj)

        const realStore = store()

        expect(sessionStore.subscribe).toBeCalledTimes(1)

        expect(realStore).toBeInstanceOf(Object)
        expect(realStore.subscribe).toBeInstanceOf(Function)
    })

    it('should use the session store to get the session when property is accessed', () => {
        const store = defineStore<any>(() => writable(() => 0))

        const sessionObj = {}
        const sessionStoreSubscribeMock = sessionStore.subscribe as unknown as jest.Mock
        sessionStoreSubscribeMock.mockReset()
        sessionStoreSubscribeMock.mockImplementation((cb) => {
            cb(sessionObj)
            return () => {}
        })

        const subscribe = store.subscribe

        expect(sessionStore.subscribe).toBeCalledTimes(1)

        expect(subscribe).toBeInstanceOf(Function)
    })

    it('should proxy all operations (except `apply`) to the real store object', () => {
        const proxyMock = {
            get: jest.fn(),
            apply: jest.fn(),
            construct: jest.fn(() => ({})),
            defineProperty: jest.fn(),
            deleteProperty: jest.fn(),
            getOwnPropertyDescriptor: jest.fn(),
            getPrototypeOf: jest.fn(() => ({})),
            has: jest.fn(),
            isExtensible: jest.fn(() => true),
            ownKeys: jest.fn(() => ['prototype']),
            preventExtensions: jest.fn(),
            set: jest.fn(),
            setPrototypeOf: jest.fn(),
        }
        function proxyDummy() {
            return {}
        }
        const theProxy = new Proxy(proxyDummy, proxyMock)
        const store = defineStore<any>(() => theProxy)

        const sessionObj = {}
        mockSvelteKitSession(sessionObj)

        Reflect.get(store, 'testProp')
        expect(proxyMock.get).toHaveBeenCalledTimes(1)
        expect(proxyMock.get).toHaveBeenCalledWith(proxyDummy, 'testProp', expect.any(Function))

        Reflect.apply(store, {}, [])
        expect(proxyMock.apply).not.toHaveBeenCalled()

        Reflect.construct(store, [])
        expect(proxyMock.construct).toHaveBeenCalledTimes(1)
        expect(proxyMock.construct).toHaveBeenCalledWith(proxyDummy, [], expect.any(Function))

        const attributes = {}
        Reflect.defineProperty(store, 'testProp', attributes)
        expect(proxyMock.defineProperty).toHaveBeenCalledTimes(1)
        expect(proxyMock.defineProperty).toHaveBeenCalledWith(proxyDummy, 'testProp', attributes)

        Reflect.deleteProperty(store, 'testProp')
        expect(proxyMock.deleteProperty).toHaveBeenCalledTimes(1)
        expect(proxyMock.deleteProperty).toHaveBeenCalledWith(proxyDummy, 'testProp')

        Reflect.getOwnPropertyDescriptor(store, 'testProp')
        expect(proxyMock.getOwnPropertyDescriptor).toHaveBeenCalledTimes(1)
        expect(proxyMock.getOwnPropertyDescriptor).toHaveBeenCalledWith(proxyDummy, 'testProp')

        Reflect.getPrototypeOf(store)
        expect(proxyMock.getPrototypeOf).toHaveBeenCalledTimes(1)
        expect(proxyMock.getPrototypeOf).toHaveBeenCalledWith(proxyDummy)

        Reflect.has(store, 'testProp')
        expect(proxyMock.has).toHaveBeenCalledTimes(1)
        expect(proxyMock.has).toHaveBeenCalledWith(proxyDummy, 'testProp')

        Reflect.isExtensible(store)
        expect(proxyMock.isExtensible).toHaveBeenCalledTimes(1)
        expect(proxyMock.isExtensible).toHaveBeenCalledWith(proxyDummy)

        Reflect.ownKeys(store)
        expect(proxyMock.ownKeys).toHaveBeenCalledTimes(1)
        expect(proxyMock.ownKeys).toHaveBeenCalledWith(proxyDummy)

        Reflect.preventExtensions(store)
        expect(proxyMock.preventExtensions).toHaveBeenCalledTimes(1)
        expect(proxyMock.preventExtensions).toHaveBeenCalledWith(proxyDummy)

        Reflect.set(store, 'testProp', 'testVal')
        expect(proxyMock.set).toHaveBeenCalledTimes(1)
        expect(proxyMock.set).toHaveBeenCalledWith(
            proxyDummy,
            'testProp',
            'testVal',
            expect.any(Function),
        )

        const proto = {}
        Reflect.setPrototypeOf(store, proto)
        expect(proxyMock.setPrototypeOf).toHaveBeenCalledTimes(1)
        expect(proxyMock.setPrototypeOf).toHaveBeenCalledWith(proxyDummy, proto)
    })

    it('should throw if store accesses `fetch` when int is not yet available', () => {
        const store = defineStore<any>(({ fetch }) => ({
            ...writable(() => 0),
            fetch, // Return the `fetch` to make sure it can be used from outside
        }))

        const sessionObj = {}
        mockSvelteKitSession(sessionObj)

        expect(() => store.fetch).toThrow(
            `\`fetch\` is not available to store without previous initialization. ${LOAD_WITH_STORES_HINT}`,
        )
    })

    it("should make SvelteKit's `fetch` available to stores", () => {
        const store = defineStore<any>(({ fetch }) => ({
            ...writable(() => 0),
            fetch, // Return the `fetch` to test if it is the same
        }))

        const sessionObj = {}
        mockSvelteKitSession(sessionObj)

        // Initialize store and make fetch available to it
        const fetchDummy = () => {}
        store({ fetch: fetchDummy })

        expect(store.fetch).toBe(fetchDummy)
    })
}
