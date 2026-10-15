"""
Unit tests for vision event normalizer and validation logic.
Run with: python -m unittest vision-edge/tests/test_event_normalizer.py
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from adapter.event_normalizer import normalize_detection, EventValidationError


class TestEventNormalizer(unittest.TestCase):

    def test_valid_detection_accepted(self):
        raw = {
            "className": "standing_water",
            "confidence": 0.85,
            "cameraId": "CAM-001",
            "bbox": [10.0, 20.0, 100.0, 50.0],
            "timestamp": "2026-10-15T14:30:00Z"
        }
        event = normalize_detection(raw)
        self.assertIsNotNone(event)
        self.assertEqual(event["className"], "standing_water")
        self.assertEqual(event["confidence"], 0.85)
        self.assertEqual(event["cameraId"], "CAM-001")
        self.assertEqual(event["bbox"], [10.0, 20.0, 100.0, 50.0])

    def test_missing_class_rejected(self):
        raw = {
            "confidence": 0.90,
            "cameraId": "CAM-001"
        }
        with self.assertRaises(EventValidationError):
            normalize_detection(raw)

    def test_invalid_confidence_rejected(self):
        raw_over = {"className": "standing_water", "confidence": 1.5}
        with self.assertRaises(EventValidationError):
            normalize_detection(raw_over)

        raw_neg = {"className": "standing_water", "confidence": -0.2}
        with self.assertRaises(EventValidationError):
            normalize_detection(raw_neg)

        raw_str = {"className": "standing_water", "confidence": "high"}
        with self.assertRaises(EventValidationError):
            normalize_detection(raw_str)

    def test_low_confidence_filtered_below_threshold(self):
        raw = {
            "className": "standing_water",
            "confidence": 0.35
        }
        event = normalize_detection(raw, confidence_threshold=0.50)
        self.assertIsNone(event)

    def test_invalid_bbox_rejected(self):
        raw_3elem = {
            "className": "standing_water",
            "confidence": 0.80,
            "bbox": [10, 20, 30]
        }
        with self.assertRaises(EventValidationError):
            normalize_detection(raw_3elem)

    def test_timestamp_normalized_to_utc_iso(self):
        raw = {
            "className": "road_waterlogging",
            "confidence": 0.75,
            "timestamp": "2026-10-15T12:00:00+00:00"
        }
        event = normalize_detection(raw)
        self.assertEqual(event["timestamp"], "2026-10-15T12:00:00Z")


if __name__ == "__main__":
    unittest.main()
