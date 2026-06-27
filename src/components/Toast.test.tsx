import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toast } from './Toast'

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('dismisses normal toasts automatically', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()

    render(<Toast message="Saved" onDismiss={onDismiss} />)

    expect(screen.getByText('Saved')).toBeInTheDocument()
    vi.advanceTimersByTime(2_000)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('keeps persistent toasts visible until dismissed externally', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()

    render(<Toast message="Listening" persistent onDismiss={onDismiss} />)

    expect(screen.getByText('Listening')).toBeInTheDocument()
    vi.advanceTimersByTime(10_000)
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
