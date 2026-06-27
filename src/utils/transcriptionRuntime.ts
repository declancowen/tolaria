import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'

const RECORDING_SAMPLE_RATE = 16_000
const RECORDING_BUFFER_SIZE = 4096

type BrowserWindowWithAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

export type RecordedAudioTranscription = {
  transcript: string
}

export type RecordingCapture = {
  flush: () => Promise<string | null>
  pause: () => void
  resume: () => void
  stop: () => Promise<string | null>
}

async function runtimeInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  if (isTauri()) return invoke<T>(command, args)

  try {
    return await invoke<T>(command, args)
  } catch {
    return mockInvoke<T>(command, args)
  }
}

export async function transcribeRecordedAudio(modelId: string, audioBase64: string): Promise<RecordedAudioTranscription> {
  return runtimeInvoke<RecordedAudioTranscription>('transcribe_recorded_audio', {
    args: {
      audioBase64,
      modelId,
    },
  })
}

export async function startRecordingCapture(): Promise<RecordingCapture> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone recording is unavailable in this environment.')
  }

  const AudioContextConstructor = window.AudioContext ?? (window as BrowserWindowWithAudio).webkitAudioContext
  if (!AudioContextConstructor) {
    throw new Error('Audio capture is unavailable in this browser.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  })
  const audioContext = new AudioContextConstructor()
  const source = audioContext.createMediaStreamSource(stream)
  const processor = audioContext.createScriptProcessor(RECORDING_BUFFER_SIZE, 1, 1)
  const silence = audioContext.createGain()
  const chunks: Float32Array[] = []
  let paused = false
  let stopped = false
  let stopPromise: Promise<string | null> | null = null

  processor.onaudioprocess = (event) => {
    if (paused || stopped) return

    const input = event.inputBuffer.getChannelData(0)
    chunks.push(new Float32Array(input))
  }

  source.connect(processor)
  silence.gain.value = 0
  processor.connect(silence)
  silence.connect(audioContext.destination)

  return {
    flush: () => Promise.resolve(encodeRecordingChunks(consumeAudioChunks(chunks), audioContext.sampleRate)),
    pause: () => {
      paused = true
    },
    resume: () => {
      paused = false
    },
    stop: () => {
      stopPromise ??= stopRecordingCapture({
        audioContext,
        chunks,
        processor,
        silence,
        source,
        stream,
        stop: () => {
          stopped = true
        },
      })
      return stopPromise
    },
  }
}

function consumeAudioChunks(chunks: Float32Array[]): Float32Array[] {
  return chunks.splice(0, chunks.length)
}

async function stopRecordingCapture({
  audioContext,
  chunks,
  processor,
  silence,
  source,
  stream,
  stop,
}: {
  audioContext: AudioContext
  chunks: Float32Array[]
  processor: ScriptProcessorNode
  silence: GainNode
  source: MediaStreamAudioSourceNode
  stream: MediaStream
  stop: () => void
}): Promise<string | null> {
  stop()
  processor.disconnect()
  silence.disconnect()
  source.disconnect()
  stream.getTracks().forEach(track => track.stop())
  await audioContext.close().catch(() => undefined)

  return encodeRecordingChunks(consumeAudioChunks(chunks), audioContext.sampleRate)
}

function encodeRecordingChunks(chunks: Float32Array[], inputSampleRate: number): string | null {
  const mergedSamples = mergeAudioChunks(chunks)
  if (mergedSamples.length === 0) {
    return null
  }

  const wav = encodeWav(downsampleAudio(mergedSamples, inputSampleRate, RECORDING_SAMPLE_RATE), RECORDING_SAMPLE_RATE)
  return `data:audio/wav;base64,${arrayBufferToBase64(wav)}`
}

function mergeAudioChunks(chunks: Float32Array[]): Float32Array {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const samples = new Float32Array(sampleCount)
  let offset = 0

  chunks.forEach((chunk) => {
    samples.set(chunk, offset)
    offset += chunk.length
  })

  return samples
}

function downsampleAudio(samples: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) return samples
  if (inputSampleRate < outputSampleRate) return samples

  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.floor(samples.length / ratio)
  const result = new Float32Array(outputLength)

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio)
    const end = Math.min(Math.floor((outputIndex + 1) * ratio), samples.length)
    let total = 0

    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      total += samples[inputIndex] ?? 0
    }

    result[outputIndex] = total / Math.max(1, end - start)
  }

  return result
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)
  writePcm16(view, 44, samples)

  return buffer
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

function writePcm16(view: DataView, offset: number, samples: Float32Array): void {
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0))
    view.setInt16(offset + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}
