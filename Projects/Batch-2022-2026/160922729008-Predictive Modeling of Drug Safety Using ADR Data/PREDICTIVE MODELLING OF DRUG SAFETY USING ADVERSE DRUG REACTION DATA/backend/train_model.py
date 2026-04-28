import os
import sys
from collections import Counter, defaultdict

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.dirname(SCRIPT_DIR)
CSV_PATH = os.path.join(WORKSPACE_ROOT, "data", "fda_adverse_events_2015_2026.csv")
MODEL_PATH = os.path.join(SCRIPT_DIR, "model.pkl")

REQUIRED_COLUMNS = [
    "suspect_drug",
    "patient_age_years",
    "patient_sex",
    "num_drugs",
    "is_hospitalized",
    "is_life_threat",
    "serious",
    "reactions"
]

def load_and_preprocess(csv_path: str) -> pd.DataFrame:
    print(f"[1/6] Loading data from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"      Loaded {len(df):,} rows, {len(df.columns)} columns.")

    print("[2/6] Selecting required columns...")
    df = df[REQUIRED_COLUMNS].copy()

    before = len(df)
    df = df.dropna(subset=REQUIRED_COLUMNS)
    print(f"      Dropped {before - len(df):,} rows with nulls → {len(df):,} rows remain.")

    df["patient_age_years"] = pd.to_numeric(df["patient_age_years"], errors="coerce")
    before = len(df)
    df = df.dropna(subset=["patient_age_years"])
    print(f"      Dropped {before - len(df):,} rows with non-numeric age → {len(df):,} rows remain.")

    df["suspect_drug"] = df["suspect_drug"].str.lower()
    df["serious"] = df["serious"].map({"Yes": 1, "No": 0})
    df["is_hospitalized"] = df["is_hospitalized"].astype(int)
    df["is_life_threat"] = df["is_life_threat"].astype(int)
    
    print("      Preprocessing complete.")
    return df

def extract_reaction_mapping(df: pd.DataFrame) -> dict:
    print("[3/6] Extracting reaction mapping...")
    
    drug_reactions = defaultdict(list)
    
    for _, row in df.iterrows():
        drug = row["suspect_drug"]
        reactions_str = str(row["reactions"])
        reactions = [r.strip().lower() for r in reactions_str.split(";") if r.strip()]
        drug_reactions[drug].extend(reactions)
    
    reaction_map = {}
    for drug, reactions in drug_reactions.items():
        counter = Counter(reactions)
        top_reactions = [r for r, _ in counter.most_common(5)]
        reaction_map[drug] = top_reactions
    
    print(f"      Extracted reactions for {len(reaction_map):,} drugs.")
    return reaction_map

def engineer_features(df: pd.DataFrame):
    print("[4/6] Engineering features...")

    df = df.copy()
    
    drug_le = LabelEncoder()
    df["drug_encoded"] = drug_le.fit_transform(df["suspect_drug"])

    gender_map = {"Male": 0, "Female": 1}
    df["gender_encoded"] = df["patient_sex"].map(gender_map).fillna(0).astype(int)

    X = df[[
        "drug_encoded",
        "patient_age_years",
        "gender_encoded",
        "num_drugs",
        "is_hospitalized",
        "is_life_threat"
    ]].to_numpy()
    
    y = df["serious"].to_numpy()

    print(f"      Feature matrix shape: {X.shape}, target shape: {y.shape}")
    print(f"      Class distribution: {np.bincount(y)}")
    return X, y, drug_le

def train_model(X: np.ndarray, y: np.ndarray):
    print("[5/6] Training RandomForestClassifier...")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=42
    )

    clf = RandomForestClassifier(
        n_estimators=100,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print(f"      Training complete.")
    print(f"      Test accuracy: {acc:.4f}")
    
    return clf

def serialize_artifacts(model, drug_le: LabelEncoder, reaction_map: dict, output_path: str):
    print(f"[6/6] Serializing artifacts to: {output_path}")
    
    payload = {
        "model": model,
        "drug_encoder": drug_le,
        "reaction_map": reaction_map,
    }
    
    joblib.dump(payload, output_path)
    print("      Done. model.pkl written successfully.")

if __name__ == "__main__":
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at '{CSV_PATH}'", file=sys.stderr)
        print(f"Please ensure the FDA adverse events CSV is located at: {CSV_PATH}")
        sys.exit(1)

    df = load_and_preprocess(CSV_PATH)
    reaction_map = extract_reaction_mapping(df)
    X, y, drug_le = engineer_features(df)
    model = train_model(X, y)
    serialize_artifacts(model, drug_le, reaction_map, MODEL_PATH)

    print(f"\nTraining complete. Model: RandomForestClassifier (balanced)")
    print(f"Artifacts saved to: {MODEL_PATH}")
    print(f"Reaction mapping includes {len(reaction_map)} drugs.")
