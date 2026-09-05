import {
  QuishingReport,
  VoiceAnalysisReport,
  CleanPixelReport,
  DgaDetectionResult,
  HttpC2AnalysisResult,
  NamedPipeAlert,
} from './tauriBridge';

export interface MitreTechnique {
  technique_id: string; // e.g. "T1566.002"
  name: string;        // e.g. "Spearphishing Link"
  tactic: string;      // e.g. "Initial Access"
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence_description: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  phase: string;
  source_module: 'Quishing Guard' | 'Voice Spectrogram' | 'CleanPixel' | 'Wireless Radar' | 'pHash Matcher' | 'C2 Hunter';
  summary: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface IoCEntry {
  type: 'domain' | 'url' | 'sha256' | 'bssid' | 'email' | 'metadata' | 'pipe';
  value: string;
  description: string;
  threat_level: 'Benign' | 'Suspicious' | 'Malicious';
}

export interface IncidentDossier {
  id: string;
  case_number: string;
  case_title: string;
  created_at: string;
  investigator: string;
  status: 'Draft' | 'Under Investigation' | 'Verified Threat' | 'Closed';
  overall_threat_level: 'Low' | 'Medium' | 'High' | 'Critical';
  threat_score: number; // 0..100
  summary: string;
  mitre_techniques: MitreTechnique[];
  timeline: TimelineEvent[];
  iocs: IoCEntry[];
  evidence: {
    quishing?: QuishingReport | null;
    voice?: VoiceAnalysisReport | null;
    cleanpixel?: CleanPixelReport | null;
    dga?: DgaDetectionResult | null;
    httpC2?: HttpC2AnalysisResult | null;
    namedPipe?: NamedPipeAlert | null;
  };
}

/**
 * Автоматически собирает доказательства со всех модулей форензики,
 * сопоставляет техники MITRE ATT&CK и формирует таймлайн расследования.
 */
export function buildIncidentDossier(
  quishing?: QuishingReport | null,
  voice?: VoiceAnalysisReport | null,
  cleanpixel?: CleanPixelReport | null,
  c2Hunter?: {
    dga?: DgaDetectionResult | null;
    httpC2?: HttpC2AnalysisResult | null;
    namedPipe?: NamedPipeAlert | null;
  },
  customTitle?: string
): IncidentDossier {
  const caseId = crypto.randomUUID();
  const caseNumber = `IR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const mitre: MitreTechnique[] = [];
  const timeline: TimelineEvent[] = [];
  const iocs: IoCEntry[] = [];

  let highestScore = 15;

  // 1. Обработка улик Quishing Guard
  if (quishing && quishing.found) {
    if (quishing.risk_score > highestScore) highestScore = quishing.risk_score;

    mitre.push({
      technique_id: 'T1566.002',
      name: 'Phishing: Spearphishing Link (Quishing)',
      tactic: 'Initial Access',
      severity: quishing.risk_score >= 50 ? 'critical' : 'medium',
      evidence_description: `Обнаружен QR-код с перенаправлением на ${quishing.domain || quishing.final_url}`,
    });

    if (quishing.redirect_chain.length > 1) {
      mitre.push({
        technique_id: 'T1204.001',
        name: 'User Execution: Malicious Link Evasion',
        tactic: 'Execution',
        severity: 'high',
        evidence_description: `Цепочка обфускации из ${quishing.redirect_chain.length} прыжков редиректа.`,
      });
    }

    timeline.push({
      id: `tl-q-1`,
      timestamp: now,
      phase: 'Initial Reconnaissance',
      source_module: 'Quishing Guard',
      summary: `Сканирование QR-кода: выявлен переход ${quishing.initial_url} ➔ ${quishing.final_url}`,
      severity: quishing.risk_score >= 50 ? 'critical' : 'warning',
    });

    if (quishing.domain) {
      iocs.push({
        type: 'domain',
        value: quishing.domain,
        description: 'Целевой хост назначения из QR-кода',
        threat_level: quishing.risk_score >= 50 ? 'Malicious' : 'Suspicious',
      });
    }

    if (quishing.final_url) {
      iocs.push({
        type: 'url',
        value: quishing.final_url,
        description: 'Конечный адрес редирект-маршрута',
        threat_level: quishing.risk_score >= 50 ? 'Malicious' : 'Suspicious',
      });
    }
  }

  // 2. Обработка улик Voice Spectrogram (Дипфейк)
  if (voice) {
    if (voice.synthetic_threat_score > highestScore) highestScore = voice.synthetic_threat_score;

    mitre.push({
      technique_id: 'T1656',
      name: 'Impersonation (Synthetic Voice / Vishing)',
      tactic: 'Social Engineering',
      severity: voice.synthetic_threat_score >= 60 ? 'critical' : 'medium',
      evidence_description: `Спектральный анализ аудио показал ${voice.synthetic_threat_score}% вероятность нейросетевого синтеза (Rolloff: ${voice.avg_rolloff_hz} Гц, MFCC var: ${voice.mfcc_variance})`,
    });

    timeline.push({
      id: `tl-v-1`,
      timestamp: now,
      phase: 'Acoustic Verification',
      source_module: 'Voice Spectrogram',
      summary: `Акустический анализ: выявлены признаки нейросетевого синтезатора речи (${voice.duration_sec} сек, срез ${voice.avg_rolloff_hz} Гц)`,
      severity: voice.synthetic_threat_score >= 60 ? 'critical' : 'warning',
    });

    if (voice.anomalies && voice.anomalies.length > 0) {
      iocs.push({
        type: 'metadata',
        value: `HiFi-GAN / TTS Spectral Cutoff @ ${voice.avg_rolloff_hz} Hz`,
        description: 'Акустический биометрический признак сгенерированного вокодера',
        threat_level: voice.synthetic_threat_score >= 60 ? 'Malicious' : 'Suspicious',
      });
    }
  }

  // 3. Обработка улик CleanPixel (EXIF / GUID)
  if (cleanpixel && cleanpixel.success) {
    mitre.push({
      technique_id: 'T1036',
      name: 'Masquerading: Forensic Metadata & GUID Removal',
      tactic: 'Defense Evasion',
      severity: 'low',
      evidence_description: `Удалены цифровые следы устройства, GPS-координаты и Google XMP GUID (${cleanpixel.stripped_items.length} блоков).`,
    });

    timeline.push({
      id: `tl-c-1`,
      timestamp: now,
      phase: 'Data Sanitization',
      source_module: 'CleanPixel',
      summary: `Байтовая очистка файла: удалено ${cleanpixel.saved_bytes} байт метаданных без потери качества растра.`,
      severity: 'info',
    });

    for (const item of cleanpixel.stripped_items) {
      if (item.includes('GPS')) {
        iocs.push({
          type: 'metadata',
          value: item,
          description: 'Извлеченные геолокационные метаданные камеры',
          threat_level: 'Suspicious',
        });
      }
    }
  }

  // 4. Обработка улик DFIR C2 Hunter (DGA, HTTP C2, Named Pipes)
  if (c2Hunter?.dga && c2Hunter.dga.is_dga_suspected) {
    if (85 > highestScore) highestScore = 85;
    mitre.push({
      technique_id: 'T1568.002',
      name: 'Dynamic Resolution: Domain Generation Algorithms (DGA)',
      tactic: 'Command and Control',
      severity: 'high',
      evidence_description: `Обнаружен DGA домен «${c2Hunter.dga.domain}» с аномальной энтропией ${c2Hunter.dga.entropy.toFixed(2)}.`,
    });
    timeline.push({
      id: 'tl-c2-dga',
      timestamp: now,
      phase: 'C2 Beacon Detection',
      source_module: 'C2 Hunter',
      summary: `DNS аудит: домен ${c2Hunter.dga.domain} определен как DGA алгоритм связи с C&C сервером.`,
      severity: 'critical',
    });
    iocs.push({
      type: 'domain',
      value: c2Hunter.dga.domain,
      description: `DGA домен (энтропия Шеннона: ${c2Hunter.dga.entropy.toFixed(2)})`,
      threat_level: 'Malicious',
    });
  }

  if (c2Hunter?.httpC2 && c2Hunter.httpC2.is_c2_suspected) {
    if (80 > highestScore) highestScore = 80;
    mitre.push({
      technique_id: 'T1071.001',
      name: 'Application Layer Protocol: Web Protocols (C2 Channel)',
      tactic: 'Command and Control',
      severity: 'high',
      evidence_description: `Выявлены высокоэнтропийные HTTP метаданные C2 канала на URI «${c2Hunter.httpC2.url}».`,
    });
    timeline.push({
      id: 'tl-c2-http',
      timestamp: now,
      phase: 'Traffic Anomaly Analysis',
      source_module: 'C2 Hunter',
      summary: `HTTP C2 аудит: зафиксирован обфусцированный сетевой трафик на ${c2Hunter.httpC2.url}`,
      severity: 'warning',
    });
    iocs.push({
      type: 'url',
      value: c2Hunter.httpC2.url,
      description: `Подозрительный URI C2 маяка (энтропия: ${c2Hunter.httpC2.url_entropy.toFixed(2)})`,
      threat_level: 'Suspicious',
    });
  }

  if (c2Hunter?.namedPipe && !c2Hunter.namedPipe.is_whitelisted) {
    const isCritical = c2Hunter.namedPipe.severity === 'critical';
    if (isCritical && 95 > highestScore) highestScore = 95;
    mitre.push({
      technique_id: 'T1570',
      name: 'Lateral Movement: Lateral Tool Transfer (C2 Named Pipe)',
      tactic: 'Lateral Movement',
      severity: isCritical ? 'critical' : 'high',
      evidence_description: `${c2Hunter.namedPipe.description}: канал ${c2Hunter.namedPipe.pipe_name}`,
    });
    timeline.push({
      id: 'tl-c2-pipe',
      timestamp: now,
      phase: 'Host IPC Forensics',
      source_module: 'C2 Hunter',
      summary: `Аудит Named Pipes: обнаружен ${c2Hunter.namedPipe.pipe_name} (${c2Hunter.namedPipe.description})`,
      severity: isCritical ? 'critical' : 'warning',
    });
    iocs.push({
      type: 'pipe',
      value: c2Hunter.namedPipe.pipe_name,
      description: c2Hunter.namedPipe.description,
      threat_level: isCritical ? 'Malicious' : 'Suspicious',
    });
  }

  // Определение общего уровня угрозы
  const overallThreatLevel =
    highestScore >= 70 ? 'Critical' : highestScore >= 45 ? 'High' : highestScore >= 20 ? 'Medium' : 'Low';

  const title =
    customTitle ||
    (c2Hunter?.namedPipe?.is_known_c2
      ? `Расследование инцидента: обнаружен активный C2 канал ${c2Hunter.namedPipe.pipe_name}`
      : quishing?.domain
      ? `Расследование инцидента: фишинговая кампания через домен ${quishing.domain}`
      : voice
      ? `Аудит подлинности голосовой записи (Синтез: ${voice.synthetic_threat_score}%)`
      : `Комплексное криминалистическое досье ${caseNumber}`);

  return {
    id: caseId,
    case_number: caseNumber,
    case_title: title,
    created_at: now,
    investigator: 'Sentinel AI Cyber Analyst (Autonomous)',
    status: highestScore >= 50 ? 'Verified Threat' : 'Under Investigation',
    overall_threat_level: overallThreatLevel,
    threat_score: highestScore,
    summary: `Настоящее криминалистическое досье сформировано модулями платформы Sentinel-OSINT v2.2. Зафиксировано ${mitre.length} привязок к матрице MITRE ATT&CK, ${timeline.length} хронологических событий и ${iocs.length} индикаторов компрометации (IoC).`,
    mitre_techniques: mitre,
    timeline: timeline,
    iocs: iocs,
    evidence: {
      quishing: quishing || null,
      voice: voice || null,
      cleanpixel: cleanpixel || null,
      dga: c2Hunter?.dga || null,
      httpC2: c2Hunter?.httpC2 || null,
      namedPipe: c2Hunter?.namedPipe || null,
    },
  };
}
