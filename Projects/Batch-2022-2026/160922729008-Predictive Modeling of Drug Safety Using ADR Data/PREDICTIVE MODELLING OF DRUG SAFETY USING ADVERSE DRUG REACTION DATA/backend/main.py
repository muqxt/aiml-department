import sys
import logging
import traceback
import itertools
from contextlib import asynccontextmanager
from typing import List

import joblib
import mysql.connector
from dotenv import load_dotenv
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

model = None
drug_encoder = None
reaction_map = None
db_conn = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, drug_encoder, reaction_map, db_conn

    model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    try:
        payload = joblib.load(model_path)
        model = payload["model"]
        drug_encoder = payload["drug_encoder"]
        reaction_map = payload.get("reaction_map", {})
        logger.info("model.pkl loaded successfully.")
        logger.info(f"Reaction map contains {len(reaction_map)} drugs.")
    except FileNotFoundError:
        logger.error("model.pkl not found at %s", model_path)
        sys.exit(1)
    except Exception as exc:
        logger.error("Failed to load model.pkl: %s", exc)
        sys.exit(1)

    try:
        db_conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "pulsefy"),
        )
        logger.info("MySQL connection established.")
    except mysql.connector.Error as exc:
        logger.error("Failed to connect to MySQL: %s", exc)
        sys.exit(1)

    yield

    if db_conn and db_conn.is_connected():
        db_conn.close()
        logger.info("MySQL connection closed.")

app = FastAPI(title="Pulsefy API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def internal_error_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error("Unhandled exception on %s %s:\n%s", request.method, request.url, tb)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )

class PredictRequest(BaseModel):
    drugs: List[str] = Field(..., min_length=1)
    age: int = Field(..., ge=0, le=120)
    gender: str
    disease: str

class InteractionResult(BaseModel):
    drug1: str
    drug2: str
    severity: str
    description: str

class AlertSummary(BaseModel):
    drug: str
    report_count: int
    top_reactions: List[str]

class DrugPrediction(BaseModel):
    drug_name: str
    risk_level: str
    severity: str
    confidence: str
    explanation: List[str]
    common_reactions: List[str]
    recommendation: str

class PredictResponse(BaseModel):
    predictions: List[DrugPrediction]
    interactions: List[InteractionResult]
    alerts: List[AlertSummary]

class ReportRequest(BaseModel):
    drug: str = Field(..., min_length=1)
    reaction: str = Field(..., min_length=1)
    severity: str = Field(..., min_length=1)

class ReportResponse(BaseModel):
    message: str

class AlertsResponse(BaseModel):
    alerts: List[AlertSummary]

def derive_risk_level(p: float) -> str:
    if p < 0.35:
        return "Low"
    elif p < 0.65:
        return "Medium"
    return "High"

def derive_severity(p: float) -> str:
    return "Serious" if p >= 0.5 else "Non-serious"

def interaction_checker(drugs: List[str]) -> List[InteractionResult]:
    results = []
    cursor = db_conn.cursor(dictionary=True)
    try:
        for a, b in itertools.combinations(drugs, 2):
            a_lower = a.lower()
            b_lower = b.lower()
            cursor.execute(
                """
                SELECT drug1, drug2, severity, description
                FROM drug_interactions
                WHERE (LOWER(drug1) = %s AND LOWER(drug2) = %s)
                   OR (LOWER(drug1) = %s AND LOWER(drug2) = %s)
                """,
                (a_lower, b_lower, b_lower, a_lower),
            )
            for row in cursor.fetchall():
                results.append(InteractionResult(**row))
    finally:
        cursor.close()
    return results

def get_alerts(drug_filter: List[str] = None) -> List[AlertSummary]:
    cursor = db_conn.cursor(dictionary=True)
    try:
        if drug_filter:
            drug_filter_lower = [d.lower() for d in drug_filter]
            placeholders = ','.join(['%s'] * len(drug_filter_lower))
            
            cursor.execute(
                f"""
                SELECT
                    LOWER(drug) AS drug,
                    COUNT(*) AS report_count,
                    GROUP_CONCAT(reaction ORDER BY reported_at DESC SEPARATOR '||') AS reactions_concat
                FROM community_reports
                WHERE LOWER(drug) IN ({placeholders})
                GROUP BY LOWER(drug)
                ORDER BY report_count DESC
                """,
                drug_filter_lower
            )
        else:
            cursor.execute(
                """
                SELECT
                    LOWER(drug) AS drug,
                    COUNT(*) AS report_count,
                    GROUP_CONCAT(reaction ORDER BY reported_at DESC SEPARATOR '||') AS reactions_concat
                FROM community_reports
                GROUP BY LOWER(drug)
                ORDER BY report_count DESC
                """
            )
        rows = cursor.fetchall()
    finally:
        cursor.close()

    if not rows:
        return []

    alerts = []
    for row in rows:
        raw = row["reactions_concat"] or ""
        seen = []
        for r in raw.split("||"):
            r = r.strip()
            if r and r not in seen:
                seen.append(r)
        alerts.append(
            AlertSummary(
                drug=row["drug"],
                report_count=row["report_count"],
                top_reactions=seen[:3],
            )
        )
    return alerts

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    age = request.age
    gender = request.gender.lower()
    num_drugs = len(request.drugs)
    
    gender_encoded = 1 if gender == "female" else 0
    is_hospitalized = 0
    is_life_threat = 0
    
    predictions = []
    
    for drug_name in request.drugs:
        drug_lower = drug_name.lower()
        
        if drug_lower in drug_encoder.classes_:
            drug_encoded = int(drug_encoder.transform([drug_lower])[0])
        else:
            drug_encoded = 0
        
        X = [[drug_encoded, age, gender_encoded, num_drugs, is_hospitalized, is_life_threat]]
        
        prediction = int(model.predict(X)[0])
        proba = model.predict_proba(X)[0]
        confidence_score = float(proba[prediction])
        
        risk_level = derive_risk_level(proba[1])
        severity = "Serious" if prediction == 1 else "Non-serious"
        confidence = f"{int(confidence_score * 100)}%"
        
        explanation = []
        
        if prediction == 1:
            explanation.append("Similar cases in the dataset were marked as serious")
        else:
            explanation.append("Similar cases in the dataset were marked as non-serious")
        
        if num_drugs > 3:
            explanation.append("Multiple drug usage increases risk")
        
        if age < 25:
            explanation.append("Younger patients may have different drug responses")
        elif age > 60:
            explanation.append("Older patients may be more sensitive to adverse effects")
        
        common_reactions = reaction_map.get(drug_lower, [])[:5]
        
        if risk_level == "High" or severity == "Serious":
            recommendation = "Consult a doctor before use. Close monitoring recommended."
        elif risk_level == "Medium":
            recommendation = "Consult a healthcare professional if you have concerns."
        else:
            recommendation = "Follow standard dosage guidelines and monitor for any reactions."
        
        predictions.append(DrugPrediction(
            drug_name=drug_name,
            risk_level=risk_level,
            severity=severity,
            confidence=confidence,
            explanation=explanation,
            common_reactions=common_reactions,
            recommendation=recommendation
        ))
    
    interactions = interaction_checker(request.drugs)
    alerts = get_alerts(drug_filter=request.drugs)
    
    return PredictResponse(
        predictions=predictions,
        interactions=interactions,
        alerts=alerts,
    )

@app.post("/report", response_model=ReportResponse)
async def report(request: ReportRequest):
    cursor = db_conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO community_reports (drug, reaction, severity) VALUES (%s, %s, %s)",
            (request.drug, request.reaction, request.severity),
        )
        db_conn.commit()
    finally:
        cursor.close()
    return ReportResponse(message="Report submitted successfully.")

@app.get("/alerts", response_model=AlertsResponse)
async def alerts():
    return AlertsResponse(alerts=get_alerts())
