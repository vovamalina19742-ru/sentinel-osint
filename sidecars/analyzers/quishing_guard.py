import numpy as np
import os
import cv2
import requests
import tldextract
from typing import TypedDict, List, Optional
from urllib.parse import urlparse

class QuishingReport(TypedDict):
    found: bool
    payload_type: str
    initial_url: str
    final_url: str
    domain: str
    redirect_chain: List[str]
    risk_score: int
    flags: List[str]
    error: Optional[str]

class QuishingAnalyzer:
    def __init__(self, timeout: int = 5):
        self.detector = cv2.QRCodeDetector()
        self.timeout = timeout
        self.suspicious_tlds = {"xyz", "top", "buzz", "cc", "monster", "cfd", "sbs"}

    def decode_qr(self, image_path: str) -> List[str]:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Файл не найден: {image_path}")
        try:
            with open(image_path, "rb") as f:
                bytes_data = np.frombuffer(f.read(), dtype=np.uint8)
            img = cv2.imdecode(bytes_data, cv2.IMREAD_COLOR)
        except Exception:
            img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Ошибка декодирования растра: {image_path}")
        
        # Попытка множественного обнаружения, fallback на одиночное
        success, decoded_info, _, _ = self.detector.detectAndDecodeMulti(img)
        if success and any(decoded_info):
            return [data for data in decoded_info if data]
        
        data, _, _ = self.detector.detectAndDecode(img)
        return [data] if data else []

    def trace_and_inspect(self, raw_payload: str) -> QuishingReport:
        if not raw_payload:
            return {
                "found": False, "payload_type": "none", "initial_url": "",
                "final_url": "", "domain": "", "redirect_chain": [],
                "risk_score": 0, "flags": [], "error": "Пустая нагрузка"
            }

        parsed_initial = urlparse(raw_payload)
        if parsed_initial.scheme not in ("http", "https"):
            return {
                "found": True, "payload_type": "text", "initial_url": raw_payload,
                "final_url": raw_payload, "domain": "", "redirect_chain": [],
                "risk_score": 0, "flags": ["Не является веб-ссылкой"], "error": None
            }

        session = requests.Session()
        session.headers.update({"User-Agent": "Sentinel-OSINT/2.1 (Quishing-Scanner)"})
        redirect_chain = []
        final_url = raw_payload

        try:
            # HEAD-запросы с ограничением времени
            resp = session.head(raw_payload, allow_redirects=True, timeout=self.timeout)
            if resp.history:
                redirect_chain = [r.url for r in resp.history]
            final_url = resp.url
        except requests.RequestException:
            # Fallback на GET со stream, если сервер блокирует HEAD
            try:
                resp = session.get(raw_payload, allow_redirects=True, timeout=self.timeout, stream=True)
                if resp.history:
                    redirect_chain = [r.url for r in resp.history]
                final_url = resp.url
                resp.close()
            except requests.RequestException:
                pass

        parsed_final = tldextract.extract(final_url)
        root_domain = f"{parsed_final.domain}.{parsed_final.suffix}".strip(".")
        
        # Эвристика компрометации
        score = 0
        flags = []
        if parsed_final.suffix.lower() in self.suspicious_tlds:
            score += 35
            flags.append(f"Подозрительный TLD: .{parsed_final.suffix}")
        if len(redirect_chain) >= 2:
            score += 25
            flags.append(f"Длинная цепочка редиректов ({len(redirect_chain)} перехода)")
        if not parsed_final.suffix and any(char.isdigit() for char in parsed_final.domain):
            score += 40
            flags.append("Прямой IP-адрес хоста вместо доменного имени")
        if "@" in parsed_final.subdomain:
            score += 30
            flags.append("Использование userinfo credentials в URL (@)")

        return {
            "found": True,
            "payload_type": "url",
            "initial_url": raw_payload,
            "final_url": final_url,
            "domain": root_domain,
            "redirect_chain": redirect_chain,
            "risk_score": min(score, 100),
            "flags": flags,
            "error": None
        }

    def analyze_file(self, image_path: str) -> QuishingReport:
        try:
            payloads = self.decode_qr(image_path)
            if not payloads:
                return {
                    "found": False, "payload_type": "none", "initial_url": "",
                    "final_url": "", "domain": "", "redirect_chain": [],
                    "risk_score": 0, "flags": [], "error": None
                }
            return self.trace_and_inspect(payloads[0])
        except Exception as err:
            return {
                "found": False, "payload_type": "error", "initial_url": "",
                "final_url": "", "domain": "", "redirect_chain": [],
                "risk_score": 0, "flags": [], "error": str(err)
            }
