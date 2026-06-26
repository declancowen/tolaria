import { cloneElement, isValidElement, useEffect, type ReactElement, type ReactNode } from 'react'
import type { useCreateBlockNote } from '@blocknote/react'
import { SlidersHorizontal, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { TOOLBAR_ICON_BUTTON_IMPORTANT_CLASSNAME, TOOLBAR_ICON_SIZE } from '@/components/ui/toolbarIconButton'
import { cn } from '@/lib/utils'
import { DEFAULT_AI_AGENT, type AiAgentId, type AiAgentReadiness } from '../lib/aiAgents'
import type { AiTarget } from '../lib/aiTargets'
import { translate, type AppLocale } from '../lib/i18n'
import type { VaultEntry, GitCommit, WorkspaceIdentity } from '../types'
import type { NoteListItem } from '../utils/ai-context'
import { Inspector, type FrontmatterValue } from './Inspector'
import type { FrontmatterOpOptions } from '../hooks/frontmatterOps'
import { AiPanelView } from './AiPanel'
import { useAiPanelController, type AiPanelController } from './useAiPanelController'
import { NEW_AI_CHAT_EVENT } from '../utils/aiPromptBridge'
import { TableOfContentsPanel } from './TableOfContentsPanel'

interface EditorRightPanelProps {
  showAIChat?: boolean
  showTableOfContents?: boolean
  aiWorkspaceSurface?: ReactNode
  inspectorCollapsed: boolean
  inspectorWidth: number
  editor: ReturnType<typeof useCreateBlockNote>
  defaultAiAgent?: AiAgentId
  defaultAiTarget?: AiTarget
  defaultAiAgentReadiness?: AiAgentReadiness
  defaultAiAgentReady?: boolean
  onUnsupportedAiPaste?: (message: string) => void
  inspectorEntry: VaultEntry | null
  inspectorContent: string | null
  entries: VaultEntry[]
  gitHistory: GitCommit[]
  vaultPath: string
  vaultPaths?: string[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  onToggleInspector: () => void
  onToggleAIChat?: () => void
  onSelectInspectorPanel: () => void
  onSelectAIChatPanel?: () => void
  onCloseRightPanel: () => void
  onToggleTableOfContents?: () => void
  onNavigateWikilink: (target: string) => void
  onViewCommitDiff: (commitHash: string) => Promise<void>
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue, options?: FrontmatterOpOptions) => Promise<void>
  onDeleteProperty?: (path: string, key: string, options?: FrontmatterOpOptions) => Promise<void>
  onAddProperty?: (path: string, key: string, value: FrontmatterValue, options?: FrontmatterOpOptions) => Promise<void>
  onCreateMissingType?: (path: string, missingType: string, nextTypeName: string) => Promise<boolean | void>
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onChangeWorkspace?: (entry: VaultEntry, workspace: WorkspaceIdentity) => Promise<void> | void
  onInitializeProperties?: (path: string) => void
  onToggleRawEditor?: () => void
  onOpenNote?: (path: string) => void
  onFileCreated?: (relativePath: string) => void
  onFileModified?: (relativePath: string) => void
  onVaultChanged?: () => void
  workspaces?: WorkspaceIdentity[]
  locale?: AppLocale
}

type RightPanelTab = 'properties' | 'ai'
type AiWorkspaceElementProps = {
  onClose?: () => void
  panelTabs?: ReactNode
}

type AiPanelSectionProps = Pick<
  EditorRightPanelProps,
  | 'defaultAiAgent'
  | 'defaultAiAgentReadiness'
  | 'defaultAiAgentReady'
  | 'defaultAiTarget'
  | 'entries'
  | 'inspectorEntry'
  | 'inspectorWidth'
  | 'locale'
  | 'onOpenNote'
  | 'onUnsupportedAiPaste'
> & {
  controller: AiPanelController
  onClose: () => void
}

function AiPanelSection({
  controller,
  defaultAiAgent = DEFAULT_AI_AGENT,
  defaultAiAgentReadiness,
  defaultAiAgentReady = true,
  defaultAiTarget,
  entries,
  inspectorEntry,
  inspectorWidth,
  locale,
  onClose,
  onOpenNote,
  onUnsupportedAiPaste,
}: AiPanelSectionProps) {
  return (
    <div
      className="shrink-0 flex flex-col min-h-0"
      style={{ width: inspectorWidth, minWidth: 240, height: '100%' }}
    >
      <AiPanelView
        controller={controller}
        onClose={onClose}
        onOpenNote={onOpenNote}
        onUnsupportedAiPaste={onUnsupportedAiPaste}
        defaultAiAgent={defaultAiAgent}
        defaultAiTarget={defaultAiTarget}
        defaultAiAgentReadiness={defaultAiAgentReadiness}
        defaultAiAgentReady={defaultAiAgentReady}
        locale={locale}
        activeEntry={inspectorEntry}
        entries={entries}
      />
    </div>
  )
}

function RightPanelTabSwitcher({
  activeTab,
  aiLabel,
  onSelectAI,
  onSelectProperties,
  propertiesLabel,
}: {
  activeTab: RightPanelTab
  aiLabel: string
  onSelectAI?: () => void
  onSelectProperties: () => void
  propertiesLabel: string
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label={`${propertiesLabel} / ${aiLabel}`}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn(
          TOOLBAR_ICON_BUTTON_IMPORTANT_CLASSNAME,
          activeTab === 'properties' && '!bg-muted !text-foreground',
        )}
        title={propertiesLabel}
        aria-label={propertiesLabel}
        aria-pressed={activeTab === 'properties'}
        onClick={onSelectProperties}
      >
        <SlidersHorizontal size={TOOLBAR_ICON_SIZE} weight="regular" />
      </Button>
      {onSelectAI && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            TOOLBAR_ICON_BUTTON_IMPORTANT_CLASSNAME,
            activeTab === 'ai' && '!bg-muted !text-foreground',
          )}
          title={aiLabel}
          aria-label={aiLabel}
          aria-pressed={activeTab === 'ai'}
          onClick={onSelectAI}
        >
          <Sparkle size={TOOLBAR_ICON_SIZE} weight={activeTab === 'ai' ? 'fill' : 'regular'} />
        </Button>
      )}
    </div>
  )
}

function renderAiWorkspaceSurface({
  aiWorkspaceSurface,
  fallback,
  onClose,
  panelTabs,
}: {
  aiWorkspaceSurface?: ReactNode
  fallback: ReactNode
  onClose: () => void
  panelTabs: ReactNode
}) {
  if (!isValidElement(aiWorkspaceSurface)) return fallback

  return cloneElement(
    aiWorkspaceSurface as ReactElement<AiWorkspaceElementProps>,
    { onClose, panelTabs },
  )
}

function usePersistentAiPanelController({
  showAIChat,
  defaultAiAgent = DEFAULT_AI_AGENT,
  defaultAiTarget,
  defaultAiAgentReadiness,
  defaultAiAgentReady = true,
  inspectorEntry,
  inspectorContent,
  entries,
  vaultPath,
  vaultPaths,
  noteList,
  noteListFilter,
  locale,
  onOpenNote,
  onFileCreated,
  onFileModified,
  onVaultChanged,
}: Pick<
  EditorRightPanelProps,
  | 'showAIChat'
  | 'defaultAiAgent'
  | 'defaultAiTarget'
  | 'defaultAiAgentReadiness'
  | 'defaultAiAgentReady'
  | 'inspectorEntry'
  | 'inspectorContent'
  | 'entries'
  | 'vaultPath'
  | 'vaultPaths'
  | 'noteList'
  | 'noteListFilter'
  | 'locale'
  | 'onOpenNote'
  | 'onFileCreated'
  | 'onFileModified'
  | 'onVaultChanged'
>): AiPanelController {
  return useAiPanelController({
    vaultPath,
    vaultPaths,
    defaultAiAgent,
    defaultAiTarget,
    defaultAiAgentReady,
    defaultAiAgentReadiness,
    activeEntry: showAIChat ? inspectorEntry : null,
    activeNoteContent: showAIChat ? inspectorContent : null,
    entries: showAIChat ? entries : undefined,
    noteList: showAIChat ? noteList : undefined,
    noteListFilter: showAIChat ? noteListFilter : undefined,
    locale,
    onOpenNote,
    onFileCreated,
    onFileModified,
    onVaultChanged,
  })
}

export function EditorRightPanel({
  showAIChat, showTableOfContents, aiWorkspaceSurface, inspectorCollapsed, inspectorWidth,
  editor,
  defaultAiAgent = DEFAULT_AI_AGENT, defaultAiTarget, defaultAiAgentReadiness, defaultAiAgentReady = true,
  onUnsupportedAiPaste,
  inspectorEntry, inspectorContent, entries, gitHistory, vaultPath,
  vaultPaths,
  noteList, noteListFilter,
  onSelectInspectorPanel, onSelectAIChatPanel, onCloseRightPanel, onToggleTableOfContents, onNavigateWikilink, onViewCommitDiff,
  onUpdateFrontmatter, onDeleteProperty, onAddProperty, onCreateMissingType, onCreateAndOpenNote, onChangeWorkspace, onInitializeProperties, onToggleRawEditor, onOpenNote,
  onFileCreated, onFileModified, onVaultChanged,
  workspaces,
  locale,
}: EditorRightPanelProps) {
  const aiPanelController = usePersistentAiPanelController({
    showAIChat,
    defaultAiAgent,
    defaultAiTarget,
    defaultAiAgentReadiness,
    defaultAiAgentReady,
    inspectorEntry,
    inspectorContent,
    entries,
    vaultPath,
    vaultPaths,
    noteList,
    noteListFilter,
    locale,
    onOpenNote,
    onFileCreated,
    onFileModified,
    onVaultChanged,
  })
  const { handleNewChat } = aiPanelController

  useEffect(() => {
    const handleRequestedNewChat = () => {
      handleNewChat()
    }

    window.addEventListener(NEW_AI_CHAT_EVENT, handleRequestedNewChat)
    return () => window.removeEventListener(NEW_AI_CHAT_EVENT, handleRequestedNewChat)
  }, [handleNewChat])

  if (showTableOfContents) {
    return (
      <div
        className="shrink-0 flex flex-col min-h-0"
        style={{ width: inspectorWidth, minWidth: 240, height: '100%' }}
      >
        <TableOfContentsPanel
          editor={editor}
          entry={inspectorEntry}
          locale={locale}
          onClose={() => onToggleTableOfContents?.()}
          sourceContent={inspectorContent}
        />
      </div>
    )
  }

  if (inspectorCollapsed && !showAIChat) return null

  const activeTab: RightPanelTab = showAIChat ? 'ai' : 'properties'
  const propertiesLabel = translate(locale ?? 'en', 'inspector.title.properties')
  const aiLabel = translate(locale ?? 'en', 'ai.panel.title')
  const panelTabs = (
    <RightPanelTabSwitcher
      activeTab={activeTab}
      aiLabel={aiLabel}
      onSelectAI={onSelectAIChatPanel}
      onSelectProperties={onSelectInspectorPanel}
      propertiesLabel={propertiesLabel}
    />
  )

  return (
    <div
      className={cn(
        'editor-right-panel shrink-0 flex min-h-0 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground',
        activeTab === 'ai' && 'editor-right-panel--ai',
      )}
      style={{ width: inspectorWidth, minWidth: 240, height: '100%' }}
    >
      {activeTab === 'properties' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <Inspector
            collapsed={false}
            panelTabs={panelTabs}
            onToggle={onCloseRightPanel}
            entry={inspectorEntry}
            content={inspectorContent}
            entries={entries}
            gitHistory={gitHistory}
            vaultPath={vaultPath}
            onNavigate={onNavigateWikilink}
            onViewCommitDiff={onViewCommitDiff}
            onUpdateFrontmatter={onUpdateFrontmatter}
            onDeleteProperty={onDeleteProperty}
            onAddProperty={onAddProperty}
            onCreateMissingType={onCreateMissingType}
            onCreateAndOpenNote={onCreateAndOpenNote}
            onChangeWorkspace={onChangeWorkspace}
            onInitializeProperties={onInitializeProperties}
            onToggleRawEditor={onToggleRawEditor}
            workspaces={workspaces}
            locale={locale}
          />
        </div>
      ) : (
        <div className="editor-right-panel__ai-workspace flex min-h-0 flex-1 overflow-hidden">
          {renderAiWorkspaceSurface({
            aiWorkspaceSurface,
            onClose: onCloseRightPanel,
            panelTabs,
            fallback: (
            <AiPanelSection
              controller={aiPanelController}
              defaultAiAgent={defaultAiAgent}
              defaultAiAgentReadiness={defaultAiAgentReadiness}
              defaultAiAgentReady={defaultAiAgentReady}
              defaultAiTarget={defaultAiTarget}
              entries={entries}
              inspectorEntry={inspectorEntry}
              inspectorWidth={inspectorWidth}
              locale={locale}
              onClose={onCloseRightPanel}
              onOpenNote={onOpenNote}
              onUnsupportedAiPaste={onUnsupportedAiPaste}
            />
            ),
          })}
        </div>
      )}
    </div>
  )
}
