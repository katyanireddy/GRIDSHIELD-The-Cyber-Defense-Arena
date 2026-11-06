import asyncio
import pandas as pd
import math
import joblib
import hashlib
import json
from pathlib import Path
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
from typing import List
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="GRIDSHIELD",
    description="Cyber-physical microgrid defense simulation",
    version="0.1.0",
)

# Local development only. Restrict CORS before deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Entirely simulated microgrid. No real grid/device connections.
GRID_TEMPLATE = {
    "G-01": {"name": "Main Generator", "voltage": 1.00, "frequency": 50.00, "load": 72.0},
    "S-01": {"name": "Solar Farm", "voltage": 1.01, "frequency": 50.00, "load": 35.0},
    "B-01": {"name": "Battery Storage", "voltage": 0.99, "frequency": 50.01, "load": 28.0},
    "N-01": {"name": "North Substation", "voltage": 1.00, "frequency": 49.99, "load": 61.0},
    "N-02": {"name": "North Residential", "voltage": 0.98, "frequency": 50.00, "load": 45.0},
    "E-01": {"name": "East Industrial", "voltage": 1.02, "frequency": 50.01, "load": 83.0},
    "W-01": {"name": "West Hospital", "voltage": 1.00, "frequency": 50.00, "load": 54.0},
    "C-01": {"name": "Campus Feeder", "voltage": 0.99, "frequency": 49.99, "load": 39.0},
}



def timestamp():
    return datetime.now(timezone.utc).isoformat()


def fresh_grid():
    return {
        node_id: {
            **values,
            "expected_voltage": values["voltage"],
            "expected_frequency": values["frequency"],
            "expected_load": values["load"],
            "status": "healthy",
            "compromised": False,
            "isolated": False,
        }
        for node_id, values in GRID_TEMPLATE.items()
    }

def get_baseline_config_hash():
    config = [
        {
            "id": node_id,
            "name": node["name"],
            "voltage": node["voltage"],
            "frequency": node["frequency"],
            "load": node["load"],
        }
        for node_id, node in GRID_TEMPLATE.items()
    ]

    serialized = json.dumps(config, sort_keys=True).encode("utf-8")
    return hashlib.sha256(serialized).hexdigest()


BASELINE_CONFIG_HASH = get_baseline_config_hash()

state = {
    "running": True,
    "grid": fresh_grid(),
    "incidents": [],
    "timeline": [],
    "last_detection": [],
    "attack_active": False,
    "island_mode": False,
}


# Load trained GRIDSHIELD ML detector
MODEL_PATH = Path(__file__).resolve().parent / "models" / "gridshield_detector.joblib"

try:
    saved_artifact = joblib.load(MODEL_PATH)
    ml_model = saved_artifact["model"]
    ml_model_name = saved_artifact["model_name"]
    ml_model_features = saved_artifact["features"]
    ML_MODEL_LOADED = True
except FileNotFoundError:
    ml_model = None
    ml_model_name = "unavailable"
    ml_model_features = []
    ML_MODEL_LOADED = False


def log_event(event, details):
    state["timeline"].append({
        "timestamp": timestamp(),
        "event": event,
        "details": details,
    })


class AttackRequest(BaseModel):
    node_ids: List[str] = Field(min_length=1)
    voltage_shift: float = Field(default=0.12, ge=0.03, le=0.30)


class NodeRequest(BaseModel):
    node_ids: List[str] = Field(min_length=1)


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "service": "GRIDSHIELD Simulation Engine",
        "simulation_only": True,
    }


@app.get("/api/grid")
def get_grid():
    return {
        "running": state["running"],
        "nodes": state["grid"],
        "node_count": len(state["grid"]),
        "attack_active": state["attack_active"],
    }


@app.post("/api/simulation/reset")
def reset_simulation():
    state["running"] = True
    state["grid"] = fresh_grid()
    state["incidents"] = []
    state["timeline"] = []
    state["last_detection"] = []
    state["attack_active"] = False
    state["island_mode"] = False

    log_event("SIMULATION_RESET", "Microgrid restored to baseline state.")
    return {"message": "Simulation reset", "grid": state["grid"]}

@app.post("/api/island-mode")
def activate_island_mode():
    state["island_mode"] = True
    state["running"] = True

    log_event(
        "ISLAND_MODE_ACTIVATED",
        "Microgrid disconnected from regional grid. Operating in island mode."
    )

    return {
        "message": "Island mode activated",
        "island_mode": state["island_mode"],
        "grid": state["grid"],
    }


@app.post("/api/verify-hash")
def verify_hash():
    current_config = [
    {
        "id": node_id,
        "name": node["name"],
        "voltage": node["voltage"],
        "frequency": node["frequency"],
        "load": node["load"],
    }
    for node_id, node in state["grid"].items()
]

    serialized = json.dumps(current_config, sort_keys=True).encode("utf-8")
    current_hash = hashlib.sha256(serialized).hexdigest()

    integrity_ok = current_hash == BASELINE_CONFIG_HASH

    log_event(
        "HASH_VERIFICATION",
        "Baseline configuration integrity verified."
        if integrity_ok
        else "Configuration integrity mismatch detected."
    )

    return {
        "integrity_ok": integrity_ok,
        "baseline_hash": BASELINE_CONFIG_HASH,
        "current_hash": current_hash,
        "message": (
            "Configuration integrity verified."
            if integrity_ok
            else "Configuration integrity mismatch detected."
        ),
    }


@app.post("/api/attack")
def launch_attack(request: AttackRequest):
    if state["attack_active"]:
        raise HTTPException(409, "An attack is already active. Mitigate or reset first.")

    for node_id in request.node_ids:
        if node_id not in state["grid"]:
            raise HTTPException(404, f"Unknown node: {node_id}")

    for node_id in request.node_ids:
        node = state["grid"][node_id]
        if node["isolated"]:
            raise HTTPException(409, f"Node {node_id} is isolated.")

        # Alter reported sensor data only, not the simulated physical baseline.
        node["voltage"] = round(
            node["expected_voltage"] + request.voltage_shift, 3
        )
        node["compromised"] = True
        node["status"] = "under_attack"

    state["attack_active"] = True
    incident = {
        "id": f"INC-{len(state['incidents']) + 1:03d}",
        "type": "FALSE_DATA_INJECTION",
        "nodes": request.node_ids,
        "status": "active",
        "created_at": timestamp(),
    }
    state["incidents"].append(incident)

    log_event(
        "FALSE_DATA_INJECTION",
        f"Injected false voltage telemetry into {', '.join(request.node_ids)}.",
    )

    return {
        "message": "Simulated false-data injection launched",
        "incident": incident,
        "grid": state["grid"],
    }



@app.post("/api/detect")
def detect_attack():
    detections = []

    node_type_map = {
        "G-01": "generator",
        "S-01": "solar",
        "B-01": "battery",
        "N-01": "substation",
        "N-02": "residential",
        "E-01": "industrial",
        "W-01": "hospital",
        "C-01": "campus",
    }

    if not ML_MODEL_LOADED:
        raise HTTPException(
            status_code=503,
            detail="Trained ML detector is not available.",
        )

    for node_id, node in state["grid"].items():
        if node["isolated"]:
            continue

        voltage_residual = (
            node["voltage"] - node["expected_voltage"]
        )
        frequency_residual = (
            node["frequency"] - node["expected_frequency"]
        )
        load_residual = (
            node["load"] - node["expected_load"]
        )

        voltage_deviation_pct = (
            abs(voltage_residual)
            / max(abs(node["expected_voltage"]), 1e-9)
            * 100
        )

        features = {
            "voltage": node["voltage"],
            "frequency": node["frequency"],
            "load": node["load"],
            "expected_voltage": node["expected_voltage"],
            "expected_frequency": node["expected_frequency"],
            "expected_load": node["expected_load"],
            "voltage_residual": voltage_residual,
            "frequency_residual": frequency_residual,
            "load_residual": load_residual,
            "voltage_deviation_pct": voltage_deviation_pct,
            "node_type": node_type_map[node_id],
        }

        input_df = pd.DataFrame(
            [features],
            columns=ml_model_features,
        )

        prediction = int(ml_model.predict(input_df)[0])
        attack_probability = float(
            ml_model.predict_proba(input_df)[0][1]
        )

        is_anomaly = (
            prediction == 1 and attack_probability >= 0.50
        )

        if is_anomaly:
            node["status"] = "compromised"
            node["compromised"] = True

            detections.append({
                "node_id": node_id,
                "node_name": node["name"],
                "prediction": "FALSE_DATA_INJECTION",
                "anomaly_score": round(
                    attack_probability * 100, 2
                ),
                "voltage_residual": round(
                    abs(voltage_residual), 4
                ),
                "frequency_residual": round(
                    abs(frequency_residual), 4
                ),
                "load_residual": round(
                    abs(load_residual), 4
                ),
                "confidence": round(attack_probability, 4),
                "reason": (
                    "Trained Random Forest classified telemetry "
                    "as anomalous based on deviations from "
                    "the expected operating baseline."
                ),
            })

    state["last_detection"] = detections

    log_event(
        "AI_DETECTION",
        f"{ml_model_name} flagged {len(detections)} anomalous node(s).",
    )

    return {
        "detector": f"GRIDSHIELD {ml_model_name}",
        "model_version": "1.0.0",
        "flagged_count": len(detections),
        "detections": detections,
    }


@app.post("/api/mitigate")
def mitigate(request: NodeRequest):
    for node_id in request.node_ids:
        if node_id not in state["grid"]:
            raise HTTPException(404, f"Unknown node: {node_id}")

    mitigated = []

    for node_id in request.node_ids:
        node = state["grid"][node_id]
        node["isolated"] = True
        node["status"] = "isolated"
        node["compromised"] = False

        # Discard suspect measurements and use baseline values.
        node["voltage"] = node["expected_voltage"]
        node["frequency"] = node["expected_frequency"]
        node["load"] = node["expected_load"]

        mitigated.append(node_id)

    if not any(node["compromised"] for node in state["grid"].values()):
        state["attack_active"] = False

    for incident in state["incidents"]:
        if incident["status"] == "active":
            incident["status"] = "contained"

    log_event("MITIGATION", f"Isolated suspicious nodes: {', '.join(mitigated)}.")

    return {
        "message": "Mitigation complete",
        "isolated_nodes": mitigated,
        "grid": state["grid"],
    }


@app.post("/api/recover")
def recover():
    recovered = []

    for node_id, node in state["grid"].items():
        node["voltage"] = node["expected_voltage"]
        node["frequency"] = node["expected_frequency"]
        node["load"] = node["expected_load"]
        node["compromised"] = False
        node["isolated"] = False
        node["status"] = "healthy"
        recovered.append(node_id)

    state["attack_active"] = False

    for incident in state["incidents"]:
        incident["status"] = "recovered"

    log_event("RECOVERY", "All simulated nodes restored to baseline.")

    return {
        "message": "Grid recovery complete",
        "recovered_nodes": recovered,
        "grid": state["grid"],
    }


@app.get("/api/incidents")
def get_incidents():
    return {"incidents": state["incidents"]}


@app.get("/api/timeline")
def get_timeline():
    return {"timeline": state["timeline"]}

@app.websocket("/ws/telemetry")
async def telemetry_stream(websocket: WebSocket):
    await websocket.accept()
    tick = 0

    try:
        while True:
            tick += 1
            live_nodes = {}

            for index, (node_id, node) in enumerate(state["grid"].items()):
                live_node = node.copy()

                # Small deterministic telemetry fluctuations for the
                # healthy simulated grid. Attack data remains unchanged.
                if not node["compromised"] and not node["isolated"]:
                    live_node["voltage"] = round(
                        node["expected_voltage"]
                        + 0.004 * math.sin(tick * 0.15 + index),
                        3,
                    )
                    live_node["frequency"] = round(
                        node["expected_frequency"]
                        + 0.015 * math.sin(tick * 0.10 + index),
                        3,
                    )
                    live_node["load"] = round(
                        node["expected_load"]
                        + 1.5 * math.sin(tick * 0.08 + index),
                        2,
                    )

                live_nodes[node_id] = live_node

            await websocket.send_json({
                "timestamp": timestamp(),
                "type": "telemetry_update",
                "grid_status": "under_attack" if state["attack_active"] else "operational",
                "attack_active": state["attack_active"],
                "nodes": live_nodes,
                "incidents": state["incidents"],
                "last_detection": state["last_detection"],
            })

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        print("GRIDSHIELD telemetry client disconnected")
