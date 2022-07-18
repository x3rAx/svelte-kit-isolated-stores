import { session as sessionStore } from '$app/stores'
import { get as $ } from 'svelte/store'
import type { LoadInput } from '@sveltejs/kit'
import type { Writable } from 'svelte/store'
import { browser, mode } from '$app/env'
import { LOAD_WITH_STORES_HINT } from './loadWithStoresHint'
import { prerendering } from '$app/env'

type Session = Writable<unknown>
export type SessionKey = {} | Session
export type SessionData = { stores: Map<unknown, unknown>; fetch: typeof fetch }

// Stores per session, weakly mapped by the session object. Allows the GC to
// remove stores of sessions that are no longer existent
export const sessionMap = new WeakMap<SessionKey, SessionData>()

const browserSession = (() => {
    let _value: SessionKey = undefined
    return {
        set(value: SessionKey) {
            if (!browser) {
                throw new Error('Browser session cannot be set from the server')
            }
            _value = value
        },
        get(): SessionKey {
            return _value
        },
    }
})()

const prerenderingKey = (() => {
    let _value = {}
    return {
        get(): SessionKey {
            if (!prerendering) {
                throw new Error('Prerendering key can only be accessed during prerendering')
            }
            return _value
        },
    }
})()

export const __USE_ONLY_IN_TESTING__resetBrowserSession = () => {
    if (mode !== 'TESTING') {
        console.error("Function disabled while not in mode 'TESTING'")
        return
    }
    browserSession.set(undefined)
}

export function useSession(input?: LoadInput): SessionData {
    let key: SessionKey
    if (prerendering) {
        key = prerenderingKey.get()
    } else {
        key = ((!prerendering) ? input?.session : undefined) ?? browserSession.get() ?? getSessionFromSvelteKitStores()
    }

    if (!key) {
        throw new Error('Failed to get session')
    }

    if (browser) {
        browserSession.set(key as Session)
    }

    const sessionData = getOrCreateSessionData(key, input)
    sessionData.fetch = sessionData.fetch ?? input?.fetch

    return sessionData
}

function getOrCreateSessionData(session: SessionKey, input?: LoadInput) {
    if (!sessionMap.has(session)) {
        sessionMap.set(session, { stores: new Map(), fetch: input?.fetch })
    }
    const sessionData = sessionMap.get(session)
    return sessionData
}

function getSessionFromSvelteKitStores() {
    try {
        return $(sessionStore)
    } catch {
        throw new Error(
            `Isolated store was used outside component initialization and without previous initialization. ${LOAD_WITH_STORES_HINT}`,
        )
    }
}
