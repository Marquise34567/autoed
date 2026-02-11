// Server page for `/editor` — render a client-side auth gate which
// determines whether to show the editor or redirect to login.
import EditorGate from '@/components/editor/EditorGate'

export default function Page() {
  return <EditorGate />
}
