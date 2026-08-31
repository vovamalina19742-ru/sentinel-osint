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

### 🎯 The 4 Critical Pains Sentinel-OSINT Solves

1. **The Hell of 300+ CLI Scripts *(Pain of Security Engineers & OSINT Analysts)*:**
   * **The Reality:** The world has amazing tools (Sherlock, Maigret, Holehe, SpiderFoot), but each demands its own runtime (Python 3.8/3.11, Go), conflicting libraries, terminal-only execution, and raw text dumps. Analysts waste 15 minutes just juggling multiple command windows.
   * **The Sentinel Fix:** One clean desktop window with a single input. An async Rust core orchestrates tools in the background and consolidates all findings into a structured dossier.

2. **The "Corporate Trap" & Target Leakage *(Pain of Journalists, Lawyers & Private Investigators)*:**
   * **The Reality:** Enterprise suites (Maltego, Palantir, Social Links) cost $1,000–$10,000/year and route every query to corporate cloud servers. If an investigative reporter or investigator probes a sensitive entity, the service logs who is being searched.
   * **The Sentinel Fix:** 100% Free & Open-Source (MIT), operating strictly local-first. Zero cloud telemetry. All findings remain securely inside an offline encrypted SQLite database on your own machine.

3. **Epidemic of Fake Listings & Resale Scams *(Pain of Resellers, Buyers & Small Businesses)*:**
   * **The Reality:** Everyday buyers, equipment resellers, and hiring managers lose money daily to prepayment scams with stolen photos. They don't have the time to manually reverse-search images across multiple engines.
   * **The Sentinel Fix:** Instant "Red Button" pHash DCT-II visual perception: drop a photo and in 2 seconds get an alert: *"Critical: 100% duplicate of archived scam listing, photo is stolen"*.

4. **Native Model Context Protocol (MCP) *(The 2026 AI Agent Revolution)*:**
   * **The Reality:** Anthropic's MCP has become the global standard for connecting tools to LLMs. AI agent developers need turnkey modules so their bots can verify identities and evaluate trust scores autonomously.
   * **The Sentinel Fix:** A standard MCP Server (`mcp-hub/`). Equip Claude Desktop, Cursor, or any local agent with investigative superpower via a single line in `claude_desktop_config.json`.

---

### 🧠 The Paradigm Shift: Why Raw LLMs Fail & Why Sentinel-OSINT Is Their "Hands & Eyes"

Everyone has access to AI today (ChatGPT, Claude, Gemini), but a raw language model is physically incapable of performing ground-truth OSINT on its own:

| Capability | Raw Cloud LLMs (ChatGPT, Gemini) | **Sentinel-OSINT (+ MCP)** |
| :--- | :--- | :--- |
| **Real-World Network Access** | ❌ **"Trapped in a sandbox":** Cannot open raw sockets, bypass Cloudflare/WAFs, or query 120+ live services simultaneously. | ✅ **Async Rust/Tokio Engine:** Dispatches parallel stealth HTTP requests, executes sidecars, and gathers live artifacts. |
| **Pixel-Exact Image Matching** | ❌ **Vision Hallucinations:** Vision models guess similarity "by eye" and frequently invent false matches. | ✅ **Mathematical Certainty (DCT-II):** Computes 64-bit perceptual hashes in Rust at the CPU level: exact Hamming distance, 0 hallucinations. |
| **Cloud Policy Censorship** | ❌ **Blocked by Safety Guardrails:** Cloud APIs reject queries with *"I cannot search for personal data"*. | ✅ **100% Sovereign & Local-First:** Runs locally on your device with Zero-Knowledge encryption and no corporate censorship. |
| **Role in AI Ecosystem** | 💬 **A theorist:** Knows OSINT theory, but cannot interact with live network protocols. | 🦾 **The "Hands & Eyes":** Plugged via MCP into Claude Desktop or Cursor, it gives the LLM direct physical tools to investigate and verify facts. |

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

### 4 ключевые боли, которые решает Sentinel-OSINT:
1. **Ад из 300+ консольных скриптов *(Боль безопасников и OSINT-аналитиков)*:**  
   Вместо десятков терминалов с разными версиями Python и сырым выводом — единое окно с одной строкой поиска. Ядро на Rust (Tauri v2) само опрашивает нужные утилиты и собирает данные в чистое досье.
2. **«Корпоративный капкан» и утечка расследований *(Боль журналистов, юристов и детективных агентств)*:**  
   Вместо облачных сервисов за \$1 000–\$10 000/год, которые видят все ваши поисковые запросы — 100% локальная работа (Zero-Knowledge) с зашифрованной базой SQLite на вашем собственном диске.
3. **Эпидемия скама и кражи фото *(Боль реселлеров, покупателей и бизнеса)*:**  
   Быстрая «красная кнопка» анти-скама: закинули фото товара → нативный алгоритм pHash DCT-II за 2 секунды определяет: *«100% совпадение с архивным скамом, фото украдено»*.
### 🧠 Почему обычный ИИ бессилен и почему Sentinel-OSINT — это его «руки и глаза»:
* **ИИ «заперт в камере»:** У ChatGPT или Gemini нет прямого сетевого доступа: они не могут сами открыть сокет, обойти защиту Cloudflare или параллельно опросить 120 сайтов.
* **ИИ гадает «на глаз»:** При сравнении фото нейросети часто галлюцинируют. Ядро на Rust вычисляет точное перцептивное хеширование **pHash DCT-II** на уровне регистров CPU (64 из 64 бит = 100% клон).
* **Облачная цензура:** Коммерческие ИИ блокируют поиск людей (*«Я не могу искать персональные данные»*). Sentinel-OSINT работает автономно и без цензуры на машине пользователя.
* **Итог:** Sentinel-OSINT не конкурирует с ИИ, а даёт ему физический инструмент. Подключив его по MCP, пользователь получает ассистента, который умеет автономно добывать проверяемые факты из реального мира.

---

## 🗺️ Product Roadmap: From MVP (v1.0) to Pro Intelligence Platform (v2.0+)

| Capability | Shipped in v1.0 (Open-Source MVP) | Planned for v2.0+ (Pro Ecosystem) |
| :--- | :--- | :--- |
| **Visual Interface** | Fast desktop dashboard, live stream radar, Markdown/PDF export. | **Interactive Relationship Graph:** Dynamic visual nodes connecting entities, handles, phones, and websites (Maltego-style). |
| **Visual Anti-Scam** | Local instant pHash DCT-II perceptual match against scam archives. | **Reverse Image Pivoting:** Automated source lookup via Yandex / Google Lens APIs. |
| **Data Sources** | Core Sidecars (Maigret for usernames, Holehe for emails). | **Direct Marketplace Modules:** Crawlers for regional classifieds (999.md, Avito, OLX) with historical price change alerts. |
| **Storage & Security** | Local zero-knowledge SQLite with WAL durability. | **Cross-Device Sync:** End-to-End (E2E) encrypted peer-to-peer sync between desktop and mobile. |
| **AI & Connectivity** | Standard Model Context Protocol (MCP) server for any LLM. | **Telegram Bot Companion:** Forward phone numbers or photos directly from mobile for instant analysis. |

---

## 🇷🇺 Дорожная карта: От MVP v1.0 к коммерческой экосистеме v2.0+

| Направление | Что уже есть в v1.0 (MVP) | Что запланировано в v2.0+ |
| :--- | :--- | :--- |
| **Интерфейс** | Быстрый десктопный UI, радар поиска, экспорт в PDF/Markdown. | **Интерактивный граф связей:** Визуальные ноды и линии между людьми, номерами и сайтами (как в Maltego). |
| **Анализ фото** | Локальный мгновенный pHash DCT-II против дубликатов скамов. | **Реверс-поиск:** Автоматический поиск первоисточника фото через Yandex / Google Lens API. |
| **Источники данных** | Базовые Sidecars (Maigret по никам, Holehe по email). | **Прямые модули маркетплейсов:** Парсинг досок объявлений (999.md, Avito) и мониторинг истории цен. |
| **Хранение** | Автономная шифрованная SQLite с WAL-режимом. | **Синхронизация:** Облачная/P2P E2E-синхронизация между ноутбуком и телефоном. |
| **Интеграция** | Стандартный MCP-сервер для вызова из любого ИИ. | **Telegram-бот:** Мгновенная проверка номера или фото прямо со смартфона на ходу. |

---

## 🤝 Contributing

We welcome contributions from the global intelligence, ethical hacking, and developer communities!
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on developing and submitting new MCP tool plugins.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
