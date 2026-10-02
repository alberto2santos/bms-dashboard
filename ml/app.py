import os
import threading
import time
from pathlib import Path
from typing import Annotated

import joblib
import numpy as np
import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sklearn.ensemble import IsolationForest

app = FastAPI(title="Sentinel BMS ML", version="1.0.0")
model_lock = threading.Lock()
model_bundle = None
model_path = Path(os.getenv("MODEL_PATH", "/models/isolation-forest.joblib"))


class Readings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tankLevelPercent: float = Field(ge=0, le=100, allow_inf_nan=False)
    demandKw: float = Field(ge=0, allow_inf_nan=False)
    energyKwh: float = Field(ge=0, allow_inf_nan=False)


class Telemetry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schemaVersion: int = Field(ge=1, le=1)
    deviceId: str = Field(min_length=1, max_length=64)
    timestamp: int = Field(ge=0)
    readings: Readings


def authorize(authorization: Annotated[str | None, Header()] = None):
    expected = os.getenv("SERVICE_API_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="SERVICE_API_TOKEN is not configured")
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def load_bundle():
    global model_bundle
    if model_bundle is not None:
        return model_bundle
    if not model_path.exists():
        raise HTTPException(status_code=409, detail="Model has not been trained")
    with model_lock:
        if model_bundle is None:
            model_bundle = joblib.load(model_path)
    return model_bundle


@app.get("/health")
def health():
    return {"status": "ok", "modelReady": model_path.exists()}


@app.post("/train", dependencies=[Depends(authorize)])
def train():
    global model_bundle
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured")

    with psycopg.connect(database_url) as connection:
        rows = connection.execute(
            """SELECT tank_level_percent, demand_kw
               FROM telemetry_readings ORDER BY timestamp_ms DESC LIMIT 50000"""
        ).fetchall()

    if len(rows) < 100:
        raise HTTPException(status_code=409, detail="At least 100 persisted telemetry samples are required")

    features = np.asarray(rows, dtype=np.float64)
    model = IsolationForest(n_estimators=200, contamination=0.03, random_state=42, n_jobs=-1)
    model.fit(features)
    bundle = {"model": model, "trained_at": int(time.time() * 1000), "sample_count": len(rows)}

    with model_lock:
        model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(bundle, model_path)
        model_bundle = bundle

    return {"trainedAt": bundle["trained_at"], "sampleCount": bundle["sample_count"], "features": ["tankLevelPercent", "demandKw"]}


@app.post("/predict", dependencies=[Depends(authorize)])
def predict(telemetry: Telemetry):
    bundle = load_bundle()
    readings = telemetry.readings
    features = np.asarray([[readings.tankLevelPercent, readings.demandKw]], dtype=np.float64)
    model = bundle["model"]
    return {
        "deviceId": telemetry.deviceId,
        "timestamp": telemetry.timestamp,
        "isAnomaly": bool(model.predict(features)[0] == -1),
        "anomalyScore": float(model.decision_function(features)[0]),
        "modelTrainedAt": bundle["trained_at"],
        "sampleCount": bundle["sample_count"],
    }