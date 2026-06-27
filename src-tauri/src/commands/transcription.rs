use crate::transcription_models::{
    TranscriptionModelInstallResult,
    TranscriptionModelStatus,
};

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeRecordedAudioArgs {
    pub audio_base64: String,
    pub model_id: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeRecordedAudioResult {
    pub transcript: String,
}

#[tauri::command]
pub fn list_transcription_models() -> Result<Vec<TranscriptionModelStatus>, String> {
    crate::transcription_models::list_transcription_models()
}

#[tauri::command]
pub fn download_transcription_model(model_id: String) -> Result<TranscriptionModelInstallResult, String> {
    crate::transcription_models::download_transcription_model(model_id)
}

#[tauri::command]
pub fn delete_transcription_model(model_id: String) -> Result<TranscriptionModelInstallResult, String> {
    crate::transcription_models::delete_transcription_model(model_id)
}

#[tauri::command]
pub fn transcribe_recorded_audio(args: TranscribeRecordedAudioArgs) -> Result<TranscribeRecordedAudioResult, String> {
    crate::transcription_runtime::transcribe_recorded_audio(args.audio_base64, args.model_id)
        .map(|transcript| TranscribeRecordedAudioResult { transcript })
}
