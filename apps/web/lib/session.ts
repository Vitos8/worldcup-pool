import { cache } from "react"
import { headers } from "next/headers"
import { auth } from "./auth"

/**
 * Per-request memoized session lookup — the dashboard layout and the page it
 * renders both need the session, and without this each would resolve it
 * separately on every navigation.
 */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }))
