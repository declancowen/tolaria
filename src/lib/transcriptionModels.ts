import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'

export type TranscriptionEngine = 'parakeet' | 'whisper'
export type TranscriptionLanguageMode = 'english' | 'multilingual'
export type DictationKey = 'option_k' | 'command_shift_d'
export type DictationMode = 'push_to_talk' | 'toggle'

export interface TranscriptionModelArtifact {
  filename: string
  url: string
}

export interface TranscriptionModelDefinition {
  artifacts: TranscriptionModelArtifact[]
  description: string
  engine: TranscriptionEngine
  id: string
  languageMode: TranscriptionLanguageMode
  license: string
  sizeMb: number
  title: string
}

export interface TranscriptionModelStatus extends TranscriptionModelDefinition {
  installed: boolean
  path: string | null
}

export interface TranscriptionModelInstallResult {
  model: TranscriptionModelStatus
}

export const DEFAULT_DICTATION_KEY: DictationKey = 'option_k'
export const DEFAULT_DICTATION_MODE: DictationMode = 'toggle'
export const DEFAULT_TRANSCRIPTION_MODEL_ID = 'whisper-base-en'

export const TRANSCRIPTION_MODEL_CATALOG: TranscriptionModelDefinition[] = [
  {
    id: 'whisper-tiny-en',
    title: 'Whisper Tiny',
    engine: 'whisper',
    languageMode: 'english',
    license: 'MIT',
    sizeMb: 75,
    description: 'Fastest option for English dictation.',
    artifacts: [{
      filename: 'ggml-tiny.en.bin',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    }],
  },
  {
    id: 'whisper-base-en',
    title: 'Whisper Base',
    engine: 'whisper',
    languageMode: 'english',
    license: 'MIT',
    sizeMb: 142,
    description: 'Balanced English transcription for notes and dictation.',
    artifacts: [{
      filename: 'ggml-base.en.bin',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    }],
  },
  {
    id: 'whisper-base-multilingual',
    title: 'Whisper Base',
    engine: 'whisper',
    languageMode: 'multilingual',
    license: 'MIT',
    sizeMb: 142,
    description: 'Balanced transcription across multiple languages.',
    artifacts: [{
      filename: 'ggml-base.bin',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    }],
  },
]

function normalizeModelId(modelId: string | null | undefined): string {
  const trimmed = modelId?.trim()
  return trimmed && TRANSCRIPTION_MODEL_CATALOG.some(model => model.id === trimmed)
    ? trimmed
    : DEFAULT_TRANSCRIPTION_MODEL_ID
}

export function resolveDefaultTranscriptionModelId(modelId: string | null | undefined): string {
  return normalizeModelId(modelId)
}

export function transcriptionLanguageModeForModel(modelId: string | null | undefined): TranscriptionLanguageMode {
  const resolvedModelId = resolveDefaultTranscriptionModelId(modelId)
  return TRANSCRIPTION_MODEL_CATALOG.find(model => model.id === resolvedModelId)?.languageMode ?? 'english'
}

export function normalizeDictationKey(value: string | null | undefined): DictationKey {
  return value === 'command_shift_d' ? 'command_shift_d' : DEFAULT_DICTATION_KEY
}

export function normalizeDictationMode(value: string | null | undefined): DictationMode {
  return value === 'push_to_talk' ? 'push_to_talk' : DEFAULT_DICTATION_MODE
}

async function transcriptionInvoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (isTauri()) return invoke<T>(command, args)

  try {
    return await invoke<T>(command, args)
  } catch {
    return mockInvoke<T>(command, args)
  }
}

export function listTranscriptionModels(): Promise<TranscriptionModelStatus[]> {
  return transcriptionInvoke<TranscriptionModelStatus[]>('list_transcription_models')
}

export function downloadTranscriptionModel(modelId: string): Promise<TranscriptionModelInstallResult> {
  return transcriptionInvoke<TranscriptionModelInstallResult>('download_transcription_model', { modelId })
}

export function deleteTranscriptionModel(modelId: string): Promise<TranscriptionModelInstallResult> {
  return transcriptionInvoke<TranscriptionModelInstallResult>('delete_transcription_model', { modelId })
}
