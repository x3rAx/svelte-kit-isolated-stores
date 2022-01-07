import { session as sessionStore } from '$app/stores'
import { get as $ } from 'svelte/store'
import type { LoadInput } from '@sveltejs/kit'
import type { Writable } from 'svelte/store'

export type Session = Writable<unknown>
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
        sessionMap.set(session, { stores: new Map(), fetch: input?.fetch })
    }
    const sessionData = sessionMap.get(session)

    sessionData.fetch = sessionData.fetch ?? input?.fetch

    return {
        session,
        sessionData,
    }
}
