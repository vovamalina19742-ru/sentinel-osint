# 🔌 Sentinel-OSINT MCP Server (Model Context Protocol)

Интеграция ядра Sentinel-OSINT в любой совместимый ИИ-клиент (Claude Desktop, Cursor, Antigravity, OpenBot).

## 🚀 Возможности MCP-инструментов:
* `sentinel_check_target`: предварительная валидация цели (email, phone, username);
* `sentinel_compare_images`: перцептивное хеширование pHash DCT-II для обнаружения скам-дубликатов;
* `sentinel_investigate`: запуск глубокого OSINT-конвейера (Maigret / Holehe) со сбором досье и Trust Score.

## ⚙️ Настройка в Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "sentinel-osint": {
      "command": "python",
      "args": ["d:/Создание программ/sentinel-osint/mcp-hub/server.py"]
    }
  }
}
```

## ⚙️ Настройка в Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "sentinel-osint": {
      "command": "python",
      "args": ["d:/Создание программ/sentinel-osint/mcp-hub/server.py"]
    }
  }
}
```
