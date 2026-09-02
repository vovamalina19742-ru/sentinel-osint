import os
import numpy as np
import librosa
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import TypedDict, List, Optional

class VoiceAnalysisReport(TypedDict):
    sample_rate: int
    duration_sec: float
    avg_rolloff_hz: float
    mfcc_variance: float
    spectral_flatness: float
    synthetic_threat_score: int
    anomalies: List[str]
    spectrogram_path: Optional[str]
    error: Optional[str]

class VoiceSpectrumAnalyzer:
    def __init__(self, target_sr: int = 22050):
        self.target_sr = target_sr

    def analyze(self, audio_path: str, output_plot_path: Optional[str] = None) -> VoiceAnalysisReport:
        if not os.path.exists(audio_path):
            return self._err_report(f"Файл не найден: {audio_path}")

        try:
            # Загрузка и ресэмплинг в моно
            y, sr = librosa.load(audio_path, sr=self.target_sr, mono=True)
            duration = float(librosa.get_duration(y=y, sr=sr))
            
            if duration < 0.3:
                return self._err_report("Слишком короткий аудиофайл для частотного анализа")

            # 1. Частотный спад (Spectral Rolloff 95%)
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.95)[0]
            avg_rolloff = float(np.mean(rolloff))

            # 2. Дельта MFCC (микромодуляция формант)
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            delta_mfcc = librosa.feature.delta(mfcc)
            mfcc_var = float(np.mean(np.var(delta_mfcc, axis=1)))

            # 3. Spectral Flatness (структура гребенчатого шума)
            flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))

            score = 0
            anomalies = []

            if avg_rolloff < 7500.0:
                score += 35
                anomalies.append(f"Аномальный срез ВЧ: {avg_rolloff:.1f} Гц (паттерн легковесного вокодера)")
            if mfcc_var < 1.2:
                score += 35
                anomalies.append("Неестественно заниженная дисперсия формант (монотонность синтеза)")
            if flatness > 0.05:
                score += 20
                anomalies.append("Высокий уровень спектральной равномерности (фоновый шум диффузии)")

            # Отрисовка мел-спектрограммы
            saved_plot = None
            if output_plot_path:
                D = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128), ref=np.max)
                plt.figure(figsize=(9, 3.5))
                librosa.display.specshow(D, sr=sr, x_axis='time', y_axis='mel', cmap='inferno')
                plt.colorbar(format='%+2.0f dB')
                plt.title('Sentinel Acoustic Profile — Mel Spectrogram')
                plt.tight_layout()
                plt.savefig(output_plot_path, dpi=120)
                plt.close()
                saved_plot = output_plot_path

            return {
                "sample_rate": sr,
                "duration_sec": round(duration, 2),
                "avg_rolloff_hz": round(avg_rolloff, 2),
                "mfcc_variance": round(mfcc_var, 3),
                "spectral_flatness": round(flatness, 5),
                "synthetic_threat_score": min(score, 100),
                "anomalies": anomalies,
                "spectrogram_path": saved_plot,
                "error": None
            }
        except Exception as err:
            return self._err_report(str(err))

    def _err_report(self, msg: str) -> VoiceAnalysisReport:
        return {
            "sample_rate": 0, "duration_sec": 0.0, "avg_rolloff_hz": 0.0,
            "mfcc_variance": 0.0, "spectral_flatness": 0.0,
            "synthetic_threat_score": 0, "anomalies": [],
            "spectrogram_path": None, "error": msg
        }
