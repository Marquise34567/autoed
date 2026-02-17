"use client"

import React from 'react'
import EditorClientV2Modern from '@/components/editor/EditorClientV2Modern'

export default function EditorClientV2({ compact }: { compact?: boolean } = {}) {
  return <EditorClientV2Modern compact={compact} />
}
