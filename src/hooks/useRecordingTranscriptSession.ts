import { useEffect, useState } from 'react'
import {
  RECORDING_TRANSCRIPT_SESSION_EVENT,
  type RecordingTranscriptSessionDetail,
} from '../utils/recordingSessionEvents'

function readSessionDetail(event: Event): RecordingTranscriptSessionDetail | null {
  if (!(event instanceof CustomEvent)) return null
  const detail = event.detail as Partial<RecordingTranscriptSessionDetail> | undefined
  if (!detail || typeof detail.active !== 'boolean' || typeof detail.blockId !== 'string') return null
  return {
    active: detail.active,
    blockId: detail.blockId,
  }
}

export function useRecordingTranscriptSessionActive(): boolean {
  const [activeRecordingBlockIds, setActiveRecordingBlockIds] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    const handleSessionChange = (event: Event) => {
      const detail = readSessionDetail(event)
      if (!detail) return

      setActiveRecordingBlockIds((current) => {
        const next = new Set(current)
        if (detail.active) next.add(detail.blockId)
        else next.delete(detail.blockId)
        return next
      })
    }

    window.addEventListener(RECORDING_TRANSCRIPT_SESSION_EVENT, handleSessionChange)
    return () => window.removeEventListener(RECORDING_TRANSCRIPT_SESSION_EVENT, handleSessionChange)
  }, [])

  return activeRecordingBlockIds.size > 0
}

