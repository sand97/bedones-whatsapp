"""
Smart Screenshot Cropper - Service FastAPI
Extraction d'image produit depuis des captures d'écran de posts Facebook/Instagram

Trois stratégies disponibles:
  1. Pure OpenCV (0 coût, ~5ms par image)
  2. YOLOv8-Nano (0 coût, ~50ms par image, très précis)
  3. Gemini Vision API bounding box (~0.001$ par appel)
"""

import base64
import io
import json
import os
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel

app = FastAPI(
    title="Image Cropper Service",
    description="Smart screenshot cropping using OpenCV, YOLO, and Gemini Vision",
    version="1.0.0",
)

# YOLOv8 model (lazy loaded)
_yolo_model = None


# ============================================================
# MODELS
# ============================================================


class CropResult(BaseModel):
    success: bool
    image_base64: str
    width: int
    height: int
    method: str
    crop_coordinates: dict
    confidence: Optional[float] = None


class GeminiCropRequest(BaseModel):
    image_base64: str
    api_key: Optional[str] = None


# ============================================================
# OPENCV CROPPING FUNCTIONS
# ============================================================


def _find_contiguous_blocks(mask: np.ndarray) -> list:
    """Trouve les blocs contigus de True dans un tableau booléen."""
    blocks = []
    transitions = np.diff(mask.astype(int))
    starts = np.where(transitions == 1)[0] + 1
    ends = np.where(transitions == -1)[0]

    if mask[0]:
        starts = np.insert(starts, 0, 0)
    if mask[-1]:
        ends = np.append(ends, len(mask) - 1)

    for s, e in zip(starts, ends):
        if e > s:
            blocks.append((s, e))

    return blocks


def _trim_overlay_bars(
    img: np.ndarray, gray: np.ndarray, y_start: int, y_end: int, scan_height: int = 80
) -> int:
    """
    Détecte et exclut les barres overlay en bas de l'image
    (ex: barre jaune "NON DISCUTABLE", barre "Shop photo").
    """
    hsv = cv2.cvtColor(
        img[max(y_start, y_end - scan_height) : y_end, :], cv2.COLOR_BGR2HSV
    )

    for i in range(hsv.shape[0] - 1, -1, -1):
        row_saturation = np.mean(hsv[i, :, 1])
        row_brightness = np.mean(gray[y_end - (hsv.shape[0] - i), :])

        if row_saturation < 120 and row_brightness < 230:
            actual_row = y_end - (hsv.shape[0] - i) + 1

            if (actual_row - y_start) > (y_end - y_start) * 0.7:
                return actual_row

    return y_end


def crop_opencv(
    image: np.ndarray,
    white_threshold: int = 240,
    white_pct_threshold: float = 0.5,
    min_block_height: int = 100,
    exclude_overlay_bars: bool = True,
) -> Optional[dict]:
    """
    Extrait l'image principale d'une capture d'écran de post social media.
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Détecter le mode: si la majorité des lignes du haut sont sombres -> dark mode
    top_mean = np.mean(gray[:50, :])
    is_dark_mode = top_mean < 100

    if is_dark_mode:
        dark_pct_per_row = np.mean(gray < 60, axis=1)
        is_image_row = dark_pct_per_row < 0.5
    else:
        white_pct_per_row = np.mean(gray > white_threshold, axis=1)
        is_image_row = white_pct_per_row < white_pct_threshold

    blocks = _find_contiguous_blocks(is_image_row)
    if not blocks:
        return None

    best_block = max(blocks, key=lambda b: b[1] - b[0])
    y_start, y_end = best_block

    if (y_end - y_start) < min_block_height:
        return None

    if exclude_overlay_bars:
        y_end = _trim_overlay_bars(image, gray, y_start, y_end)

    cropped = image[y_start:y_end, :]

    # Calculer la confiance basée sur le ratio de crop
    crop_h = cropped.shape[0]
    ratio = crop_h / h
    confidence = 0.95 if 0.2 < ratio < 0.8 and crop_h > 200 else 0.6

    return {
        "image": cropped,
        "coordinates": {"y_start": int(y_start), "y_end": int(y_end), "x_start": 0, "x_end": int(w)},
        "confidence": confidence,
    }


# ============================================================
# GEMINI CROPPING FUNCTIONS
# ============================================================


def crop_with_gemini(image_b64: str, api_key: str) -> Optional[dict]:
    """
    Utilise Gemini Vision pour détecter le bounding box de l'image produit.
    """
    import requests

    PROMPT = (
        "This is a screenshot of a social media post. "
        "Return ONLY the bounding box coordinates [y_min, x_min, y_max, x_max] "
        "of the main product/content image in the post. "
        "Exclude all UI elements (headers, buttons, text, overlays). "
        "Coordinates should be normalized to 0-1000 range. "
        "Return ONLY a JSON array, nothing else. Example: [350, 0, 800, 1000]"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
                    {"text": PROMPT},
                ]
            }
        ],
        "generationConfig": {"temperature": 0.1},
    }

    try:
        resp = requests.post(url, json=payload, timeout=15)
        resp.raise_for_status()

        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().strip("```json").strip("```").strip()
        bbox = json.loads(text)

        return {"bbox": bbox, "confidence": 0.95}
    except Exception as e:
        print(f"Gemini API error: {e}")
        return None


# ============================================================
# API ENDPOINTS
# ============================================================


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "image-cropper"}


@app.post("/crop/opencv", response_model=CropResult)
async def crop_with_opencv_endpoint(file: UploadFile = File(...)):
    """
    Crop une image en utilisant OpenCV (stratégie 1)
    Gratuit et rapide (~5ms)
    """
    try:
        # Lire l'image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Crop avec OpenCV
        result = crop_opencv(img)

        if result is None:
            raise HTTPException(
                status_code=400, detail="Could not find suitable crop area"
            )

        # Encoder l'image croppée en base64
        _, buffer = cv2.imencode(".jpg", result["image"])
        img_b64 = base64.b64encode(buffer).decode("utf-8")

        h, w = result["image"].shape[:2]

        return CropResult(
            success=True,
            image_base64=img_b64,
            width=w,
            height=h,
            method="opencv",
            crop_coordinates=result["coordinates"],
            confidence=result["confidence"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@app.post("/crop/gemini")
async def crop_with_gemini_endpoint(request: GeminiCropRequest):
    """
    Crop une image en utilisant Gemini Vision API (stratégie 2)
    Plus robuste mais coûte ~0.001$/appel
    """
    try:
        # Récupérer l'API key
        api_key = request.api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Gemini API key required (provide in request or GEMINI_API_KEY env var)",
            )

        # Décoder l'image
        img_bytes = base64.b64decode(request.image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        h, w = img.shape[:2]

        # Appeler Gemini
        result = crop_with_gemini(request.image_base64, api_key)

        if result is None:
            raise HTTPException(
                status_code=500, detail="Gemini API failed to detect bounding box"
            )

        bbox = result["bbox"]

        # Convertir les coordonnées normalisées en pixels
        y_min = int(bbox[0] / 1000 * h)
        x_min = int(bbox[1] / 1000 * w)
        y_max = int(bbox[2] / 1000 * h)
        x_max = int(bbox[3] / 1000 * w)

        # Valider et ajuster les coordonnées
        y_min = max(0, min(y_min, h - 1))
        y_max = max(y_min + 1, min(y_max, h))
        x_min = max(0, min(x_min, w - 1))
        x_max = max(x_min + 1, min(x_max, w))

        # Crop l'image
        cropped = img[y_min:y_max, x_min:x_max]

        # Encoder en base64
        _, buffer = cv2.imencode(".jpg", cropped)
        img_b64 = base64.b64encode(buffer).decode("utf-8")

        crop_h, crop_w = cropped.shape[:2]

        return CropResult(
            success=True,
            image_base64=img_b64,
            width=crop_w,
            height=crop_h,
            method="gemini",
            crop_coordinates={
                "y_min": y_min,
                "y_max": y_max,
                "x_min": x_min,
                "x_max": x_max,
            },
            confidence=result["confidence"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@app.post("/crop/gemini-upload", response_model=CropResult)
async def crop_with_gemini_upload_endpoint(
    file: UploadFile = File(...), api_key: Optional[str] = None
):
    """
    Crop une image en utilisant Gemini Vision API (stratégie 2)
    Version avec upload de fichier direct
    """
    try:
        # Lire et encoder l'image
        contents = await file.read()
        img_b64 = base64.b64encode(contents).decode("utf-8")

        # Utiliser l'endpoint existant
        request = GeminiCropRequest(image_base64=img_b64, api_key=api_key)
        return await crop_with_gemini_endpoint(request)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


def _get_yolo_model():
    """Lazy load YOLOv8 model"""
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        _yolo_model = YOLO("yolov8n.pt")  # Auto-download ~6MB
    return _yolo_model


def crop_with_yolo(image: np.ndarray, margin: int = 10) -> Optional[dict]:
    """
    Utilise YOLOv8-Nano pour détecter et cropper l'objet principal.

    Args:
        image: Image OpenCV (BGR)
        margin: Marge de sécurité en pixels autour de la détection

    Returns:
        Dict avec image croppée et infos, ou None si aucune détection
    """
    try:
        model = _get_yolo_model()

        # Run detection
        results = model(image, verbose=False)

        if len(results[0].boxes) == 0:
            return None

        # Trouver la détection avec la plus grande aire
        boxes = results[0].boxes
        best_box = None
        max_area = 0

        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            area = (x2 - x1) * (y2 - y1)
            if area > max_area:
                max_area = area
                best_box = box

        if best_box is None:
            return None

        # Extract coordinates
        x1, y1, x2, y2 = map(int, best_box.xyxy[0])
        confidence = float(best_box.conf[0])

        # Apply margin
        h, w = image.shape[:2]
        x1 = max(0, x1 - margin)
        y1 = max(0, y1 - margin)
        x2 = min(w, x2 + margin)
        y2 = min(h, y2 + margin)

        # Crop
        cropped = image[y1:y2, x1:x2]

        return {
            "image": cropped,
            "coordinates": {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
            },
            "confidence": confidence,
        }
    except Exception as e:
        print(f"YOLO error: {e}")
        return None


@app.post("/crop/yolo", response_model=CropResult)
async def crop_with_yolo_endpoint(file: UploadFile = File(...), margin: int = 10):
    """
    Crop une image en utilisant YOLOv8-Nano (stratégie 2)
    Gratuit, rapide (~50ms), et très précis pour la détection d'objets
    """
    try:
        # Lire l'image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Crop avec YOLO
        result = crop_with_yolo(img, margin=margin)

        if result is None:
            raise HTTPException(
                status_code=400, detail="No object detected by YOLO"
            )

        # Encoder l'image croppée en base64
        _, buffer = cv2.imencode(".jpg", result["image"])
        img_b64 = base64.b64encode(buffer).decode("utf-8")

        h, w = result["image"].shape[:2]

        return CropResult(
            success=True,
            image_base64=img_b64,
            width=w,
            height=h,
            method="yolo",
            crop_coordinates=result["coordinates"],
            confidence=result["confidence"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8011"))
    uvicorn.run(app, host=host, port=port)
