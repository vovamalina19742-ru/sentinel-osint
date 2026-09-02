import os
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import numpy as np
import soundfile as sf
import qrcode

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sidecars.analyzers.quishing_guard import QuishingAnalyzer
from sidecars.analyzers.voice_spectrogram import VoiceSpectrumAnalyzer

def run_tests():
    print("=== 🔬 Running Upgraded Sentinel-OSINT Sidecar Tests ===")
    
    # 1. Тест Quishing Guard
    qr_path = os.path.join(BASE_DIR, "tests", "test_qr.png")
    img = qrcode.make("https://httpbin.org/redirect/2")
    img.save(qr_path)
    
    qa = QuishingAnalyzer()
    q_res = qa.analyze_file(qr_path)
    print("Quishing Result:", q_res)
    assert q_res["found"] is True, "QR code not detected"
    assert len(q_res["redirect_chain"]) >= 2, f"Expected redirects >= 2, got {len(q_res['redirect_chain'])}"
    print("✅ Quishing Guard (Redirect tracing & TLD heuristics): OK")

    # 2. Тест Voice Spectrum (генерация сэмпла с искусственной тишиной)
    audio_path = os.path.join(BASE_DIR, "tests", "test_synth.wav")
    spec_path = os.path.join(BASE_DIR, "tests", "test_spec.png")
    sr = 22050
    
    # Создаем 1 сек звука + 1 сек абсолютной тишины (паттерн дипфейка без дыхания)
    t = np.linspace(0, 1.0, int(sr * 1.0))
    sound = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    silence = np.zeros(int(sr * 1.0), dtype=np.float32)
    waveform = np.concatenate([sound, silence])
    sf.write(audio_path, waveform, sr)

    va = VoiceSpectrumAnalyzer()
    
    # Первый прогон (полный расчет)
    t0 = time.time()
    v_res = va.analyze(audio_path, output_plot_path=spec_path)
    t_first = time.time() - t0
    print(f"Voice First Run ({t_first:.2f}s):", v_res)
    assert v_res["synthetic_threat_score"] >= 35, "Expected synthetic threat score >= 35"
    assert v_res["digital_silence_ratio"] > 0.25, "Expected digital silence ratio > 0.25"
    assert v_res["spectrogram_path"] is not None, "Spectrogram plot not generated"
    assert v_res["cached"] is False, "First run should not be cached"
    
    # Второй прогон (проверка кэширования SHA-256)
    t1 = time.time()
    v_cached = va.analyze(audio_path, output_plot_path=spec_path)
    t_cached = time.time() - t1
    print(f"Voice Cached Run ({t_cached*1000:.1f}ms): cached={v_cached.get('cached')}")
    assert v_cached["cached"] is True, "Expected cached == True on second run"
    assert t_cached < 0.1, "Cached run should complete in under 100ms"
    
    print("✅ Voice Spectrum Analyzer (Silence/Breathing detection & SHA-256 caching): OK")
    print("🎉 All upgraded sidecar tests PASSED successfully!")

if __name__ == "__main__":
    run_tests()
