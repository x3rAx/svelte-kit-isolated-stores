import { session as sessionStore } from '$app/stores'
import { get as $ } from 'svelte/store'
import type { Session } from './svelteKitTypes'
import type { LoadInput } from '@sveltejs/kit'

export type SessionData = { stores: Map<unknown, unknown>; fetch: typeof fetch }

// Stores per session, weakly mapped to the session object. Allows the GC to
// remove stores of sessions that are no longer existent
export const sessionMap = new WeakMap<Session, SessionData>()

export function useSession(input?: LoadInput): { session: Session; sessionData: SessionData } {
    const session = input?.session ?? ($(sessionStore) as Session)

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
