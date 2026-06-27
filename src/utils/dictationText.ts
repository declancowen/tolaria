import { trackEvent } from '../lib/telemetry'
import { writeClipboardText } from './clipboardText'
import { insertPlainTextFromClipboardText } from './plainTextPaste'

export type DictationTextResult = {
  copied: boolean
  inserted: boolean
}

export async function commitDictationText(text: string): Promise<DictationTextResult> {
  const transcript = text.trim()
  if (!transcript) return { copied: false, inserted: false }

  let copied = false
  try {
    await writeClipboardText(transcript)
    copied = true
  } catch {
    copied = false
  }

  const inserted = insertPlainTextFromClipboardText(transcript)
  trackEvent('dictation_text_committed', {
    copied: copied ? 1 : 0,
    inserted: inserted ? 1 : 0,
  })
  return { copied, inserted }
}
