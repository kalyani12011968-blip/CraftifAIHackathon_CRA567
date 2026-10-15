"""
JAL-RAKSHAK Edge — Pipeline IR Validator (PipeGen v0.5.1 Specification)
Validates the structural integrity, node schemas, DAG acyclicity,
and model specification consistency of the PipeGen Pipeline IR.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Dict, Any, List, Set


class PipelineIRValidationError(Exception):
    """Raised when Pipeline IR fails validation requirements."""
    pass


SUPPORTED_NODE_TYPES = {
    "VideoSource",
    "Preprocess",
    "TensorRTInference",
    "Inference",
    "NMSPostprocess",
    "Postprocess",
    "EventSink"
}

SUPPORTED_PRECISIONS = {"FP32", "FP16", "INT8"}


def validate_pipeline_ir(ir_path: str, model_spec_path: str | None = None) -> Dict[str, Any]:
    if not os.path.exists(ir_path):
        raise PipelineIRValidationError(f"Pipeline IR file not found at: {ir_path}")

    with open(ir_path, "r", encoding="utf-8") as f:
        try:
            ir_data = json.load(f)
        except json.JSONDecodeError as e:
            raise PipelineIRValidationError(f"Invalid JSON in Pipeline IR: {e}")

    # 1. Top-level metadata
    required_keys = ["pipelineVersion", "pipelineId", "nodes", "edges"]
    for key in required_keys:
        if key not in ir_data:
            raise PipelineIRValidationError(f"Missing required top-level key: '{key}'")

    version = ir_data.get("pipelineVersion")
    if not isinstance(version, str) or not version.startswith("0.5"):
        print(f"[WARNING] Pipeline version '{version}' differs from target v0.5.x")

    # 2. Nodes validation
    nodes = ir_data.get("nodes")
    if not isinstance(nodes, list) or len(nodes) == 0:
        raise PipelineIRValidationError("IR 'nodes' must be a non-empty list")

    node_ids: Set[str] = set()
    node_types: Dict[str, str] = {}

    for node in nodes:
        if not isinstance(node, dict):
            raise PipelineIRValidationError("Every node must be an object")

        nid = node.get("id")
        ntype = node.get("type")
        props = node.get("properties", {})

        if not nid or not isinstance(nid, str):
            raise PipelineIRValidationError(f"Node missing string 'id': {node}")
        if nid in node_ids:
            raise PipelineIRValidationError(f"Duplicate node id detected: '{nid}'")
        node_ids.add(nid)

        if not ntype or ntype not in SUPPORTED_NODE_TYPES:
            raise PipelineIRValidationError(f"Unsupported node type '{ntype}' for node '{nid}'")
        node_types[nid] = ntype

        # Specific node property validations
        if ntype == "Preprocess":
            res = props.get("targetResolution")
            if not isinstance(res, (list, tuple)) or len(res) != 2:
                raise PipelineIRValidationError(f"Node '{nid}' targetResolution must be [W, H]")
        elif ntype in ("TensorRTInference", "Inference"):
            prec = props.get("precision", "FP16")
            if prec not in SUPPORTED_PRECISIONS:
                raise PipelineIRValidationError(f"Node '{nid}' precision '{prec}' not in {SUPPORTED_PRECISIONS}")
        elif ntype in ("NMSPostprocess", "Postprocess"):
            conf = props.get("confidenceThreshold", 0.5)
            if not (0.0 <= float(conf) <= 1.0):
                raise PipelineIRValidationError(f"Node '{nid}' confidenceThreshold must be in [0, 1]")

    # 3. Edges & DAG acyclicity validation
    edges = ir_data.get("edges")
    if not isinstance(edges, list) or len(edges) == 0:
        raise PipelineIRValidationError("IR 'edges' must be a non-empty list")

    adj: Dict[str, List[str]] = {nid: [] for nid in node_ids}
    in_degree: Dict[str, int] = {nid: 0 for nid in node_ids}

    for edge in edges:
        u = edge.get("from")
        v = edge.get("to")
        if u not in node_ids:
            raise PipelineIRValidationError(f"Edge 'from' references unknown node: '{u}'")
        if v not in node_ids:
            raise PipelineIRValidationError(f"Edge 'to' references unknown node: '{v}'")
        adj[u].append(v)
        in_degree[v] += 1

    # Topological sort (Kahn's algorithm)
    queue = [nid for nid in node_ids if in_degree[nid] == 0]
    visited_count = 0
    while queue:
        curr = queue.pop(0)
        visited_count += 1
        for neighbor in adj[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if visited_count != len(node_ids):
        raise PipelineIRValidationError("Cyclic dependency detected in Pipeline IR graph!")

    # 4. Optional model spec cross-validation
    if model_spec_path and os.path.exists(model_spec_path):
        with open(model_spec_path, "r", encoding="utf-8") as f:
            mspec = json.load(f)
        # Check resolution alignment
        mspec_shape = mspec.get("input", {}).get("shape", [])
        if len(mspec_shape) == 4:
            mspec_h, mspec_w = mspec_shape[2], mspec_shape[3]
            for n in nodes:
                if n.get("type") == "Preprocess":
                    ires = n.get("properties", {}).get("targetResolution", [])
                    if ires and ires != [mspec_w, mspec_h]:
                        print(f"[WARNING] Preprocess resolution {ires} != model_spec {[mspec_w, mspec_h]}")

    return {
        "valid": True,
        "pipelineId": ir_data.get("pipelineId"),
        "nodeCount": len(node_ids),
        "edgeCount": len(edges),
        "nodeTypes": list(set(node_types.values()))
    }


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ir_file = os.path.join(base_dir, "config", "pipeline_ir.json")
    spec_file = os.path.join(base_dir, "model", "model_spec.json")

    print(f"Validating Pipeline IR: {ir_file}")
    try:
        report = validate_pipeline_ir(ir_file, spec_file)
        print("\n==========================================")
        print("  PIPELINE IR VALIDATION: SUCCESS         ")
        print("==========================================")
        print(f"Pipeline ID : {report['pipelineId']}")
        print(f"Nodes Count : {report['nodeCount']}")
        print(f"Edges Count : {report['edgeCount']}")
        print(f"Node Types  : {', '.join(report['nodeTypes'])}")
        print("==========================================")
        sys.exit(0)
    except PipelineIRValidationError as e:
        print(f"\n[ERROR] Pipeline IR Validation Failed: {e}", file=sys.stderr)
        sys.exit(1)
