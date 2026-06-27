import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commitDictationText } from './dictationText'
import { writeClipboardText } from './clipboardText'
import { insertPlainTextFromClipboardText } from './plainTextPaste'

const { trackEvent } = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}))

vi.mock('../lib/telemetry', () => ({
  trackEvent,
}))

vi.mock('./clipboardText', () => ({
  writeClipboardText: vi.fn(),
}))

vi.mock('./plainTextPaste', () => ({
  insertPlainTextFromClipboardText: vi.fn(),
}))

const mockWriteClipboardText = vi.mocked(writeClipboardText)
const mockInsertPlainTextFromClipboardText = vi.mocked(insertPlainTextFromClipboardText)

describe('commitDictationText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteClipboardText.mockResolvedValue(undefined)
    mockInsertPlainTextFromClipboardText.mockReturnValue(true)
  })

  it('copies and inserts trimmed transcript text', async () => {
    await expect(commitDictationText('  dictated text  ')).resolves.toEqual({
      copied: true,
      inserted: true,
    })

    expect(mockWriteClipboardText).toHaveBeenCalledWith('dictated text')
    expect(mockInsertPlainTextFromClipboardText).toHaveBeenCalledWith('dictated text')
    expect(trackEvent).toHaveBeenCalledWith('dictation_text_committed', {
      copied: 1,
      inserted: 1,
    })
  })

  it('still inserts when clipboard copy is unavailable', async () => {
    mockWriteClipboardText.mockRejectedValue(new Error('clipboard unavailable'))

    await expect(commitDictationText('dictated text')).resolves.toEqual({
      copied: false,
      inserted: true,
    })

    expect(mockInsertPlainTextFromClipboardText).toHaveBeenCalledWith('dictated text')
    expect(trackEvent).toHaveBeenCalledWith('dictation_text_committed', {
      copied: 0,
      inserted: 1,
    })
  })

  it('ignores empty transcript text', async () => {
    await expect(commitDictationText('  ')).resolves.toEqual({
      copied: false,
      inserted: false,
    })

    expect(mockWriteClipboardText).not.toHaveBeenCalled()
    expect(mockInsertPlainTextFromClipboardText).not.toHaveBeenCalled()
    expect(trackEvent).not.toHaveBeenCalled()
  })
})
