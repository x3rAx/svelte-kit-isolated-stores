import type { ExternalFetch } from '@sveltejs/kit'
import { useSession } from './useSession'

export const useFetch = (): { fetch: ExternalFetch } => {
    const { sessionData } = useSession()
    return { fetch: sessionData.fetch }
}
