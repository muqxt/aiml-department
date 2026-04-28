import os
import pandas as pd
import mysql.connector
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

CSV_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "db_drug_interactions.csv"
)

def derive_severity(description: str) -> str:
    desc_lower = description.lower()
    if "increase" in desc_lower:
        return "Major"
    if "decrease" in desc_lower:
        return "Moderate"
    return "Minor"

def load_and_clean() -> pd.DataFrame:
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} rows from CSV.")

    df = df.rename(columns={
        "Drug 1": "drug1",
        "Drug 2": "drug2",
        "Interaction Description": "description",
    })

    df["severity"] = df["description"].apply(derive_severity)
    df["drug1"] = df["drug1"].str.lower()
    df["drug2"] = df["drug2"].str.lower()
    df = df.drop_duplicates(subset=["drug1", "drug2"])
    
    print(f"After deduplication: {len(df)} rows.")
    return df

def select_representative(df: pd.DataFrame) -> pd.DataFrame:
    if len(df) > 50:
        selected = df.sample(n=50, random_state=42)
    else:
        selected = df
    print(f"Selected {len(selected)} representative pairs for insertion.")
    return selected

def insert_pairs(df: pd.DataFrame) -> None:
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "pulsefy"),
    )
    cursor = conn.cursor()

    sql = """
        INSERT IGNORE INTO drug_interactions (drug1, drug2, severity, description)
        VALUES (%s, %s, %s, %s)
    """

    rows = [
        (row["drug1"], row["drug2"], row["severity"], row["description"])
        for _, row in df.iterrows()
    ]

    cursor.executemany(sql, rows)
    conn.commit()
    print(f"Inserted {cursor.rowcount} rows into drug_interactions.")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at '{CSV_PATH}'")
        print(f"Please ensure the drug interactions CSV is located at: {CSV_PATH}")
        exit(1)
    
    df = load_and_clean()
    selected = select_representative(df)
    insert_pairs(selected)
