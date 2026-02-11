// Stub for ffprobe helper used only on server.
export async function ffprobe(/* file */) {
  throw new Error('ffprobe is disabled in frontend-only build')
}
