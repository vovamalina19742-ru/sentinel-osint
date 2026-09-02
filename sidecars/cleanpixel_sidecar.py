import os
import sys
import json
import subprocess
from typing import Dict, Any, List, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUST_BINARY = os.path.join(BASE_DIR, "cleanpixel")

def strip_jpeg_bytes(data: bytes) -> Tuple[bytes, List[str]]:
    """Lossless byte-stream stripping of JPEG markers (APP1..APP15, COM)."""
    if len(data) < 4 or data[0] != 0xFF or data[1] != 0xD8:
        raise ValueError("Невалидный JPEG заголовок")

    out = bytearray([0xFF, 0xD8])
    stripped = []
    pos = 2

    while pos < len(data):
        if data[pos] != 0xFF:
            pos += 1
            continue
        while pos < len(data) and data[pos] == 0xFF:
            pos += 1
        if pos >= len(data):
            break

        marker = data[pos]
        pos += 1

        if marker == 0xD9: # EOI
            out.extend([0xFF, 0xD9])
            break

        if marker == 0xDA: # SOS
            if pos + 2 > len(data):
                break
            length = (data[pos] << 8) | data[pos + 1]
            out.extend([0xFF, 0xDA])
            out.extend(data[pos : pos + length])
            pos += length

            # Copy entropy-coded pixel stream directly to EOI
            while pos < len(data):
                if data[pos] == 0xFF and pos + 1 < len(data):
                    if data[pos + 1] == 0xD9:
                        out.extend([0xFF, 0xD9])
                        break
                    elif data[pos + 1] == 0x00 or (0xD0 <= data[pos + 1] <= 0xD7):
                        out.extend([0xFF, data[pos + 1]])
                        pos += 2
                        continue
                out.append(data[pos])
                pos += 1
            break

        if (0xD0 <= marker <= 0xD7) or marker == 0x01:
            out.extend([0xFF, marker])
            continue

        if pos + 2 > len(data):
            break
        length = (data[pos] << 8) | data[pos + 1]
        if length < 2 or pos + length > len(data):
            break

        # APP1 (EXIF/XMP), APP2-APP15, COM
        if marker == 0xE1 or (0xE2 <= marker <= 0xEF) or marker == 0xFE:
            label = "APP1-Exif/GPS/GUID" if marker == 0xE1 else "COM (Комментарий)" if marker == 0xFE else f"APP{marker - 0xE0}"
            stripped.append(f"{label}: {length} байт")
            pos += length
        else:
            out.extend([0xFF, marker])
            out.extend(data[pos : pos + length])
            pos += length

    return bytes(out), stripped

def strip_png_bytes(data: bytes) -> Tuple[bytes, List[str]]:
    """Lossless chunk stripping of PNG metadata (tEXt, zTXt, iTXt, eXIf, tIME)."""
    PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
    if len(data) < 8 or not data.startswith(PNG_MAGIC):
        raise ValueError("Невалидный PNG заголовок")

    out = bytearray(PNG_MAGIC)
    stripped = []
    pos = 8

    while pos + 8 <= len(data):
        length = int.from_bytes(data[pos : pos + 4], "big")
        chunk_type = data[pos + 4 : pos + 8]
        total_len = 12 + length

        if pos + total_len > len(data):
            break

        if chunk_type in [b"tEXt", b"zTXt", b"iTXt", b"eXIf", b"tIME", b"dSIG"]:
            name = chunk_type.decode("ascii", errors="ignore")
            stripped.append(f"Чанк {name}: {total_len} байт")
            pos += total_len
        else:
            out.extend(data[pos : pos + total_len])
            pos += total_len
            if chunk_type == b"IEND":
                break

    return bytes(out), stripped

def clean_image(file_path: str, output_path: str = None) -> Dict[str, Any]:
    """Выполняет очистку файла от всех метаданных и GUID без пережатия пикселей."""
    if not os.path.exists(file_path):
        return {
            "file_path": file_path, "format": "unknown", "original_size_bytes": 0,
            "cleaned_size_bytes": 0, "saved_bytes": 0, "saved_percent": 0.0,
            "stripped_items": [], "success": False, "error": f"Файл не найден: {file_path}"
        }

    # 1. Попытка вызова скомпилированного Rust-бинарника
    try:
        target_out = output_path or file_path
        cmd = ["wsl", "-d", "Ubuntu", "bash", "-c", f"'{RUST_BINARY}' '{file_path}' -o '{target_out}' --json"]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if res.returncode == 0 and res.stdout.strip().startswith("{"):
            return json.loads(res.stdout.strip())
    except Exception:
        pass

    # 2. Высокоскоростной нативный фолбэк
    try:
        with open(file_path, "rb") as f:
            raw = f.read()

        orig_len = len(raw)
        if raw.startswith(b"\xFF\xD8"):
            fmt = "JPEG"
            cleaned, stripped = strip_jpeg_bytes(raw)
        elif raw.startswith(b"\x89PNG\r\n\x1a\n"):
            fmt = "PNG"
            cleaned, stripped = strip_png_bytes(raw)
        else:
            return {
                "file_path": file_path, "format": "unsupported", "original_size_bytes": orig_len,
                "cleaned_size_bytes": orig_len, "saved_bytes": 0, "saved_percent": 0.0,
                "stripped_items": [], "success": False, "error": "Формат не поддерживается (требуется JPEG или PNG)"
            }

        target_out = output_path or file_path
        with open(target_out, "wb") as f:
            f.write(cleaned)

        cleaned_len = len(cleaned)
        saved = max(0, orig_len - cleaned_len)
        pct = round((saved / orig_len) * 100, 2) if orig_len > 0 else 0.0

        return {
            "file_path": file_path,
            "format": fmt,
            "original_size_bytes": orig_len,
            "cleaned_size_bytes": cleaned_len,
            "saved_bytes": saved,
            "saved_percent": pct,
            "stripped_items": stripped,
            "success": True,
            "error": None
        }
    except Exception as err:
        return {
            "file_path": file_path, "format": "error", "original_size_bytes": 0,
            "cleaned_size_bytes": 0, "saved_bytes": 0, "saved_percent": 0.0,
            "stripped_items": [], "success": False, "error": str(err)
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        out = clean_image(sys.argv[1])
        print(json.dumps(out, ensure_ascii=False, indent=2))
