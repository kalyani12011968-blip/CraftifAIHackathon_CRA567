# JAL-RAKSHAK Edge: Water-Hazard Model Specification & Training Protocol

## 1. Directory Status & Model Audit

Current files in `vision-edge/model/`:
- `model_spec.json`: Target input/output shapes, color order, and FP16 TensorRT compilation parameters.
- `labels.txt`: Class names mapping indices 0..4.
- `hazard_detector.onnx`: **MISSING (Requires domain training / download)**.

> [!WARNING]
> Generic models (COCO, Pascal VOC) detect common objects (cars, pedestrians, chairs) but **cannot recognize standing water, water accumulation, road waterlogging, or drain blockage**. Running generic object detectors and re-labeling detections as "waterlogging" is strictly prohibited by JAL-RAKSHAK safety policy.

---

## 2. Target Architecture & Tensor Contract

| Specification | Target Value | Description |
|---|---|---|
| **Architecture** | YOLOv8n / YOLOv8s Detection | Single-stage anchor-free convolutional architecture |
| **Input Shape** | `[1, 3, 640, 640]` | Batch size 1, 3 color channels, 640x640 resolution |
| **Color Space** | RGB | Normalized $[0.0, 1.0]$ with scale factor $1/255 \approx 0.0039215$ |
| **Output Shape** | `[1, 9, 8400]` | $8400$ candidate boxes; $4$ bbox coordinates $+ 5$ class logits |
| **Classes (5)** | `0: standing_water`<br>`1: road_waterlogging`<br>`2: dry_surface`<br>`3: vehicle`<br>`4: person` | Corresponds directly to `labels.txt` |
| **License Requirement** | Apache 2.0 / MIT / Non-Commercial Research | Free of proprietary encumbrance |

---

## 3. Recommended Datasets for Water-Hazard Training

To train a genuine, high-accuracy model for JAL-RAKSHAK Edge:

1. **FloodNet Dataset (CVPR):**
   - High-resolution road and waterlogging images with segmentation masks and bounding boxes.
   - Includes flooded roadways, standing water, and road infrastructure.
2. **Roboflow Road Waterlogging & Puddle Dataset:**
   - 3,400+ annotated traffic camera and street-level puddle/standing water images.
   - Direct export in YOLOv8 PyTorch format.
3. **ADE20K Environmental Subset (Class 21: Water):**
   - Contains urban and road water accumulation examples under diverse lighting.

---

## 4. Training & Export Instructions

To train and generate `hazard_detector.onnx`:

```bash
# 1. Install ultralytics
pip install ultralytics

# 2. Train on water-hazard dataset
yolo detect train \
  data=water_hazard_dataset.yaml \
  model=yolov8n.pt \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  device=0

# 3. Export to ONNX format with static shapes for TensorRT
yolo export \
  model=runs/detect/train/weights/best.pt \
  format=onnx \
  imgsz=640 \
  dynamic=False \
  opset=17 \
  simplify=True

# 4. Copy to model directory
cp best.onnx vision-edge/model/hazard_detector.onnx
```

---

## 5. TensorRT Compilation via PipeGen / trtexec

Once `hazard_detector.onnx` is placed in this folder:
```bash
# Using trtexec inside the PipeGen container:
trtexec \
  --onnx=vision-edge/model/hazard_detector.onnx \
  --saveEngine=vision-edge/model/hazard_detector_fp16.engine \
  --fp16 \
  --memPoolSize=workspace:2048MiB
```
