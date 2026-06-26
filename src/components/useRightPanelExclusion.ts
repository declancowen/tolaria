import { useCallback, useState } from 'react'
import { trackEvent } from '../lib/telemetry'

interface RightPanelExclusionOptions {
  inspectorCollapsed: boolean
  onToggleAIChat?: () => void
  onToggleInspector: () => void
  showAIChat?: boolean
}

interface RightPanelToggleOptions extends RightPanelExclusionOptions {
  closeTableOfContents: () => void
  openTableOfContents?: () => void
  showTableOfContents?: boolean
}

function toggleTableOfContentsPanel({
  closeTableOfContents,
  inspectorCollapsed,
  onToggleAIChat,
  onToggleInspector,
  openTableOfContents,
  showAIChat,
  showTableOfContents,
}: RightPanelToggleOptions) {
  if (showTableOfContents) {
    closeTableOfContents()
    return
  }

  if (!inspectorCollapsed) onToggleInspector()
  if (showAIChat) onToggleAIChat?.()
  openTableOfContents?.()
}

export function useRightPanelExclusion({
  inspectorCollapsed,
  onToggleAIChat,
  onToggleInspector,
  showAIChat,
}: RightPanelExclusionOptions) {
  const [showTableOfContents, setShowTableOfContents] = useState(false)
  const closeTableOfContents = useCallback(() => setShowTableOfContents(false), [])

  const handleToggleInspectorPanel = useCallback(() => {
    closeTableOfContents()
    if (showAIChat) {
      onToggleAIChat?.()
      if (inspectorCollapsed) onToggleInspector()
      return
    }
    onToggleInspector()
  }, [closeTableOfContents, inspectorCollapsed, onToggleAIChat, onToggleInspector, showAIChat])

  const handleToggleAIChatPanel = useCallback(() => {
    closeTableOfContents()
    if (showAIChat) {
      onToggleAIChat?.()
      if (!inspectorCollapsed) onToggleInspector()
      return
    }
    if (inspectorCollapsed) onToggleInspector()
    onToggleAIChat?.()
  }, [closeTableOfContents, inspectorCollapsed, onToggleAIChat, onToggleInspector, showAIChat])

  const handleSelectInspectorPanel = useCallback(() => {
    closeTableOfContents()
    if (showAIChat) onToggleAIChat?.()
    if (inspectorCollapsed) onToggleInspector()
  }, [closeTableOfContents, inspectorCollapsed, onToggleAIChat, onToggleInspector, showAIChat])

  const handleSelectAIChatPanel = useCallback(() => {
    closeTableOfContents()
    if (inspectorCollapsed) onToggleInspector()
    if (!showAIChat) onToggleAIChat?.()
  }, [closeTableOfContents, inspectorCollapsed, onToggleAIChat, onToggleInspector, showAIChat])

  const handleCloseRightPanel = useCallback(() => {
    closeTableOfContents()
    if (showAIChat) onToggleAIChat?.()
    if (!inspectorCollapsed) onToggleInspector()
  }, [closeTableOfContents, inspectorCollapsed, onToggleAIChat, onToggleInspector, showAIChat])

  const handleToggleTableOfContents = useCallback(() => {
    trackEvent('table_of_contents_toggled', { open: showTableOfContents ? 0 : 1 })
    toggleTableOfContentsPanel({
      closeTableOfContents,
      inspectorCollapsed,
      onToggleAIChat,
      onToggleInspector,
      openTableOfContents: () => setShowTableOfContents(true),
      showAIChat,
      showTableOfContents,
    })
  }, [closeTableOfContents, inspectorCollapsed, onToggleAIChat, onToggleInspector, showAIChat, showTableOfContents])

  return {
    handleCloseRightPanel,
    handleSelectAIChatPanel,
    handleSelectInspectorPanel,
    handleToggleAIChatPanel,
    handleToggleInspectorPanel,
    handleToggleTableOfContents,
    showTableOfContents,
  }
}
