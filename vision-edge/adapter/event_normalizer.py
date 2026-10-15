"""
JAL-RAKSHAK Edge — Vision Event Normalizer
Converts raw model / PipeGen inference detections into the canonical
JAL-RAKSHAK vision event schema with strict validation.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List, Union


class EventValidationError(ValueError):
    """Raised when an inference detection fails schema requirements."""
    pass



def normalize_detection(
    raw_detection: Dict[str, Any],
    camera_id: str = "CAM-001",
    location_id: Optional[str] = "SITE-001",
    confidence_threshold: float = 0.50
) -> Optional[Dict[str, Any]]:
    """
    Validates and normalizes raw model output to the canonical schema.

    Canonical Schema:
    {
      "source": "vision",
      "eventType": "WATER_HAZARD_OBSERVATION",
      "className": "standing_water",
      "confidence": 0.91,
      "cameraId": "CAM-001",
      "locationId": "SITE-001",
      "timestamp": "2026-10-15T14:00:00Z",
      "bbox": [x, y, w, h] or None,
      "evidenceUrl": None,
      "trackId": None,
      "isTestEvent": False
    }
    """
    if not isinstance(raw_detection, dict):
        raise EventValidationError("raw_detection must be a dictionary")

    # Class extraction and validation
    class_name = raw_detection.get("className") or raw_detection.get("class_name") or raw_detection.get("class")
    if not class_name or not isinstance(class_name, str):
        raise EventValidationError("Detection must have a valid non-empty string class name")
    class_name = class_name.strip().lower()

    # Confidence validation
    confidence = raw_detection.get("confidence") or raw_detection.get("score")
    if confidence is None:
        raise EventValidationError("Detection must have a confidence score")
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        raise EventValidationError(f"Invalid confidence value: {confidence}")

    if confidence < 0.0 or confidence > 1.0:
        raise EventValidationError(f"Confidence {confidence} must be between 0.0 and 1.0")

    if confidence < confidence_threshold:
        return None  # Filtered below threshold

    # Timestamp extraction and normalization to UTC ISO-8601
    raw_ts = raw_detection.get("timestamp")
    if raw_ts:
        try:
            if isinstance(raw_ts, (int, float)):
                dt = datetime.fromtimestamp(raw_ts, tz=timezone.utc)
            elif isinstance(raw_ts, str):
                # Replace trailing 'Z' for fromisoformat if needed
                clean_ts = raw_ts.replace("Z", "+00:00")
                dt = datetime.fromisoformat(clean_ts)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = datetime.now(timezone.utc)
        except Exception as e:
            raise EventValidationError(f"Invalid timestamp format: {raw_ts} ({e})")
    else:
        dt = datetime.now(timezone.utc)

    iso_timestamp = dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Bounding box extraction
    bbox = raw_detection.get("bbox") or raw_detection.get("boundingBox") or raw_detection.get("box")
    if bbox is not None:
        if isinstance(bbox, dict):
            if all(k in bbox for k in ("x", "y", "w", "h")):
                bbox = [bbox["x"], bbox["y"], bbox["w"], bbox["h"]]
            elif all(k in bbox for k in ("xMin", "yMin", "xMax", "yMax")):
                bbox = [bbox["xMin"], bbox["yMin"], bbox["xMax"] - bbox["xMin"], bbox["yMax"] - bbox["yMin"]]
            elif all(k in bbox for k in ("xmin", "ymin", "xmax", "ymax")):
                bbox = [bbox["xmin"], bbox["ymin"], bbox["xmax"] - bbox["xmin"], bbox["ymax"] - bbox["ymin"]]
            else:
                raise EventValidationError(f"Invalid bbox dictionary format: {bbox}")
        elif not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
            raise EventValidationError(f"bbox must be a 4-element array [x, y, w, h] or dict, got: {bbox}")
        try:
            bbox = [round(float(coord), 2) for coord in bbox]
        except (TypeError, ValueError):
            raise EventValidationError("All bbox coordinates must be numeric")

    # Tracking ID
    track_id = raw_detection.get("trackId") or raw_detection.get("track_id")
    track_id_str = str(track_id) if track_id is not None else None

    # Evidence URL
    evidence_url = raw_detection.get("evidenceUrl") or raw_detection.get("evidence_url")

    # Build normalized event
    event = {
        "source": raw_detection.get("source", "vision"),
        "eventType": raw_detection.get("eventType", "WATER_HAZARD_OBSERVATION"),
        "className": class_name,
        "confidence": round(confidence, 4),
        "cameraId": raw_detection.get("cameraId") or camera_id,
        "locationId": raw_detection.get("locationId") or location_id,
        "timestamp": iso_timestamp,
        "bbox": bbox,
        "evidenceUrl": evidence_url,
        "trackId": track_id_str,
        "isTestEvent": bool(raw_detection.get("isTestEvent", False))
    }

    return event
