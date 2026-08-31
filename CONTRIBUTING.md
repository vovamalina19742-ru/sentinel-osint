# Contributing to Sentinel-OSINT

We are on a mission to make open-source intelligence and anti-scam tooling accessible, private, and automated for everyone.

## Architecture Philosophy
1. **MCP-First:** All third-party tools must interface as a Model Context Protocol (MCP) server or a JSON-compliant sidecar.
2. **Local-First:** No telemetry, no external cloud dependencies, no plain-text credentials.
3. **Rust Core:** Core orchestration, hashing, and database access are strictly written in Rust with robust memory safety.

## How to Add an MCP Tool Connector
1. Place tool configuration under `src-tauri/plugins/<tool_name>/`.
2. Implement the `McpToolDefinition` trait.
3. Define strict JSON schema inputs and outputs.
4. Add integration tests under `tests/`.
