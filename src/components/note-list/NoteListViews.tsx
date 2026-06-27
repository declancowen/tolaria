import { createElement, forwardRef } from 'react'
import { Virtuoso, VirtuosoGrid, type GridItemProps, type VirtuosoHandle } from 'react-virtuoso'
import { FileText, Folder } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FolderNode, SidebarSelection, VaultEntry } from '../../types'
import type { GroupByOption, NoteListDocumentGroup, SortOption, SortDirection, SortConfig, RelationshipGroup } from '../../utils/noteListHelpers'
import { relativeDate } from '../../utils/noteListHelpers'
import { translate, type AppLocale } from '../../lib/i18n'
import { getTypeColor, getTypeLightColor } from '../../utils/typeColors'
import { getTypeIcon } from '../note-item/typeIcon'
import type { NoteListDisplayMode } from './noteListDisplayMode'
import { PinnedCard } from './PinnedCard'
import { RelationshipGroupSection } from './RelationshipGroupSection'
import { EmptyMessage } from './TrashWarningBanner'

type FolderSelection = Extract<SidebarSelection, { kind: 'folder' }>
type BrowserViewItem =
  | { kind: 'entry'; entry: VaultEntry; key: string }
  | { kind: 'folder'; folder: FolderNode; key: string }
  | { kind: 'group'; group: NoteListDocumentGroup; key: string }
type BrowserGridContext = { items: BrowserViewItem[] }

const BrowserGridItem = forwardRef<HTMLDivElement, GridItemProps & { context?: BrowserGridContext }>(
  function BrowserGridItem({ children, className, context, style, ...props }, ref) {
    const item = context?.items[props['data-index']]
    const isGroup = item?.kind === 'group'

    return (
      <div
        {...props}
        ref={ref}
        className={cn(className, isGroup && 'browser-view-grid-item--group')}
        data-browser-view-grid-kind={item?.kind}
        style={isGroup ? { ...style, gridColumn: '1 / -1' } : style}
      >
        {children}
      </div>
    )
  },
)

function resolveEmptyText({
  isChangesView,
  changesError,
  isArchivedView,
  isInboxView,
  query,
  locale,
}: {
  isChangesView: boolean
  changesError: string | null | undefined
  isArchivedView: boolean
  isInboxView: boolean
  query: string
  locale: AppLocale
}): string {
  if (isChangesView && changesError) return translate(locale, 'noteList.empty.changesError', { error: changesError })
  if (isChangesView) return translate(locale, 'noteList.empty.noChanges')
  if (isArchivedView) return translate(locale, 'noteList.empty.noArchived')
  if (isInboxView) return query ? translate(locale, 'noteList.empty.noMatching') : translate(locale, 'noteList.empty.allOrganized')
  return query ? translate(locale, 'noteList.empty.noMatching') : translate(locale, 'noteList.empty.noNotes')
}

export function EntityView({ entity, groups, query, collapsedGroups, sortPrefs, onToggleGroup, onSortChange, renderItem, locale = 'en' }: {
  entity: VaultEntry; groups: RelationshipGroup[]; query: string
  collapsedGroups: Set<string>; sortPrefs: Record<string, SortConfig>
  onToggleGroup: (label: string) => void; onSortChange: (label: string, opt: SortOption, dir: SortDirection) => void
  renderItem: (entry: VaultEntry, options?: { forceSelected?: boolean }) => React.ReactNode
  locale?: AppLocale
}) {
  return (
    <div className="h-full overflow-y-auto">
      <PinnedCard entry={entity} renderItem={renderItem} />
      {groups.length === 0
        ? <EmptyMessage text={query ? translate(locale, 'noteList.empty.noMatchingItems') : translate(locale, 'noteList.empty.noRelatedItems')} />
        : groups.map((group) => (
          <RelationshipGroupSection key={group.label} group={group} isCollapsed={collapsedGroups.has(group.label)} sortPrefs={sortPrefs} locale={locale} onToggle={() => onToggleGroup(group.label)} handleSortChange={onSortChange} renderItem={renderItem} />
        ))
      }
    </div>
  )
}

export function ListView({ isArchivedView, isChangesView, isInboxView, changesError, searched, query, renderItem, virtuosoRef, locale = 'en' }: {
  isArchivedView?: boolean; isChangesView?: boolean; isInboxView?: boolean; changesError?: string | null
  searched: VaultEntry[]; query: string
  renderItem: (entry: VaultEntry) => React.ReactNode
  virtuosoRef?: React.RefObject<VirtuosoHandle | null>
  locale?: AppLocale
}) {
  const emptyText = resolveEmptyText({
    isChangesView: !!isChangesView,
    changesError: changesError ?? null,
    isArchivedView: !!isArchivedView,
    isInboxView: !!isInboxView,
    query,
    locale,
  })

  if (searched.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <EmptyMessage text={emptyText} />
      </div>
    )
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ height: '100%' }}
      data={searched}
      overscan={200}
      itemContent={(_index, entry) => renderItem(entry)}
    />
  )
}

function folderSelection(folder: FolderNode): FolderSelection {
  return folder.rootPath
    ? { kind: 'folder', path: folder.path, rootPath: folder.rootPath }
    : { kind: 'folder', path: folder.path }
}

function entryTypeLabel(entry: VaultEntry): string {
  if (entry.isA) return entry.isA
  if (entry.fileKind === 'markdown') return 'Note'
  return entry.fileKind ?? 'File'
}

function entryTags(entry: VaultEntry): string[] {
  const rawTags = Reflect.get(entry.properties, 'tags') ?? Reflect.get(entry.properties, 'tag')
  if (Array.isArray(rawTags)) return rawTags.map(String).filter(Boolean).slice(0, 3)
  if (typeof rawTags === 'string' && rawTags.trim()) return rawTags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 3)
  return []
}

function TypePill({
  entry,
  typeEntryMap,
}: {
  entry: VaultEntry
  typeEntryMap: Record<string, VaultEntry>
}) {
  const typeName = entry.isA ?? (entry.fileKind && entry.fileKind !== 'markdown' ? null : 'Note')
  const typeEntry = typeName ? typeEntryMap[typeName] : undefined
  const TypeIcon = getTypeIcon(typeName, typeEntry?.icon)
  const color = getTypeColor(typeName, typeEntry?.color)
  const background = getTypeLightColor(typeName, typeEntry?.color)

  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ background, color }}
    >
      {createElement(TypeIcon, { width: 12, height: 12, className: 'shrink-0' })}
      <span className="truncate">{entryTypeLabel(entry)}</span>
    </span>
  )
}

function groupHeadingLabel(group: NoteListDocumentGroup, groupBy: GroupByOption, locale: AppLocale): string | null {
  if (groupBy === 'none') return null
  return group.label || translate(locale, 'noteList.groupBy.noValue')
}

function browserFolderKey(folder: FolderNode): string {
  return `folder:${folder.rootPath ?? ''}:${folder.path}`
}

function buildBrowserViewItems(
  folderChildren: FolderNode[],
  documentGroups: NoteListDocumentGroup[],
  groupBy: GroupByOption,
): BrowserViewItem[] {
  const items: BrowserViewItem[] = folderChildren.map((folder) => ({
    kind: 'folder',
    folder,
    key: browserFolderKey(folder),
  }))

  for (const group of documentGroups) {
    if (groupBy !== 'none') {
      items.push({ kind: 'group', group, key: `group:${group.key}` })
    }
    for (const entry of group.entries) {
      items.push({ kind: 'entry', entry, key: `entry:${entry.path}` })
    }
  }

  return items
}

function GroupHeading({
  group,
  groupBy,
  locale,
}: {
  group: NoteListDocumentGroup
  groupBy: GroupByOption
  locale: AppLocale
}) {
  const label = groupHeadingLabel(group, groupBy, locale)
  if (!label) return null

  return (
    <div className="flex min-h-8 items-center justify-between gap-3 border-b border-border px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      <span className="truncate">{label}</span>
      <span className="font-normal tabular-nums">{group.entries.length}</span>
    </div>
  )
}

function BrowserFolderItem({
  displayMode,
  folder,
  onSelectFolder,
}: {
  displayMode: NoteListDisplayMode
  folder: FolderNode
  onSelectFolder?: (selection: FolderSelection) => void
}) {
  const openFolder = () => onSelectFolder?.(folderSelection(folder))
  const hasChildren = folder.children.length > 0

  if (displayMode === 'cards') {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-0 min-w-0 items-start justify-start rounded-md border border-border bg-background p-3 text-left shadow-none hover:bg-muted"
        onClick={openFolder}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <Folder size={22} weight="fill" className="text-[var(--accent-blue)]" />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-foreground">{folder.name}</div>
            <div className="mt-1 text-[12px] font-normal text-muted-foreground">
              {hasChildren ? `${folder.children.length}` : ''}
            </div>
          </div>
        </div>
      </Button>
    )
  }

  const rowClassName = displayMode === 'rows'
    ? 'grid h-auto min-h-12 w-full min-w-0 grid-cols-[minmax(180px,1.2fr)_minmax(140px,2fr)_110px_120px_minmax(100px,1fr)] items-center gap-3 rounded-none border-0 border-b border-border bg-transparent px-4 py-2 text-left shadow-none hover:bg-muted'
    : 'grid h-auto min-h-[52px] w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none border-b border-border px-3 py-2 text-left shadow-none hover:bg-muted'

  return (
    <Button type="button" variant="ghost" className={rowClassName} onClick={openFolder}>
      <div className="flex min-w-0 items-center gap-2">
        <Folder size={16} weight="fill" className="shrink-0 text-[var(--accent-blue)]" />
        <span className="truncate text-[13px] font-medium text-foreground">{folder.name}</span>
      </div>
      {displayMode === 'rows' ? (
        <>
          <span className="truncate text-[12px] font-normal text-muted-foreground">{hasChildren ? `${folder.children.length}` : ''}</span>
          <span className="text-[12px] font-normal text-muted-foreground" />
          <span className="text-[12px] font-normal text-muted-foreground" />
          <span className="text-[12px] font-normal text-muted-foreground" />
        </>
      ) : (
        <span className="text-[12px] font-normal text-muted-foreground">{hasChildren ? `${folder.children.length}` : ''}</span>
      )}
    </Button>
  )
}

function BrowserEntryItem({
  displayMode,
  entry,
  onOpenEntry,
  typeEntryMap,
}: {
  displayMode: Exclude<NoteListDisplayMode, 'list'>
  entry: VaultEntry
  onOpenEntry: (entry: VaultEntry, event: React.MouseEvent) => void
  typeEntryMap: Record<string, VaultEntry>
}) {
  const subtitle = entry.snippet || entry.filename
  const created = entry.createdAt ? relativeDate(entry.createdAt) : ''
  const tags = entryTags(entry)
  if (displayMode === 'cards') {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-0 min-w-0 items-start justify-start rounded-md border border-border bg-background p-3 text-left shadow-none hover:bg-muted"
        onClick={(event) => onOpenEntry(entry, event)}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <FileText size={20} className="text-muted-foreground" />
          <div className="min-w-0">
            <div className="line-clamp-2 text-[14px] font-medium leading-5 text-foreground">{entry.title}</div>
            <div className="mt-1 line-clamp-2 text-[12px] font-normal leading-5 text-muted-foreground">{subtitle}</div>
          </div>
          <div className="flex max-w-full flex-wrap gap-1.5">
            <TypePill entry={entry} typeEntryMap={typeEntryMap} />
            {tags.map((tag) => (
              <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{tag}</span>
            ))}
          </div>
        </div>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="grid h-auto min-h-12 w-full min-w-0 grid-cols-[minmax(180px,1.2fr)_minmax(140px,2fr)_110px_120px_minmax(100px,1fr)] items-center gap-3 rounded-none border-0 border-b border-border bg-transparent px-4 py-2 text-left shadow-none hover:bg-muted"
      onClick={(event) => onOpenEntry(entry, event)}
    >
      <span className="truncate text-[13px] font-medium text-foreground">{entry.title}</span>
      <span className="truncate text-[12px] font-normal text-muted-foreground">{subtitle}</span>
      <span className="truncate text-[12px] font-normal text-muted-foreground">{created}</span>
      <span className="min-w-0">
        <TypePill entry={entry} typeEntryMap={typeEntryMap} />
      </span>
      <span className="truncate text-[12px] font-normal text-muted-foreground">{tags.join(', ')}</span>
    </Button>
  )
}

export function BrowserView({
  changesError,
  displayMode,
  documentGroups,
  folderChildren,
  groupBy,
  typeEntryMap,
  isArchivedView,
  isChangesView,
  isInboxView,
  locale = 'en',
  onOpenEntry,
  onSelectFolder,
  query,
  renderItem,
  searched,
}: {
  changesError?: string | null
  displayMode: NoteListDisplayMode
  documentGroups: NoteListDocumentGroup[]
  folderChildren: FolderNode[]
  groupBy: GroupByOption
  typeEntryMap: Record<string, VaultEntry>
  isArchivedView?: boolean
  isChangesView?: boolean
  isInboxView?: boolean
  locale?: AppLocale
  onOpenEntry: (entry: VaultEntry, event: React.MouseEvent) => void
  onSelectFolder?: (selection: FolderSelection) => void
  query: string
  renderItem: (entry: VaultEntry) => React.ReactNode
  searched: VaultEntry[]
}) {
  const emptyText = resolveEmptyText({
    isChangesView: !!isChangesView,
    changesError: changesError ?? null,
    isArchivedView: !!isArchivedView,
    isInboxView: !!isInboxView,
    query,
    locale,
  })
  if (folderChildren.length === 0 && searched.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <EmptyMessage text={emptyText} />
      </div>
    )
  }

  const browserItems = buildBrowserViewItems(folderChildren, documentGroups, groupBy)

  if (displayMode === 'cards') {
    return (
      <VirtuosoGrid
        style={{ height: '100%' }}
        data={browserItems}
        context={{ items: browserItems }}
        components={{ Item: BrowserGridItem }}
        overscan={200}
        listClassName="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] content-start gap-2 p-2"
        itemClassName="browser-view-grid-item min-w-0"
        computeItemKey={(_index, item) => item.key}
        itemContent={(_index, item) => {
          if (item.kind === 'folder') {
            return <BrowserFolderItem folder={item.folder} displayMode={displayMode} onSelectFolder={onSelectFolder} />
          }
          if (item.kind === 'group') {
            return (
              <div data-browser-view-grid-heading="true">
                <GroupHeading group={item.group} groupBy={groupBy} locale={locale} />
              </div>
            )
          }
          return <BrowserEntryItem entry={item.entry} displayMode={displayMode} typeEntryMap={typeEntryMap} onOpenEntry={onOpenEntry} />
        }}
      />
    )
  }

  if (displayMode === 'rows') {
    return (
      <div className="h-full overflow-x-auto">
        <Virtuoso
          style={{ height: '100%', minWidth: 760 }}
          data={browserItems}
          overscan={200}
          computeItemKey={(_index, item) => item.key}
          itemContent={(_index, item) => {
            if (item.kind === 'folder') return <BrowserFolderItem folder={item.folder} displayMode={displayMode} onSelectFolder={onSelectFolder} />
            if (item.kind === 'group') return <GroupHeading group={item.group} groupBy={groupBy} locale={locale} />
            return <BrowserEntryItem entry={item.entry} displayMode={displayMode} typeEntryMap={typeEntryMap} onOpenEntry={onOpenEntry} />
          }}
        />
      </div>
    )
  }

  return (
    <Virtuoso
      style={{ height: '100%' }}
      data={browserItems}
      overscan={200}
      computeItemKey={(_index, item) => item.key}
      itemContent={(_index, item) => {
        if (item.kind === 'folder') return <BrowserFolderItem folder={item.folder} displayMode={displayMode} onSelectFolder={onSelectFolder} />
        if (item.kind === 'group') return <GroupHeading group={item.group} groupBy={groupBy} locale={locale} />
        return renderItem(item.entry)
      }}
    />
  )
}
