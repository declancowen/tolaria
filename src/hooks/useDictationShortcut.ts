import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { AppLocale } from '../lib/i18n'
import { translate } from '../lib/i18n'
import {
  listTranscriptionModels,
  resolveDefaultTranscriptionModelId,
  type DictationKey,
  type DictationMode,
} from '../lib/transcriptionModels'
import { trackEvent } from '../lib/telemetry'
import { commitDictationText } from '../utils/dictationText'
import {
  startRecordingCapture,
  transcribeRecordedAudio,
  type RecordingCapture,
} from '../utils/transcriptionRuntime'

interface UseDictationShortcutOptions {
  dictationEnabled: boolean
  dictationKey: DictationKey
  dictationMode: DictationMode
  defaultTranscriptionModelId: string | null | undefined
  locale: AppLocale
  recordingTranscriptActive: boolean
  transcriptionEnabled: boolean
  onToast: (message: string) => void
}

function matchesDictationKey(event: KeyboardEvent, dictationKey: DictationKey): boolean {
  if (dictationKey === 'option_k') {
    return event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.code === 'KeyK'
  }

  return event.metaKey && event.shiftKey && !event.altKey && !event.ctrlKey && event.code === 'KeyD'
}

export function useDictationShortcut({
  dictationEnabled,
  dictationKey,
  dictationMode,
  defaultTranscriptionModelId,
  locale,
  recordingTranscriptActive,
  transcriptionEnabled,
  onToast,
}: UseDictationShortcutOptions) {
  const [dictating, setDictating] = useState(false)
  const activeModelIdRef = useRef<string | null>(null)
  const captureRef = useRef<RecordingCapture | null>(null)
  const pushToTalkActiveRef = useRef(false)

  const stopDictation = useEffectEvent(async () => {
    const capture = captureRef.current
    const modelId = activeModelIdRef.current
    if (!capture || !modelId) return

    captureRef.current = null
    activeModelIdRef.current = null
    pushToTalkActiveRef.current = false
    setDictating(false)

    try {
      onToast(translate(locale, 'editor.dictation.transcribing'))
      const audioBase64 = await capture.stop()
      const result = audioBase64
        ? await transcribeRecordedAudio(modelId, audioBase64)
        : { transcript: '' }
      const committed = await commitDictationText(result.transcript)

      if (!result.transcript.trim()) {
        onToast(translate(locale, 'editor.dictation.noTranscript'))
      } else if (committed.inserted) {
        onToast(translate(locale, 'editor.dictation.inserted'))
      } else if (committed.copied) {
        onToast(translate(locale, 'editor.dictation.copied'))
      }

      trackEvent('dictation_transcribed', {
        copied: committed.copied ? 1 : 0,
        inserted: committed.inserted ? 1 : 0,
        model_id: modelId,
        transcript_length: result.transcript.length,
      })
    } catch (err) {
      onToast(err instanceof Error ? err.message : String(err))
      trackEvent('dictation_transcription_failed', { model_id: modelId })
    }
  })

  const startDictation = useEffectEvent(async (event: KeyboardEvent) => {
    if (!transcriptionEnabled || !dictationEnabled) return
    if (!matchesDictationKey(event, dictationKey)) return
    if (event.repeat) return

    event.preventDefault()
    event.stopPropagation()

    if (dictating) {
      if (dictationMode === 'toggle') {
        await stopDictation()
      }
      return
    }

    if (dictationMode === 'push_to_talk' && pushToTalkActiveRef.current) return

    if (recordingTranscriptActive) {
      onToast(translate(locale, 'editor.dictation.unavailableWhileRecording'))
      trackEvent('dictation_blocked_while_recording')
      return
    }

    const modelId = resolveDefaultTranscriptionModelId(defaultTranscriptionModelId)
    try {
      const models = await listTranscriptionModels()
      if (!models.some(model => model.id === modelId && model.installed)) {
        onToast(translate(locale, 'editor.dictation.installModelFirst'))
        trackEvent('dictation_model_missing', { model_id: modelId })
        return
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : String(err))
      trackEvent('dictation_model_check_failed', { model_id: modelId })
      return
    }

    try {
      captureRef.current = await startRecordingCapture()
      activeModelIdRef.current = modelId
      setDictating(true)
      onToast(translate(locale, 'editor.dictation.listening'))
      trackEvent('dictation_started', { key: dictationKey, mode: dictationMode, model_id: modelId })
    } catch (err) {
      captureRef.current = null
      activeModelIdRef.current = null
      onToast(err instanceof Error ? err.message : String(err))
      trackEvent('dictation_start_failed', { model_id: modelId })
      return
    }

    if (dictationMode === 'push_to_talk') {
      pushToTalkActiveRef.current = true
    }
  })

  const stopPushToTalk = useEffectEvent(async (event: KeyboardEvent) => {
    if (dictationMode !== 'push_to_talk') return
    if (!pushToTalkActiveRef.current) return
    if (!matchesDictationKey(event, dictationKey)) return

    event.preventDefault()
    await stopDictation()
  })

  useEffect(() => {
    window.addEventListener('keydown', startDictation, true)
    window.addEventListener('keyup', stopPushToTalk, true)
    return () => {
      window.removeEventListener('keydown', startDictation, true)
      window.removeEventListener('keyup', stopPushToTalk, true)
    }
  }, [])

  useEffect(() => () => {
    captureRef.current?.stop().catch(() => undefined)
    captureRef.current = null
    activeModelIdRef.current = null
    pushToTalkActiveRef.current = false
    setDictating(false)
  }, [])

  return { dictating }
}
