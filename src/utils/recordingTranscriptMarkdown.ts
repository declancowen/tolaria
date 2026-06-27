import {
  type BlockLike,
  type DurableBlockCodec,
  type DurableFencePayloadInput,
  readCodeBlockLanguage,
  readInlineText,
} from './durableMarkdownBlocks'

export const RECORDING_TRANSCRIPT_BLOCK_TYPE = 'recordingTranscriptBlock'
export const RECORDING_TRANSCRIPT_FENCE_LANGUAGE = 'tolaria-recording'

const TOKEN_PREFIX = '@@TOLARIA_RECORDING_TRANSCRIPT_BLOCK:'
const TOKEN_SUFFIX = '@@'

export interface RecordingTranscriptPayload {
  collapsed: string
  createdAt: string
  languageMode: string
  modelId: string
  title: string
  transcript: string
}

type RecordingTranscriptMetadata = Omit<RecordingTranscriptPayload, 'transcript'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFenceAttribute(info: string, name: keyof RecordingTranscriptMetadata): string {
  for (const match of info.matchAll(/\b([A-Za-z][\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/gu)) {
    if (match.at(1) === name) return unescapeFenceAttribute(match.at(2) ?? match.at(3) ?? match.at(4) ?? '')
  }
  return ''
}

function readRecordingFenceMetadata(info: string): RecordingTranscriptMetadata | null {
  const [language = '', ...infoParts] = info.trim().split(/\s+/u)
  if (language.toLowerCase() !== RECORDING_TRANSCRIPT_FENCE_LANGUAGE) return null

  const metadata = infoParts.join(' ')
  return {
    collapsed: normalizeCollapsed(readFenceAttribute(metadata, 'collapsed')),
    createdAt: readFenceAttribute(metadata, 'createdAt'),
    languageMode: readFenceAttribute(metadata, 'languageMode'),
    modelId: readFenceAttribute(metadata, 'modelId'),
    title: readFenceAttribute(metadata, 'title') || 'Recording',
  }
}

function normalizeCollapsed(value: string): string {
  return value === 'true' ? 'true' : 'false'
}

function decodeRecordingTranscriptPayload(payload: unknown): RecordingTranscriptPayload | null {
  if (!isRecord(payload)) return null
  if (typeof payload.transcript !== 'string') return null

  return {
    collapsed: normalizeCollapsed(typeof payload.collapsed === 'string' ? payload.collapsed : ''),
    createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : '',
    languageMode: typeof payload.languageMode === 'string' ? payload.languageMode : '',
    modelId: typeof payload.modelId === 'string' ? payload.modelId : '',
    title: typeof payload.title === 'string' && payload.title.trim() ? payload.title : 'Recording',
    transcript: payload.transcript,
  }
}

function buildRecordingTranscriptPayload({ lines, start, end, metadata }: DurableFencePayloadInput): RecordingTranscriptPayload {
  return {
    ...(metadata as RecordingTranscriptMetadata),
    transcript: lines.slice(start + 1, end).join('').trimEnd(),
  }
}

function buildRecordingTranscriptBlock(block: BlockLike, payload: RecordingTranscriptPayload): BlockLike {
  return {
    ...block,
    type: RECORDING_TRANSCRIPT_BLOCK_TYPE,
    props: {
      ...(block.props ?? {}),
      collapsed: payload.collapsed,
      createdAt: payload.createdAt,
      languageMode: payload.languageMode,
      modelId: payload.modelId,
      title: payload.title,
      transcript: payload.transcript,
    },
    content: undefined,
    children: [],
  }
}

function readRecordingTranscriptCodeBlock(block: BlockLike): RecordingTranscriptPayload | null {
  if (block.type !== 'codeBlock') return null
  if (readCodeBlockLanguage({ block }) !== RECORDING_TRANSCRIPT_FENCE_LANGUAGE) return null

  const transcript = readInlineText(block.content)
  if (transcript === null) return null

  return {
    collapsed: 'false',
    createdAt: '',
    languageMode: '',
    modelId: '',
    title: 'Recording',
    transcript: transcript.trimEnd(),
  }
}

function isRecordingTranscriptBlock(block: BlockLike): boolean {
  return block.type === RECORDING_TRANSCRIPT_BLOCK_TYPE
    && typeof block.props?.transcript === 'string'
}

function fenceLengthForTranscript(transcript: string): number {
  const longestRun = Math.max(0, ...Array.from(transcript.matchAll(/`+/gu), match => match[0].length))
  return Math.max(3, longestRun + 1)
}

function escapeFenceAttribute(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/"/gu, '&quot;')
}

function unescapeFenceAttribute(value: string): string {
  return value.replace(/&quot;/gu, '"').replace(/&amp;/gu, '&')
}

function recordingTranscriptMetadata(payload: RecordingTranscriptPayload): string {
  const attributes: string[] = []
  attributes.push(`title="${escapeFenceAttribute(payload.title || 'Recording')}"`)
  if (payload.createdAt) attributes.push(`createdAt="${escapeFenceAttribute(payload.createdAt)}"`)
  if (payload.modelId) attributes.push(`modelId="${escapeFenceAttribute(payload.modelId)}"`)
  if (payload.languageMode) attributes.push(`languageMode="${escapeFenceAttribute(payload.languageMode)}"`)
  if (payload.collapsed === 'true') attributes.push('collapsed="true"')
  return attributes.length > 0 ? ` ${attributes.join(' ')}` : ''
}

export function recordingTranscriptFenceSource(payload: RecordingTranscriptPayload): string {
  const transcript = payload.transcript.endsWith('\n') ? payload.transcript : `${payload.transcript}\n`
  const fence = '`'.repeat(fenceLengthForTranscript(transcript))
  return `${fence}${RECORDING_TRANSCRIPT_FENCE_LANGUAGE}${recordingTranscriptMetadata(payload)}\n${transcript}${fence}`
}

function recordingTranscriptMarkdown(block: BlockLike): string {
  const props = block.props ?? {}
  return recordingTranscriptFenceSource({
    collapsed: normalizeCollapsed(props.collapsed ?? ''),
    createdAt: props.createdAt ?? '',
    languageMode: props.languageMode ?? '',
    modelId: props.modelId ?? '',
    title: props.title ?? 'Recording',
    transcript: props.transcript ?? '',
  })
}

export const recordingTranscriptMarkdownCodec: DurableBlockCodec = {
  tokenPrefix: TOKEN_PREFIX,
  tokenSuffix: TOKEN_SUFFIX,
  readFenceMetadata: readRecordingFenceMetadata,
  buildPayload: buildRecordingTranscriptPayload,
  decodePayload: decodeRecordingTranscriptPayload,
  buildBlock: (block, payload) => buildRecordingTranscriptBlock(block, payload as RecordingTranscriptPayload),
  readCodeBlock: readRecordingTranscriptCodeBlock,
  isBlock: isRecordingTranscriptBlock,
  serializeBlock: recordingTranscriptMarkdown,
}
