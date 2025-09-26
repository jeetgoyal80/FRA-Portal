# 🌳 DSS - Forest Rights Act Document System

A **FastAPI-based Decision Support System (DSS)** for managing **FRA (Forest Rights Act) documents** and checking **government scheme eligibility**.  
Supports:
- 📤 Uploading FRA documents (OCR + LLM processing)  
- ✅ Scheme eligibility checks using DSS queries  
- 🗂️ Storing logs for audits  

---

## 🚀 Setup Guide

### 1. Clone the repository
```bash
git clone https://github.com/RealRakshit/sih_fra.git
cd sih_fra
git checkout dev   # development branch
```
### Create & activate virtual environment
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Linux/Mac
source venv/bin/activate
```
### Install dependencies
```bash
pip install -r requirements.txt
```
### Configure environment variables
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/dss_db
GEMINI_API_KEY=your_api_key_here
```
### Run the Application
```bash
uvicorn main:app --reload
```

## Frontend

The frontend is built using **React + Vite**.

### Setup

1. Navigate to the frontend folder:

```bash
   cd Frontend
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```
The app should now be running on http://localhost:5173


### Build for production

```bash
npm run build
```
This will generate optimized static files inside the dist folder.
