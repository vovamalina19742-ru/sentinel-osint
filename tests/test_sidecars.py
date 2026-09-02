import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import os
import sys
import numpy as np
import soundfile as sf
import qrcode

# Add base project path to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sidecars.analyzers.quishing_guard import QuishingAnalyzer
from sidecars.analyzers.voice_spectrogram import VoiceSpectrumAnalyzer

def run_tests():
    print("=== 🔬 Running Sentinel-OSINT Sidecar Tests ===")
    
    # 1. Тест Quishing Guard
    qr_path = os.path.join(BASE_DIR, "tests", "test_qr.png")
    img = qrcode.make("https://httpbin.org/redirect/2")
    img.save(qr_path)
    
    qa = QuishingAnalyzer()
    q_res = qa.analyze_file(qr_path)
    print("Quishing Result:", q_res)
    assert q_res["found"] is True, "QR code not detected"
    assert len(q_res["redirect_chain"]) >= 2, f"Expected redirects >= 2, got {len(q_res['redirect_chain'])}"
    print("✅ Quishing Guard: OK")

    # 2. Тест Voice Spectrum (генерация синусоиды 440 Гц со срезом)
    audio_path = os.path.join(BASE_DIR, "tests", "test_synth.wav")
    spec_path = os.path.join(BASE_DIR, "tests", "test_spec.png")
    sr = 22050
    t = np.linspace(0, 2.0, int(sr * 2.0))
    waveform = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    sf.write(audio_path, waveform, sr)

    va = VoiceSpectrumAnalyzer()
    v_res = va.analyze(audio_path, output_plot_path=spec_path)
    print("Voice Result:", v_res)
    assert v_res["synthetic_threat_score"] >= 35, "Expected synthetic threat score >= 35"
    assert v_res["spectrogram_path"] is not None, "Spectrogram plot not generated"
    assert os.path.exists(spec_path), "Spectrogram PNG file not saved on disk"
    print("✅ Voice Spectrum Analyzer: OK")
    print("🎉 All sidecar tests PASSED successfully!")

if __name__ == "__main__":
    run_tests()
