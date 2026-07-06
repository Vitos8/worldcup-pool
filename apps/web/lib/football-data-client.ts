const BASE_URL = "https://api.football-data.org/v4"

/**
 * football-data.org's onboarding email specifically calls out reading the
 * rate-limit headers instead of hardcoding a request budget — free tier is
 * 10 req/min, exposed live via X-Requests-Available-Minute.
 */
export async function footballDataFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
  })

  const remaining = res.headers.get("X-Requests-Available-Minute")
  if (remaining !== null && Number(remaining) <= 1) {
    console.warn(`football-data.org: only ${remaining} request(s) left this minute`)
  }

  if (!res.ok) {
    throw new Error(`football-data.org request failed: ${res.status} ${res.statusText} (${path})`)
  }

  return res.json()
}
