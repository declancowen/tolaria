---
type: ADR
id: "0145"
title: "Embedded Whisper transcription runtime"
status: active
date: 2026-06-27
---

## Context

Tolaria needs local recording transcription for editor transcript blocks and app-wide dictation. The feature must not keep audio recordings on disk: microphone audio is captured for the active session, transcribed locally, then discarded. Only transcript text is saved into Markdown or committed into the focused text target.

The runtime also needs to support model download/delete from Settings so a fresh install can remain small while users opt into local transcription.

## Decision

Add `whisper-rs` to the Tauri backend and use embedded Whisper for the first local transcription runtime.

The renderer captures microphone audio through Web Audio, encodes a 16 kHz mono WAV payload in memory, and sends it to the `transcribe_recorded_audio` Tauri command. The backend decodes the WAV bytes in memory, runs the selected downloaded Whisper model, and returns transcript text. The downloaded model files live in app config under `transcription-models/`; recorded audio is never written to app data or the vault.

## Alternatives considered

- **Embedded Whisper via `whisper-rs`** (chosen): local, free, works offline after model download, and avoids requiring a separate CLI install. Cons: native builds require CMake and the bundled C++ Whisper dependency increases build complexity.
- **External `whisper-cli`**: simpler Rust code, but pushes setup burden onto users and makes dictation depend on a separately installed binary.
- **Parakeet first**: attractive for quality, but would require a separate ONNX/NeMo runtime path before it can be honestly selectable in Tolaria.
- **Remote transcription API**: simplest runtime, but violates the local/private default and introduces API cost/key handling.

## Consequences

The transcription settings UI must only list models supported by the embedded runtime. If Parakeet is added later, a new runtime adapter and ADR should cover its model format, storage, and install/delete semantics.

macOS builds need a microphone usage string and audio-input entitlement. Development machines building the Rust backend need CMake available for `whisper-rs-sys`.
