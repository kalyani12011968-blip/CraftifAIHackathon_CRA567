# JAL-RAKSHAK Edge — PipeGen v0.5.1 Setup & Compilation Guide

**CraftifAI PipeGen + NVIDIA TensorRT + DeepStream on Edge Hardware**

---

## 1. Environment Audit & Prerequisites

The edge environment audit verified the following host & WSL2 setup:
- **Operating System:** Windows 11 with WSL2 (Ubuntu 24.04 LTS)
- **NVIDIA GPU:** NVIDIA GeForce RTX 4050 Laptop GPU (Ada Lovelace, Compute Capability 8.9)
- **Host NVIDIA Driver:** 615.78.05 / CUDA 13.4 UMD
- **Container Runtime:** Docker 29.1.3 with NVIDIA Container Toolkit inside WSL2
- **Python Version:** Python 3.12 (WSL2) / Python 3.14 (Host)
- **Target PipeGen Version:** `PipeGen v0.5.1` (Hackathon Track A Specification)

---

## 2. PipeGen 5-Stage Workflow

PipeGen mandates the following sequence:
$$\text{Requirement} \longrightarrow \text{Pipeline IR} \longrightarrow \text{Model Selection} \longrightarrow \text{Compiler} \longrightarrow \text{Run}$$

### Stage 1: Requirement
- Detect visible standing surface water and road waterlogging at critical monitoring locations (e.g. Adyar Bridge, Velachery lowland road).
- Target throughput: $\ge 25\text{ FPS}$ on RTX 4050.
- Target latency: $\le 25\text{ ms}$ inference pass.

### Stage 2: Pipeline IR
Defined in [`vision-edge/config/pipeline_ir.json`](file:///c:/PowerHouse-main/vision-edge/config/pipeline_ir.json):
- Source node: video input (file/camera/RTSP).
- Preprocessing: Resize to $640 \times 640$, RGB normalization.
- Inference node: TensorRT engine binding.
- Postprocess node: NMS filter, confidence $\ge 0.50$, IoU $0.45$.
- Event sink: EdgeAdapter HTTP/Socket.IO emitter.

### Stage 3: Model Selection
- Model: `yolov8n_water_hazard` (YOLOv8 Nano detection architecture customized for standing water / waterlogging).
- Target Classes: `standing_water`, `road_waterlogging`.
- Precision: **FP16** for maximum throughput on RTX 4050 Tensor Cores.
- Specification file: [`vision-edge/model/model_spec.json`](file:///c:/PowerHouse-main/vision-edge/model/model_spec.json).

### Stage 4: Compiler
Run the compilation script:
```powershell
python vision-edge/pipegen/compile_pipeline.py
```
Inside WSL2 Ubuntu 24.04:
```bash
# Using PipeGen CLI v0.5.1
pipegen compile --ir /mnt/c/PowerHouse-main/vision-edge/config/pipeline_ir.json --output-dir /mnt/c/PowerHouse-main/vision-edge/model/

# Direct TensorRT compilation via trtexec
trtexec --onnx=/mnt/c/PowerHouse-main/vision-edge/model/yolov8n_water_hazard.onnx \
        --saveEngine=/mnt/c/PowerHouse-main/vision-edge/model/yolov8n_water_hazard_fp16.engine \
        --fp16 --inputIOFormats=fp16:chw --outputIOFormats=fp16:chw
```

### Stage 5: Run & Telemetry
Execute the inference runner:
```powershell
python vision-edge/pipegen/run_pipegen_inference.py
```
Outputs live FPS, latency (ms), and pipes events to the backend.

---

## 3. Exact Remaining Manual Steps for PipeGen Installation

Because PipeGen is a licensed developer tool requiring authentication via the CraftifAI Developer Portal:

1. **Obtain PipeGen v0.5.1 wheel/package:**
   - Log in to: [https://developer.craftifai.com/dashboard?tab=downloads](https://developer.craftifai.com/dashboard?tab=downloads)
   - Download the PipeGen v0.5.1 package for Ubuntu 24.04 / Python 3.12.
2. **Install inside WSL2 Ubuntu 24.04:**
   ```bash
   wsl -d Ubuntu-24.04
   cd /mnt/c/PowerHouse-main
   pip install --upgrade pip
   pip install craftifai_pipegen-0.5.1-py3-none-any.whl  # or wheel provided
   ```
3. **Verify installation:**
   ```bash
   pipegen --version
   ```
4. **Compile the engine:**
   ```bash
   python3 vision-edge/pipegen/compile_pipeline.py
   ```

*Note: In the meantime, the pipeline includes a verified development runner, mock-model runner, automated contract tests, and edge adapter ready to ingest real engine outputs.*
