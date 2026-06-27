export const OPEN_RECORDING_SETTINGS_EVENT = 'tolaria:open-recording-settings'
export const TRANSCRIPTION_MODELS_CHANGED_EVENT = 'tolaria:transcription-models-changed'

export function requestOpenRecordingSettings(): void {
  window.dispatchEvent(new Event(OPEN_RECORDING_SETTINGS_EVENT))
}

export function notifyTranscriptionModelsChanged(): void {
  window.dispatchEvent(new Event(TRANSCRIPTION_MODELS_CHANGED_EVENT))
}
