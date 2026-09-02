import { IncidentDossier } from './dossierEngine';

/**
 * Генерирует автономный HTML-документ с поддержкой красивой печати в PDF.
 */
export function generateHtmlReport(dossier: IncidentDossier): string {
  const threatBadgeColor =
    dossier.overall_threat_level === 'Critical'
      ? '#ef4444'
      : dossier.overall_threat_level === 'High'
      ? '#f97316'
      : dossier.overall_threat_level === 'Medium'
      ? '#eab308'
      : '#10b981';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${dossier.case_number} - ${dossier.case_title}</title>
  <style>
    :root {
      --bg: #09090b;
      --card: #18181b;
      --border: #27272a;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --primary: #3b82f6;
    }
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 11pt;
      }
      .no-print { display: none !important; }
      .card { border: 1px solid #ddd !important; background: #fff !important; color: #000 !important; }
      .threat-badge { border: 1px solid #000 !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      margin: 0;
      padding: 30px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .threat-badge {
      background: rgba(239, 68, 68, 0.15);
      color: ${threatBadgeColor};
      border: 1px solid ${threatBadgeColor};
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    h1 { font-size: 22px; margin: 0 0 6px 0; }
    h2 { font-size: 15px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid var(--border); }
    th { color: var(--text-muted); font-weight: 600; }
    .btn {
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    .btn:hover { opacity: 0.9; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
      <button class="btn" onclick="window.print()">🖨️ Распечатать / Сохранить в PDF</button>
    </div>

    <div class="header">
      <div>
        <div style="color: var(--primary); font-weight: 800; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;">
          🛡️ SENTINEL-OSINT v2.2 • CYBER THREAT DOSSIER
        </div>
        <h1>${dossier.case_title}</h1>
        <div style="font-size: 13px; color: var(--text-muted);">
          Номер дела: <span class="mono">${dossier.case_number}</span> • Дата: ${new Date(dossier.created_at).toLocaleString('ru-RU')}
        </div>
      </div>
      <div>
        <span class="badge threat-badge">Угроза: ${dossier.overall_threat_level} (${dossier.threat_score}%)</span>
      </div>
    </div>

    <div class="card">
      <h2>Резюме расследования (Executive Summary)</h2>
      <p style="margin: 0; font-size: 14px;">${dossier.summary}</p>
    </div>

    <!-- MITRE ATT&CK Matrix -->
    <div class="card">
      <h2>Сопоставление с матрицей MITRE ATT&CK®</h2>
      <table>
        <thead>
          <tr>
            <th>ID Техники</th>
            <th>Название техники</th>
            <th>Тактика</th>
            <th>Степень риска</th>
            <th>Доказательство / Улика</th>
          </tr>
        </thead>
        <tbody>
          ${dossier.mitre_techniques.map(t => `
            <tr>
              <td><strong class="mono" style="color: var(--primary);">${t.technique_id}</strong></td>
              <td>${t.name}</td>
              <td>${t.tactic}</td>
              <td><span class="mono">${t.severity.toUpperCase()}</span></td>
              <td>${t.evidence_description}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Timeline of Events -->
    <div class="card">
      <h2>Хронологический таймлайн событий</h2>
      <table>
        <thead>
          <tr>
            <th>Фаза</th>
            <th>Модуль-источник</th>
            <th>Событие расследования</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          ${dossier.timeline.map(e => `
            <tr>
              <td><strong>${e.phase}</strong></td>
              <td>${e.source_module}</td>
              <td>${e.summary}</td>
              <td><span class="mono">${e.severity.toUpperCase()}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Indicators of Compromise -->
    <div class="card">
      <h2>Индикаторы компрометации (IoC)</h2>
      <table>
        <thead>
          <tr>
            <th>Тип</th>
            <th>Значение</th>
            <th>Описание</th>
            <th>Репутация</th>
          </tr>
        </thead>
        <tbody>
          ${dossier.iocs.map(ioc => `
            <tr>
              <td><span class="mono">${ioc.type.toUpperCase()}</span></td>
              <td class="mono" style="word-break: break-all;">${ioc.value}</td>
              <td>${ioc.description}</td>
              <td><strong>${ioc.threat_level}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="text-align: center; color: var(--text-muted); font-size: 11px; margin-top: 30px;">
      Документ сформирован автоматически аналитическим ядром Sentinel-OSINT v2.2. Соответствует стандарту OASIS STIX 2.1 и классификации MITRE ATT&CK.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Генерирует валидный STIX 2.1 Bundle JSON для импорта в SIEM / TIP платформы.
 */
export function generateStixBundle(dossier: IncidentDossier): Record<string, any> {
  const bundleId = `bundle--${dossier.id}`;
  const reportId = `report--${crypto.randomUUID()}`;

  const stixObjects: any[] = [];

  // Report object
  stixObjects.push({
    type: 'report',
    spec_version: '2.1',
    id: reportId,
    created: dossier.created_at,
    modified: dossier.created_at,
    name: dossier.case_title,
    description: dossier.summary,
    published: dossier.created_at,
    object_refs: [],
    labels: ['threat-report', 'incident-dossier', 'osint', 'forensics'],
    confidence: dossier.threat_score,
  });

  // MITRE Attack Patterns
  for (const mitre of dossier.mitre_techniques) {
    const apId = `attack-pattern--${crypto.randomUUID()}`;
    stixObjects.push({
      type: 'attack-pattern',
      spec_version: '2.1',
      id: apId,
      created: dossier.created_at,
      modified: dossier.created_at,
      name: mitre.name,
      external_references: [
        {
          source_name: 'mitre-attack',
          external_id: mitre.technique_id,
          url: `https://attack.mitre.org/techniques/${mitre.technique_id.replace('.', '/')}/`,
        },
      ],
      description: mitre.evidence_description,
    });
    stixObjects[0].object_refs.push(apId);
  }

  // IoC Indicators
  for (const ioc of dossier.iocs) {
    const indId = `indicator--${crypto.randomUUID()}`;
    const pattern =
      ioc.type === 'domain'
        ? `[domain-name:value = '${ioc.value}']`
        : ioc.type === 'url'
        ? `[url:value = '${ioc.value}']`
        : `[artifact:payload_bin = '${ioc.value}']`;

    stixObjects.push({
      type: 'indicator',
      spec_version: '2.1',
      id: indId,
      created: dossier.created_at,
      modified: dossier.created_at,
      name: `IoC: ${ioc.value}`,
      description: ioc.description,
      pattern: pattern,
      pattern_type: 'stix',
      valid_from: dossier.created_at,
    });
    stixObjects[0].object_refs.push(indId);
  }

  return {
    type: 'bundle',
    id: bundleId,
    objects: stixObjects,
  };
}

/**
 * Генерирует Markdown-отчет для документации или задач.
 */
export function generateMarkdownReport(dossier: IncidentDossier): string {
  return `# 🛡️ ${dossier.case_title}
> **Номер дела:** \`${dossier.case_number}\` | **Уровень угрозы:** **${dossier.overall_threat_level} (${dossier.threat_score}%)**  
> **Дата расследования:** ${dossier.created_at}  
> **Платформа:** Sentinel-OSINT v2.2 (DFIR & Threat Intelligence Engine)

---

## 📌 1. Резюме расследования
${dossier.summary}

---

## 🗺️ 2. Матрица техник MITRE ATT&CK®
| Техника ID | Наименование | Тактика | Серьезность | Доказательство |
| :--- | :--- | :--- | :--- | :--- |
${dossier.mitre_techniques.map(t => `| **[${t.technique_id}](https://attack.mitre.org/techniques/${t.technique_id.replace('.', '/')}/)** | ${t.name} | ${t.tactic} | \`${t.severity.toUpperCase()}\` | ${t.evidence_description} |`).join('\n')}

---

## ⏱️ 3. Таймлайн событий
${dossier.timeline.map(e => `* **[${e.phase}]** (\`${e.source_module}\`): ${e.summary}`).join('\n')}

---

## 🎯 4. Индикаторы компрометации (IoC)
${dossier.iocs.map(ioc => `* \`${ioc.type.toUpperCase()}\`: \`${ioc.value}\` — *${ioc.description}* (Угроза: **${ioc.threat_level}**)`).join('\n')}
`;
}
