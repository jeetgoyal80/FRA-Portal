from fastapi import APIRouter, HTTPException, Query
from db import insert_scheme, get_scheme_by_name, fetch_schemes, write_dss_log
from services.scheme_service import find_eligible_people_by_scheme
from utils.llm_utils import parse_dss_query  # your LLM query parser

router = APIRouter(prefix="/dss", tags=["dss"])


@router.post("/schemes")
def create_scheme(payload: dict):
    name = payload.get("name")
    eligibility = payload.get("eligibility")
    if not name or not eligibility:
        raise HTTPException(status_code=400, detail="name and eligibility required")

    scheme_id = insert_scheme(name, payload.get("description", ""), eligibility)
    return {"id": scheme_id, "name": name}


@router.get("/schemes")
def list_schemes():
    return fetch_schemes()


@router.get("/check")
def dss_check(q: str = Query(..., description="Natural language query")):
    try:
        parsed = parse_dss_query(q) or {}
    except Exception as e:
        return {"status": "error", "message": f"Could not parse query: {str(e)}"}

    scheme_name = parsed.get("scheme")
    village = parsed.get("village")

    if not scheme_name:
        return {"status": "error", "message": "Could not extract scheme name from query"}

    scheme = get_scheme_by_name(scheme_name)
    if not scheme:
        return {"status": "error", "message": f"Scheme '{scheme_name}' not found"}

    try:
        results = find_eligible_people_by_scheme(scheme, village)
    except Exception as e:
        return {"status": "error", "message": f"Database error: {str(e)}"}

    # Handle village not found (if no match but village was given)
    if village and len(results) == 0:
        # Try again with all villages
        results = find_eligible_people_by_scheme(scheme, None)
        message = f"No results found for village '{village}', showing results for all villages"
    else:
        message = "Success"

    # log for audit
    sample = results[:5]
    try:
        write_dss_log(q, parsed, scheme["id"], len(results), sample)
    except Exception as e:
        # Don’t block API if logging fails
        print(f"Log error: {e}")

    return {
        "status": "ok",
        "message": message,
        "scheme": scheme_name,
        "village": village,
        "count": len(results),
        "results": sample,
    }
