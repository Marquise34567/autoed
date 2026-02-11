export async function safeJson(response: Response) {
  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_) {
    parsed = null;
  }

  if (!response.ok) {
    const message = (parsed && (parsed.error || parsed.message)) || text || response.statusText;
    throw new Error(message);
  }

  return parsed;
}
