use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::settings::preferred_app_config_path;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionModelArtifact {
    pub filename: String,
    pub url: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionModelDefinition {
    pub artifacts: Vec<TranscriptionModelArtifact>,
    pub description: String,
    pub engine: String,
    pub id: String,
    pub language_mode: String,
    pub license: String,
    pub size_mb: u32,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionModelStatus {
    #[serde(flatten)]
    pub definition: TranscriptionModelDefinition,
    pub installed: bool,
    pub path: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionModelInstallResult {
    pub model: TranscriptionModelStatus,
}

fn artifact(filename: &str, url: &str) -> TranscriptionModelArtifact {
    TranscriptionModelArtifact {
        filename: filename.to_string(),
        url: url.to_string(),
    }
}

fn definition(
    id: &str,
    title: &str,
    engine: &str,
    language_mode: &str,
    license: &str,
    size_mb: u32,
    description: &str,
    artifacts: Vec<TranscriptionModelArtifact>,
) -> TranscriptionModelDefinition {
    TranscriptionModelDefinition {
        artifacts,
        description: description.to_string(),
        engine: engine.to_string(),
        id: id.to_string(),
        language_mode: language_mode.to_string(),
        license: license.to_string(),
        size_mb,
        title: title.to_string(),
    }
}

fn model_catalog() -> Vec<TranscriptionModelDefinition> {
    vec![
        definition(
            "whisper-tiny-en",
            "Whisper Tiny",
            "whisper",
            "english",
            "MIT",
            75,
            "Fastest option for English dictation.",
            vec![artifact(
                "ggml-tiny.en.bin",
                "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin",
            )],
        ),
        definition(
            "whisper-base-en",
            "Whisper Base",
            "whisper",
            "english",
            "MIT",
            142,
            "Balanced English transcription for notes and dictation.",
            vec![artifact(
                "ggml-base.en.bin",
                "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
            )],
        ),
        definition(
            "whisper-base-multilingual",
            "Whisper Base",
            "whisper",
            "multilingual",
            "MIT",
            142,
            "Balanced transcription across multiple languages.",
            vec![artifact(
                "ggml-base.bin",
                "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
            )],
        ),
    ]
}

fn model_root() -> Result<PathBuf, String> {
    preferred_app_config_path("transcription-models")
}

fn model_dir(root: &Path, model_id: &str) -> PathBuf {
    root.join(model_id)
}

fn find_model(model_id: &str) -> Result<TranscriptionModelDefinition, String> {
    model_catalog()
        .into_iter()
        .find(|definition| definition.id == model_id)
        .ok_or_else(|| format!("Unknown transcription model: {model_id}"))
}

fn is_model_installed(root: &Path, definition: &TranscriptionModelDefinition) -> bool {
    let dir = model_dir(root, &definition.id);
    definition
        .artifacts
        .iter()
        .all(|artifact| dir.join(&artifact.filename).is_file())
}

fn status_for(root: &Path, definition: TranscriptionModelDefinition) -> TranscriptionModelStatus {
    let dir = model_dir(root, &definition.id);
    let installed = is_model_installed(root, &definition);
    TranscriptionModelStatus {
        definition,
        installed,
        path: installed.then(|| dir.to_string_lossy().into_owned()),
    }
}

pub fn list_transcription_models() -> Result<Vec<TranscriptionModelStatus>, String> {
    let root = model_root()?;
    Ok(model_catalog()
        .into_iter()
        .map(|definition| status_for(&root, definition))
        .collect())
}

pub fn transcription_model_status(model_id: &str) -> Result<TranscriptionModelStatus, String> {
    let root = model_root()?;
    let definition = find_model(model_id)?;
    Ok(status_for(&root, definition))
}

fn copy_response_to_file(url: &str, target: &Path) -> Result<(), String> {
    let mut response = reqwest::blocking::get(url)
        .map_err(|error| format!("Failed to download transcription model artifact: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Failed to download transcription model artifact: {error}"))?;
    let mut file = fs::File::create(target)
        .map_err(|error| format!("Failed to create transcription model artifact: {error}"))?;
    io::copy(&mut response, &mut file)
        .map_err(|error| format!("Failed to save transcription model artifact: {error}"))?;
    Ok(())
}

pub fn download_transcription_model(
    model_id: String,
) -> Result<TranscriptionModelInstallResult, String> {
    let definition = find_model(&model_id)?;
    let root = model_root()?;
    let dir = model_dir(&root, &definition.id);
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Failed to create transcription model directory: {error}"))?;

    for artifact in &definition.artifacts {
        let target = dir.join(&artifact.filename);
        if target.is_file() {
            continue;
        }
        let partial = dir.join(format!("{}.download", artifact.filename));
        if partial.exists() {
            fs::remove_file(&partial).map_err(|error| {
                format!("Failed to clear partial transcription model download: {error}")
            })?;
        }
        copy_response_to_file(&artifact.url, &partial)?;
        fs::rename(&partial, &target)
            .map_err(|error| format!("Failed to install transcription model artifact: {error}"))?;
    }

    Ok(TranscriptionModelInstallResult {
        model: status_for(&root, definition),
    })
}

pub fn delete_transcription_model(
    model_id: String,
) -> Result<TranscriptionModelInstallResult, String> {
    let definition = find_model(&model_id)?;
    let root = model_root()?;
    let dir = model_dir(&root, &definition.id);
    if dir.exists() {
        fs::remove_dir_all(&dir)
            .map_err(|error| format!("Failed to delete transcription model: {error}"))?;
    }

    Ok(TranscriptionModelInstallResult {
        model: status_for(&root, definition),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_catalog_contains_runnable_english_and_multilingual_options() {
        let catalog = model_catalog();
        assert!(catalog
            .iter()
            .any(|model| model.engine == "whisper" && model.language_mode == "english"));
        assert!(catalog
            .iter()
            .any(|model| model.engine == "whisper" && model.language_mode == "multilingual"));
        assert!(catalog.iter().all(|model| model.engine == "whisper"));
    }

    #[test]
    fn model_status_requires_every_artifact() {
        let tmp = tempfile::tempdir().unwrap();
        let definition = find_model("whisper-base-en").unwrap();

        assert!(!is_model_installed(tmp.path(), &definition));

        let dir = model_dir(tmp.path(), &definition.id);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("ggml-base.en.bin"), b"model").unwrap();

        assert!(is_model_installed(tmp.path(), &definition));
    }
}
