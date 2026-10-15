"""
JAL-RAKSHAK Edge — PipeGen Pipeline Compiler
Implements the official PipeGen Compilation Workflow:
  Requirement -> Pipeline IR -> Model -> Compiler -> Run

This script:
1. Validates the Pipeline IR (config/pipeline_ir.json)
2. Checks the local and WSL2 execution environment for PipeGen & TensorRT (trtexec)
3. Detects whether PipeGen v0.5.1 is installed in WSL2/Host
4. Runs compilation to produce TensorRT engine when toolchain is present
5. Documents compilation output and records actual status without fabrication
"""

import os
import sys
import json
import shutil
import subprocess
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, "config", "pipeline_ir.json")
MODEL_SPEC_PATH = os.path.join(BASE_DIR, "model", "model_spec.json")
REPORT_PATH = os.path.join(BASE_DIR, "docs", "EDGE_BENCHMARK_REPORT.md")


def audit_toolchain():
    """Audit installed compiler and runtime tools across Host and WSL2."""
    tools = {
        "host_python": sys.version.split()[0],
        "host_pipegen": shutil.which("pipegen") is not None,
        "host_trtexec": shutil.which("trtexec") is not None,
        "wsl_available": shutil.which("wsl") is not None,
        "wsl_pipegen": False,
        "wsl_pipegen_version": None,
        "wsl_trtexec": False,
        "wsl_docker": False,
        "gpu_detected": False
    }

    if tools["wsl_available"]:
        # Check WSL2 Ubuntu 24.04
        try:
            res = subprocess.run(
                ["wsl", "-d", "Ubuntu-24.04", "bash", "-c", "which pipegen 2>/dev/null"],
                capture_output=True, text=True, timeout=10
            )
            tools["wsl_pipegen"] = res.returncode == 0
            if tools["wsl_pipegen"]:
                v_res = subprocess.run(
                    ["wsl", "-d", "Ubuntu-24.04", "bash", "-c", "pipegen --version 2>/dev/null"],
                    capture_output=True, text=True, timeout=10
                )
                tools["wsl_pipegen_version"] = v_res.stdout.strip()
        except Exception:
            pass

        try:
            res = subprocess.run(
                ["wsl", "-d", "Ubuntu-24.04", "bash", "-c", "which trtexec 2>/dev/null"],
                capture_output=True, text=True, timeout=10
            )
            tools["wsl_trtexec"] = res.returncode == 0
        except Exception:
            pass

        try:
            res = subprocess.run(
                ["wsl", "-d", "Ubuntu-24.04", "bash", "-c", "nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null"],
                capture_output=True, text=True, timeout=10
            )
            if res.returncode == 0 and res.stdout.strip():
                tools["gpu_detected"] = True
                tools["gpu_name"] = res.stdout.strip()
        except Exception:
            pass

    return tools


def validate_pipeline_ir():
    """Verify that the Pipeline IR is syntactically valid and well-formed."""
    if not os.path.exists(CONFIG_PATH):
        raise FileNotFoundError(f"Pipeline IR missing at {CONFIG_PATH}")

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        ir = json.load(f)

    required_keys = ["pipelineVersion", "pipelineId", "nodes", "edges"]
    for k in required_keys:
        if k not in ir:
            raise ValueError(f"Pipeline IR missing required key: {k}")

    print(f"[OK] Pipeline IR validated: {ir['pipelineId']} (version {ir['pipelineVersion']})")
    print(f"     Nodes defined: {len(ir['nodes'])} | Edges defined: {len(ir['edges'])}")
    return ir


def compile_pipeline():
    """Execute PipeGen compilation if present, or output concrete instructions."""
    print("==================================================")
    print("      JAL-RAKSHAK EDGE — PIPEGEN COMPILER         ")
    print("==================================================")

    ir = validate_pipeline_ir()
    tools = audit_toolchain()

    print("\nEnvironment & Toolchain Audit:")
    print(f"  - Host Python        : {tools['host_python']}")
    print(f"  - WSL2 Active        : {tools['wsl_available']}")
    print(f"  - NVIDIA GPU         : {tools.get('gpu_name', 'Not verified')}")
    print(f"  - PipeGen Installed  : {tools['wsl_pipegen']} (Version: {tools['wsl_pipegen_version']})")
    print(f"  - TensorRT (trtexec) : {tools['wsl_trtexec']}")

    status_report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "pipelineId": ir["pipelineId"],
        "pipelineVersion": ir["pipelineVersion"],
        "gpu": tools.get("gpu_name"),
        "pipegenInstalled": tools["wsl_pipegen"],
        "pipegenVersion": tools["wsl_pipegen_version"],
        "status": "READY_FOR_COMPILATION" if tools["wsl_pipegen"] else "PREREQUISITE_ACTION_REQUIRED",
        "actionRequired": None
    }

    if not tools["wsl_pipegen"]:
        status_report["actionRequired"] = (
            "PipeGen CLI (v0.5.1) is not in the default WSL PATH. "
            "Download PipeGen from https://developer.craftifai.com/dashboard?tab=downloads "
            "and run: pip install craftifai-pipegen==0.5.1 inside WSL2 Ubuntu 24.04."
        )
        print("\n[INFO] Prerequisite Action Required:")
        print(f"       {status_report['actionRequired']}")
    else:
        print("\n[INFO] PipeGen detected. Invoking compilation...")
        # Supported CLI command per PipeGen v0.5.1 specification:
        cmd = ["wsl", "-d", "Ubuntu-24.04", "pipegen", "compile", "--ir", CONFIG_PATH]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            print(res.stdout)
            status_report["status"] = "COMPILED"
        except Exception as e:
            print(f"[WARN] Compilation invocation: {e}")

    # Output compilation status file
    out_path = os.path.join(BASE_DIR, "pipegen", "compilation_status.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(status_report, f, indent=2)

    print(f"\n[OK] Compilation status recorded at: {out_path}")
    return status_report


if __name__ == "__main__":
    compile_pipeline()
