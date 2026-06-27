use base64::Engine;
use std::path::PathBuf;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

const WHISPER_SAMPLE_RATE: u32 = 16_000;

pub fn transcribe_recorded_audio(audio_base64: String, model_id: String) -> Result<String, String> {
    let model = crate::transcription_models::transcription_model_status(&model_id)?;
    if !model.installed {
        return Err("Download the selected transcription model before recording.".to_string());
    }
    if model.definition.engine != "whisper" {
        return Err(
            "This transcription model is not available for local recording yet.".to_string(),
        );
    }

    let model_path = whisper_model_artifact(&model)?;
    let audio = decode_audio(audio_base64)?;
    let samples = decode_wav_pcm16_mono(&audio)?;
    transcribe_whisper_samples(&model_path, &model.definition.language_mode, &samples)
}

fn whisper_model_artifact(
    model: &crate::transcription_models::TranscriptionModelStatus,
) -> Result<PathBuf, String> {
    let model_dir = model
        .path
        .as_ref()
        .map(PathBuf::from)
        .ok_or_else(|| "Downloaded transcription model path is missing.".to_string())?;
    let artifact = model
        .definition
        .artifacts
        .first()
        .ok_or_else(|| "Transcription model has no downloadable artifact.".to_string())?;
    Ok(model_dir.join(&artifact.filename))
}

fn decode_audio(audio_base64: String) -> Result<Vec<u8>, String> {
    let payload = audio_base64
        .split_once(',')
        .map(|(_, encoded)| encoded)
        .unwrap_or(audio_base64.as_str());
    base64::engine::general_purpose::STANDARD
        .decode(payload)
        .map_err(|error| format!("Failed to decode recorded audio: {error}"))
}

fn transcribe_whisper_samples(
    model_path: &PathBuf,
    language_mode: &str,
    samples: &[f32],
) -> Result<String, String> {
    whisper_rs::install_logging_hooks();
    let context = WhisperContext::new_with_params(model_path, WhisperContextParameters::default())
        .map_err(|error| format!("Failed to load local transcription model: {error}"))?;
    let mut state = context
        .create_state()
        .map_err(|error| format!("Failed to create local transcription state: {error}"))?;
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_n_threads(default_whisper_thread_count());
    params.set_no_context(true);
    params.set_no_timestamps(true);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    if language_mode == "multilingual" {
        params.set_detect_language(true);
        params.set_language(None);
    } else {
        params.set_language(Some("en"));
    }

    state
        .full(params, samples)
        .map_err(|error| format!("Local transcription failed: {error}"))?;

    let mut transcript = Vec::new();
    for segment in state.as_iter() {
        let text = segment
            .to_str_lossy()
            .map_err(|error| format!("Failed to read transcription segment: {error}"))?;
        transcript.push(text.to_string());
    }
    Ok(normalize_transcript(&transcript.join("\n")))
}

fn default_whisper_thread_count() -> i32 {
    std::thread::available_parallelism()
        .map(|count| count.get().clamp(1, 4) as i32)
        .unwrap_or(4)
}

fn decode_wav_pcm16_mono(bytes: &[u8]) -> Result<Vec<f32>, String> {
    if bytes.len() < 44 {
        return Err("Recorded audio is too short.".to_string());
    }
    if &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("Recorded audio must be a WAV file.".to_string());
    }

    let mut cursor = 12usize;
    let mut format: Option<WavFormat> = None;
    let mut data: Option<&[u8]> = None;
    while cursor + 8 <= bytes.len() {
        let chunk_id = &bytes[cursor..cursor + 4];
        let chunk_len = read_u32_le(bytes, cursor + 4)? as usize;
        let chunk_start = cursor + 8;
        let chunk_end = chunk_start
            .checked_add(chunk_len)
            .filter(|end| *end <= bytes.len())
            .ok_or_else(|| "Recorded audio WAV chunk is truncated.".to_string())?;

        if chunk_id == b"fmt " {
            format = Some(parse_wav_format(&bytes[chunk_start..chunk_end])?);
        } else if chunk_id == b"data" {
            data = Some(&bytes[chunk_start..chunk_end]);
        }

        cursor = chunk_end + (chunk_len % 2);
    }

    let format = format.ok_or_else(|| "Recorded audio WAV format is missing.".to_string())?;
    let data = data.ok_or_else(|| "Recorded audio WAV samples are missing.".to_string())?;
    if format.audio_format != 1 {
        return Err("Recorded audio must use PCM encoding.".to_string());
    }
    if format.channels != 1 {
        return Err("Recorded audio must be mono.".to_string());
    }
    if format.sample_rate != WHISPER_SAMPLE_RATE {
        return Err("Recorded audio must be sampled at 16 kHz.".to_string());
    }
    if format.bits_per_sample != 16 {
        return Err("Recorded audio must use 16-bit samples.".to_string());
    }
    if data.len() % 2 != 0 {
        return Err("Recorded audio sample data is malformed.".to_string());
    }

    let samples = data
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0)
        .collect::<Vec<_>>();
    if samples.is_empty() {
        return Err("No microphone audio was captured.".to_string());
    }
    Ok(samples)
}

#[derive(Debug, PartialEq)]
struct WavFormat {
    audio_format: u16,
    bits_per_sample: u16,
    channels: u16,
    sample_rate: u32,
}

fn parse_wav_format(bytes: &[u8]) -> Result<WavFormat, String> {
    if bytes.len() < 16 {
        return Err("Recorded audio WAV format is truncated.".to_string());
    }
    Ok(WavFormat {
        audio_format: read_u16_le(bytes, 0)?,
        channels: read_u16_le(bytes, 2)?,
        sample_rate: read_u32_le(bytes, 4)?,
        bits_per_sample: read_u16_le(bytes, 14)?,
    })
}

fn read_u16_le(bytes: &[u8], offset: usize) -> Result<u16, String> {
    let end = offset + 2;
    let slice = bytes
        .get(offset..end)
        .ok_or_else(|| "Recorded audio WAV data is truncated.".to_string())?;
    Ok(u16::from_le_bytes([slice[0], slice[1]]))
}

fn read_u32_le(bytes: &[u8], offset: usize) -> Result<u32, String> {
    let end = offset + 4;
    let slice = bytes
        .get(offset..end)
        .ok_or_else(|| "Recorded audio WAV data is truncated.".to_string())?;
    Ok(u32::from_le_bytes([slice[0], slice[1], slice[2], slice[3]]))
}

fn normalize_transcript(text: &str) -> String {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_audio_accepts_data_url_payloads() {
        let decoded = decode_audio("data:audio/wav;base64,aGVsbG8=".to_string()).unwrap();
        assert_eq!(decoded, b"hello");
    }

    #[test]
    fn normalize_transcript_trims_blank_lines() {
        assert_eq!(normalize_transcript("  hello \n\n world  "), "hello\nworld");
    }

    #[test]
    fn decode_wav_pcm16_mono_reads_samples() {
        let wav = wav_bytes(&[0, i16::MAX, i16::MIN]);
        let samples = decode_wav_pcm16_mono(&wav).unwrap();
        assert_eq!(samples.len(), 3);
        assert_eq!(samples[0], 0.0);
        assert!(samples[1] > 0.99);
        assert_eq!(samples[2], -1.0);
    }

    #[test]
    fn decode_wav_pcm16_mono_rejects_non_wav_audio() {
        assert!(decode_wav_pcm16_mono(b"hello").is_err());
    }

    fn wav_bytes(samples: &[i16]) -> Vec<u8> {
        let data_len = samples.len() as u32 * 2;
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + data_len).to_le_bytes());
        bytes.extend_from_slice(b"WAVE");
        bytes.extend_from_slice(b"fmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&WHISPER_SAMPLE_RATE.to_le_bytes());
        bytes.extend_from_slice(&(WHISPER_SAMPLE_RATE * 2).to_le_bytes());
        bytes.extend_from_slice(&2u16.to_le_bytes());
        bytes.extend_from_slice(&16u16.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_len.to_le_bytes());
        for sample in samples {
            bytes.extend_from_slice(&sample.to_le_bytes());
        }
        bytes
    }
}
