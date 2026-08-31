# 🛡️ Sentinel-OSINT: The Unified AI-Native Intelligence & Anti-Scam Platform

<div align="center">

> **Stop wrestling with 350+ fragmented scripts.** One unified AI-driven desktop hub that turns any lead (phone, username, email, photo) into an actionable, verified intelligence dossier in under 30 seconds.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2_(Rust)-orange.svg?style=flat-square)](https://v2.tauri.app)
[![Protocol: MCP](https://img.shields.io/badge/Protocol-MCP_(Model_Context_Protocol)-purple.svg?style=flat-square)](https://modelcontextprotocol.io)
[![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25_Local_First-brightgreen.svg?style=flat-square)](#-privacy--zero-knowledge-security)
[![Cross-Platform](https://img.shields.io/badge/Platform-Windows_%7C_Linux_%7C_macOS-darkblue.svg?style=flat-square)](#-quick-start)

**[English](#-overview) · [Русская версия](#-обзор-проекта-на-русском)**

</div>

---

## 🚀 The Global Problem & Our Mission

| The Enterprise Trap (Maltego, Palantir) | The Open-Source Zoo (350+ GitHub Scripts) | **The Sentinel-OSINT Solution** |
| :--- | :--- | :--- |
| Costs **$2,000 to $50,000 / year** per analyst. | Free, but heavily fragmented and unmaintained. | **100% Free & Open-Source (MIT).** |
| Closed source, heavy corporate lock-in. | Requires manual terminal commands and dependency hell. | **One-Input GUI:** Enter target → AI runs the pipeline. |
| Cloud-dependent: your investigation targets leak. | Raw outputs full of noise and false positives (35% error rate). | **AI De-noising & Trust Scoring (0–100%).** |
| Rigid, monolithic data models. | No interoperability between tools. | **Model Context Protocol (MCP):** plug-and-play 300+ tools. |

---

## ⚡ Key Features

1. **🎯 One-Input Autonomous Pipeline:**
   * Enter a single piece of evidence: phone number, social handle, email address, marketplace link, or photo.
   * Autonomous AI Agent identifies the entity, executes multi-step pivoting, filters false positives, and builds the profile.
2. **🔌 Universal MCP Plugin Architecture:**
   * Built on the open **Model Context Protocol (MCP)**. Any tool (`Maigret`, `Holehe`, `ExifTool`, `Nmap`, `pHash`) connects as an isolated, sandboxed module without rewriting core code.
3. **🖼️ Anti-Scam Visual Perception (pHash DCT-II):**
   * Built-in native Rust perceptual hashing engine instantly identifies re-uploaded photos from known scammers, catalog rips, and stock imagery.
4. **📊 Verified Trust Scoring (0–100%):**
   * Eliminates the #1 pain in OSINT (data hallucination and false leads) by cross-verifying discoveries across multiple independent sources before including them in the final dossier.
5. **🛡️ 100% Local-First & Zero-Knowledge:**
   * All investigation artifacts, graph nodes, and cached profiles remain strictly inside an encrypted local SQLite database on your machine. Zero cloud telemetry.

---

## 🏗️ Architecture

```
                       ┌───────────────────────────────────────────────┐
                       │   Desktop UI: Tauri v2 + React/TypeScript    │
                       │   (Ultra-lightweight, ~50MB RAM footprint)   │
                       └───────────────────────┬───────────────────────┘
                                               │ IPC (Strict AppError)
                                               ▼
                       ┌───────────────────────────────────────────────┐
                       │          Rust Investigation Core              │
                       │      (Async Tokio, Sandboxed Process)         │
                       └───────────────────────┬───────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
        ┌───────────────────────────────┐             ┌───────────────────────────────┐
        │       AI Agent Orchestrator   │             │       Native Rust Engines     │
        │    (LangGraph State Machine)  │             │   • pHash DCT-II Image Match  │
        │    • Entity Classification    │             │   • SQLCipher Local Storage   │
        │    • Trust Score Aggregator   │             │   • Guardrails & Sandboxing   │
        └───────────────┬───────────────┘             └───────────────────────────────┘
                        │
                        ▼ Model Context Protocol (MCP)
        ┌─────────────────────────────────────────────────────────────┐
        │                    Modular Tool Connectors                  │
        │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │
        │   │   Maigret   │   │   Holehe    │   │ Market Scrapers │   │
        │   │ (Usernames) │   │  (Emails)   │   │ (Phone & Ads)   │   │
        │   └─────────────┘   └─────────────┘   └─────────────────┘   │
        └─────────────────────────────────────────────────────────────┘
```

---

## 📦 Quick Start

### 1. Desktop Application
```bash
# Clone & install dependencies
git clone https://github.com/vovamalina19742-ru/sentinel-osint.git
cd sentinel-osint
npm install

# Run web / desktop development
npm run dev
npm run tauri dev

# Build standalone release binaries (.deb / .AppImage / .msi / .exe)
npm run tauri build
```

### 2. Model Context Protocol (MCP) Server for LLM Assistants
Connect Sentinel-OSINT directly to **Claude Desktop**, **Cursor**, or any local LLM agent:

```json
// Add to claude_desktop_config.json or .cursor/mcp.json:
{
  "mcpServers": {
    "sentinel-osint": {
      "command": "python",
      "args": ["<path-to-sentinel-osint>/mcp-hub/server.py"]
    }
  }
}
```

---

## 🇷🇺 Обзор проекта на русском

**Sentinel-OSINT** — это открытый десктопный ИИ-комбайн для OSINT-разведки, проверки контрагентов и защиты от мошенников.

* **Проблема:** Существующие инструменты либо стоят баснословных денег ($2 000–$50 000 в год), либо представляют собой зоопарк из 350+ разрозненных скриптов, в которых тонут 99% пользователей.
* **Решение:** Пользователь вводит одну зацепку (номер телефона, логин, email или фото) → автономный ИИ-агент сам опрашивает нужные утилиты по открытому протоколу **MCP**, отсеивает шум и выдает **готовое структурированное досье с рейтингом благонадежности (Trust Score)** за 30 секунд.
* **Приватность:** 100% локальная работа на вашем компьютере. Никакие данные расследований не передаются третьим лицам.

---

## 🤝 Contributing

We welcome contributions from the global intelligence, ethical hacking, and developer communities!
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on developing and submitting new MCP tool plugins.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
