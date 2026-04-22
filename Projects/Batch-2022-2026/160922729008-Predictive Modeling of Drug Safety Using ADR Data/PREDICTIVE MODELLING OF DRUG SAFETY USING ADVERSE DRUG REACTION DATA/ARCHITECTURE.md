# Pulsefy Architecture Documentation

## System Overview

Pulsefy is a three-tier web application that provides drug safety predictions using machine learning, drug-drug interaction checking, and community-driven adverse reaction reporting.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Home    │ │ Predict  │ │   DDI    │ │  Report  │       │
│  │  Page    │ │   Page   │ │  Check   │ │   Page   │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │             │             │             │
│       └────────────┴─────────────┴─────────────┘             │
│                          │                                   │
│                    HTTP/HTTPS                                │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                  APPLICATION LAYER                           │
│                          │                                   │
│              ┌───────────▼──────────┐                        │
│              │   FastAPI Server     │                        │
│              │   (Uvicorn ASGI)     │                        │
│              └───────────┬──────────┘                        │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│    ┌────▼─────┐   ┌─────▼──────┐  ┌─────▼──────┐          │
│    │ /predict │   │  /report   │  │  /alerts   │          │
│    │ endpoint │   │  endpoint  │  │  endpoint  │          │
│    └────┬─────┘   └─────┬──────┘  └─────┬──────┘          │
│         │               │               │                  │
│    ┌────▼─────────┐     │               │                  │
│    │   ML Engine  │     │               │                  │
│    │ ┌──────────┐ │     │               │                  │
│    │ │Model.pkl │ │     │               │                  │
│    │ └──────────┘ │     │               │                  │
│    │ ┌──────────┐ │     │               │                  │
│    │ │Reaction  │ │     │               │                  │
│    │ │  Map     │ │     │               │                  │
│    │ └──────────┘ │     │               │                  │
│    └────┬─────────┘     │               │                  │
│         │               │               │                  │
└─────────┼───────────────┼───────────────┼──────────────────┘
          │               │               │
┌─────────┼───────────────┼───────────────┼──────────────────┐
│                    DATA LAYER                                │
│         │               │               │                  │
│    ┌────▼───────────────▼───────────────▼──────┐           │
│    │         MySQL Database Server              │           │
│    │  ┌──────────────────────────────────────┐  │           │
│    │  │  drug_interactions table             │  │           │
│    │  │  - id, drug1, drug2, severity, desc  │  │           │
│    │  └──────────────────────────────────────┘  │           │
│    │  ┌──────────────────────────────────────┐  │           │
│    │  │  community_reports table             │  │           │
│    │  │  - id, drug, reaction, severity, ts  │  │           │
│    │  └──────────────────────────────────────┘  │           │
│    └────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **HTML5** - Structure and semantic markup
- **Tailwind CSS** - Utility-first styling via CDN
- **Vanilla JavaScript** - Client-side logic and API calls
- **No build tools** - Direct browser execution

### Backend
- **Python 3.9+** - Programming language
- **FastAPI** - Modern web framework for APIs
- **Uvicorn** - ASGI server for FastAPI
- **Pydantic** - Data validation and serialization

### Machine Learning
- **Scikit-learn** - ML algorithms (RandomForest)
- **Pandas** - Data manipulation and preprocessing
- **NumPy** - Numerical computations
- **Joblib** - Model serialization

### Database
- **MySQL 8.0+** - Relational database
- **mysql-connector-python** - Python MySQL driver

### Testing
- **Pytest** - Testing framework
- **Hypothesis** - Property-based testing

## Component Details

### 1. Presentation Layer (Frontend)

#### Pages
- **index.html** - Home/dashboard with stats and navigation
- **predict.html** - Drug safety prediction interface
- **ddi.html** - Drug-drug interaction checker
- **report.html** - Community ADR reporting form
- **alerts.html** - Community alerts aggregation

#### JavaScript Modules
- **predict.js** - Handles prediction form and results display
- **ddi.js** - Manages DDI check functionality
- **report.js** - Handles ADR report submission
- **alerts.js** - Fetches and displays community alerts

#### Design System
- **Color Palette:**
  - Dark Teal: #005461
  - Medium Teal: #018790
  - Light Teal: #00B7B5
  - Off-white: #F4F4F4
- **Typography:** System fonts with Tailwind defaults
- **Components:** Cards, badges, forms, tables
- **Animations:** Fade-in, slide-up, floating icons

### 2. Application Layer (Backend)

#### API Endpoints

**POST /predict**
- **Purpose:** Generate drug safety predictions
- **Input:** 
  ```json
  {
    "drugs": ["aspirin", "warfarin"],
    "age": 65,
    "gender": "male",
    "disease": "atrial fibrillation"
  }
  ```
- **Output:**
  ```json
  {
    "predictions": [...],
    "interactions": [...],
    "alerts": [...]
  }
  ```
- **Processing:**
  1. Validate input (Pydantic)
  2. Encode features (drug, age, gender, num_drugs)
  3. Run ML prediction for each drug
  4. Query drug interactions
  5. Fetch community alerts
  6. Format and return response

**POST /report**
- **Purpose:** Submit adverse drug reaction report
- **Input:**
  ```json
  {
    "drug": "metformin",
    "reaction": "nausea and vomiting",
    "severity": "Mild"
  }
  ```
- **Output:**
  ```json
  {
    "message": "Report submitted successfully."
  }
  ```
- **Processing:**
  1. Validate input
  2. Insert into community_reports table
  3. Return confirmation

**GET /alerts**
- **Purpose:** Retrieve aggregated community alerts
- **Output:**
  ```json
  {
    "alerts": [
      {
        "drug": "aspirin",
        "report_count": 5,
        "top_reactions": ["bleeding", "nausea", "headache"]
      }
    ]
  }
  ```
- **Processing:**
  1. Query community_reports with GROUP BY
  2. Aggregate counts and reactions
  3. Sort by report count
  4. Return formatted results

#### ML Engine

**Model:** RandomForest Classifier
- **Algorithm:** Ensemble of decision trees
- **Features (6):**
  1. drug_encoded (LabelEncoder)
  2. patient_age_years (numeric)
  3. gender_encoded (0=Male, 1=Female)
  4. num_drugs (count)
  5. is_hospitalized (0/1)
  6. is_life_threat (0/1)
- **Target:** serious (0=Non-serious, 1=Serious)
- **Class Balancing:** class_weight='balanced'
- **Accuracy:** 83.7% on test set

**Prediction Pipeline:**
1. Load model.pkl at startup
2. Encode input features
3. Generate prediction (0 or 1)
4. Calculate probability scores
5. Derive risk level (Low/Medium/High)
6. Build structured explanation
7. Fetch common reactions from reaction_map
8. Generate personalized recommendation

**Reaction Mapping:**
- Dictionary: drug_name → [top 5 reactions]
- Extracted from FDA FAERS dataset
- 8,431 drugs covered
- Frequency-based ranking

### 3. Data Layer

#### Database Schema

**drug_interactions**
```sql
CREATE TABLE drug_interactions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    drug1       VARCHAR(255) NOT NULL,
    drug2       VARCHAR(255) NOT NULL,
    severity    VARCHAR(100),
    description TEXT
);
```
- **Purpose:** Store known drug-drug interactions
- **Data Source:** Curated clinical database
- **Size:** 50+ interaction pairs

**community_reports**
```sql
CREATE TABLE community_reports (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    drug        VARCHAR(255) NOT NULL,
    reaction    VARCHAR(500) NOT NULL,
    severity    VARCHAR(100) NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- **Purpose:** Store user-submitted ADR reports
- **Growth:** Increases with user submissions
- **Aggregation:** Used for community alerts

#### Data Files

**fda_adverse_events_2015_2026.csv**
- **Size:** 376,491 records
- **Source:** FDA FAERS dataset
- **Columns:** suspect_drug, patient_age_years, patient_sex, num_drugs, is_hospitalized, is_life_threat, serious, reactions
- **Usage:** ML model training

**db_drug_interactions.csv**
- **Size:** 50+ pairs
- **Columns:** Drug 1, Drug 2, Interaction Description
- **Usage:** Populate drug_interactions table

## Data Flow

### Prediction Request Flow

```
User Input (Frontend)
    ↓
Form Validation (JavaScript)
    ↓
HTTP POST /predict (JSON)
    ↓
Request Validation (Pydantic)
    ↓
Feature Encoding (Python)
    ↓
ML Prediction (Scikit-learn)
    ↓
Database Queries (MySQL)
    ↓
Response Formatting (FastAPI)
    ↓
JSON Response
    ↓
Results Rendering (JavaScript)
    ↓
Display to User (HTML/CSS)
```

### Report Submission Flow

```
User Input (Frontend)
    ↓
Form Validation (JavaScript)
    ↓
HTTP POST /report (JSON)
    ↓
Request Validation (Pydantic)
    ↓
Database Insert (MySQL)
    ↓
Commit Transaction
    ↓
Success Response (JSON)
    ↓
Toast Notification (JavaScript)
    ↓
Form Reset
```

## Security Considerations

### Input Validation
- Pydantic models for type checking
- Age range validation (0-120)
- Required field enforcement
- SQL injection prevention (parameterized queries)

### CORS Configuration
- Currently allows all origins (development)
- Should be restricted in production

### Environment Variables
- Database credentials in .env file
- Not committed to version control
- .gitignore includes .env

### Error Handling
- Generic error messages to users
- Detailed logs for debugging
- No sensitive data in responses

## Performance Optimizations

### Backend
- Model loaded at startup (not per request)
- Database connection pooling
- Efficient SQL queries with indexes
- Async/await for I/O operations

### Frontend
- CDN for Tailwind CSS
- Minimal JavaScript dependencies
- Lazy loading for results
- Optimized animations (GPU-accelerated)

### Database
- Indexes on frequently queried columns
- Efficient GROUP BY for aggregations
- Connection reuse

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Load balancer compatible
- Multiple uvicorn workers

### Vertical Scaling
- Efficient memory usage
- Optimized model size
- Database query optimization

### Caching Opportunities
- Prediction results (same inputs)
- Drug interaction lookups
- Reaction mappings
- Community alerts

## Monitoring and Logging

### Application Logs
- Startup events
- Request/response logging
- Error tracking
- Performance metrics

### Database Logs
- Query execution times
- Connection pool status
- Transaction logs

### Frontend Monitoring
- API call success/failure
- User interaction tracking
- Error reporting

## Deployment Architecture

### Development
- Local MySQL instance
- Uvicorn with --reload
- Direct HTML file access

### Production (Recommended)
- MySQL on dedicated server
- Gunicorn with multiple workers
- Nginx reverse proxy
- HTTPS with SSL certificates
- Static file CDN
- Database backups
- Log aggregation
- Health checks
- Rate limiting

## Future Enhancements

### Short Term
- User authentication
- API rate limiting
- Response caching
- Enhanced error messages
- More comprehensive tests

### Medium Term
- Real-time notifications
- Advanced analytics dashboard
- Export functionality
- Multi-language support
- Mobile responsive improvements

### Long Term
- Mobile app (React Native)
- Integration with EHR systems
- Advanced ML models (deep learning)
- Federated learning for privacy
- Blockchain for data integrity

---

This architecture is designed to be maintainable, scalable, and extensible while providing a solid foundation for drug safety intelligence.
