export const NOTE_LIST_DISPLAY_MODES = ['list', 'rows', 'cards'] as const

export type NoteListDisplayMode = typeof NOTE_LIST_DISPLAY_MODES[number]
