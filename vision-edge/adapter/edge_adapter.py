"""
JAL-RAKSHAK Edge — Edge to Backend Event Adapter
Connects real inference / PipeGen detections to the Node.js backend.
Handles:
- Detections reading & normalization
- Cooldown & de-duplication
- HTTP event transmission with retry & exponential backoff
- Periodic pipeline heartbeats (FPS, latency, status)
- Diagnostic logging without secret exposure
"""

from __future__ import annotations

import os
import sys
import time
import json
import logging
from typing import Dict, Any, Optional, Tuple, List, Union
import urllib.request
import urllib.error

# Ensure package and parent paths are resolved in all execution contexts
_curr_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_curr_dir)
for _p in (_curr_dir, _parent_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from .event_normalizer import normalize_detection, EventValidationError
except (ImportError, ValueError):
    try:
        from adapter.event_normalizer import normalize_detection, EventValidationError
    except (ImportError, ValueError):
        from event_normalizer import normalize_detection, EventValidationError


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [EdgeAdapter] %(message)s"
)
logger = logging.getLogger("EdgeAdapter")


class EdgeAdapter:
    def __init__(
        self,
        api_url: str = "http://localhost:5001/api/vision/events",
        heartbeat_url: str = "http://localhost:5001/api/vision/heartbeat",
        camera_id: str = "CAM-001",
        location_id: Optional[str] = "SITE-001",
        confidence_threshold: float = 0.50,
        cooldown_seconds: float = 30.0
    ):
        self.api_url = os.getenv("VISION_API_URL", api_url)
        self.heartbeat_url = os.getenv("VISION_HEARTBEAT_URL", heartbeat_url)
        self.camera_id = os.getenv("VISION_CAMERA_ID", camera_id)
        self.location_id = os.getenv("VISION_LOCATION_ID", location_id)
        self.confidence_threshold = float(os.getenv("VISION_CONFIDENCE_THRESHOLD", confidence_threshold))
        self.cooldown_seconds = float(os.getenv("VISION_COOLDOWN_SECONDS", cooldown_seconds))

        self.last_sent_time: Dict[str, float] = {}  # class_name -> last timestamp
        self.total_received = 0
        self.total_transmitted = 0
        self.total_deduped = 0
        self.total_errors = 0

    def send_heartbeat(self, status: str = "RUNNING", fps: Optional[float] = None, latency_ms: Optional[float] = None, model_name: Optional[str] = None):
        """Send pipeline heartbeat to backend status registry."""
        payload = {
            "status": status,
            "cameraId": self.camera_id,
            "modelName": model_name or "yolov8_waterlogging.onnx",
            "fps": fps,
            "latencyMs": latency_ms,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        try:
            req = urllib.request.Request(
                self.heartbeat_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                if resp.status in (200, 201):
                    logger.debug("Heartbeat acknowledged")
        except Exception as e:
            logger.debug(f"Heartbeat send failed (backend may be warming up): {e}")

    def process_detection(self, raw_detection: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Validate, deduplicate, and transmit an individual detection."""
        self.total_received += 1

        try:
            event = normalize_detection(
                raw_detection,
                camera_id=self.camera_id,
                location_id=self.location_id,
                confidence_threshold=self.confidence_threshold
            )
        except EventValidationError as e:
            logger.warning(f"Validation rejected detection: {e}")
            self.total_errors += 1
            return None

        if event is None:
            return None  # Below confidence threshold

        # Cooldown de-duplication
        class_name = event["className"]
        now = time.time()
        last_time = self.last_sent_time.get(class_name, 0.0)

        # Allow test events through even if within cooldown
        if not event.get("isTestEvent") and (now - last_time) < self.cooldown_seconds:
            self.total_deduped += 1
            logger.debug(f"Event de-duplicated for {class_name} (cooldown: {self.cooldown_seconds}s)")
            return None

        # Transmit event to backend with retry
        success, response = self._transmit_event_with_retry(event)
        if success:
            self.last_sent_time[class_name] = now
            self.total_transmitted += 1
            logger.info(
                f"Transmitted {event['className']} (conf: {event['confidence']:.2f}) "
                f"from {event['cameraId']} -> Backend HTTP 201"
            )
            return response
        else:
            self.total_errors += 1
            logger.error(f"Failed to transmit event after retries: {response}")
            return None

    def _transmit_event_with_retry(self, event: Dict[str, Any], max_retries: int = 3) -> Tuple[bool, Any]:
        """Post JSON payload to backend endpoint with exponential backoff."""
        data = json.dumps(event).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "JAL-RAKSHAK-EdgeAdapter/1.0"
        }

        # Shared ingestion secret if configured
        secret = os.getenv("VISION_EVENT_SECRET")
        if secret:
            headers["X-Vision-Secret"] = secret

        for attempt in range(1, max_retries + 1):
            try:
                req = urllib.request.Request(self.api_url, data=data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    resp_body = resp.read().decode("utf-8")
                    result = json.loads(resp_body) if resp_body else {}
                    return True, result
            except urllib.error.HTTPError as e:
                err_content = e.read().decode("utf-8", errors="ignore")
                if 400 <= e.code < 500:
                    # Client errors (e.g. 400 bad request, 401 unauthorized) should not be retried
                    return False, f"HTTP {e.code}: {err_content}"
                logger.warning(f"HTTP {e.code} on attempt {attempt}/{max_retries}: {err_content}")
            except Exception as e:
                logger.warning(f"Connection failure on attempt {attempt}/{max_retries}: {e}")

            if attempt < max_retries:
                time.sleep(0.5 * (2 ** (attempt - 1)))

        return False, "Max retries exceeded"


if __name__ == "__main__":
    adapter = EdgeAdapter()
    logger.info(f"EdgeAdapter initialized targeting {adapter.api_url}")
    # Run test heartbeat
    adapter.send_heartbeat(status="STANDBY", fps=0.0, latency_ms=0.0)
