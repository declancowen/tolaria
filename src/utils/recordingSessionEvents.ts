export const RECORDING_TRANSCRIPT_SESSION_EVENT = 'tolaria:recording-transcript-session'

export type RecordingTranscriptSessionDetail = {
  active: boolean
  blockId: string
}

export function dispatchRecordingTranscriptSessionChange(detail: RecordingTranscriptSessionDetail): void {
  window.dispatchEvent(new CustomEvent<RecordingTranscriptSessionDetail>(
    RECORDING_TRANSCRIPT_SESSION_EVENT,
    { detail },
  ))
}

