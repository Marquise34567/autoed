// Frontend-only stub for supabase server helpers. Real server code is disabled.
export function createApiRouteClient() {
  return {
    supabase: {
      auth: {
        exchangeCodeForSession: async (code: string) => ({ error: null }),
        getUser: async () => ({ data: null }),
      },
      from: (table?: string) => ({
        select: (cols?: string) => ({
          eq: (_k: string, _v: any) => ({ single: async () => ({ data: null }) }),
          single: async () => ({ data: null }),
        }),
        insert: async (obj: any) => ({ data: obj }),
      }),
    },
    response: undefined,
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
