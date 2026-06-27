# 0146. Hidden Managed Vault Guidance

## Status

Accepted

## Context

Tolaria previously managed vault AI guidance at the vault root through `AGENTS.md`, `CLAUDE.md`, and optional `GEMINI.md`. That made the guidance easy for generic agent tools to discover, but it also exposed Tolaria-managed system files as ordinary vault content in the folder browser and note surfaces.

Tolaria now owns the MCP runtime and the app-managed agent prompts, so it can route those integrations to an app-defined guidance location instead of relying on root-file discovery.

## Decision

Tolaria stores managed vault guidance under `.laputa/agents/`:

- `.laputa/agents/AGENTS.md` is the canonical shared guidance file.
- `.laputa/agents/CLAUDE.md` is the Claude Code compatibility shim.
- `.laputa/agents/GEMINI.md` is the optional Gemini CLI compatibility shim.

The vault scanner treats `.laputa/` as a hidden system folder, so these files do not appear as normal notes or folders. Restore and repair commands check the hidden location and write restored files there. Legacy root `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `config/agents.md` are migration inputs, not the ongoing source of truth.

Tolaria's MCP server reads `.laputa/agents/AGENTS.md` when building vault context. Generic third-party tools that only discover root `AGENTS.md` do not read the hidden file unless they use Tolaria's MCP/config path.

## Consequences

- The root vault view stays clean of Tolaria-managed system files.
- Restore warnings represent the hidden managed guidance state, not the presence of legacy root files.
- Existing vaults can be hard-migrated by moving safe legacy guidance files into `.laputa/agents/`.
- Project-level user-authored `AGENTS.md` files in normal folders remain visible vault documents.
