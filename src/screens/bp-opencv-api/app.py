import base64
import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

load_dotenv()

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

DIGIT_PATTERNS = {
    (1, 1, 1, 0, 1, 1, 1): 0,
    (0, 0, 1, 0, 0, 1, 0): 1,
    (1, 0, 1, 1, 1, 0, 1): 2,
    (1, 0, 1, 1, 0, 1, 1): 3,
    (0, 1, 1, 1, 0, 1, 0): 4,
    (1, 1, 0, 1, 0, 1, 1): 5,
    (1, 1, 0, 1, 1, 1, 1): 6,
    (1, 0, 1, 0, 0, 1, 0): 7,
    (1, 1, 1, 1, 1, 1, 1): 8,
    (1, 1, 1, 1, 0, 1, 1): 9,
}


def decode_base64_image(image_base64):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_base64)
    image_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("No se pudo decodificar la imagen.")

    return image


def resize_image(image, target_width=900):
    height, width = image.shape[:2]

    if width == target_width:
        return image

    scale = target_width / float(width)
    new_height = int(height * scale)

    return cv2.resize(image, (target_width, new_height))


def preprocess_binary(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        31,
        7,
    )

    binary = cv2.medianBlur(binary, 3)
    return binary


def trim_binary(binary, pad=2):
    points = cv2.findNonZero(binary)

    if points is None:
        return binary

    x, y, w, h = cv2.boundingRect(points)

    x = max(0, x - pad)
    y = max(0, y - pad)
    w = min(binary.shape[1] - x, w + pad * 2)
    h = min(binary.shape[0] - y, h + pad * 2)

    return binary[y : y + h, x : x + w]


def recognize_digit(binary_roi):
    roi = trim_binary(binary_roi, 2)

    if roi.size == 0:
        return None

    h, w = roi.shape[:2]

    if h < 20 or w < 5:
        return None

    roi = cv2.resize(roi, (70, 120), interpolation=cv2.INTER_NEAREST)

    h, w = roi.shape[:2]

    segments = [
        ((int(w * 0.20), 0), (int(w * 0.80), int(h * 0.18))),  # superior
        ((0, int(h * 0.12)), (int(w * 0.35), int(h * 0.50))),  # sup izq
        ((int(w * 0.62), int(h * 0.12)), (w, int(h * 0.50))),  # sup der
        ((int(w * 0.20), int(h * 0.40)), (int(w * 0.80), int(h * 0.60))),  # centro
        ((0, int(h * 0.50)), (int(w * 0.35), int(h * 0.88))),  # inf izq
        ((int(w * 0.62), int(h * 0.50)), (w, int(h * 0.88))),  # inf der
        ((int(w * 0.20), int(h * 0.82)), (int(w * 0.80), h)),  # inferior
    ]

    active_segments = []

    for (x1, y1), (x2, y2) in segments:
        segment = roi[y1:y2, x1:x2]
        total_pixels = segment.size
        active_pixels = cv2.countNonZero(segment)

        ratio = active_pixels / float(total_pixels) if total_pixels else 0
        active_segments.append(1 if ratio > 0.18 else 0)

    pattern = tuple(active_segments)

    if pattern in DIGIT_PATTERNS:
        return DIGIT_PATTERNS[pattern]

    best_digit = None
    best_distance = 10

    for known_pattern, digit in DIGIT_PATTERNS.items():
        distance = sum(abs(a - b) for a, b in zip(pattern, known_pattern))

        if distance < best_distance:
            best_distance = distance
            best_digit = digit

    if best_distance <= 1:
        return best_digit

    return None


def group_digits_into_rows(digits):
    digits = sorted(digits, key=lambda d: d["y"] + d["h"] / 2)
    rows = []

    for digit in digits:
        cy = digit["y"] + digit["h"] / 2
        placed = False

        for row in rows:
            row_cy = row["cy"]
            row_h = row["h"]

            if abs(cy - row_cy) < max(digit["h"], row_h) * 0.48:
                row["digits"].append(digit)
                row["cy"] = np.mean([d["y"] + d["h"] / 2 for d in row["digits"]])
                row["h"] = max(d["h"] for d in row["digits"])
                placed = True
                break

        if not placed:
            rows.append(
                {
                    "cy": cy,
                    "h": digit["h"],
                    "digits": [digit],
                }
            )

    numbers = []

    for row in rows:
        row_digits = row["digits"]

        if not row_digits:
            continue

        max_height = max(d["h"] for d in row_digits)

        row_digits = [
            d for d in row_digits if d["h"] >= max_height * 0.55
        ]

        if len(row_digits) > 3:
            row_digits = sorted(
                row_digits,
                key=lambda d: d["w"] * d["h"],
                reverse=True,
            )[:3]

        row_digits = sorted(row_digits, key=lambda d: d["x"])

        if 1 <= len(row_digits) <= 3:
            value = int("".join(str(d["digit"]) for d in row_digits))

            avg_height = float(np.mean([d["h"] for d in row_digits]))
            avg_x = float(np.mean([d["x"] + d["w"] / 2 for d in row_digits]))
            area = int(sum(d["w"] * d["h"] for d in row_digits))

            numbers.append(
                {
                    "value": value,
                    "cy": float(np.mean([d["y"] + d["h"] / 2 for d in row_digits])),
                    "cx": avg_x,
                    "avg_height": avg_height,
                    "area": area,
                    "count": len(row_digits),
                    "digits": row_digits,
                }
            )

    numbers = sorted(numbers, key=lambda n: n["cy"])
    return numbers


def detect_numbers_in_crop(crop):
    crop = resize_image(crop, 900)
    binary = preprocess_binary(crop)

    h, w = binary.shape[:2]

    kernel_w = max(7, int(w * 0.018))
    kernel_h = max(7, int(h * 0.018))

    if kernel_w % 2 == 0:
        kernel_w += 1

    if kernel_h % 2 == 0:
        kernel_h += 1

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_w, kernel_h))

    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, _ = cv2.findContours(
        closed,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    digits = []

    for contour in contours:
        x, y, digit_w, digit_h = cv2.boundingRect(contour)

        aspect_ratio = digit_w / float(digit_h)

        if digit_h < h * 0.08:
            continue

        if digit_h > h * 0.35:
            continue

        if digit_w < w * 0.015:
            continue

        if digit_w > w * 0.28:
            continue

        if aspect_ratio < 0.06 or aspect_ratio > 0.9:
            continue

        pad = int(max(digit_w, digit_h) * 0.08)

        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(w, x + digit_w + pad)
        y2 = min(h, y + digit_h + pad)

        roi = binary[y1:y2, x1:x2]

        if aspect_ratio < 0.28:
            digit = 1
        else:
            digit = recognize_digit(roi)

        if digit is None:
            continue

        digits.append(
            {
                "x": int(x1),
                "y": int(y1),
                "w": int(x2 - x1),
                "h": int(y2 - y1),
                "digit": int(digit),
            }
        )

    return group_digits_into_rows(digits)


def crop_candidates(image):
    h, w = image.shape[:2]
    candidates = []

    candidates.append(("imagen_completa", image))

    candidates.append(
        (
            "lado_izquierdo_display",
            image[int(h * 0.00) : int(h * 1.00), int(w * 0.00) : int(w * 0.78)],
        )
    )

    candidates.append(
        (
            "zona_central_numeros",
            image[int(h * 0.02) : int(h * 0.98), int(w * 0.12) : int(w * 0.82)],
        )
    )

    candidates.append(
        (
            "solo_numeros_probable",
            image[int(h * 0.02) : int(h * 0.98), int(w * 0.18) : int(w * 0.74)],
        )
    )

    candidates.append(
        (
            "pantalla_lcd_probable",
            image[int(h * 0.10) : int(h * 0.88), int(w * 0.05) : int(w * 0.72)],
        )
    )

    valid_candidates = []

    for name, crop in candidates:
        if crop is not None and crop.size > 0:
            valid_candidates.append((name, crop))

    return valid_candidates


def is_valid_pressure_triplet(systolic, diastolic, pulse):
    if not (60 <= systolic <= 300):
        return False

    if not (40 <= diastolic <= 200):
        return False

    if not (30 <= pulse <= 250):
        return False

    if diastolic >= systolic:
        return False

    return True
def es_valor_rol_valido(valor, rol):
    if rol == "sistolica":
        return 60 <= valor <= 300

    if rol == "diastolica":
        return 40 <= valor <= 200

    if rol == "pulso":
        return 30 <= valor <= 250

    return False


def generar_candidatos_para_rol(valor_original, rol):
    """
    Genera posibles correcciones para números leídos mal.
    Ejemplos reales:
    17 puede ser 77
    741 puede contener 74
    371 puede contener 71
    """
    candidatos = []

    if es_valor_rol_valido(valor_original, rol):
        candidatos.append(
            {
                "valor": valor_original,
                "metodo": "exacto",
                "puntaje": 100,
            }
        )

    texto = str(valor_original)

    if rol in ["diastolica", "pulso"]:
        if 10 <= valor_original <= 19:
            corregido = 70 + (valor_original % 10)

            if es_valor_rol_valido(corregido, rol):
                candidatos.append(
                    {
                        "valor": corregido,
                        "metodo": "posible_7_confundido_con_1",
                        "puntaje": 80,
                    }
                )

    if len(texto) == 3 and valor_original > 250:
        primeros_dos = int(texto[:2])
        ultimos_dos = int(texto[1:])

        if es_valor_rol_valido(primeros_dos, rol):
            puntaje = 70

            if rol == "pulso":
                puntaje = 90

            candidatos.append(
                {
                    "valor": primeros_dos,
                    "metodo": "primeros_dos_digitos",
                    "puntaje": puntaje,
                }
            )

        if es_valor_rol_valido(ultimos_dos, rol):
            candidatos.append(
                {
                    "valor": ultimos_dos,
                    "metodo": "ultimos_dos_digitos",
                    "puntaje": 55,
                }
            )

    return candidatos

def intentar_tripleta_directa_en_crop(attempts):
    """
    Primero intenta encontrar una lectura directa y ordenada dentro de un mismo recorte.
    Esto protege casos que ya funcionan, como:
    [119, 77, 74]
    [118, 70, 76]
    """

    mejores_crops = [
        "solo_numeros_probable",
        "zona_central_numeros",
        "lado_izquierdo_display",
        "pantalla_lcd_probable",
        "imagen_completa",
    ]

    attempts_ordenados = sorted(
        attempts,
        key=lambda a: mejores_crops.index(a["crop"])
        if a["crop"] in mejores_crops
        else 999,
    )

    for attempt in attempts_ordenados:
        valores = attempt["numbers"]

        if len(valores) < 3:
            continue

        for i in range(len(valores) - 2):
            sistolica = valores[i]
            diastolica = valores[i + 1]
            pulso = valores[i + 2]

            if sistolica == pulso:
                continue

            if is_valid_pressure_triplet(sistolica, diastolica, pulso):
                return {
                    "sistolica": sistolica,
                    "diastolica": diastolica,
                    "pulso": pulso,
                    "puntaje": 9999,
                    "detalle": {
                        "metodo": "tripleta_directa_ordenada",
                        "crop": attempt["crop"],
                        "valores": valores,
                    },
                }

    return None


def select_pressure_values_global(attempts):
    directa = intentar_tripleta_directa_en_crop(attempts)

    if directa:
        return directa

    candidatos_sistolica = []
    candidatos_diastolica = []
    candidatos_pulso = []

    frecuencia_exacta = {}

    for attempt in attempts:
        for valor in attempt["numbers"]:
            frecuencia_exacta[valor] = frecuencia_exacta.get(valor, 0) + 1

    for crop_index, attempt in enumerate(attempts):
        crop_name = attempt["crop"]
        valores = attempt["numbers"]

        for index, valor_original in enumerate(valores):
            for rol, lista_destino in [
                ("sistolica", candidatos_sistolica),
                ("diastolica", candidatos_diastolica),
                ("pulso", candidatos_pulso),
            ]:
                candidatos = generar_candidatos_para_rol(valor_original, rol)

                for candidato in candidatos:
                    valor = candidato["valor"]
                    puntaje = candidato["puntaje"]

                    if candidato["metodo"] == "exacto":
                        puntaje += frecuencia_exacta.get(valor, 0) * 8

                    if rol == "sistolica" and 90 <= valor <= 180:
                        puntaje += 25

                    if rol == "diastolica" and 50 <= valor <= 110:
                        puntaje += 25

                    if rol == "pulso" and 45 <= valor <= 130:
                        puntaje += 25

                    # Peso por posición vertical:
                    # 0 = sistólica, 1 = diastólica, 2 = pulso
                    if rol == "sistolica":
                        if index == 0:
                            puntaje += 130
                        elif index == 1:
                            puntaje -= 90
                        else:
                            puntaje -= 140

                    if rol == "diastolica":
                        if index == 1:
                            puntaje += 130
                        elif index == 0:
                            puntaje -= 120
                        else:
                            puntaje -= 80

                    if rol == "pulso":
                        if index == 2:
                            puntaje += 160
                        elif index == 1:
                            puntaje -= 90
                        elif index == 0:
                            puntaje -= 250

                    lista_destino.append(
                        {
                            "valor": valor,
                            "raw": valor_original,
                            "crop": crop_name,
                            "crop_index": crop_index,
                            "index": index,
                            "metodo": candidato["metodo"],
                            "puntaje": puntaje,
                        }
                    )

    mejor = None
    mejor_puntaje = -999999

    for s in candidatos_sistolica:
        for d in candidatos_diastolica:
            for p in candidatos_pulso:
                sistolica = s["valor"]
                diastolica = d["valor"]
                pulso = p["valor"]

                if not is_valid_pressure_triplet(sistolica, diastolica, pulso):
                    continue

                # No permitas que use exactamente la misma detección
                # para dos campos distintos.
                if s["crop"] == d["crop"] and s["index"] == d["index"]:
                    continue

                if s["crop"] == p["crop"] and s["index"] == p["index"]:
                    continue

                if d["crop"] == p["crop"] and d["index"] == p["index"]:
                    continue

                # Esto corrige tu error actual:
                # 118 / 70 / 118.
                # Para detección automática, si sistólica y pulso son iguales,
                # casi siempre es una reutilización incorrecta.
                if sistolica == pulso:
                    continue

                puntaje = s["puntaje"] + d["puntaje"] + p["puntaje"]

                if diastolica == pulso:
                    puntaje -= 180

                # Premio si vienen del mismo recorte en orden correcto.
                if s["crop"] == d["crop"] and s["index"] < d["index"]:
                    puntaje += 50

                if d["crop"] == p["crop"] and d["index"] < p["index"]:
                    puntaje += 50

                if (
                    s["crop"] == d["crop"]
                    and d["crop"] == p["crop"]
                    and s["index"] < d["index"]
                    and d["index"] < p["index"]
                ):
                    puntaje += 160

                # Penaliza fuertemente que el pulso venga de la primera posición.
                if p["index"] == 0:
                    puntaje -= 300

                # Premia que el pulso sea el tercer número.
                if p["index"] == 2:
                    puntaje += 120

                if mejor is None or puntaje > mejor_puntaje:
                    mejor_puntaje = puntaje
                    mejor = {
                        "sistolica": sistolica,
                        "diastolica": diastolica,
                        "pulso": pulso,
                        "puntaje": puntaje,
                        "detalle": {
                            "sistolica": s,
                            "diastolica": d,
                            "pulso": p,
                        },
                    }

    return mejor

def generar_valores_posibles_por_rol(valor, rol):
    posibles = []

    def agregar(v, prioridad):
        if rol == "sistolica" and 60 <= v <= 300:
            posibles.append((v, prioridad))

        if rol == "diastolica" and 40 <= v <= 200:
            posibles.append((v, prioridad))

        if rol == "pulso" and 30 <= v <= 250:
            posibles.append((v, prioridad))

    agregar(valor, 100)

    texto = str(valor)

    # Caso: 17 leído cuando realmente puede ser 77.
    if rol in ["diastolica", "pulso"] and 10 <= valor <= 19:
        agregar(70 + (valor % 10), 75)

    # Caso: 741 puede contener 74.
    # Caso: 371 puede contener 71.
    if len(texto) == 3 and valor > 250:
        agregar(int(texto[:2]), 80)
        agregar(int(texto[1:]), 55)

    # Caso: 702 puede contener 70.
    if len(texto) == 3 and texto.endswith("2"):
        agregar(int(texto[:2]), 85)

    return posibles


def seleccionar_tres_numeros_mas_grandes(numbers):
    if len(numbers) < 3:
        return None

    # Quitar valores basura muy pequeños, pero sin eliminar posibles lecturas útiles.
    candidatos = [
        n for n in numbers
        if n["avg_height"] > 0 and n["area"] > 0
    ]

    if len(candidatos) < 3:
        return None

    max_height = max(n["avg_height"] for n in candidatos)

    # Nos quedamos con los números visualmente grandes.
    grandes = [
        n for n in candidatos
        if n["avg_height"] >= max_height * 0.45
    ]

    if len(grandes) < 3:
        grandes = sorted(
            candidatos,
            key=lambda n: (n["avg_height"] * 4) + (n["area"] / 1000),
            reverse=True,
        )[:5]

    mejor = None
    mejor_puntaje = -999999

    for i in range(len(grandes) - 2):
        for j in range(i + 1, len(grandes) - 1):
            for k in range(j + 1, len(grandes)):
                trio = sorted([grandes[i], grandes[j], grandes[k]], key=lambda n: n["cy"])

                n1, n2, n3 = trio

                # Deben estar en orden vertical claro.
                if not (n1["cy"] < n2["cy"] < n3["cy"]):
                    continue

                # Evita elegir números demasiado separados horizontalmente.
                alineacion = abs(n1["cx"] - n2["cx"]) + abs(n2["cx"] - n3["cx"])

                for sistolica, ps in generar_valores_posibles_por_rol(n1["value"], "sistolica"):
                    for diastolica, pd in generar_valores_posibles_por_rol(n2["value"], "diastolica"):
                        for pulso, pp in generar_valores_posibles_por_rol(n3["value"], "pulso"):

                            if not is_valid_pressure_triplet(sistolica, diastolica, pulso):
                                continue

                            if sistolica == pulso:
                                continue

                            puntaje = 0

                            # Prioridad por tamaño visual: los números principales son los más grandes.
                            puntaje += n1["avg_height"] * 3
                            puntaje += n2["avg_height"] * 3
                            puntaje += n3["avg_height"] * 3

                            puntaje += n1["area"] / 500
                            puntaje += n2["area"] / 500
                            puntaje += n3["area"] / 500

                            # Prioridad por correcciones menos agresivas.
                            puntaje += ps + pd + pp

                            # Penaliza mala alineación horizontal.
                            puntaje -= alineacion * 0.25

                            # Premia rangos normales.
                            if 90 <= sistolica <= 180:
                                puntaje += 40

                            if 50 <= diastolica <= 110:
                                puntaje += 40

                            if 45 <= pulso <= 130:
                                puntaje += 40

                            # El pulso normalmente no debe ser igual a sistólica ni mayor que sistólica.
                            if pulso >= sistolica:
                                puntaje -= 200

                            if mejor is None or puntaje > mejor_puntaje:
                                mejor_puntaje = puntaje
                                mejor = {
                                    "sistolica": sistolica,
                                    "diastolica": diastolica,
                                    "pulso": pulso,
                                    "puntaje": puntaje,
                                    "detalle": {
                                        "metodo": "tres_numeros_mas_grandes_verticales",
                                        "raw": [
                                            n1["value"],
                                            n2["value"],
                                            n3["value"],
                                        ],
                                        "alturas": [
                                            n1["avg_height"],
                                            n2["avg_height"],
                                            n3["avg_height"],
                                        ],
                                    },
                                }

    return mejor


def seleccionar_mejor_desde_attempts(attempts):
    mejor = None
    mejor_puntaje = -999999

    prioridad_crop = {
        "solo_numeros_probable": 50,
        "zona_central_numeros": 45,
        "lado_izquierdo_display": 40,
        "pantalla_lcd_probable": 35,
        "imagen_completa": 20,
    }

    for attempt in attempts:
        numbers = attempt["numbers_full"]
        seleccionado = seleccionar_tres_numeros_mas_grandes(numbers)

        if not seleccionado:
            continue

        seleccionado["puntaje"] += prioridad_crop.get(attempt["crop"], 0)

        if seleccionado["puntaje"] > mejor_puntaje:
            mejor_puntaje = seleccionado["puntaje"]
            mejor = seleccionado

    return mejor

def read_pressure_from_image(image):
    attempts = []

    for crop_name, crop in crop_candidates(image):
        numbers = detect_numbers_in_crop(crop)

        attempts.append(
            {
                "crop": crop_name,
                "numbers": [n["value"] for n in numbers],
                "numbers_full": numbers,
            }
        )

    selected = seleccionar_mejor_desde_attempts(attempts)

    attempts_limpios = [
        {
            "crop": attempt["crop"],
            "numbers": attempt["numbers"],
        }
        for attempt in attempts
    ]

    if selected:
        return {
            "ok": True,
            "sistolica": selected["sistolica"],
            "diastolica": selected["diastolica"],
            "pulso": selected["pulso"],
            "attempts": attempts_limpios,
            "selected": selected,
        }

    return {
        "ok": False,
        "message": "No se pudieron detectar los 3 números principales.",
        "attempts": attempts_limpios,
    }

def encode_cv2_image_to_base64(image):
    ok, buffer = cv2.imencode(
        ".jpg",
        image,
        [int(cv2.IMWRITE_JPEG_QUALITY), 95],
    )

    if not ok:
        raise ValueError("No se pudo convertir la imagen a base64.")

    return base64.b64encode(buffer).decode("utf-8")


def resize_cv2_width(image, target_width=1400):
    h, w = image.shape[:2]

    if w <= target_width:
        return image

    scale = target_width / float(w)
    new_h = int(h * scale)

    return cv2.resize(image, (target_width, new_h), interpolation=cv2.INTER_AREA)


def crear_variantes_para_ia(image_base64):
    image = decode_base64_image(image_base64)
    image = resize_cv2_width(image, 1400)

    h, w = image.shape[:2]

    variantes = []

    variantes.append(
        {
            "nombre": "Vista original completa",
            "base64": encode_cv2_image_to_base64(image),
        }
    )

    # Recorte amplio: conserva casi todo el display.
    crop_display_amplio = image[
        int(h * 0.02) : int(h * 0.98),
        int(w * 0.00) : int(w * 0.90),
    ]

    variantes.append(
        {
            "nombre": "Display completo ampliado",
            "base64": encode_cv2_image_to_base64(resize_cv2_width(crop_display_amplio, 1600)),
        }
    )

    # Recorte centrado: prioriza los números grandes.
    crop_numeros_centro = image[
        int(h * 0.02) : int(h * 0.98),
        int(w * 0.05) : int(w * 0.82),
    ]

    variantes.append(
        {
            "nombre": "Columna principal de numeros",
            "base64": encode_cv2_image_to_base64(resize_cv2_width(crop_numeros_centro, 1600)),
        }
    )

    # Recorte izquierda/media: útil cuando textos SYS/DIA/PUL están a la derecha.
    crop_sin_textos_derecha = image[
        int(h * 0.00) : int(h * 1.00),
        int(w * 0.00) : int(w * 0.75),
    ]

    variantes.append(
        {
            "nombre": "Display sin textos laterales",
            "base64": encode_cv2_image_to_base64(resize_cv2_width(crop_sin_textos_derecha, 1600)),
        }
    )

    return variantes


def extraer_json_desde_texto(texto):
    texto = texto.strip()

    if texto.startswith("```"):
        texto = texto.replace("```json", "").replace("```", "").strip()

    inicio = texto.find("{")
    fin = texto.rfind("}")

    if inicio != -1 and fin != -1:
        texto = texto[inicio : fin + 1]

    return json.loads(texto)


def leer_presion_con_ia(image_base64):
    variantes = crear_variantes_para_ia(image_base64)

    prompt = """
Eres un lector visual especializado en baumanómetros digitales.

Vas a recibir varias vistas de la MISMA imagen. Tu tarea es leer SOLO los 3 números grandes principales del display.

Reglas obligatorias:
1. Lee únicamente los 3 números más grandes que están acomodados verticalmente.
2. El número grande superior es la presión sistólica.
3. El número grande del medio es la presión diastólica.
4. El número grande inferior es el pulso.
5. Ignora por completo: SYS, DIA, PUL, mmHg, DATE, hora, fecha, memoria, iconos, botones, marcas, etiquetas y números pequeños.
6. No uses el mismo número para dos campos distintos.
7. Si ves dos lecturas posibles, elige la que corresponda a los números grandes verticales.
8. No corrijas médicamente los valores; solo lee lo que aparece visualmente.
9. Devuelve únicamente JSON válido, sin explicación.

Formato obligatorio:
{
  "sistolica": number | null,
  "diastolica": number | null,
  "pulso": number | null
}
"""

    contenido = [
        {
            "type": "input_text",
            "text": prompt,
        }
    ]

    for variante in variantes:
        contenido.append(
            {
                "type": "input_text",
                "text": f"Vista: {variante['nombre']}",
            }
        )

        contenido.append(
            {
                "type": "input_image",
                "image_url": f"data:image/jpeg;base64,{variante['base64']}",
                "detail": "high",
            }
        )

    response = client.responses.create(
        model=OPENAI_VISION_MODEL,
        input=[
            {
                "role": "user",
                "content": contenido,
            }
        ],
        temperature=0,
    )

    texto = response.output_text.strip()
    print("RESPUESTA IA RAW:", texto)

    data = extraer_json_desde_texto(texto)

    sistolica = data.get("sistolica")
    diastolica = data.get("diastolica")
    pulso = data.get("pulso")

    if sistolica is None or diastolica is None or pulso is None:
        return {
            "ok": False,
            "message": "La IA no pudo leer los 3 valores con seguridad.",
            "raw": data,
        }

    sistolica = int(sistolica)
    diastolica = int(diastolica)
    pulso = int(pulso)

    if not is_valid_pressure_triplet(sistolica, diastolica, pulso):
        return {
            "ok": False,
            "message": "La IA leyó valores fuera de rango médico válido.",
            "raw": data,
        }

    # En esta extracción automática no aceptamos que use el mismo valor
    # como sistólica y pulso, porque fue justo el error que apareció.
    if sistolica == pulso:
        return {
            "ok": False,
            "message": "La IA reutilizó la sistólica como pulso.",
            "raw": data,
        }

    return {
        "ok": True,
        "sistolica": sistolica,
        "diastolica": diastolica,
        "pulso": pulso,
        "source": "openai_vision_multi_view",
        "raw": data,
    }

def extraer_json_desde_texto(texto):
    texto = texto.strip()

    if texto.startswith("```"):
        texto = texto.replace("```json", "").replace("```", "").strip()

    inicio = texto.find("{")
    fin = texto.rfind("}")

    if inicio != -1 and fin != -1:
        texto = texto[inicio : fin + 1]

    return json.loads(texto)


def image_base64_to_bytes(image_base64):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    return base64.b64decode(image_base64)


def leer_presion_con_gemini(image_base64):
    image_bytes = image_base64_to_bytes(image_base64)

    prompt = """
Eres un lector visual especializado en baumanómetros digitales.

Tu tarea es leer ÚNICAMENTE los 3 números grandes principales del display.

Reglas obligatorias:
1. Lee solo los 3 números más grandes acomodados verticalmente.
2. El número grande superior es la presión sistólica.
3. El número grande del medio es la presión diastólica.
4. El número grande inferior es el pulso.
5. Ignora SYS, DIA, PUL, mmHg, DATE, hora, fecha, memoria, iconos, botones, marcas, textos, etiquetas y números pequeños.
6. No uses el mismo número para dos campos distintos.
7. No inventes valores.
8. Si no puedes leer uno de los valores con seguridad, usa null.
9. Devuelve únicamente JSON válido.

Formato:
{
  "sistolica": number | null,
  "diastolica": number | null,
  "pulso": number | null
}
"""

    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            prompt,
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg",
            ),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0,
        ),
    )

    texto = response.text.strip()
    print("RESPUESTA GEMINI RAW:", texto)

    data = extraer_json_desde_texto(texto)

    sistolica = data.get("sistolica")
    diastolica = data.get("diastolica")
    pulso = data.get("pulso")

    if sistolica is None or diastolica is None or pulso is None:
        return {
            "ok": False,
            "message": "Gemini no pudo leer los 3 valores con seguridad.",
            "raw": data,
        }

    sistolica = int(sistolica)
    diastolica = int(diastolica)
    pulso = int(pulso)

    if not is_valid_pressure_triplet(sistolica, diastolica, pulso):
        return {
            "ok": False,
            "message": "Gemini leyó valores fuera de rango médico válido.",
            "raw": data,
        }

    if sistolica == pulso:
        return {
            "ok": False,
            "message": "Gemini reutilizó la sistólica como pulso.",
            "raw": data,
        }

    return {
        "ok": True,
        "sistolica": sistolica,
        "diastolica": diastolica,
        "pulso": pulso,
        "source": "gemini_vision",
        "raw": data,
    }

def extraer_json_desde_texto(texto):
    texto = texto.strip()

    if texto.startswith("```"):
        texto = texto.replace("```json", "").replace("```", "").strip()

    inicio = texto.find("{")
    fin = texto.rfind("}")

    if inicio != -1 and fin != -1:
        texto = texto[inicio : fin + 1]

    return json.loads(texto)


def image_base64_to_bytes(image_base64):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    return base64.b64decode(image_base64)


def leer_glucosa_con_gemini(image_base64):
    image_bytes = image_base64_to_bytes(image_base64)

    prompt = """
Eres un lector visual especializado en glucómetros digitales.

Tu tarea es leer ÚNICAMENTE el número grande principal de glucosa que aparece en la pantalla.

Reglas obligatorias:
1. Lee solo el número grande principal de glucosa.
2. Ignora hora, fecha, memoria, batería, iconos, botones, marcas, unidades, textos y números pequeños.
3. El valor normalmente aparece en mg/dL.
4. No inventes valores.
5. Si no puedes leer el número con seguridad, usa null.
6. Devuelve únicamente JSON válido.

Formato obligatorio:
{
  "glucosa": number | null
}
"""

    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            prompt,
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg",
            ),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0,
        ),
    )

    texto = response.text.strip()
    print("RESPUESTA GEMINI GLUCOSA RAW:", texto)

    data = extraer_json_desde_texto(texto)

    glucosa = data.get("glucosa")

    if glucosa is None:
        return {
            "ok": False,
            "message": "Gemini no pudo leer el valor de glucosa con seguridad.",
            "raw": data,
        }

    glucosa = int(glucosa)

    if glucosa < 20 or glucosa > 600:
        return {
            "ok": False,
            "message": "Gemini leyó un valor fuera de rango humano realista.",
            "raw": data,
        }

    return {
        "ok": True,
        "glucosa": glucosa,
        "source": "gemini_glucose",
        "raw": data,
    }

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "message": "API OpenCV funcionando"})


@app.route("/leer-presion", methods=["POST"])
def leer_presion():
    try:
        payload = request.get_json(silent=True)

        if not payload:
            return jsonify(
                {
                    "ok": False,
                    "message": "No se recibió JSON.",
                }
            ), 400

        image_base64 = payload.get("imageBase64") or payload.get("base64")

        if not image_base64:
            return jsonify(
                {
                    "ok": False,
                    "message": "No se recibió imageBase64.",
                }
            ), 400

        try:
            gemini_result = leer_presion_con_gemini(image_base64)

            if gemini_result.get("ok"):
                return jsonify(gemini_result), 200

            print("Gemini no pudo leer correctamente:", gemini_result)

        except Exception as error_gemini:
            print("Error usando Gemini:", str(error_gemini))

        # Respaldo con OpenCV si Gemini falla.
        image = decode_base64_image(image_base64)
        result = read_pressure_from_image(image)

        if result.get("ok"):
            result["source"] = "opencv_backup"
            return jsonify(result), 200

        return jsonify(
            {
                "ok": False,
                "message": "No se pudieron detectar los valores ni con Gemini ni con OpenCV.",
                "opencv": result,
            }
        ), 422

    except Exception as error:
        return jsonify(
            {
                "ok": False,
                "message": str(error),
            }
        ), 500

@app.route("/leer-glucosa", methods=["POST"])
def leer_glucosa():
    try:
        payload = request.get_json(silent=True)

        if not payload:
            return jsonify(
                {
                    "ok": False,
                    "message": "No se recibió JSON.",
                }
            ), 400

        image_base64 = payload.get("imageBase64") or payload.get("base64")

        print("RECIBÍ PETICIÓN /leer-glucosa")
        print("TAMAÑO BASE64 GLUCOSA:", len(image_base64) if image_base64 else 0)

        if not image_base64:
            return jsonify(
                {
                    "ok": False,
                    "message": "No se recibió imageBase64.",
                }
            ), 400

        resultado = leer_glucosa_con_gemini(image_base64)

        if resultado.get("ok"):
            return jsonify(resultado), 200

        return jsonify(resultado), 422

    except Exception as error:
        print("ERROR /leer-glucosa:", str(error))

        return jsonify(
            {
                "ok": False,
                "message": str(error),
            }
        ), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)