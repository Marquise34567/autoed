// subscription helpers

export function isPremium(userDoc: any): boolean {
  if (!userDoc) return false
  const plan = userDoc.plan || userDoc?.subscription?.plan || 'free'
  const status = userDoc.status || userDoc.subscriptionStatus || userDoc?.subscription?.status || 'inactive'
  return (plan !== 'free' && (status === 'active' || status === 'trialing'))
}

export async function requirePremium(actionName: string, userDoc: any, router?: any, opts?: { next?: string }) {
  const ok = isPremium(userDoc)
  if (ok) return true

  try {
    // Lightweight UI fallback: show an upgrade prompt. Integrate with app toast/modal if available.
    // Do not auto-redirect — let the user choose to navigate to pricing.
    // eslint-disable-next-line no-alert
    alert(`Upgrade to use ${actionName}. Visit pricing to upgrade.`)
    if (router && typeof router.push === 'function') {
      const next = opts?.next ?? '/editor'
      // optional: route user to pricing with reason and return path
      router.push(`/pricing?reason=upgrade&next=${encodeURIComponent(next)}`)
    }
  } catch (_) {}

  return false
}
