import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteList } from './NoteList'
import { NoteItem } from './NoteItem'
import { BrowserView } from './note-list/NoteListViews'
import { openNoteListPropertiesPicker } from './note-list/noteListPropertiesEvents'
import { AppPreferencesProvider } from '../hooks/useAppPreferences'
import {
  allSelection,
  buildNoteListProps,
  makeEntry,
  makeTypeDefinition,
  mockEntries,
  renderNoteList,
} from '../test-utils/noteListTestUtils'
import type { ViewFile } from '../types'

vi.mock('../hooks/useTabManagement', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useTabManagement')>()
  return { ...actual, prefetchNoteContent: vi.fn() }
})

function makeBookTypeEntries(
  displayProps: string[] = [],
  entryOverrides: Parameters<typeof makeEntry>[0] = {},
) {
  return [
    makeTypeDefinition('Book', displayProps),
    makeEntry({
      path: '/vault/book.md',
      filename: 'book.md',
      title: 'Book Note',
      isA: 'Book',
      createdAt: 1700000000,
      ...entryOverrides,
    }),
  ]
}

const noop = () => undefined
const NOTE_LIST_SEARCH_SETTLE_TIMEOUT_MS = 3_000

function withMacChromeClass<T>(callback: () => T): T {
  const hadMacChromeClass = document.body.classList.contains('mac-chrome')
  document.body.classList.add('mac-chrome')
  try {
    return callback()
  } finally {
    if (!hadMacChromeClass) document.body.classList.remove('mac-chrome')
  }
}

function makeViewDefinition(overrides: Partial<ViewFile> = {}): ViewFile {
  return {
    filename: 'active-books.yml',
    definition: {
      name: 'Active Books',
      icon: null,
      color: null,
      sort: null,
      filters: { all: [{ field: 'type', op: 'equals', value: 'Book' }] },
      ...overrides.definition,
    },
    ...overrides,
  }
}

function renderManagedViewNoteList({
  entries,
  view = makeViewDefinition(),
}: {
  entries: Parameters<typeof renderNoteList>[0]['entries']
  view?: ViewFile
}) {
  const built = buildNoteListProps({
    entries,
    selection: { kind: 'view', filename: view.filename },
    views: [view],
  })

  function ManagedViewNoteList() {
    const [views, setViews] = useState([view])

    return (
      <NoteList
        {...built.props}
        views={views}
        onUpdateViewDefinition={(filename, patch) => {
          setViews((currentViews) => currentViews.map((currentView) => (
            currentView.filename === filename
              ? { ...currentView, definition: { ...currentView.definition, ...patch } }
              : currentView
          )))
        }}
      />
    )
  }

  return {
    ...render(<ManagedViewNoteList />),
    ...built,
  }
}

async function searchNoteList(query: string) {
  const searchInput = screen.queryByPlaceholderText('Search notes...')
  if (!searchInput) fireEvent.click(screen.getByTitle('Search notes'))
  fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: query } })
  await waitFor(() => {
    expect(screen.getByTestId('note-list-search-loading')).toBeInTheDocument()
  }, { timeout: NOTE_LIST_SEARCH_SETTLE_TIMEOUT_MS })
  await waitFor(() => {
    expect(screen.queryByTestId('note-list-search-loading')).not.toBeInTheDocument()
  }, { timeout: NOTE_LIST_SEARCH_SETTLE_TIMEOUT_MS })
}

interface NoteListSearchMockResult {
  note_type: string
  path: string
  score: number
  snippet: string
  title: string
}

function installFullTextSearchMocks({
  resultsByVault,
}: {
  resultsByVault: Record<string, NoteListSearchMockResult[]>
}) {
  const originalContentHandler = window.__mockHandlers?.get_note_content
  const originalSearchHandler = window.__mockHandlers?.search_vault
  const searchVault = vi.fn((args?: Record<string, unknown>) => ({
    elapsed_ms: 7,
    mode: args?.mode,
    query: args?.query,
    results: resultsByVault[String(args?.vaultPath ?? '')] ?? [],
  }))
  const getNoteContent = vi.fn(() => {
    throw new Error('Note-list full-text search should not read note content in React')
  })

  if (!window.__mockHandlers) window.__mockHandlers = {}
  window.__mockHandlers.search_vault = searchVault
  window.__mockHandlers.get_note_content = getNoteContent

  return {
    getNoteContent,
    restore: () => {
      window.__mockHandlers.search_vault = originalSearchHandler
      window.__mockHandlers.get_note_content = originalContentHandler
    },
    searchVault,
  }
}

function renderBookNoteList({
  displayProps = ['Priority'],
  entryOverrides = {},
  selection = allSelection,
  allNotesNoteListProperties,
  onUpdateAllNotesNoteListProperties = noop,
  inboxNoteListProperties,
  onUpdateInboxNoteListProperties = noop,
}: {
  displayProps?: string[]
  entryOverrides?: Parameters<typeof makeEntry>[0]
  selection?: Parameters<typeof renderNoteList>[0]['selection']
  allNotesNoteListProperties?: string[] | null
  onUpdateAllNotesNoteListProperties?: () => void
  inboxNoteListProperties?: string[] | null
  onUpdateInboxNoteListProperties?: () => void
} = {}) {
  return renderNoteList({
    entries: makeBookTypeEntries(displayProps, entryOverrides),
    selection,
    allNotesNoteListProperties,
    onUpdateAllNotesNoteListProperties,
    inboxNoteListProperties,
    onUpdateInboxNoteListProperties,
  })
}

async function expectOnlySearchMatch(title: string, matchingQuery: string, hiddenQuery: string) {
  await searchNoteList(matchingQuery)
  expect(screen.getByText(title)).toBeInTheDocument()

  await searchNoteList(hiddenQuery)
  expect(screen.queryByText(title)).not.toBeInTheDocument()
  expect(screen.getByText('No matching notes')).toBeInTheDocument()
}

describe('NoteList rendering', () => {
  it('shows an empty state when there are no entries', () => {
    renderNoteList({ entries: [] })
    expect(screen.getByText('No notes found')).toBeInTheDocument()
  })

  it('renders all entries in the all-notes view', () => {
    renderNoteList()
    expect(screen.getByText('Build Laputa App')).toBeInTheDocument()
    expect(screen.getByText('Facebook Ads Strategy')).toBeInTheDocument()
    expect(screen.getByText('Matteo Cellini')).toBeInTheDocument()
  })

  it('filters section groups by type', () => {
    renderNoteList({ selection: { kind: 'sectionGroup', type: 'Person' } })
    expect(screen.getByText('Matteo Cellini')).toBeInTheDocument()
    expect(screen.queryByText('Build Laputa App')).not.toBeInTheDocument()
  })

  it('supports event sections', () => {
    renderNoteList({ selection: { kind: 'sectionGroup', type: 'Event' } })
    expect(screen.getByText('Kickoff Meeting')).toBeInTheDocument()
    expect(screen.queryByText('Build Laputa App')).not.toBeInTheDocument()
  })

  it('supports project sections', () => {
    renderNoteList({ selection: { kind: 'sectionGroup', type: 'Project' } })
    expect(screen.getByText('Build Laputa App')).toBeInTheDocument()
    expect(screen.queryByText('Matteo Cellini')).not.toBeInTheDocument()
  })

  it('passes the selected type when creating a note from a type section', () => {
    const { onCreateNote } = renderNoteList({ selection: { kind: 'sectionGroup', type: 'Project' } })
    fireEvent.click(screen.getByTitle('Create new note'))
    expect(onCreateNote).toHaveBeenCalledWith('Project')
  })

  it('creates an untyped note from all notes', () => {
    const { onCreateNote } = renderNoteList()
    fireEvent.click(screen.getByTitle('Create new note'))
    expect(onCreateNote).toHaveBeenCalledWith(undefined)
  })

  it('shows the active folder name and creates notes inside that folder', () => {
    const { onCreateNote } = renderNoteList({
      selection: {
        kind: 'folder',
        path: 'Projects/2026 Planning',
        rootPath: '/Users/luca/Laputa',
      },
    })

    expect(screen.getByRole('heading', { name: '2026 Planning' })).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Create new note'))

    expect(onCreateNote).toHaveBeenCalledWith(undefined, {
      creationPath: 'folder_header',
      folderPath: 'Projects/2026 Planning',
      vaultPath: '/Users/luca/Laputa',
    })
  })

  it('pins the current entity and shows grouped children', () => {
    renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    expect(screen.getAllByText('Build Laputa App').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Facebook Ads Strategy')).toBeInTheDocument()
    expect(screen.queryByText('Matteo Cellini')).not.toBeInTheDocument()
    expect(screen.getByText('Children')).toBeInTheDocument()
    expect(screen.getByText('Related to')).toBeInTheDocument()
  })

  it('shows referenced-by groups for topic entities', () => {
    renderNoteList({ selection: { kind: 'entity', entry: mockEntries[4] } })
    expect(screen.getByText('Build Laputa App')).toBeInTheDocument()
    expect(screen.getByText('Referenced by')).toBeInTheDocument()
  })

  it('toggles the search input from the header action', () => {
    renderNoteList()
    expect(screen.queryByPlaceholderText('Search notes...')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Search notes'))
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument()
  })

  it('filters by a case-insensitive search query', async () => {
    renderNoteList()
    await searchNoteList('facebook')
    expect(screen.getByText('Facebook Ads Strategy')).toBeInTheDocument()
    expect(screen.queryByText('Build Laputa App')).not.toBeInTheDocument()
  })

  it('filters by snippet text when the title does not match', async () => {
    renderNoteList({
      entries: [
        makeEntry({ path: '/vault/a.md', filename: 'a.md', title: 'Alpha Note', snippet: 'Routine body copy.' }),
        makeEntry({ path: '/vault/b.md', filename: 'b.md', title: 'Beta Note', snippet: 'Nebula-only snippet token.' }),
      ],
    })

    await searchNoteList('nebula-only')

    expect(screen.getByText('Beta Note')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Note')).not.toBeInTheDocument()
  })

  it('filters by full note content when the title and snippet do not match', async () => {
    const { getNoteContent, restore, searchVault } = installFullTextSearchMocks({
      resultsByVault: {
        '/vault': [{
          note_type: 'Note',
          path: '/vault/b.md',
          score: 1,
          snippet: 'Private body match is intentionally not rendered here.',
          title: 'Beta Note',
        }],
      },
    })

    try {
      renderNoteList({
        entries: [
          makeEntry({ path: '/vault/a.md', filename: 'a.md', title: 'Alpha Note', snippet: 'Routine body copy.' }),
          makeEntry({ path: '/vault/b.md', filename: 'b.md', title: 'Beta Note', snippet: 'Another public preview.' }),
        ],
      })

      await searchNoteList('subterranean-keyword')

      await waitFor(() => {
        expect(searchVault).toHaveBeenCalledWith(expect.objectContaining({
          vaultPath: '/vault',
          query: 'subterranean-keyword',
          mode: 'keyword',
          excludeFrontmatter: true,
        }))
      })
      expect(getNoteContent).not.toHaveBeenCalled()
      expect(screen.getByText('Beta Note')).toBeInTheDocument()
      expect(screen.queryByText('Alpha Note')).not.toBeInTheDocument()
      expect(screen.queryByText('Private body match is intentionally not rendered here.')).not.toBeInTheDocument()
    } finally {
      restore()
    }
  })

  it('ignores stale full-content results when the query changes before a slow search returns', async () => {
    const originalContentHandler = window.__mockHandlers?.get_note_content
    const originalSearchHandler = window.__mockHandlers?.search_vault
    let resolveSlowSearch: ((response: {
      elapsed_ms: number
      results: NoteListSearchMockResult[]
    }) => void) | null = null
    const searchVault = vi.fn((args?: Record<string, unknown>) => {
      if (args?.query === 'slow-body') {
        return new Promise((resolve) => {
          resolveSlowSearch = resolve
        })
      }

      return Promise.resolve({
        elapsed_ms: 7,
        results: [],
      })
    })
    const getNoteContent = vi.fn(() => {
      throw new Error('Note-list full-text search should not read note content in React')
    })

    if (!window.__mockHandlers) window.__mockHandlers = {}
    window.__mockHandlers.search_vault = searchVault
    window.__mockHandlers.get_note_content = getNoteContent

    try {
      renderNoteList({
        entries: [
          makeEntry({ path: '/vault/a.md', filename: 'a.md', title: 'Alpha Note', snippet: 'Routine body copy.' }),
          makeEntry({ path: '/vault/b.md', filename: 'b.md', title: 'Beta Note', snippet: 'Another public preview.' }),
        ],
      })

      fireEvent.click(screen.getByTitle('Search notes'))
      fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: 'slow-body' } })

      await waitFor(() => {
        expect(searchVault).toHaveBeenCalledWith(expect.objectContaining({
          query: 'slow-body',
          excludeFrontmatter: true,
        }))
      })

      fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: 'new-empty-query' } })

      await waitFor(() => {
        expect(searchVault).toHaveBeenCalledWith(expect.objectContaining({
          query: 'new-empty-query',
          excludeFrontmatter: true,
        }))
      })
      await waitFor(() => {
        expect(screen.queryByTestId('note-list-search-loading')).not.toBeInTheDocument()
      })

      await act(async () => {
        resolveSlowSearch?.({
          elapsed_ms: 7,
          results: [{
            note_type: 'Note',
            path: '/vault/b.md',
            score: 1,
            snippet: 'Stale body hit from the previous query.',
            title: 'Beta Note',
          }],
        })
        await Promise.resolve()
      })

      expect(getNoteContent).not.toHaveBeenCalled()
      expect(screen.queryByText('Beta Note')).not.toBeInTheDocument()
      expect(screen.getByText('No matching notes')).toBeInTheDocument()
    } finally {
      window.__mockHandlers.search_vault = originalSearchHandler
      window.__mockHandlers.get_note_content = originalContentHandler
    }
  })

  it('ignores full-content matches that only appear in hidden frontmatter', async () => {
    const { getNoteContent, restore, searchVault } = installFullTextSearchMocks({
      resultsByVault: {
        '/vault': [],
      },
    })

    try {
      renderNoteList({
        entries: [
          makeEntry({ path: '/vault/a.md', filename: 'a.md', title: 'Alpha Note', snippet: 'Routine body copy.' }),
          makeEntry({ path: '/vault/b.md', filename: 'b.md', title: 'Beta Note', snippet: 'Another public preview.' }),
        ],
      })

      await searchNoteList('hidden-frontmatter-keyword')

      await waitFor(() => {
        expect(searchVault).toHaveBeenCalledWith(expect.objectContaining({
          excludeFrontmatter: true,
        }))
      })
      expect(getNoteContent).not.toHaveBeenCalled()
      expect(screen.queryByText('Alpha Note')).not.toBeInTheDocument()
      expect(screen.getByText('No matching notes')).toBeInTheDocument()
    } finally {
      restore()
    }
  })

  it('runs full-content note-list search across visible workspaces', async () => {
    const { getNoteContent, restore, searchVault } = installFullTextSearchMocks({
      resultsByVault: {
        '/team': [{
          note_type: 'Note',
          path: '/team/team-body-hit.md',
          score: 1,
          snippet: 'Private workspace body hit.',
          title: 'Team Body Hit',
        }],
      },
    })

    try {
      renderNoteList({
        entries: [
          makeEntry({
            path: '/personal/personal-note.md',
            filename: 'personal-note.md',
            title: 'Personal Note',
            snippet: 'No body token here.',
            workspace: { id: 'personal', label: 'Personal', alias: 'PE', path: '/personal', shortLabel: 'PE', color: null, icon: null, mounted: true, available: true, defaultForNewNotes: true },
          }),
          makeEntry({
            path: '/team/team-body-hit.md',
            filename: 'team-body-hit.md',
            title: 'Team Body Hit',
            snippet: 'No body token here either.',
            workspace: { id: 'team', label: 'Team', alias: 'TE', path: '/team', shortLabel: 'TE', color: null, icon: null, mounted: true, available: true, defaultForNewNotes: false },
          }),
        ],
      })

      await searchNoteList('workspace-only-keyword')

      await waitFor(() => {
        expect(searchVault).toHaveBeenCalledWith(expect.objectContaining({ vaultPath: '/personal', excludeFrontmatter: true }))
        expect(searchVault).toHaveBeenCalledWith(expect.objectContaining({ vaultPath: '/team', excludeFrontmatter: true }))
      })
      expect(getNoteContent).not.toHaveBeenCalled()
      expect(screen.getByText('Team Body Hit')).toBeInTheDocument()
      expect(screen.queryByText('Personal Note')).not.toBeInTheDocument()
    } finally {
      restore()
    }
  })

  it('filters by visible property values and ignores hidden properties', async () => {
    renderBookNoteList({
      entryOverrides: {
        title: 'Property Search Note',
        properties: { Priority: 'Boarding Window', Owner: 'Hidden Owner Value' },
      },
      allNotesNoteListProperties: null,
    })

    await expectOnlySearchMatch('Property Search Note', 'boarding window', 'hidden owner value')
  })

  it('uses the active all-notes columns when filtering by visible property values', async () => {
    renderBookNoteList({
      entryOverrides: {
        title: 'Override Search Note',
        properties: { Priority: 'Hidden Priority', Owner: 'Visible Owner Value' },
      },
      allNotesNoteListProperties: ['Owner'],
    })

    await expectOnlySearchMatch('Override Search Note', 'visible owner value', 'hidden priority')
  })

  it('sorts entries by last modified descending by default', () => {
    renderNoteList({
      entries: [
        { ...mockEntries[0], modifiedAt: 1000, title: 'Oldest' },
        { ...mockEntries[1], modifiedAt: 3000, title: 'Newest', path: '/p2' },
        { ...mockEntries[2], modifiedAt: 2000, title: 'Middle', path: '/p3' },
      ],
    })

    const titles = screen.getAllByText(/Oldest|Newest|Middle/).map((element) => element.textContent)
    expect(titles).toEqual(['Newest', 'Middle', 'Oldest'])
  })

  it('hides standalone status badges inside note rows', () => {
    renderNoteList()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })

  it('shows search and create actions in the header instead of a count badge', () => {
    renderNoteList()
    expect(screen.getByTitle('Search notes')).toBeInTheDocument()
    expect(screen.getByTitle('Create new note')).toBeInTheDocument()
  })

  it('uses the shared 24px icon button styling for note-list header actions', () => {
    renderBookNoteList({
      entryOverrides: { properties: { Priority: 'High' } },
      selection: { kind: 'filter', filter: 'inbox' },
      inboxNoteListProperties: null,
    })

    const buttons = [
      screen.getByTitle('Search notes'),
      screen.getByTitle('Customize Inbox columns'),
      screen.getByTitle('Create new note'),
    ]

    for (const button of buttons) {
      expect(button).toHaveAttribute('data-variant', 'ghost')
      expect(button).toHaveClass(
        '!h-6',
        '!w-6',
        '!min-w-0',
        '!rounded-md',
        '!p-0',
        '!text-muted-foreground',
        'hover:!bg-accent',
        'hover:!text-foreground',
        '[&_svg]:!size-[16.5px]',
      )
      expect(button).not.toHaveAttribute('tabindex', '-1')
    }
  })

  it('spans grouped card headings across the grid', async () => {
    const project = makeEntry({
      path: '/vault/project.md',
      filename: 'project.md',
      title: 'Project Card',
      isA: 'Project',
    })
    const { container } = render(
      <BrowserView
        displayMode="cards"
        documentGroups={[{ key: 'type:Project', label: 'Project', entries: [project] }]}
        folderChildren={[]}
        groupBy="type"
        typeEntryMap={{}}
        onOpenEntry={vi.fn()}
        onSelectFolder={vi.fn()}
        query=""
        renderItem={() => null}
        searched={[project]}
      />,
    )

    await waitFor(() => {
      expect(container.querySelector('[data-browser-card-grid-surface="true"]')).toHaveClass('pt-2')
      const groupHeading = container.querySelector('[data-browser-view-grid-heading="true"]')
      expect(groupHeading?.closest('.browser-view-grid-item')).toHaveClass('browser-view-grid-item--group')
      const cardButton = screen.getByText('Project Card').closest('button')
      expect(cardButton).toHaveClass('h-auto', 'min-h-0', 'w-full', 'overflow-hidden', 'whitespace-normal')
      expect(cardButton?.firstElementChild).toHaveClass('w-full', 'min-w-0')
      const pillBand = cardButton?.querySelector('[data-browser-card-pill-band="true"]')
      expect(pillBand).toHaveClass('h-[46px]', 'content-end', 'overflow-hidden')
    })
  })

  it('keeps folders structurally separate from document cards in browser card view', async () => {
    const documentEntry = makeEntry({
      path: '/vault/brief.md',
      filename: 'brief.md',
      title: 'Strategy Brief',
      isA: 'Note',
    })

    const { container } = render(
      <BrowserView
        displayMode="cards"
        documentGroups={[{ key: 'none', label: '', entries: [documentEntry] }]}
        folderChildren={[{ name: 'Agents', path: 'Agents', children: [] }]}
        groupBy="none"
        typeEntryMap={{}}
        onOpenEntry={vi.fn()}
        onSelectFolder={vi.fn()}
        query=""
        renderItem={() => null}
        searched={[documentEntry]}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('FOLDERS')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()

      const folderButton = screen.getByText('Agents').closest('button')
      expect(folderButton).toBeInTheDocument()
      expect(folderButton).toHaveClass('h-full', 'min-h-[72px]', 'items-center')
      expect(folderButton?.firstElementChild).toHaveClass('justify-center')
      expect(folderButton?.querySelector('svg')).toHaveClass('text-foreground')
      expect(screen.getByText('Agents').nextElementSibling).toBeNull()

      const headings = container.querySelectorAll('[data-browser-view-grid-heading="true"]')
      expect(headings).toHaveLength(2)
      const headingDividers = container.querySelectorAll('[data-browser-inset-divider="heading"]')
      expect(headingDividers).toHaveLength(2)
      expect(headings[0].firstElementChild).toHaveClass('px-0')
      expect(headingDividers[0]).toHaveClass('border-b', 'border-border')
      expect(headingDividers[0]).not.toHaveClass('mx-4')
    })
  })

  it('renders browser list folders with compact rows and documents with regular note previews', async () => {
    const documentEntry = makeEntry({
      path: '/vault/brief.md',
      filename: 'brief.md',
      title: 'Strategy Brief',
      isA: 'Note',
      snippet: 'Preview text from the document body',
    })
    const onOpenEntry = vi.fn()

    render(
      <BrowserView
        displayMode="list"
        documentGroups={[{ key: 'none', label: '', entries: [documentEntry] }]}
        folderChildren={[{ name: 'Agents', path: 'Agents', children: [] }]}
        groupBy="none"
        typeEntryMap={{}}
        onOpenEntry={onOpenEntry}
        onSelectFolder={vi.fn()}
        query=""
        renderItem={(entry) => (
          <NoteItem
            entry={entry}
            isSelected={false}
            typeEntryMap={{}}
            onClickNote={(clickedEntry, event) => onOpenEntry(clickedEntry, event)}
          />
        )}
        searched={[documentEntry]}
      />,
    )

    await waitFor(() => {
      const folderButton = screen.getByText('Agents').closest('button')
      expect(folderButton).toHaveClass('h-12', 'border-0', 'px-4')
      expect(folderButton).not.toHaveClass('border-b')

      const folderTitleCell = screen.getByText('Agents').parentElement
      expect(folderTitleCell).toHaveClass('flex', 'items-center', 'gap-2')
      expect(screen.getByText('Preview text from the document body')).toBeInTheDocument()

      const noteRow = screen.getByText('Strategy Brief').closest('[data-note-path]')
      expect(noteRow).toHaveClass('border-b', 'border-transparent')
      expect(noteRow?.querySelector('[data-note-row-divider="true"]')).toHaveClass('inset-x-4', 'border-b')
      expect(document.querySelector('[data-browser-inset-divider="row"]')).not.toBeInTheDocument()
    })
  })

  it('renders browser rows with aligned folder and document icons but no row dividers', async () => {
    const documentEntry = makeEntry({
      path: '/vault/brief.md',
      filename: 'brief.md',
      title: 'Strategy Brief',
      isA: 'Note',
      properties: { tags: ['marketing', 'permissions', 'workshop'] },
    })

    render(
      <BrowserView
        displayMode="rows"
        documentGroups={[{ key: 'none', label: '', entries: [documentEntry] }]}
        folderChildren={[{ name: 'Agents', path: 'Agents', children: [] }]}
        groupBy="none"
        typeEntryMap={{}}
        onOpenEntry={vi.fn()}
        onSelectFolder={vi.fn()}
        query=""
        renderItem={() => null}
        searched={[documentEntry]}
      />,
    )

    await waitFor(() => {
      const folderButton = screen.getByText('Agents').closest('button')
      const documentButton = screen.getByText('Strategy Brief').closest('button')
      expect(folderButton).toHaveClass('h-12', 'border-0', 'px-4')
      expect(documentButton).toHaveClass(
        'h-12',
        'border-0',
        'px-4',
        'gap-4',
        'grid-cols-[minmax(160px,1.15fr)_minmax(180px,1.65fr)_76px_max-content_minmax(140px,0.9fr)]',
      )
      expect(folderButton).not.toHaveClass('border-b')
      expect(documentButton).not.toHaveClass('border-b')

      const folderTitleCell = screen.getByText('Agents').parentElement
      const titleCell = screen.getByText('Strategy Brief').parentElement
      expect(folderTitleCell).toHaveClass('flex', 'items-center', 'gap-2')
      expect(titleCell?.querySelector('svg')).toHaveClass('text-muted-foreground')
      expect(documentButton).not.toHaveTextContent('marketing, permissions, workshop')
      const typePillStyle = screen.getByText('Note').parentElement?.getAttribute('style')
      expect(screen.getByText('marketing')).toHaveClass('rounded')
      expect(screen.getByText('marketing')).not.toHaveClass('bg-muted')
      expect(screen.getByText('marketing').getAttribute('style')).toBe(typePillStyle)
      expect(screen.getByText('permissions').getAttribute('style')).toBe(typePillStyle)
      expect(document.querySelector('[data-browser-inset-divider="row"]')).not.toBeInTheDocument()
    })
  })

  it('applies selected display properties to browser row and card entries', async () => {
    const documentEntry = makeEntry({
      path: '/vault/brief.md',
      filename: 'brief.md',
      title: 'Strategy Brief',
      isA: 'Note',
      status: 'Done',
      properties: { tags: ['marketing'] },
    })
    const commonProps = {
      documentGroups: [{ key: 'none', label: '', entries: [documentEntry] }],
      displayPropsOverride: ['status'],
      folderChildren: [],
      groupBy: 'none' as const,
      onOpenEntry: vi.fn(),
      onSelectFolder: vi.fn(),
      query: '',
      renderItem: () => null,
      searched: [documentEntry],
      typeEntryMap: {},
    }

    const { rerender } = render(<BrowserView {...commonProps} displayMode="rows" />)

    await waitFor(() => {
      expect(screen.getByText('• Done')).toHaveAttribute('style', 'background-color: var(--accent-blue-light); color: var(--accent-blue);')
      expect(screen.queryByText('marketing')).not.toBeInTheDocument()
    })

    rerender(<BrowserView {...commonProps} displayMode="cards" />)

    await waitFor(() => {
      expect(screen.getByText('• Done')).toHaveAttribute('style', 'background-color: var(--accent-blue-light); color: var(--accent-blue);')
      expect(screen.queryByText('marketing')).not.toBeInTheDocument()
    })
  })

  it('omits empty document group headings when only folders are visible', async () => {
    const { container } = render(
      <BrowserView
        displayMode="cards"
        documentGroups={[{ key: 'type:Note', label: 'Note', entries: [] }]}
        folderChildren={[{ name: 'Agents', path: 'Agents', children: [] }]}
        groupBy="type"
        typeEntryMap={{}}
        onOpenEntry={vi.fn()}
        onSelectFolder={vi.fn()}
        query=""
        renderItem={() => null}
        searched={[]}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('FOLDERS')).toBeInTheDocument()
      expect(screen.getByText('Agents')).toBeInTheDocument()
      expect(screen.queryByText('Note')).not.toBeInTheDocument()
      expect(container.querySelectorAll('[data-browser-view-grid-heading="true"]')).toHaveLength(1)
    })
  })

  it('keeps the note-list search input full width and shows inline search controls while loading', async () => {
    vi.useFakeTimers()
    try {
      renderNoteList({
        entries: [
          makeEntry({ path: '/vault/a.md', filename: 'a.md', title: 'Alpha Strategy' }),
          makeEntry({ path: '/vault/b.md', filename: 'b.md', title: 'Beta Note' }),
        ],
      })

      fireEvent.click(screen.getByTitle('Search notes'))
      fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: 'strategy' } })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      expect(searchInput).toHaveClass('pr-16')
      expect(searchInput.parentElement).toHaveClass('relative', 'flex-1')
      expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument()
      expect(screen.getByTestId('note-list-search-loading')).toBeInTheDocument()
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(180)
      })
      await act(async () => {
        await vi.runOnlyPendingTimersAsync()
      })

      expect(screen.queryByTestId('note-list-search-loading')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows backlinks from outgoing links in entity view', () => {
    const entriesWithBacklink = mockEntries.map((entry) =>
      entry.path === mockEntries[2].path ? { ...entry, outgoingLinks: ['Build Laputa App'] } : entry,
    )

    renderNoteList({
      entries: entriesWithBacklink,
      selection: { kind: 'entity', entry: mockEntries[0] },
    })

    expect(screen.getByText('Backlinks')).toBeInTheDocument()
    expect(screen.getByText('Matteo Cellini')).toBeInTheDocument()
  })

  it('shows no placeholder neighborhood groups when none exist', () => {
    const standalone = makeEntry({
      path: '/vault/solo.md',
      filename: 'solo.md',
      title: 'Standalone',
      isA: 'Note',
    })

    renderNoteList({
      entries: [standalone],
      selection: { kind: 'entity', entry: standalone },
    })

    expect(screen.queryByRole('button', { name: /Children/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Events/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Referenced by/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Backlinks/i })).not.toBeInTheDocument()
  })

  it('keeps existing neighborhood groups visible at zero after search filters them out', async () => {
    const parent = makeEntry({
      path: '/vault/parent.md',
      filename: 'parent.md',
      title: 'Parent',
      isA: 'Project',
    })
    const child = makeEntry({
      path: '/vault/child.md',
      filename: 'child.md',
      title: 'Child Note',
      isA: 'Note',
      belongsTo: ['[[parent]]'],
    })

    renderNoteList({
      entries: [parent, child],
      selection: { kind: 'entity', entry: parent },
    })

    expect(screen.getByRole('button', { name: /Children\s*1/i })).toBeInTheDocument()

    await searchNoteList('missing-neighborhood-match')

    expect(screen.getByRole('button', { name: /Children\s*0/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Events/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Referenced by/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Backlinks/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Child Note')).not.toBeInTheDocument()
  })

  it('shows the same note in multiple neighborhood groups when relationships overlap', () => {
    const parent = makeEntry({
      path: '/vault/parent.md',
      filename: 'parent.md',
      title: 'Parent',
      isA: 'Project',
      relationships: { 'Related to': ['[[shared-note]]'] },
    })
    const shared = makeEntry({
      path: '/vault/shared-note.md',
      filename: 'shared-note.md',
      title: 'Shared Note',
      isA: 'Note',
      relatedTo: ['[[parent]]'],
    })

    renderNoteList({
      entries: [parent, shared],
      selection: { kind: 'entity', entry: parent },
    })

    expect(screen.getByText('Related to')).toBeInTheDocument()
    expect(screen.getByText('Referenced by')).toBeInTheDocument()
    expect(screen.getAllByText('Shared Note')).toHaveLength(2)
  })

  it('shows all real inverse relationship groups for custom relationship keys', () => {
    const parent = makeEntry({
      path: '/vault/parent.md',
      filename: 'parent.md',
      title: 'Parent',
      isA: 'Project',
    })
    const topicNote = makeEntry({
      path: '/vault/topic-note.md',
      filename: 'topic-note.md',
      title: 'Topic Note',
      isA: 'Note',
      relationships: { Topics: ['[[parent]]'] },
    })
    const mentorNote = makeEntry({
      path: '/vault/mentor-note.md',
      filename: 'mentor-note.md',
      title: 'Mentor Note',
      isA: 'Note',
      relationships: { Mentors: ['[[parent]]'] },
    })
    const hostEvent = makeEntry({
      path: '/vault/host-event.md',
      filename: 'host-event.md',
      title: 'Host Event',
      isA: 'Event',
      relationships: { Hosts: ['[[parent]]'] },
    })

    renderNoteList({
      entries: [parent, topicNote, mentorNote, hostEvent],
      selection: { kind: 'entity', entry: parent },
    })

    expect(screen.getByText('← Topics')).toBeInTheDocument()
    expect(screen.getByText('← Mentors')).toBeInTheDocument()
    expect(screen.getByText('← Hosts')).toBeInTheDocument()
    expect(screen.getByText('Topic Note')).toBeInTheDocument()
    expect(screen.getByText('Mentor Note')).toBeInTheDocument()
    expect(screen.getByText('Host Event')).toBeInTheDocument()
  })

  it('collapses and expands entity groups', () => {
    renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    expect(screen.getByText('Facebook Ads Strategy')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Children'))
    expect(screen.queryByText('Facebook Ads Strategy')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Children'))
    expect(screen.getByText('Facebook Ads Strategy')).toBeInTheDocument()
  })

  it('shows the pinned neighborhood note using the standard row content', () => {
    renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    expect(screen.getByText('Build a personal knowledge management app.')).toBeInTheDocument()
  })

  it('shows the inbox customize-columns action and falls back to type-defined chips', () => {
    renderBookNoteList({
      entryOverrides: { properties: { Priority: 'High', Owner: 'Luca' } },
      selection: { kind: 'filter', filter: 'inbox' },
      inboxNoteListProperties: null,
    })

    expect(screen.getByTitle('Customize Inbox columns')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.queryByText('Luca')).not.toBeInTheDocument()
  })

  it('shows the all-notes customize-columns action and falls back to type-defined chips', () => {
    renderBookNoteList({
      entryOverrides: { properties: { Priority: 'High', Owner: 'Luca' } },
      allNotesNoteListProperties: null,
    })

    expect(screen.getByTitle('Customize All Notes columns')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.queryByText('Luca')).not.toBeInTheDocument()
  })

  it('opens the all-notes column picker as a searchable combobox and saves new columns', async () => {
    const onUpdateAllNotesNoteListProperties = vi.fn()
    const archivedOwnerEntry = makeEntry({
      path: '/vault/book-archive.md',
      filename: 'book-archive.md',
      title: 'Archived Book',
      isA: 'Book',
      archived: true,
      properties: { Owner: 'Luca' },
    })

    renderNoteList({
      entries: [
        ...makeBookTypeEntries(['Priority'], { properties: { Priority: 'High' } }),
        archivedOwnerEntry,
      ],
      selection: allSelection,
      allNotesNoteListProperties: null,
      onUpdateAllNotesNoteListProperties,
    })

    act(() => {
      openNoteListPropertiesPicker('all')
    })

    expect(screen.getByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByTestId('list-properties-popover')).toHaveClass('overflow-hidden')
    expect(screen.getByTestId('list-properties-scroll-area')).toBeInTheDocument()
    expect(screen.getByTestId('list-properties-scroll-area')).toHaveClass('overflow-y-auto')
    expect(screen.getByRole('checkbox', { name: 'Priority' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Owner' })).toBeInTheDocument()

    const combobox = screen.getByRole('combobox', { name: 'Search note-list properties' })
    await waitFor(() => expect(combobox).toHaveFocus())

    fireEvent.change(combobox, { target: { value: 'Owner' } })
    expect(screen.getByRole('checkbox', { name: 'Owner' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Priority' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner' }))
    expect(onUpdateAllNotesNoteListProperties).toHaveBeenCalledWith(['Priority', 'Owner'])

    fireEvent.keyDown(combobox, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('list-properties-popover')).not.toBeInTheDocument())
  })

  it('opens the inbox column picker from the global event and saves new columns', () => {
    const onUpdateInboxNoteListProperties = vi.fn()

    renderNoteList({
      entries: makeBookTypeEntries(['Priority'], { properties: { Priority: 'High', Owner: 'Luca' } }),
      selection: { kind: 'filter', filter: 'inbox' },
      inboxNoteListProperties: null,
      onUpdateInboxNoteListProperties,
    })

    act(() => {
      openNoteListPropertiesPicker('inbox')
    })

    expect(screen.getByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Search note-list properties' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Priority' })).toBeChecked()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner' }))
    expect(onUpdateInboxNoteListProperties).toHaveBeenCalledWith(['Priority', 'Owner'])
  })

  it('opens the view column picker from the global event and applies the saved columns', () => {
    renderManagedViewNoteList({
      entries: makeBookTypeEntries(['Priority'], { properties: { Priority: 'High', Owner: 'Luca' } }),
    })

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.queryByText('Luca')).not.toBeInTheDocument()

    act(() => {
      openNoteListPropertiesPicker('view')
    })

    expect(screen.getByTestId('list-properties-popover')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner' }))

    expect(screen.getByText('Luca')).toBeInTheDocument()
  })

  it('shows an empty-state picker for views with no matching properties', () => {
    renderManagedViewNoteList({
      entries: makeBookTypeEntries(),
      view: makeViewDefinition({
        filename: 'empty-view.yml',
        definition: {
          name: 'Empty View',
          filters: { all: [{ field: 'type', op: 'equals', value: 'Project' }] },
        },
      }),
    })

    act(() => {
      openNoteListPropertiesPicker('view')
    })

    expect(screen.getByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByText('No properties match this search.')).toBeInTheDocument()
  })

  it('shows status in the type column picker when at least one note has it set', () => {
    renderNoteList({
      entries: makeBookTypeEntries([], { status: 'Active' }),
      selection: { kind: 'sectionGroup', type: 'Book' },
      onUpdateTypeSort: () => undefined,
    })

    act(() => {
      openNoteListPropertiesPicker('type')
    })

    expect(screen.getByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Search note-list properties' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'status' })).toBeInTheDocument()
  })

  it('keeps blank statuses out of the type column picker', () => {
    renderNoteList({
      entries: makeBookTypeEntries([], { status: '', properties: { Owner: 'Luca' } }),
      selection: { kind: 'sectionGroup', type: 'Book' },
      onUpdateTypeSort: () => undefined,
    })

    act(() => {
      openNoteListPropertiesPicker('type')
    })

    expect(screen.getByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Owner' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'status' })).not.toBeInTheDocument()
  })

  it('renders status as a note-list chip when a type displays it', () => {
    renderNoteList({
      entries: makeBookTypeEntries(['status'], { status: 'Active' }),
      selection: { kind: 'sectionGroup', type: 'Book' },
    })

    const chip = screen.getByTestId('property-chip-status-0')
    expect(chip).toHaveTextContent('• Active')
    expect(chip).toHaveStyle({ backgroundColor: 'var(--accent-green-light)', color: 'var(--accent-green)' })
  })

  it('auto-detects status-like property values in note-list chips', () => {
    renderNoteList({
      entries: makeBookTypeEntries(['Phase'], { properties: { Phase: 'Draft' } }),
      selection: { kind: 'sectionGroup', type: 'Book' },
    })

    const chip = screen.getByTestId('property-chip-phase-0')
    expect(chip).toHaveTextContent('• Draft')
    expect(chip).toHaveStyle({ backgroundColor: 'var(--accent-yellow-light)', color: 'var(--accent-yellow)' })
  })

  it('formats date properties in note-list chips with the selected display format', async () => {
    const built = buildNoteListProps({
      entries: makeBookTypeEntries(['Due'], { properties: { Due: '2026-05-11' } }),
      selection: { kind: 'sectionGroup', type: 'Book' },
    })
    render(
      <AppPreferencesProvider dateDisplayFormat="european">
        <NoteList {...built.props} />
      </AppPreferencesProvider>,
    )

    expect(screen.getByTestId('property-chip-due-0')).toHaveTextContent('11/5/2026')

    await searchNoteList('11/5/2026')
    expect(screen.getByText('Book Note')).toBeInTheDocument()
  })

  it('keeps unknown status values on neutral note-list chip styling', () => {
    renderNoteList({
      entries: makeBookTypeEntries(['status'], { status: 'Needs Review' }),
      selection: { kind: 'sectionGroup', type: 'Book' },
    })

    const chip = screen.getByTestId('property-chip-status-0')
    expect(chip).toHaveTextContent('• Needs Review')
    expect(chip.getAttribute('style')).toBeNull()
  })

  it('uses inbox overrides when configured', () => {
    renderNoteList({
      entries: makeBookTypeEntries(['Priority'], { properties: { Priority: 'High', Owner: 'Luca' } }),
      selection: { kind: 'filter', filter: 'inbox' },
      inboxNoteListProperties: ['Owner'],
      onUpdateInboxNoteListProperties: () => undefined,
    })

    expect(screen.getByText('Luca')).toBeInTheDocument()
    expect(screen.queryByText('High')).not.toBeInTheDocument()
  })

  it('Cmd+clicks relationship chips through the note list without triggering the row click', async () => {
    const projectType = makeTypeDefinition('Project')
    const taskType = makeTypeDefinition('Task', ['Belongs to'])
    const projectEntry = makeEntry({
      path: '/vault/project/build-app.md',
      filename: 'build-app.md',
      title: 'Build App',
      isA: 'Project',
      createdAt: 1700000000,
    })
    const taskEntry = makeEntry({
      path: '/vault/task/write-tests.md',
      filename: 'write-tests.md',
      title: 'Write tests',
      isA: 'Task',
      relationships: { 'Belongs to': ['[[project/build-app]]'] },
      createdAt: 1700000001,
    })

    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList({
      entries: [projectType, taskType, projectEntry, taskEntry],
      selection: { kind: 'sectionGroup', type: 'Task' },
    })

    const chip = screen.getByTestId('property-chip-belongs-to-0')

    fireEvent.click(chip)
    expect(onReplaceActiveTab).not.toHaveBeenCalled()
    expect(onEnterNeighborhood).not.toHaveBeenCalled()

    fireEvent.click(chip, { metaKey: true })
    await waitFor(() => {
      expect(onReplaceActiveTab).toHaveBeenCalledWith(projectEntry)
      expect(onEnterNeighborhood).toHaveBeenCalledWith(projectEntry)
    })
  })
})

describe('NoteList click behavior', () => {
  it('opens the current tab on a regular click', () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList()
    fireEvent.click(screen.getByText('Build Laputa App'))
    expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
    expect(onEnterNeighborhood).not.toHaveBeenCalled()
  })

  it('enters Neighborhood on Cmd+Click', async () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList()
    fireEvent.click(screen.getByText('Build Laputa App'), { metaKey: true })
    await waitFor(() => {
      expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
      expect(onEnterNeighborhood).toHaveBeenCalledWith(mockEntries[0])
    })
  })

  it('enters Neighborhood on Ctrl+Click', async () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList()
    fireEvent.click(screen.getByText('Build Laputa App'), { ctrlKey: true })
    await waitFor(() => {
      expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
      expect(onEnterNeighborhood).toHaveBeenCalledWith(mockEntries[0])
    })
  })

  it('supports Cmd+Click on the entity pinned card', async () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    const titles = screen.getAllByText('Build Laputa App')
    fireEvent.click(titles[titles.length - 1], { metaKey: true })
    await waitFor(() => {
      expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
      expect(onEnterNeighborhood).toHaveBeenCalledWith(mockEntries[0])
    })
  })

  it('opens the current tab from the entity pinned card on regular click', () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    const titles = screen.getAllByText('Build Laputa App')
    fireEvent.click(titles[titles.length - 1])
    expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
    expect(onEnterNeighborhood).not.toHaveBeenCalled()
  })

  it('opens child notes from entity view in the current tab', () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    fireEvent.click(screen.getByText('Facebook Ads Strategy'))
    expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[1])
    expect(onEnterNeighborhood).not.toHaveBeenCalled()
  })
})

describe('NoteList type sections', () => {
  const typeEntry = {
    ...makeEntry({
      path: '/Users/luca/Laputa/types/project.md',
      filename: 'project.md',
      title: 'Project',
      isA: 'Type',
      snippet: 'Defines the Project type.',
      modifiedAt: 1700000000,
      fileSize: 200,
      wordCount: 50,
    }),
  }
  const entriesWithType = [...mockEntries, typeEntry]

  it('does not show a type note pinned card while browsing the section', () => {
    renderNoteList({
      entries: entriesWithType,
      selection: { kind: 'sectionGroup', type: 'Project' },
    })

    expect(screen.queryByText('Defines the Project type.')).not.toBeInTheDocument()
    expect(screen.getByText('Build Laputa App')).toBeInTheDocument()
  })

  it('renders a clickable type header that opens the type note', () => {
    const { onReplaceActiveTab } = renderNoteList({
      entries: entriesWithType,
      selection: { kind: 'sectionGroup', type: 'Project' },
    })

    const headerLink = screen.getByTestId('type-header-link')
    expect(headerLink).toHaveTextContent('Project')
    fireEvent.click(headerLink)
    expect(onReplaceActiveTab).toHaveBeenCalledWith(typeEntry)
  })

  it('does not render a type header outside type sections', () => {
    renderNoteList({ entries: entriesWithType, selection: allSelection })
    expect(screen.queryByTestId('type-header-link')).not.toBeInTheDocument()
  })
})

describe('NoteList traffic-light padding', () => {
  it('adds left padding for native macOS traffic lights when the sidebar is collapsed', () => {
    withMacChromeClass(() => {
      const { container } = renderNoteList({ sidebarCollapsed: true })
      const header = container.querySelector('.h-\\[52px\\]') as HTMLElement
      expect(header.style.paddingLeft).toBe('90px')
    })
  })

  it('does not add left padding for native macOS traffic lights in fullscreen', () => {
    withMacChromeClass(() => {
      document.body.classList.add('mac-chrome-fullscreen')
      try {
        const { container } = renderNoteList({ sidebarCollapsed: true })
        const header = container.querySelector('.h-\\[52px\\]') as HTMLElement
        expect(header.style.paddingLeft).toBe('')
      } finally {
        document.body.classList.remove('mac-chrome-fullscreen')
      }
    })
  })

  it('does not add native macOS traffic-light padding without the mac chrome class', () => {
    const { container } = renderNoteList({ sidebarCollapsed: true })
    const header = container.querySelector('.h-\\[52px\\]') as HTMLElement
    expect(header.style.paddingLeft).toBe('')
  })

  it('does not add extra left padding when the sidebar is expanded', () => {
    withMacChromeClass(() => {
      const { container } = renderNoteList({ sidebarCollapsed: false })
      const header = container.querySelector('.h-\\[52px\\]') as HTMLElement
      expect(header.style.paddingLeft).toBe('')
    })
  })

  it('defaults to no extra padding when sidebarCollapsed is omitted', () => {
    const { container } = renderNoteList()
    const header = container.querySelector('.h-\\[52px\\]') as HTMLElement
    expect(header.style.paddingLeft).toBe('')
  })
})
