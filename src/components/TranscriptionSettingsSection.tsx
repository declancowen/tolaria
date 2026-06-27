import { DownloadSimple, Microphone, Trash } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { trackEvent } from '../lib/telemetry'
import {
  DEFAULT_TRANSCRIPTION_MODEL_ID,
  deleteTranscriptionModel,
  downloadTranscriptionModel,
  listTranscriptionModels,
  TRANSCRIPTION_MODEL_CATALOG,
  type DictationKey,
  type DictationMode,
  type TranscriptionModelStatus,
} from '../lib/transcriptionModels'
import type { TranslationKey } from '../lib/i18n'
import { notifyTranscriptionModelsChanged } from '../utils/recordingSettingsEvents'
import { Button } from './ui/button'
import {
  SectionHeading,
  SelectControl,
  SettingsGroup,
  SettingsGroupItem,
  SettingsRow,
  SettingsSwitchRow,
} from './SettingsControls'

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string

interface TranscriptionSettingsSectionProps {
  defaultModelId: string
  dictationEnabled: boolean
  dictationKey: DictationKey
  dictationMode: DictationMode
  setDefaultModelId: (value: string) => void
  setDictationEnabled: (value: boolean) => void
  setDictationKey: (value: DictationKey) => void
  setDictationMode: (value: DictationMode) => void
  setTranscriptionEnabled: (value: boolean) => void
  t: Translate
  transcriptionEnabled: boolean
}

function installedModelOptions(t: Translate, models: TranscriptionModelStatus[]) {
  const installed = models.filter(model => model.installed)
  const source = installed.length > 0 ? installed : models
  return source.map(model => ({
    value: model.id,
    label: installed.length > 0
      ? model.title
      : `${model.title} (${t('settings.recordings.modelNotInstalled')})`,
  }))
}

function engineLabel(engine: TranscriptionModelStatus['engine']): string {
  return engine === 'parakeet' ? 'Parakeet' : 'Whisper'
}

function languageModeLabel(languageMode: TranscriptionModelStatus['languageMode']): string {
  return languageMode === 'multilingual' ? 'Multilingual' : 'English'
}

function resolveDefaultModel(models: TranscriptionModelStatus[], current: string): string {
  if (models.some(model => model.id === current)) return current
  return models[0]?.id ?? DEFAULT_TRANSCRIPTION_MODEL_ID
}

export function TranscriptionSettingsSection({
  defaultModelId,
  dictationEnabled,
  dictationKey,
  dictationMode,
  setDefaultModelId,
  setDictationEnabled,
  setDictationKey,
  setDictationMode,
  setTranscriptionEnabled,
  t,
  transcriptionEnabled,
}: TranscriptionSettingsSectionProps) {
  const [models, setModels] = useState<TranscriptionModelStatus[]>(() => TRANSCRIPTION_MODEL_CATALOG.map(model => ({
    ...model,
    installed: false,
    path: null,
  })))
  const [busyModelId, setBusyModelId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshModels = useCallback(async () => {
    try {
      setModels(await listTranscriptionModels())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void refreshModels()
  }, [refreshModels])

  useEffect(() => {
    const resolvedModelId = resolveDefaultModel(models, defaultModelId)
    if (resolvedModelId !== defaultModelId) setDefaultModelId(resolvedModelId)
  }, [defaultModelId, models, setDefaultModelId])

  const modelOptions = useMemo(() => installedModelOptions(t, models), [models, t])

  const handleDownload = useCallback(async (modelId: string) => {
    setBusyModelId(modelId)
    trackEvent('transcription_model_download_started', { model_id: modelId })
    try {
      const result = await downloadTranscriptionModel(modelId)
      setModels(current => current.map(model => model.id === modelId ? result.model : model))
      setDefaultModelId(modelId)
      setError(null)
      notifyTranscriptionModelsChanged()
      trackEvent('transcription_model_download_completed', { model_id: modelId })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      trackEvent('transcription_model_download_failed', { model_id: modelId })
    } finally {
      setBusyModelId(null)
    }
  }, [setDefaultModelId])

  const handleDelete = useCallback(async (modelId: string) => {
    setBusyModelId(modelId)
    trackEvent('transcription_model_deleted', { model_id: modelId })
    try {
      const result = await deleteTranscriptionModel(modelId)
      setModels(current => current.map(model => model.id === modelId ? result.model : model))
      setError(null)
      notifyTranscriptionModelsChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyModelId(null)
    }
  }, [])

  return (
    <>
      <SectionHeading
        icon={<Microphone size={16} aria-hidden="true" />}
        title={t('settings.recordings.title')}
      />

      <SettingsGroup>
        <SettingsSwitchRow
          label={t('settings.recordings.enable')}
          description={t('settings.recordings.enableDescription')}
          checked={transcriptionEnabled}
          onChange={setTranscriptionEnabled}
          testId="settings-transcription-enabled"
        />
        <SettingsSwitchRow
          label={t('settings.recordings.dictation')}
          description={t('settings.recordings.dictationDescription')}
          checked={dictationEnabled}
          onChange={setDictationEnabled}
          disabled={!transcriptionEnabled}
          testId="settings-dictation-enabled"
        />
        <SettingsRow
          label={t('settings.recordings.defaultModel')}
          description={t('settings.recordings.defaultModelDescription')}
          controlWidth="wide"
        >
          <SelectControl
            ariaLabel={t('settings.recordings.defaultModel')}
            value={defaultModelId}
            onValueChange={setDefaultModelId}
            options={modelOptions}
            testId="settings-default-transcription-model"
          />
        </SettingsRow>
        <SettingsRow
          label={t('settings.recordings.dictationKey')}
          description={t('settings.recordings.dictationKeyDescription')}
        >
          <SelectControl
            ariaLabel={t('settings.recordings.dictationKey')}
            value={dictationKey}
            onValueChange={(value) => setDictationKey(value as DictationKey)}
            options={[
              { value: 'option_k', label: t('settings.recordings.keyOptionK') },
              { value: 'command_shift_d', label: t('settings.recordings.keyCommandShiftD') },
            ]}
            testId="settings-dictation-key"
          />
        </SettingsRow>
        <SettingsRow
          label={t('settings.recordings.dictationMode')}
          description={t('settings.recordings.dictationModeDescription')}
        >
          <SelectControl
            ariaLabel={t('settings.recordings.dictationMode')}
            value={dictationMode}
            onValueChange={(value) => setDictationMode(value as DictationMode)}
            options={[
              { value: 'toggle', label: t('settings.recordings.modeToggle') },
              { value: 'push_to_talk', label: t('settings.recordings.modePushToTalk') },
            ]}
            testId="settings-dictation-mode"
          />
        </SettingsRow>
        <SettingsGroupItem>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-foreground">{t('settings.recordings.models')}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{t('settings.recordings.modelsDescription')}</div>
            </div>
            {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div> : null}
            <div className="grid gap-2">
              {models.map(model => (
                <div key={model.id} className="flex flex-col gap-3 rounded-md border border-border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{model.title}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{engineLabel(model.engine)}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{languageModeLabel(model.languageMode)}</span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      {model.description}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={model.installed ? 'text-xs text-emerald-700' : 'text-xs text-muted-foreground'}>
                      {model.installed ? t('settings.recordings.installed') : t('settings.recordings.notInstalled')}
                    </span>
                    {model.installed ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={busyModelId === model.id}
                        onClick={() => void handleDelete(model.id)}
                      >
                        <Trash size={15} />
                        {t('settings.recordings.deleteModel')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={busyModelId === model.id}
                        onClick={() => void handleDownload(model.id)}
                      >
                        <DownloadSimple size={15} />
                        {busyModelId === model.id ? t('settings.recordings.downloading') : t('settings.recordings.downloadModel')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs leading-5 text-muted-foreground">{t('settings.recordings.privacy')}</div>
          </div>
        </SettingsGroupItem>
      </SettingsGroup>
    </>
  )
}
