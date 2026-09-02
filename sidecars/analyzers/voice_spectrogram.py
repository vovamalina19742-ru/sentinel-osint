import os
import hashlib
import json
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
    digital_silence_ratio: float
    synthetic_threat_score: int
    anomalies: List[str]
    spectrogram_path: Optional[str]
    cached: bool
    error: Optional[str]

class VoiceSpectrumAnalyzer:
    def __init__(self, target_sr: int = 22050, cache_dir: Optional[str] = None):
        self.target_sr = target_sr
        self.cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), ".spec_cache")
        os.makedirs(self.cache_dir, exist_ok=True)

    def _get_audio_hash(self, audio_path: str) -> str:
        """Вычисление быстрого SHA-256 хэша файла для надежного кэширования."""
        hasher = hashlib.sha256()
        with open(audio_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def analyze(self, audio_path: str, output_plot_path: Optional[str] = None) -> VoiceAnalysisReport:
        if not os.path.exists(audio_path):
            return self._err_report(f"Файл не найден: {audio_path}")

        try:
            file_hash = self._get_audio_hash(audio_path)
            cached_json = os.path.join(self.cache_dir, f"{file_hash}.json")
            cached_plot = os.path.join(self.cache_dir, f"{file_hash}_spec.png")

            # Проверка дискового кэша (мгновенный возврат при повторном открытии досье)
            if os.path.exists(cached_json) and os.path.exists(cached_plot):
                try:
                    with open(cached_json, "r", encoding="utf-8") as f:
                        cached_data = json.load(f)
                    cached_data["cached"] = True
                    if output_plot_path and output_plot_path != cached_plot:
                        # При необходимости копируем кэшированный график по запрошенному пути
                        import shutil
                        shutil.copyfile(cached_plot, output_plot_path)
                        cached_data["spectrogram_path"] = output_plot_path
                    else:
                        cached_data["spectrogram_path"] = cached_plot
                    return cached_data
                except Exception:
                    pass

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

            # 4. Анализ пауз, дыхания и абсолютной цифровой тишины (RMS)
            rms = librosa.feature.rms(y=y)[0]
            # Паузы с неестественным абсолютным нулем (< 1e-4)
            digital_silence_frames = np.sum(rms < 1e-4)
            digital_silence_ratio = float(digital_silence_frames / max(len(rms), 1))

            score = 0
            anomalies = []

            if avg_rolloff < 7500.0:
                score += 35
                anomalies.append(f"Аномальный срез ВЧ: {avg_rolloff:.1f} Гц (паттерн легковесного вокодера)")
            if mfcc_var < 1.2:
                score += 30
                anomalies.append("Неестественно заниженная дисперсия формант (монотонность синтеза)")
            if flatness > 0.05:
                score += 20
                anomalies.append("Высокий уровень спектральной равномерности (фоновый шум диффузии)")
            if digital_silence_ratio > 0.25:
                score += 25
                anomalies.append(f"Аномальная цифровая тишина в паузах ({digital_silence_ratio*100:.1f}%): отсутствие естественного дыхания и фоновой акустики")

            # Отрисовка мел-спектрограммы в кэш
            D = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128), ref=np.max)
            plt.figure(figsize=(9, 3.5))
            librosa.display.specshow(D, sr=sr, x_axis='time', y_axis='mel', cmap='inferno')
            plt.colorbar(format='%+2.0f dB')
            plt.title('Sentinel Acoustic Profile — Mel Spectrogram')
            plt.tight_layout()
            plt.savefig(cached_plot, dpi=120)
            plt.close()

            saved_plot = cached_plot
            if output_plot_path and output_plot_path != cached_plot:
                import shutil
                shutil.copyfile(cached_plot, output_plot_path)
                saved_plot = output_plot_path

            report: VoiceAnalysisReport = {
                "sample_rate": sr,
                "duration_sec": round(duration, 2),
                "avg_rolloff_hz": round(avg_rolloff, 2),
                "mfcc_variance": round(mfcc_var, 3),
                "spectral_flatness": round(flatness, 5),
                "digital_silence_ratio": round(digital_silence_ratio, 3),
                "synthetic_threat_score": min(score, 100),
                "anomalies": anomalies,
                "spectrogram_path": saved_plot,
                "cached": False,
                "error": None
            }

            # Сохраняем в кэш
            try:
                with open(cached_json, "w", encoding="utf-8") as f:
                    json.dump(report, f, ensure_ascii=False, indent=2)
            except Exception:
                pass

            return report
        except Exception as err:
            return self._err_report(str(err))

    def _err_report(self, msg: str) -> VoiceAnalysisReport:
        return {
            "sample_rate": 0, "duration_sec": 0.0, "avg_rolloff_hz": 0.0,
            "mfcc_variance": 0.0, "spectral_flatness": 0.0,
            "digital_silence_ratio": 0.0,
            "synthetic_threat_score": 0, "anomalies": [],
            "spectrogram_path": None, "cached": False, "error": msg
        }
