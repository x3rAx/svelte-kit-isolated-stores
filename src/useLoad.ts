import type { LoadInput } from '@sveltejs/kit'
import type { Session } from './svelteKitTypes'

export type SessionData = { stores: Map<unknown, unknown>; fetch: typeof fetch }

// Needed during `load` in `module` context as `getStores()` can only be called
// during component initialization
export let loadSession: Session = null
// Stores per session, weakly mapped to the session object. Allows the GC to
// remove stores of sessions that are no longer existent
export const sessionMap = new WeakMap<Session, SessionData>()

// Typescript magic to combine return types of provided functions
type ReturnTypes<T> = T extends [...infer U, infer A]
    ? A extends (...args: unknown[]) => unknown
        ? ReturnType<A> & ReturnTypes<U>
        : void
    : void

export function useLoad<T extends Array<(...args: unknown[]) => unknown>>(
    input: LoadInput,
    ...fns: T
): ReturnTypes<T> {
    if (!sessionMap.has(input.session)) {
        sessionMap.set(input.session, { stores: new Map(), fetch: input.fetch })
    }

    loadSession = input.session

    try {
        return Object.assign({}, ...fns.map((fn) => fn()))
    } finally {
        loadSession = null
    }
}
