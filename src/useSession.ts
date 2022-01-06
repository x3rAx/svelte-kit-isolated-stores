import { session as sessionStore } from '$app/stores'
import { get as $ } from 'svelte/store'
import type { Session } from './svelteKitTypes'
import { loadSession, sessionMap } from './useLoad'
import type { SessionData } from './useLoad'

export function useSession(): { session: Session; sessionData: SessionData } {
    const session = loadSession ?? ($(sessionStore) as Session)

    if (!session) {
        throw new Error('Failed to get session')
    }

    if (!sessionMap.has(session)) {
        // TODO: `fetch: fetch` instead of `null`?
        sessionMap.set(session, { stores: new Map(), fetch: null })
    }
    const sessionData = sessionMap.get(session)

    return {
        session,
        sessionData,
    }
}
