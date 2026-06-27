import { StackSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { TOOLBAR_ICON_SIZE } from '@/components/ui/toolbarIconButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import type { GroupByOption } from '../../utils/noteListHelpers'

const BUILT_IN_GROUP_OPTIONS: GroupByOption[] = ['none', 'type', 'status', 'author']
const GROUP_LABEL_KEYS = {
  none: 'noteList.groupBy.none',
  type: 'noteList.groupBy.type',
  status: 'noteList.groupBy.status',
  author: 'noteList.groupBy.author',
} satisfies Record<string, TranslationKey>
const GROUP_LABEL_KEYS_BY_OPTION = new Map<string, TranslationKey>(Object.entries(GROUP_LABEL_KEYS))

function uniquePropertyOptions(customProperties: string[]): GroupByOption[] {
  const seen = new Set<string>()
  const builtInProperties = new Set(['author', 'status', 'type'])
  const options: GroupByOption[] = []
  for (const property of customProperties) {
    const trimmed = property.trim()
    if (!trimmed) continue
    const normalized = trimmed.toLowerCase()
    if (builtInProperties.has(normalized)) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    options.push(`property:${trimmed}`)
  }
  return options
}

function groupByOptionLabel(option: GroupByOption, locale: AppLocale): string {
  if (option.startsWith('property:')) return option.slice('property:'.length)
  return translate(locale, GROUP_LABEL_KEYS_BY_OPTION.get(option) ?? 'noteList.groupBy.none')
}

function groupByTriggerLabel(current: GroupByOption, locale: AppLocale): string {
  if (current === 'none') return translate(locale, 'noteList.groupBy.triggerNone')
  return groupByOptionLabel(current, locale)
}

export function GroupByDropdown({
  current,
  customProperties,
  locale = 'en',
  onChange,
}: {
  current?: GroupByOption
  customProperties?: string[]
  locale?: AppLocale
  onChange: (option: GroupByOption) => void
}) {
  const activeGroupBy = current ?? 'none'
  const options = [...BUILT_IN_GROUP_OPTIONS, ...uniquePropertyOptions(customProperties ?? [])]
  const currentLabel = groupByOptionLabel(activeGroupBy, locale)
  const triggerLabel = groupByTriggerLabel(activeGroupBy, locale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className={cn(
            'h-6 min-w-0 gap-1 rounded px-1 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground',
            activeGroupBy !== 'none' && 'bg-accent text-foreground',
          )}
          title={translate(locale, 'noteList.groupBy.by', { label: currentLabel })}
          aria-label={translate(locale, 'noteList.groupBy.by', { label: currentLabel })}
          data-testid="group-by-button"
        >
          <StackSimple size={TOOLBAR_ICON_SIZE} weight="regular" />
          <span className="text-[12px] font-medium">{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[12000] w-44">
        <DropdownMenuRadioGroup value={activeGroupBy} onValueChange={(value) => onChange(value as GroupByOption)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option} value={option} data-testid={`group-by-option-${option}`}>
              {groupByOptionLabel(option, locale)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
