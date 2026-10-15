"""
JAL-RAKSHAK Edge — Test Event Sender
Sends a verified, clearly labeled development test event to the backend.
Distinguished with "isTestEvent: true" to ensure test observations
are never confused with genuine edge inference detections.
"""

from __future__ import annotations

import sys
import os
import json
import time

# Ensure package and parent paths are resolved in all execution contexts
_curr_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_curr_dir)
for _p in (_curr_dir, _parent_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from .edge_adapter import EdgeAdapter
except (ImportError, ValueError):
    try:
        from adapter.edge_adapter import EdgeAdapter
    except (ImportError, ValueError):
        from edge_adapter import EdgeAdapter

def send_test_observation(
    class_name: str = "standing_water",
    confidence: float = 0.88,
    camera_id: str = "CAM-001",
    location_id: str = "SITE-001"
):
    adapter = EdgeAdapter(camera_id=camera_id, location_id=location_id)

    test_payload = {
        "source": "vision-edge-test",
        "eventType": "WATER_HAZARD_OBSERVATION",
        "className": class_name,
        "confidence": confidence,
        "cameraId": camera_id,
        "locationId": location_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "bbox": [120.5, 230.0, 310.2, 180.4],
        "evidenceUrl": "https://jalrakshak.local/evidence/sample_waterlog.jpg",
        "trackId": "TRK-001",
        "isTestEvent": True
    }

    print("========================================")
    print("  JAL-RAKSHAK EDGE - TEST EVENT SENDER  ")
    print("========================================")
    print(f"Target URL   : {adapter.api_url}")
    print(f"Camera ID    : {camera_id}")
    print(f"Class        : {class_name}")
    print(f"Confidence   : {confidence}")
    print("Flag         : isTestEvent=True (Development Verification)")
    print("========================================")

    result = adapter.process_detection(test_payload)
    if result:
        if result.get("deduped"):
            print("\nNOTICE: Event acknowledged by backend (deduplicated within window):")
        else:
            print("\nSUCCESS: Backend confirmed event persistence!")
        print(json.dumps(result, indent=2))
        return True
    else:
        print("\nFAILURE: Backend rejected or failed to process event.")
        return False


if __name__ == "__main__":
    success = send_test_observation()
    sys.exit(0 if success else 1)
