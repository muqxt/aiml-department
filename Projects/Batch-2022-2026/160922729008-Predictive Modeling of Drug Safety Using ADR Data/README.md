# PREDICTIVE MODELLING OF DRUG SAFETY USING ADVERSE DRUG REACTION DATA

A full-stack web application that combines machine learning with real-world ADR data to provide drug safety predictions, drug-drug interaction checks, and community-driven adverse reaction reporting.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- **🔮 Drug Safety Prediction** - ML-powered risk assessment with confidence scores
- **⚠️ Drug-Drug Interaction Check** - Query known interactions from clinical database
- **📊 Community ADR Reporting** - Submit and view adverse drug reaction reports
- **🚨 Community Alerts** - Aggregated safety alerts from community reports
- **📈 Real-World Data** - Trained on 376,491+ FDA FAERS records

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, Tailwind CSS, Vanilla JavaScript |
| Backend | Python 3.9+, FastAPI |
| ML Model | Scikit-learn (RandomForest) |
| Database | MySQL 8.0+ |
| Testing | Pytest, Hypothesis |

## Quick Start

### Prerequisites

- Python 3.9 or higher
- MySQL 8.0 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
```

2. **Install Python dependencies**
```bash
pip install -r backend/requirements.txt
```

3. **Configure database**

Create a `.env` file in the `backend/` directory:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pulsefy
```

4. **Initialize the database**
```bash
mysql -u root -p < backend/schema.sql
```

5. **Load drug-drug interaction data**
```bash
python backend/load_interactions.py
```

6. **Train the ML model**
```bash
python backend/train_model.py
```
This will create `backend/model.pkl` (required for predictions).

7. **Start the API server**
```bash
cd backend
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`

8. **Open the frontend**

Open `frontend/index.html` in your browser, or serve with:
```bash
npx serve frontend
```

## Project Structure

```
D1/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── train_model.py          # ML training pipeline
│   ├── load_interactions.py    # DDI data loader
│   ├── schema.sql              # Database schema
│   ├── test_properties.py      # Property-based tests
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Environment template
├── frontend/
│   ├── index.html              # Home page
│   ├── predict.html            # Prediction interface
│   ├── ddi.html                # DDI checker
│   ├── report.html             # ADR reporting
│   ├── alerts.html             # Community alerts
│   └── js/
│       ├── predict.js
│       ├── ddi.js
│       ├── report.js
│       └── alerts.js
├── data/
│   ├── fda_adverse_events_2015_2026.csv
│   └── db_drug_interactions.csv
└── README.md
```

## API Endpoints

### POST /predict
Predict adverse event risk for drug combinations.

**Request:**
```json
{
  "drugs": ["aspirin", "warfarin"],
  "age": 65,
  "gender": "male",
  "disease": "atrial fibrillation"
}
```

**Response:**
```json
{
  "predictions": [{
    "drug_name": "aspirin",
    "risk_level": "High",
    "severity": "Serious",
    "confidence": "78%",
    "explanation": ["Similar cases marked as serious", "..."],
    "common_reactions": ["bleeding", "nausea"],
    "recommendation": "Consult a doctor before use."
  }],
  "interactions": [...],
  "alerts": [...]
}
```

### POST /report
Submit an adverse drug reaction report.

**Request:**
```json
{
  "drug": "metformin",
  "reaction": "nausea and vomiting",
  "severity": "Mild"
}
```

### GET /alerts
Retrieve community safety alerts.

## Running Tests

```bash
pytest backend/test_properties.py -v
```

18 property-based tests covering ML pipeline, API endpoints, and database operations.

## Model Performance

- **Algorithm:** RandomForest Classifier
- **Accuracy:** 83.7%
- **Features:** 6 (drug, age, gender, num_drugs, hospitalization, life_threat)
- **Training Data:** 376,491 FDA FAERS records
- **Drugs Covered:** 8,431 unique drugs

## Configuration

### Database Setup

The application requires two tables:
- `drug_interactions` - Drug-drug interaction pairs
- `community_reports` - User-submitted ADR reports

See `backend/schema.sql` for complete schema.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | MySQL host | localhost |
| DB_PORT | MySQL port | 3306 |
| DB_USER | Database user | root |
| DB_PASSWORD | Database password | (required) |
| DB_NAME | Database name | pulsefy |


## Authors

- Muhammed Usman Khan - 160922729001
- Mohd Azeem - 160922729008
- Sufiyan Mehmood Nizami - 160922729013

Under the Guidance of:
Dr. Abdul Rasool MD (Associate Professor)


## Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for safer medication use**
