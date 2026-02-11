// Frontend-only stub for supabase server helpers. Real server code is disabled.
export function createApiRouteClient() {
  return {
    auth: { getUser: async () => ({ data: null }) },
  }
}

export function createServerClient() {
  return {
    from: () => ({ select: async () => [] }),
  }
}

export async function createClient() {
  return createServerClient()
}

export function createAdminClient() {
  throw new Error('createAdminClient is disabled in frontend-only build')
}
