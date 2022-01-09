import { session as sessionStore } from '$app/stores'
import { get as $ } from 'svelte/store'
import type { LoadInput } from '@sveltejs/kit'
import type { Writable } from 'svelte/store'
import { browser } from '$app/env'
import { LOAD_WITH_STORES_HINT } from './loadWithStoresHint'

export type Session = Writable<unknown>
export type SessionData = { stores: Map<unknown, unknown>; fetch: typeof fetch }

// Stores per session, weakly mapped by the session object. Allows the GC to
// remove stores of sessions that are no longer existent
export const sessionMap = new WeakMap<Session, SessionData>()

const browserSession = (() => {
    let _value: Session = undefined
    return {
        set(value: Session) {
            if (!browser) {
                throw new Error('Browser session cannot be set from the server')
            }
            _value = value
        },
        get(): Session {
            return _value
        },
    }
})()

export function useSession(input?: LoadInput): { session: Session; sessionData: SessionData } {
    let session: Session = input?.session ?? browserSession.get() ?? getSessionFromSvelteKitStores()

    if (!session) {
        throw new Error('Failed to get session')
    }

    if (browser) {
        browserSession.set(session)
    }

    const sessionData = getOrCreateSessionData(session, input)
    sessionData.fetch = sessionData.fetch ?? input?.fetch

    return {
        session,
        sessionData,
    }
}

function getOrCreateSessionData(session: Session, input?: LoadInput) {
    if (!sessionMap.has(session)) {
        sessionMap.set(session, { stores: new Map(), fetch: input?.fetch })
    }
    const sessionData = sessionMap.get(session)
    return sessionData
}

function getSessionFromSvelteKitStores() {
    try {
        return $(sessionStore)
    } catch (e) {
        console.error(e)
        throw new Error(
            `Isolated store was used outside component initialization and without previous initialization. ${LOAD_WITH_STORES_HINT}`,
        )
    }
}
