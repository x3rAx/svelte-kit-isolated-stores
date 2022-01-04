import { session as sessionStore } from '$app/stores'
//import { session as sessionStore } from '@sveltejs/kit/assets/runtime/app/stores'
import { get as $ } from 'svelte/store'
import type { Session } from './svelteKitTypes'
import { loadSession, sessionMap } from './useLoad'
import type { SessionData } from './useLoad'

export function useSession(): { session: Session; sessionData: SessionData } {
    const session = loadSession ?? ($(sessionStore) as Session)

    const sessionData = sessionMap.get(session)

    if (!sessionData) {
        throw new Error('Call useLoad before calls to useSession')
    }

    return {
        session,
        sessionData,
    }
}
