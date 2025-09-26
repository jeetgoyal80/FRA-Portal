import re
import psycopg2.extras
from db import get_db_connection as get_conn
from utils.llm_utils import convert_area_to_acres


def parse_acres_from_text(area_text: str) -> float:
    """Return numeric acres (float) if possible, else 0.0"""
    if not area_text:
        return 0.0
    m = re.search(r"([\d\.]+)", str(area_text))
    if not m:
        return 0.0
    return float(m.group(1))

def normalize_gender(g: str) -> str:
    if not g:
        return ""
    g = g.lower().strip()
    if g.startswith("m"): return "male"
    if g.startswith("f"): return "female"
    return g

def matches_criteria(record: dict, criteria: dict) -> bool:
    # --- Age ---
    age = None
    if record.get("age"):  # <-- use DB column `age`
        try:
            age = int(re.search(r"\d+", str(record["age"])).group(0))
        except Exception:
            pass

    if "min_age" in criteria and criteria["min_age"] is not None:
        if age is None or age < int(criteria["min_age"]):
            return False
    if "max_age" in criteria and criteria["max_age"] is not None:
        if age is None or age > int(criteria["max_age"]):
            return False

    # --- State ---
    if "state" in criteria and criteria["state"]:
        if not record.get("state") or criteria["state"].strip().lower() != record["state"].strip().lower():
            return False

    # --- Gender ---
    if "gender" in criteria and criteria["gender"]:
        if normalize_gender(criteria["gender"]) != normalize_gender(record.get("gender", "")):
            return False

    # --- Land area ---
    if "min_land_area_acres" in criteria and criteria["min_land_area_acres"] is not None:
        area_text = record.get("total_area_claimed", "")
        acres = parse_acres_from_text(area_text)
        if acres < float(criteria["min_land_area_acres"]):
            return False

    return True

def find_eligible_people_by_scheme(scheme_record: dict, village: str = None):
    q = 'SELECT * FROM fra_documents WHERE 1=1'
    params = []
    if village:
        q += ' AND village_name ILIKE %s'   # ✅ use DB column
        params.append(village)

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(q, tuple(params))
            rows = cur.fetchall()

    criteria = scheme_record.get("eligibility", {})
    return [r for r in rows if matches_criteria(r, criteria)]
