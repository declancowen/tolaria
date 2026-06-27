import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigationHistory } from './useNavigationHistory'
import { useNavigationGestures } from './useNavigationGestures'
import type { VaultEntry } from '../types'

interface UseAppNavigationParams {
  entries: VaultEntry[]
  activeTabPath: string | null
  pendingActiveTabPath?: string | null
  activeSurfaceKey?: string | null
  onSelectNote: (entry: VaultEntry) => void
  onSelectSurface?: (surfaceKey: string) => void
}

type NavigationTarget =
  | { kind: 'note'; path: string }
  | { kind: 'surface'; key: string }

function encodeNavigationTarget(target: NavigationTarget): string {
  return JSON.stringify(target)
}

function decodeNavigationTarget(raw: string): NavigationTarget | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { kind: 'note', path: raw }
    if ('kind' in parsed && parsed.kind === 'note' && 'path' in parsed && typeof parsed.path === 'string') {
      return { kind: 'note', path: parsed.path }
    }
    if ('kind' in parsed && parsed.kind === 'surface' && 'key' in parsed && typeof parsed.key === 'string') {
      return { kind: 'surface', key: parsed.key }
    }
  } catch {
    return { kind: 'note', path: raw }
  }
  return null
}

function activeNavigationKey(
  activeSurfaceKey: string | null | undefined,
  activeTabPath: string | null,
  pendingActiveTabPath: string | null | undefined,
): string | null {
  if (activeSurfaceKey) return encodeNavigationTarget({ kind: 'surface', key: activeSurfaceKey })
  if (pendingActiveTabPath) return encodeNavigationTarget({ kind: 'note', path: pendingActiveTabPath })
  if (activeTabPath) return encodeNavigationTarget({ kind: 'note', path: activeTabPath })
  return null
}

/**
 * Encapsulates browser-style back/forward navigation for the app:
 * - Navigation history (push on note change, back/forward traversal)
 * - Mouse button & trackpad gesture bindings
 * - O(1) path->entry lookup map
 */
export function useAppNavigation({
  activeSurfaceKey,
  entries,
  activeTabPath,
  pendingActiveTabPath,
  onSelectNote,
  onSelectSurface,
}: UseAppNavigationParams) {
  const navHistory = useNavigationHistory()
  const currentNavigationKey = activeNavigationKey(activeSurfaceKey, activeTabPath, pendingActiveTabPath)

  // Push to navigation history whenever the active note or browser surface changes.
  const navFromHistoryRef = useRef(false)
  useEffect(() => {
    if (currentNavigationKey && !navFromHistoryRef.current) {
      navHistory.push(currentNavigationKey)
    }
    navFromHistoryRef.current = false
  }, [currentNavigationKey, navHistory.push]) // eslint-disable-line react-hooks/exhaustive-deps -- navHistory.push is stable

  const isEntryExists = useCallback(
    (path: string) => entries.some(e => e.path === path),
    [entries],
  )
  const isNavigationTargetValid = useCallback((raw: string) => {
    const target = decodeNavigationTarget(raw)
    if (!target) return false
    if (target.kind === 'surface') return Boolean(onSelectSurface)
    return isEntryExists(target.path)
  }, [isEntryExists, onSelectSurface])

  const navigateToHistoryTarget = useCallback((raw: string | null) => {
    if (!raw) return
    const target = decodeNavigationTarget(raw)
    if (!target) return

    navFromHistoryRef.current = true
    if (target.kind === 'surface') {
      onSelectSurface?.(target.key)
      return
    }

    const entry = entries.find(e => e.path === target.path)
    if (entry) onSelectNote(entry)
  }, [entries, onSelectNote, onSelectSurface])

  const handleGoBack = useCallback(() => {
    navigateToHistoryTarget(navHistory.goBack(isNavigationTargetValid))
  }, [isNavigationTargetValid, navHistory, navigateToHistoryTarget])

  const handleGoForward = useCallback(() => {
    navigateToHistoryTarget(navHistory.goForward(isNavigationTargetValid))
  }, [isNavigationTargetValid, navHistory, navigateToHistoryTarget])

  useNavigationGestures({ onGoBack: handleGoBack, onGoForward: handleGoForward })

  // O(1) path lookup map — rebuilt only when entries change
  const entriesByPath = useMemo(() => {
    const map = new Map<string, VaultEntry>()
    for (const e of entries) map.set(e.path, e)
    return map
  }, [entries])

  return {
    handleGoBack,
    handleGoForward,
    canGoBack: navHistory.canGoBack,
    canGoForward: navHistory.canGoForward,
    entriesByPath,
  }
}
