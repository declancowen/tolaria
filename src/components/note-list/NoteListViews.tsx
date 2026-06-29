import { createElement, forwardRef, type CSSProperties } from 'react'
import { Virtuoso, VirtuosoGrid, type GridItemProps, type VirtuosoHandle } from 'react-virtuoso'
import { FileText, Folder } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FolderNode, SidebarSelection, VaultEntry } from '../../types'
import type { GroupByOption, NoteListDocumentGroup, SortOption, SortDirection, SortConfig, RelationshipGroup } from '../../utils/noteListHelpers'
import { relativeDate } from '../../utils/noteListHelpers'
import { translate, type AppLocale } from '../../lib/i18n'
import { getTypeColor, getTypeLightColor } from '../../utils/typeColors'
import type { DateDisplayFormat } from '../../utils/dateDisplay'
import { getTypeIcon } from '../note-item/typeIcon'
import { resolvePropertyChipValues } from '../note-item/propertyChipValues'
import type { NoteListDisplayMode } from './noteListDisplayMode'
import { PinnedCard } from './PinnedCard'
import { RelationshipGroupSection } from './RelationshipGroupSection'
import { EmptyMessage } from './TrashWarningBanner'

type FolderSelection = Extract<SidebarSelection, { kind: 'folder' }>
type BrowserSection = 'folders' | 'documents'
type BrowserViewItem =
  | { kind: 'entry'; entry: VaultEntry; key: string }
  | { kind: 'folder'; folder: FolderNode; key: string }
  | { kind: 'group'; group: NoteListDocumentGroup; key: string }
  | { kind: 'section'; section: BrowserSection; count: number; key: string }
type BrowserGridContext = { items: BrowserViewItem[] }
const BROWSER_HEADING_CLASSNAME =
  'flex min-h-8 items-center justify-between gap-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'
const BROWSER_ROW_TITLE_CLASSNAME = 'flex min-w-0 items-center gap-2'
const BROWSER_ROW_GRID_CLASSNAME =
  'grid h-12 w-full min-w-0 grid-cols-[minmax(160px,1.15fr)_minmax(180px,1.65fr)_76px_max-content_minmax(140px,0.9fr)] items-center gap-4 rounded-none border-0 bg-transparent px-4 py-0 text-left shadow-none hover:bg-muted'

const BrowserGridItem = forwardRef<HTMLDivElement, GridItemProps & { context?: BrowserGridContext }>(
  function BrowserGridItem({ children, className, context, style, ...props }, ref) {
    const item = context?.items[props['data-index']]
    const spansGrid = item?.kind === 'group' || item?.kind === 'section'

    return (
      <div
        {...props}
        ref={ref}
        className={cn(className, spansGrid && 'browser-view-grid-item--group')}
        data-browser-view-grid-kind={item?.kind}
        style={spansGrid ? { ...style, gridColumn: '1 / -1' } : style}
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

function entryTypeName(entry: VaultEntry): string | null {
  return entry.isA ?? (entry.fileKind && entry.fileKind !== 'markdown' ? null : 'Note')
}

function entryPillStyle(entry: VaultEntry, typeEntryMap: Record<string, VaultEntry>): CSSProperties {
  const typeName = entryTypeName(entry)
  const typeEntry = typeName ? typeEntryMap[typeName] : undefined
  return {
    background: getTypeLightColor(typeName, typeEntry?.color),
    color: getTypeColor(typeName, typeEntry?.color),
  }
}

function TypePill({ entry, typeEntryMap }: {
  entry: VaultEntry
  typeEntryMap: Record<string, VaultEntry>
}) {
  const typeName = entryTypeName(entry)
  const typeEntry = typeName ? typeEntryMap[typeName] : undefined
  const TypeIcon = getTypeIcon(typeName, typeEntry?.icon)

  return (
    <span
      className="inline-flex h-5 min-w-0 max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={entryPillStyle(entry, typeEntryMap)}
    >
      {createElement(TypeIcon, { width: 12, height: 12, className: 'shrink-0' })}
      <span className="truncate">{entryTypeLabel(entry)}</span>
    </span>
  )
}

function BrowserValuePill({ label, style }: { label: string; style: CSSProperties }) {
  return (
    <span className="inline-flex h-5 min-w-0 max-w-[120px] items-center truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-none" style={style}>
      {label}
    </span>
  )
}

function TagPillList({
  className = 'flex min-w-0 items-center gap-1.5 overflow-hidden',
  style,
  tags,
}: {
  className?: string
  style: CSSProperties
  tags: string[]
}) {
  if (tags.length === 0) return null
  return (
    <span className={className}>
      {tags.map((tag) => <BrowserValuePill key={tag} label={tag} style={style} />)}
    </span>
  )
}

function BrowserPropertyPillList({
  allEntries,
  className = 'flex min-w-0 items-center gap-1.5 overflow-hidden',
  dateDisplayFormat,
  displayProps,
  entry,
  typeEntryMap,
}: {
  allEntries: VaultEntry[]
  className?: string
  dateDisplayFormat?: DateDisplayFormat
  displayProps: string[]
  entry: VaultEntry
  typeEntryMap: Record<string, VaultEntry>
}) {
  const style = entryPillStyle(entry, typeEntryMap)
  type BrowserPropertyPill = { key: string; label: string; isType: boolean; style?: CSSProperties }
  const pills = displayProps.flatMap<BrowserPropertyPill>((prop) => {
    const normalized = prop.trim().toLowerCase()
    if (normalized === 'type') return [{ key: `${prop}:type`, label: entryTypeLabel(entry), isType: true }]
    if (normalized === 'tag' || normalized === 'tags') {
      return entryTags(entry).map((tag) => ({ key: `${prop}:tag:${tag}`, label: tag, isType: false }))
    }
    return resolvePropertyChipValues(entry, prop, { allEntries, dateDisplayFormat, typeEntryMap })
      .map((chip) => ({ key: `${prop}:${chip.tone}:${chip.label}`, label: chip.label, isType: false, style: chip.style }))
  })
  if (pills.length === 0) return null

  return (
    <span className={className}>
      {pills.map((pill) => (
        pill.isType
          ? <TypePill key={pill.key} entry={entry} typeEntryMap={typeEntryMap} />
          : <BrowserValuePill key={pill.key} label={pill.label} style={pill.style ?? style} />
      ))}
    </span>
  )
}

function BrowserEntryPillBand({
  allEntries,
  className = 'flex min-w-0 items-center gap-1.5 overflow-hidden',
  dateDisplayFormat,
  displayPropsOverride,
  entry,
  includeDefaultType = true,
  typeEntryMap,
}: {
  allEntries: VaultEntry[]
  className?: string
  dateDisplayFormat?: DateDisplayFormat
  displayPropsOverride?: string[] | null
  entry: VaultEntry
  includeDefaultType?: boolean
  typeEntryMap: Record<string, VaultEntry>
}) {
  if (displayPropsOverride && displayPropsOverride.length > 0) {
    return (
      <BrowserPropertyPillList
        allEntries={allEntries}
        className={className}
        dateDisplayFormat={dateDisplayFormat}
        displayProps={displayPropsOverride}
        entry={entry}
        typeEntryMap={typeEntryMap}
      />
    )
  }

  return (
    <span className={className}>
      {includeDefaultType ? <TypePill entry={entry} typeEntryMap={typeEntryMap} /> : null}
      <TagPillList className="contents" style={entryPillStyle(entry, typeEntryMap)} tags={entryTags(entry)} />
    </span>
  )
}

function BrowserInsetDivider({ displayMode, kind }: { displayMode: NoteListDisplayMode; kind: 'heading' | 'row' }) {
  const className = displayMode === 'cards' ? 'border-b border-border' : 'mx-4 border-b border-border'
  return <div aria-hidden="true" className={className} data-browser-inset-divider={kind} />
}

function browserHeadingClassName(displayMode: NoteListDisplayMode): string {
  return cn(BROWSER_HEADING_CLASSNAME, displayMode === 'cards' ? 'px-0' : 'px-4')
}

function groupHeadingLabel(group: NoteListDocumentGroup, groupBy: GroupByOption, locale: AppLocale): string | null {
  if (groupBy === 'none') return null
  return group.label || translate(locale, 'noteList.groupBy.noValue')
}

function sectionHeadingLabel(section: BrowserSection, locale: AppLocale): string {
  return section === 'folders'
    ? translate(locale, 'sidebar.group.folders')
    : translate(locale, 'noteList.browser.documents')
}

function browserFolderKey(folder: FolderNode): string {
  return `folder:${folder.rootPath ?? ''}:${folder.path}`
}

function buildBrowserViewItems(
  folderChildren: FolderNode[],
  documentGroups: NoteListDocumentGroup[],
  groupBy: GroupByOption,
): BrowserViewItem[] {
  const items: BrowserViewItem[] = []
  if (folderChildren.length > 0) {
    items.push({ kind: 'section', section: 'folders', count: folderChildren.length, key: 'section:folders' })
    items.push(...folderChildren.map((folder) => ({
      kind: 'folder' as const,
      folder,
      key: browserFolderKey(folder),
    })))
  }

  if (groupBy === 'none') {
    const entries = documentGroups.flatMap((group) => group.entries)
    if (entries.length > 0) {
      items.push({ kind: 'section', section: 'documents', count: entries.length, key: 'section:documents' })
      items.push(...entries.map((entry) => ({ kind: 'entry' as const, entry, key: `entry:${entry.path}` })))
    }
    return items
  }

  for (const group of documentGroups) {
    if (group.entries.length === 0) continue
    items.push({ kind: 'group', group, key: `group:${group.key}` })
    for (const entry of group.entries) {
      items.push({ kind: 'entry', entry, key: `entry:${entry.path}` })
    }
  }

  return items
}

function GroupHeading({
  displayMode,
  group,
  groupBy,
  locale,
}: {
  displayMode: NoteListDisplayMode
  group: NoteListDocumentGroup
  groupBy: GroupByOption
  locale: AppLocale
}) {
  const label = groupHeadingLabel(group, groupBy, locale)
  if (!label) return null

  return (
    <>
      <div className={browserHeadingClassName(displayMode)}>
        <span className="truncate">{label}</span>
        <span className="font-normal tabular-nums">{group.entries.length}</span>
      </div>
      <BrowserInsetDivider displayMode={displayMode} kind="heading" />
    </>
  )
}

function BrowserSectionHeading({
  count,
  displayMode,
  locale,
  section,
}: {
  count: number
  displayMode: NoteListDisplayMode
  locale: AppLocale
  section: BrowserSection
}) {
  return (
    <>
      <div className={browserHeadingClassName(displayMode)}>
        <span className="truncate">{sectionHeadingLabel(section, locale)}</span>
        <span className="font-normal tabular-nums">{count}</span>
      </div>
      <BrowserInsetDivider displayMode={displayMode} kind="heading" />
    </>
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

  if (displayMode === 'cards') {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-full min-h-[72px] w-full min-w-0 items-center justify-start overflow-hidden whitespace-normal rounded-md border border-border bg-background p-3 text-left shadow-none hover:bg-muted"
        onClick={openFolder}
      >
        <div className="flex h-full w-full min-w-0 flex-col justify-center">
          <Folder size={18} weight="fill" className="text-foreground" />
          <div className="mt-2 min-w-0 truncate text-[14px] font-medium text-foreground">{folder.name}</div>
        </div>
      </Button>
    )
  }

  const rowClassName = 'grid h-12 w-full min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-3 rounded-none border-0 bg-transparent px-4 py-0 text-left shadow-none hover:bg-muted'

  return (
    <Button type="button" variant="ghost" className={rowClassName} onClick={openFolder}>
      <div className={BROWSER_ROW_TITLE_CLASSNAME}>
        <Folder size={16} weight="fill" className="shrink-0 text-foreground" />
        <span className="truncate text-[13px] font-medium text-foreground">{folder.name}</span>
      </div>
    </Button>
  )
}

function BrowserDocumentTitle({ entry }: { entry: VaultEntry }) {
  return (
    <span className={BROWSER_ROW_TITLE_CLASSNAME}>
      <FileText size={16} className="shrink-0 text-muted-foreground" />
      <span className="truncate text-[13px] font-medium text-foreground">{entry.title}</span>
    </span>
  )
}

function BrowserEntryItem({
  allEntries,
  dateDisplayFormat,
  displayMode,
  displayPropsOverride,
  entry,
  onOpenEntry,
  typeEntryMap,
}: {
  allEntries: VaultEntry[]
  dateDisplayFormat?: DateDisplayFormat
  displayMode: Exclude<NoteListDisplayMode, 'list'>
  displayPropsOverride?: string[] | null
  entry: VaultEntry
  onOpenEntry: (entry: VaultEntry, event: React.MouseEvent) => void
  typeEntryMap: Record<string, VaultEntry>
}) {
  const subtitle = entry.snippet || entry.filename
  const created = entry.createdAt ? relativeDate(entry.createdAt) : ''
  if (displayMode === 'cards') {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-0 w-full min-w-0 items-start justify-start overflow-hidden whitespace-normal rounded-md border border-border bg-background p-3 text-left shadow-none hover:bg-muted"
        onClick={(event) => onOpenEntry(entry, event)}
      >
        <div className="flex h-full w-full min-w-0 flex-col">
          <FileText size={18} className="text-muted-foreground" />
          <div className="mt-2 min-w-0">
            <div className="truncate text-[14px] font-medium leading-5 text-foreground">{entry.title}</div>
            <div className="mt-1 line-clamp-2 min-h-10 text-[12px] font-normal leading-5 text-muted-foreground">{subtitle}</div>
          </div>
          <div
            className="mt-1 flex h-[46px] max-w-full flex-wrap content-end gap-1.5 overflow-hidden"
            data-browser-card-pill-band="true"
          >
            <BrowserEntryPillBand
              allEntries={allEntries}
              className="contents"
              dateDisplayFormat={dateDisplayFormat}
              displayPropsOverride={displayPropsOverride}
              entry={entry}
              typeEntryMap={typeEntryMap}
            />
          </div>
        </div>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={BROWSER_ROW_GRID_CLASSNAME}
      onClick={(event) => onOpenEntry(entry, event)}
    >
      <BrowserDocumentTitle entry={entry} />
      <span className="truncate text-[12px] font-normal text-muted-foreground">{subtitle}</span>
      <span className="truncate text-[12px] font-normal text-muted-foreground">{created}</span>
      <span className="min-w-0">
        <TypePill entry={entry} typeEntryMap={typeEntryMap} />
      </span>
      <BrowserEntryPillBand
        allEntries={allEntries}
        dateDisplayFormat={dateDisplayFormat}
        displayPropsOverride={displayPropsOverride}
        entry={entry}
        includeDefaultType={false}
        typeEntryMap={typeEntryMap}
      />
    </Button>
  )
}

export function BrowserView({
  changesError,
  dateDisplayFormat,
  displayMode,
  displayPropsOverride,
  documentGroups,
  folderChildren,
  groupBy,
  allEntries,
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
  dateDisplayFormat?: DateDisplayFormat
  displayMode: NoteListDisplayMode
  displayPropsOverride?: string[] | null
  documentGroups: NoteListDocumentGroup[]
  folderChildren: FolderNode[]
  groupBy: GroupByOption
  allEntries?: VaultEntry[]
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
  const browserAllEntries = allEntries ?? searched

  if (displayMode === 'cards') {
    return (
      <div className="h-full" data-browser-card-grid-surface="true">
        <VirtuosoGrid
          style={{ height: '100%' }}
          data={browserItems}
          context={{ items: browserItems }}
          components={{ Item: BrowserGridItem }}
          overscan={200}
          listClassName="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] content-start gap-2 px-4 pb-2"
          itemClassName="browser-view-grid-item min-w-0 overflow-hidden"
          computeItemKey={(_index, item) => item.key}
          itemContent={(_index, item) => {
            if (item.kind === 'folder') {
              return <BrowserFolderItem folder={item.folder} displayMode={displayMode} onSelectFolder={onSelectFolder} />
            }
            if (item.kind === 'section') {
              return (
                <div data-browser-view-grid-heading="true">
                  <BrowserSectionHeading section={item.section} count={item.count} displayMode={displayMode} locale={locale} />
                </div>
              )
            }
            if (item.kind === 'group') {
              return (
                <div data-browser-view-grid-heading="true">
                  <GroupHeading group={item.group} groupBy={groupBy} displayMode={displayMode} locale={locale} />
                </div>
              )
            }
            return (
              <BrowserEntryItem
                allEntries={browserAllEntries}
                dateDisplayFormat={dateDisplayFormat}
                displayPropsOverride={displayPropsOverride}
                entry={item.entry}
                displayMode={displayMode}
                typeEntryMap={typeEntryMap}
                onOpenEntry={onOpenEntry}
              />
            )
          }}
        />
      </div>
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
            if (item.kind === 'section') return <BrowserSectionHeading section={item.section} count={item.count} displayMode={displayMode} locale={locale} />
            if (item.kind === 'group') return <GroupHeading group={item.group} groupBy={groupBy} displayMode={displayMode} locale={locale} />
            return (
              <BrowserEntryItem
                allEntries={browserAllEntries}
                dateDisplayFormat={dateDisplayFormat}
                displayPropsOverride={displayPropsOverride}
                entry={item.entry}
                displayMode={displayMode}
                typeEntryMap={typeEntryMap}
                onOpenEntry={onOpenEntry}
              />
            )
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
        if (item.kind === 'section') return <BrowserSectionHeading section={item.section} count={item.count} displayMode={displayMode} locale={locale} />
        if (item.kind === 'group') return <GroupHeading group={item.group} groupBy={groupBy} displayMode={displayMode} locale={locale} />
        return renderItem(item.entry)
      }}
    />
  )
}
