import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppNavigation } from './useAppNavigation'
import type { VaultEntry } from '../types'

function makeEntry(path: string): VaultEntry {
  return { path, filename: path.split('/').pop()!, title: path, isA: null, aliases: [] } as VaultEntry
}

describe('useAppNavigation', () => {
  let onSelectNote: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSelectNote = vi.fn()
  })

  function renderNav(overrides: {
    entries?: VaultEntry[]
    activeTabPath?: string | null
    pendingActiveTabPath?: string | null
    activeNoteSourceSurfaceKey?: string | null
    activeSurfaceKey?: string | null
  } = {}) {
    const entries = overrides.entries ?? [makeEntry('/a.md'), makeEntry('/b.md'), makeEntry('/c.md')]
    const activeTabPath = overrides.activeTabPath ?? null
    const pendingActiveTabPath = overrides.pendingActiveTabPath ?? null
    const activeNoteSourceSurfaceKey = overrides.activeNoteSourceSurfaceKey ?? null
    const activeSurfaceKey = overrides.activeSurfaceKey ?? null
    return renderHook(() =>
      useAppNavigation({ entries, activeTabPath, pendingActiveTabPath, activeNoteSourceSurfaceKey, activeSurfaceKey, onSelectNote }),
    )
  }

  function renderAfterNavigatingToSecondEntry() {
    const entries = [makeEntry('/a.md'), makeEntry('/b.md')]
    const hook = renderHook(
      ({ activeTabPath }) =>
        useAppNavigation({ entries, activeTabPath, onSelectNote }),
      { initialProps: { activeTabPath: '/a.md' as string | null } },
    )

    hook.rerender({ activeTabPath: '/b.md' })
    return { entries, ...hook }
  }

  // --- entriesByPath ---

  describe('entriesByPath', () => {
    it('builds a Map from entries for O(1) lookup', () => {
      const entries = [makeEntry('/a.md'), makeEntry('/b.md')]
      const { result } = renderNav({ entries })
      expect(result.current.entriesByPath.get('/a.md')).toBe(entries[0])
      expect(result.current.entriesByPath.get('/b.md')).toBe(entries[1])
      expect(result.current.entriesByPath.get('/missing.md')).toBeUndefined()
    })
  })

  // --- canGoBack / canGoForward initial state ---

  describe('initial state', () => {
    it('starts with canGoBack=false and canGoForward=false', () => {
      const { result } = renderNav()
      expect(result.current.canGoBack).toBe(false)
      expect(result.current.canGoForward).toBe(false)
    })
  })

  // --- navigation history integration ---

  describe('navigation via activeTabPath changes', () => {
    it('pushes to history when activeTabPath changes, enabling goBack', () => {
      const entries = [makeEntry('/a.md'), makeEntry('/b.md')]

      const { result, rerender } = renderHook(
        ({ activeTabPath }) =>
          useAppNavigation({ entries, activeTabPath, onSelectNote }),
        { initialProps: { activeTabPath: '/a.md' as string | null } },
      )

      // Navigate to /b.md
      rerender({ activeTabPath: '/b.md' })

      expect(result.current.canGoBack).toBe(true)
      expect(result.current.canGoForward).toBe(false)
    })

    it('handleGoBack calls onSelectNote with the previous entry', () => {
      const { entries, result } = renderAfterNavigatingToSecondEntry()

      act(() => { result.current.handleGoBack() })

      expect(onSelectNote).toHaveBeenCalledWith(entries[0])
    })

    it('handleGoForward works after going back', () => {
      const { entries, result } = renderAfterNavigatingToSecondEntry()
      act(() => { result.current.handleGoBack() })

      expect(result.current.canGoForward).toBe(true)
      act(() => { result.current.handleGoForward() })

      expect(onSelectNote).toHaveBeenCalledWith(entries[1])
    })

    it('navigates back from a document to the previous browser surface', () => {
      const entries = [makeEntry('/a.md')]
      const onSelectSurface = vi.fn()
      const { result, rerender } = renderHook(
        ({ activeSurfaceKey, activeTabPath }) =>
          useAppNavigation({ entries, activeSurfaceKey, activeTabPath, onSelectNote, onSelectSurface }),
        { initialProps: { activeSurfaceKey: 'filter:inbox' as string | null, activeTabPath: null as string | null } },
      )

      rerender({ activeSurfaceKey: null, activeTabPath: '/a.md' })

      act(() => { result.current.handleGoBack() })

      expect(onSelectSurface).toHaveBeenCalledWith('filter:inbox')
    })

    it('navigates forward from a browser surface to the previously opened document', () => {
      const entries = [makeEntry('/a.md')]
      const onSelectSurface = vi.fn()
      const { result, rerender } = renderHook(
        ({ activeSurfaceKey, activeTabPath }) =>
          useAppNavigation({ entries, activeSurfaceKey, activeTabPath, onSelectNote, onSelectSurface }),
        { initialProps: { activeSurfaceKey: 'filter:inbox' as string | null, activeTabPath: null as string | null } },
      )

      rerender({ activeSurfaceKey: null, activeTabPath: '/a.md' })
      act(() => { result.current.handleGoBack() })
      act(() => { result.current.handleGoForward() })

      expect(onSelectNote).toHaveBeenCalledWith(entries[0])
    })

    it('keeps Back targeting the source browser surface when older documents remain behind it', () => {
      const entries = [makeEntry('/a.md'), makeEntry('/b.md')]
      const onSelectSurface = vi.fn()
      const { result, rerender } = renderHook(
        ({ activeSurfaceKey, activeTabPath, pendingActiveTabPath, activeNoteSourceSurfaceKey }) =>
          useAppNavigation({
            entries,
            activeSurfaceKey,
            activeTabPath,
            pendingActiveTabPath,
            activeNoteSourceSurfaceKey,
            onSelectNote,
            onSelectSurface,
          }),
        {
          initialProps: {
            activeSurfaceKey: 'filter:inbox' as string | null,
            activeTabPath: null as string | null,
            pendingActiveTabPath: null as string | null,
            activeNoteSourceSurfaceKey: null as string | null,
          },
        },
      )

      rerender({
        activeSurfaceKey: null,
        activeTabPath: null,
        pendingActiveTabPath: '/a.md',
        activeNoteSourceSurfaceKey: 'filter:inbox',
      })
      rerender({
        activeSurfaceKey: null,
        activeTabPath: '/a.md',
        pendingActiveTabPath: null,
        activeNoteSourceSurfaceKey: 'filter:inbox',
      })
      act(() => { result.current.handleGoBack() })
      rerender({
        activeSurfaceKey: 'filter:inbox',
        activeTabPath: '/a.md',
        pendingActiveTabPath: null,
        activeNoteSourceSurfaceKey: null,
      })
      rerender({
        activeSurfaceKey: null,
        activeTabPath: '/a.md',
        pendingActiveTabPath: '/b.md',
        activeNoteSourceSurfaceKey: 'filter:inbox',
      })
      rerender({
        activeSurfaceKey: null,
        activeTabPath: '/b.md',
        pendingActiveTabPath: null,
        activeNoteSourceSurfaceKey: 'filter:inbox',
      })

      act(() => { result.current.handleGoBack() })

      expect(onSelectSurface).toHaveBeenLastCalledWith('filter:inbox')
      expect(onSelectNote).not.toHaveBeenCalledWith(entries[0])
    })

    it('skips a stale active document recorded during a replace transition', () => {
      const entries = [makeEntry('/a.md'), makeEntry('/b.md')]
      const onSelectSurface = vi.fn()
      const { result, rerender } = renderHook(
        ({ activeSurfaceKey, activeTabPath, pendingActiveTabPath, activeNoteSourceSurfaceKey }) =>
          useAppNavigation({
            entries,
            activeSurfaceKey,
            activeTabPath,
            pendingActiveTabPath,
            activeNoteSourceSurfaceKey,
            onSelectNote,
            onSelectSurface,
          }),
        {
          initialProps: {
            activeSurfaceKey: 'filter:inbox' as string | null,
            activeTabPath: null as string | null,
            pendingActiveTabPath: null as string | null,
            activeNoteSourceSurfaceKey: null as string | null,
          },
        },
      )

      rerender({
        activeSurfaceKey: null,
        activeTabPath: null,
        pendingActiveTabPath: '/a.md',
        activeNoteSourceSurfaceKey: 'filter:inbox',
      })
      rerender({
        activeSurfaceKey: null,
        activeTabPath: '/a.md',
        pendingActiveTabPath: null,
        activeNoteSourceSurfaceKey: 'filter:inbox',
      })
      act(() => { result.current.handleGoBack() })
      rerender({
        activeSurfaceKey: 'filter:inbox',
        activeTabPath: '/a.md',
        pendingActiveTabPath: null,
        activeNoteSourceSurfaceKey: null,
      })
      rerender({
        activeSurfaceKey: null,
        activeTabPath: '/a.md',
        pendingActiveTabPath: null,
        activeNoteSourceSurfaceKey: null,
      })
      rerender({
        activeSurfaceKey: null,
        activeTabPath: '/b.md',
        pendingActiveTabPath: null,
        activeNoteSourceSurfaceKey: 'filter:inbox',
      })

      act(() => { result.current.handleGoBack() })

      expect(onSelectSurface).toHaveBeenLastCalledWith('filter:inbox')
      expect(onSelectNote).not.toHaveBeenCalledWith(entries[0])
    })
  })
})
