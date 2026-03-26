export async function getAuthKey(
    userId: string,
  ): Promise<{ accessManagerToken: string | undefined }> {
    const baseUrl = process.env.NEXT_PUBLIC_ACCESS_MANAGER_URL
    if (!baseUrl) {
      console.warn('[Auth] No NEXT_PUBLIC_ACCESS_MANAGER_URL configured, skipping token fetch')
      return { accessManagerToken: undefined }
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(`${baseUrl}/.netlify/functions/api/live-events/grant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ UUID: userId }),
        });

        if (!response.ok) {
          console.warn(`[Auth] Token grant returned ${response.status} (attempt ${attempt}/3)`)
          if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue }
          return { accessManagerToken: undefined }
        }

        const data = await response.json();
        if (data.statusCode === 200 && data.body?.token) {
          console.log('[Auth] Access Manager token granted, TTL:', data.body.ttl)
          return { accessManagerToken: data.body.token }
        }

        console.warn('[Auth] Token response missing token:', data)
        return { accessManagerToken: undefined }
      } catch (error: any) {
        console.error(`[Auth] Token fetch failed (attempt ${attempt}/3):`, error.message)
        if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue }
      }
    }

    return { accessManagerToken: undefined }
  }
  