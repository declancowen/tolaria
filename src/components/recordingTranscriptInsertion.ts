import { trackEvent } from '../lib/telemetry'
import {
  resolveDefaultTranscriptionModelId,
  transcriptionLanguageModeForModel,
  type TranscriptionLanguageMode,
} from '../lib/transcriptionModels'
import { RECORDING_TRANSCRIPT_BLOCK_TYPE } from '../utils/recordingTranscriptMarkdown'
import {
  isStaleBlockReferenceError,
  reportRecoveredEditorTransformError,
} from './richEditorTransformErrorRecoveryExtension'

export type RecordingTranscriptInsertSource = 'slash_command' | 'toolbar'

export interface RecordingTranscriptInsertDefaults {
  languageMode?: TranscriptionLanguageMode | null
  modelId?: string | null
}

interface CursorBlock {
  id: string
}

interface RecordingTranscriptInsertEditor {
  focus?: () => void
  getBlock: (blockId: string) => CursorBlock | null | undefined
  getTextCursorPosition: () => { block: CursorBlock }
  insertBlocks: (
    blocksToInsert: Array<{ type: typeof RECORDING_TRANSCRIPT_BLOCK_TYPE; props: RecordingTranscriptBlockProps }>,
    referenceBlock: CursorBlock,
    placement: 'after',
  ) => unknown[]
}

export type RecordingTranscriptBlockProps = Record<string, string> & {
  collapsed: string
  createdAt: string
  languageMode: string
  modelId: string
  title: string
  transcript: string
}

export function createRecordingTranscriptBlockProps(
  defaults: RecordingTranscriptInsertDefaults = {},
): RecordingTranscriptBlockProps {
  const modelId = resolveDefaultTranscriptionModelId(defaults.modelId)
  return {
    collapsed: 'false',
    createdAt: new Date().toISOString(),
    languageMode: defaults.languageMode ?? transcriptionLanguageModeForModel(modelId),
    modelId,
    title: 'Recording',
    transcript: '',
  }
}

export function insertRecordingTranscriptBlockAfterCursor(
  editor: RecordingTranscriptInsertEditor,
  defaults: RecordingTranscriptInsertDefaults,
  source: RecordingTranscriptInsertSource,
): boolean {
  const props = createRecordingTranscriptBlockProps(defaults)

  try {
    const cursorBlock = editor.getTextCursorPosition().block
    const liveBlock = editor.getBlock(cursorBlock.id) ?? cursorBlock
    editor.insertBlocks([{ type: RECORDING_TRANSCRIPT_BLOCK_TYPE, props }], liveBlock, 'after')
    editor.focus?.()
    trackEvent('editor_recording_transcript_inserted', {
      language_mode: props.languageMode,
      model_id: props.modelId,
      source,
    })
    return true
  } catch (error) {
    if (!isStaleBlockReferenceError(error)) throw error

    reportRecoveredEditorTransformError('stale_block_reference', error)
    return false
  }
}
