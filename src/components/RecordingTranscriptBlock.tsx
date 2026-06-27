import { CaretDown, CaretRight, Microphone, Play, Stop } from '@phosphor-icons/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { trackEvent } from '../lib/telemetry'
import { translate } from '../lib/i18n'
import {
  listTranscriptionModels,
  resolveDefaultTranscriptionModelId,
  transcriptionLanguageModeForModel,
  TRANSCRIPTION_MODEL_CATALOG,
  type TranscriptionLanguageMode,
  type TranscriptionModelStatus,
} from '../lib/transcriptionModels'
import { dispatchRichEditorExternalChange } from './editorExternalChangeEvents'
import {
  isStaleBlockReferenceError,
  reportRecoveredEditorTransformError,
} from './richEditorTransformErrorRecoveryExtension'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Textarea } from './ui/textarea'
import { dispatchRecordingTranscriptSessionChange } from '../utils/recordingSessionEvents'
import { requestOpenRecordingSettings, TRANSCRIPTION_MODELS_CHANGED_EVENT } from '../utils/recordingSettingsEvents'
import {
  startRecordingCapture,
  transcribeRecordedAudio,
  type RecordingCapture,
} from '../utils/transcriptionRuntime'

type RecordingState = 'idle' | 'recording' | 'transcribing'

type RecordingTranscriptBlockProps = {
  block: {
    id: string
    props: {
      collapsed: string
      createdAt: string
      languageMode: string
      modelId: string
      title: string
      transcript: string
    }
  }
  editor: {
    domElement?: EventTarget | null
    focus?: () => void
    updateBlock: (blockId: string, update: { props: Partial<RecordingTranscriptBlockProps['block']['props']> }) => void
  }
}

function t(key: Parameters<typeof translate>[1], values?: Record<string, string | number>): string {
  return translate('en', key, values)
}

function updateRecordingBlock(
  editor: RecordingTranscriptBlockProps['editor'],
  blockId: string,
  props: Partial<RecordingTranscriptBlockProps['block']['props']>,
) {
  try {
    editor.updateBlock(blockId, { props })
    dispatchRichEditorExternalChange(editor, editor.domElement ?? undefined)
  } catch (error) {
    if (!isStaleBlockReferenceError(error)) throw error
    reportRecoveredEditorTransformError('stale_block_reference', error)
  }
}

function stopBlockEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

function displayModelId(modelId: string): string {
  return TRANSCRIPTION_MODEL_CATALOG.find(model => model.id === resolveDefaultTranscriptionModelId(modelId))?.title ?? modelId
}

export function RecordingTranscriptBlock({ block, editor }: RecordingTranscriptBlockProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<TranscriptionModelStatus[]>(() => TRANSCRIPTION_MODEL_CATALOG.map(model => ({
    ...model,
    installed: false,
    path: null,
  })))
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const captureRef = useRef<RecordingCapture | null>(null)
  const collapsed = block.props.collapsed === 'true'
  const modelId = resolveDefaultTranscriptionModelId(block.props.modelId)
  const languageMode = (block.props.languageMode || 'english') as TranscriptionLanguageMode
  const selectedModel = models.find(model => model.id === modelId) ?? TRANSCRIPTION_MODEL_CATALOG.find(model => model.id === modelId)
  const selectedModelInstalled = selectedModel && 'installed' in selectedModel ? selectedModel.installed : false
  const hasTranscript = block.props.transcript.trim().length > 0

  const refreshModels = useCallback(async () => {
    try {
      setModels(await listTranscriptionModels())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void refreshModels()
  }, [refreshModels])

  useEffect(() => {
    window.addEventListener(TRANSCRIPTION_MODELS_CHANGED_EVENT, refreshModels)
    return () => window.removeEventListener(TRANSCRIPTION_MODELS_CHANGED_EVENT, refreshModels)
  }, [refreshModels])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || collapsed) return

    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [block.props.transcript, collapsed])

  const setCollapsed = useCallback((nextCollapsed: boolean) => {
    updateRecordingBlock(editor, block.id, { collapsed: nextCollapsed ? 'true' : 'false' })
  }, [block.id, editor])

  const appendTranscript = useCallback((nextTranscript: string) => {
    const trimmedTranscript = nextTranscript.trim()
    if (!trimmedTranscript) return

    const currentTranscript = block.props.transcript.trim()
    updateRecordingBlock(editor, block.id, {
      transcript: currentTranscript
        ? `${currentTranscript}\n\n${trimmedTranscript}`
        : trimmedTranscript,
    })
  }, [block.id, block.props.transcript, editor])

  const setModel = useCallback((nextModelId: string) => {
    const resolvedModelId = resolveDefaultTranscriptionModelId(nextModelId)
    updateRecordingBlock(editor, block.id, {
      languageMode: transcriptionLanguageModeForModel(resolvedModelId),
      modelId: resolvedModelId,
    })
    trackEvent('editor_recording_transcript_model_changed', { model_id: resolvedModelId })
  }, [block.id, editor])

  const startRecording = useCallback(async () => {
    try {
      const models = await listTranscriptionModels()
      const model = models.find(candidate => candidate.id === modelId)
      if (!model?.installed) {
        setError(t('editor.recording.installModelFirst'))
        trackEvent('editor_recording_transcript_model_missing', { model_id: modelId })
        return
      }
      setError(null)
      captureRef.current = await startRecordingCapture()
      setRecordingState('recording')
      dispatchRecordingTranscriptSessionChange({ active: true, blockId: block.id })
      trackEvent('editor_recording_transcript_started', {
        language_mode: languageMode,
        model_id: modelId,
        resumed: hasTranscript ? 1 : 0,
      })
    } catch (err) {
      captureRef.current = null
      dispatchRecordingTranscriptSessionChange({ active: false, blockId: block.id })
      setError(err instanceof Error ? err.message : String(err))
      trackEvent('editor_recording_transcript_start_failed', { model_id: modelId })
    }
  }, [block.id, hasTranscript, languageMode, modelId])

  const stopRecording = useCallback(async () => {
    const capture = captureRef.current
    if (!capture) return

    captureRef.current = null
    setRecordingState('transcribing')
    try {
      const audioBase64 = await capture.stop()
      const result = await transcribeRecordedAudio(modelId, audioBase64)
      appendTranscript(result.transcript)
      setError(null)
      trackEvent('editor_recording_transcript_stopped', {
        model_id: modelId,
        transcript_length: result.transcript.length,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      trackEvent('editor_recording_transcript_stop_failed', { model_id: modelId })
    } finally {
      setRecordingState('idle')
      dispatchRecordingTranscriptSessionChange({ active: false, blockId: block.id })
    }
  }, [appendTranscript, block.id, modelId])

  useEffect(() => () => {
    captureRef.current?.stop().catch(() => undefined)
    captureRef.current = null
    dispatchRecordingTranscriptSessionChange({ active: false, blockId: block.id })
  }, [block.id])

  return (
    <div className="recording-transcript-block" contentEditable={false} onMouseDown={stopBlockEvent}>
      <div className="recording-transcript-block__header">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="recording-transcript-block__collapse"
          aria-label={collapsed ? t('editor.recording.expand') : t('editor.recording.collapse')}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <CaretRight size={15} /> : <CaretDown size={15} />}
        </Button>
        <div className="recording-transcript-block__icon">
          <Microphone size={16} weight={recordingState === 'recording' ? 'fill' : 'regular'} />
        </div>
        <div className="recording-transcript-block__title">
          <span>{block.props.title || t('editor.recording.title')}</span>
        </div>
        <div className="recording-transcript-block__actions">
          <Select value={modelId} onValueChange={setModel} disabled={recordingState !== 'idle'}>
            <SelectTrigger
              aria-label={t('editor.recording.modelLabel')}
              className="recording-transcript-block__model-trigger"
              size="sm"
            >
              <SelectValue>{displayModelId(modelId)}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" position="popper">
              {models.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  {model.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {recordingState === 'idle' ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!selectedModelInstalled} onClick={() => void startRecording()}>
              <Play size={15} weight="fill" />
              {hasTranscript ? t('editor.recording.resume') : t('editor.recording.start')}
            </Button>
          ) : null}
          {recordingState === 'recording' ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void stopRecording()}>
              <Stop size={15} weight="fill" />
              {t('editor.recording.stop')}
            </Button>
          ) : null}
          {recordingState === 'transcribing' ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled>
              {t('editor.recording.transcribing')}
            </Button>
          ) : null}
        </div>
      </div>
      {!collapsed ? (
        <div className="recording-transcript-block__body">
          {recordingState !== 'idle' ? (
            <div className="recording-transcript-block__status" data-state={recordingState}>
              {recordingState === 'recording'
                ? t('editor.recording.listening')
                : t('editor.recording.transcribing')}
            </div>
          ) : null}
          {!selectedModelInstalled ? (
            <div className="recording-transcript-block__message recording-transcript-block__message--actionable">
              <span>{t('editor.recording.installModelFirst')}</span>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={requestOpenRecordingSettings}>
                {t('editor.recording.openSettings')}
                <CaretRight size={14} />
              </Button>
            </div>
          ) : null}
          {error ? <div className="recording-transcript-block__message">{error}</div> : null}
          <Textarea
            ref={textareaRef}
            aria-label={t('editor.recording.transcriptLabel')}
            className="recording-transcript-block__textarea selection:bg-[var(--colors-selection)] selection:text-[var(--colors-text)] focus-visible:ring-0"
            placeholder={t('editor.recording.placeholder')}
            readOnly
            value={block.props.transcript}
          />
        </div>
      ) : null}
    </div>
  )
}
