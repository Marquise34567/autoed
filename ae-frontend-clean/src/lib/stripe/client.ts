type StartCheckoutPayload = {
  priceId: string;
  plan: string;
  interval: 'monthly' | 'annual';
  trial?: boolean;
  next?: string;
};

export async function startCheckout(payload: StartCheckoutPayload): Promise<string> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let json: any = null;
    try { json = JSON.parse(text); } catch (e) {}
    const msg = (json && (json.message || json.error)) || text || `status:${res.status}`;
    throw new Error(`Checkout API error: ${msg}`);
  }

  const data = await res.json();
  if (!data || !data.url) throw new Error('No checkout URL returned');
  return data.url as string;
}
