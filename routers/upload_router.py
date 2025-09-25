from fastapi import APIRouter, UploadFile, File, HTTPException
import requests
from db import get_db_connection
from utils.ocr_utils import extract_text_from_file
from utils.llm_utils import clean_with_llm  # with regex fallback

router = APIRouter(prefix="/upload", tags=["upload"])


def get_coordinates_from_address(address: str):
    """
    Get coordinates using OpenStreetMap Nominatim API.
    Returns (lat, lon) or "" if not found.
    """
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1}
        headers = {"User-Agent": "fra-doc-system"}  # required by Nominatim
        response = requests.get(url, params=params, headers=headers, timeout=10)

        if response.status_code == 200:
            results = response.json()
            if results:
                lat = results[0]["lat"]
                lon = results[0]["lon"]
                return f"{lat}, {lon}"
    except Exception as e:
        print(f"Coordinate fetch error: {e}")
    return ""


@router.post("/")
async def upload_document(file: UploadFile = File(...)):
    try:
        # 1. Read file
        file_bytes = await file.read()

        # 2. Extract OCR text
        ocr_text = extract_text_from_file(file_bytes)
        print("OCR Output:", ocr_text)

        # 3. Clean + Structure text using LLM
        data = clean_with_llm(ocr_text)
        if "error" in data:
            raise HTTPException(status_code=500, detail=data["error"])

        # 4. Ensure coordinates
        coords = str(data.get("Coordinates") or "").strip()
        if not coords:  
            # Try generating from address if missing
            address_parts = [
                data.get("Village Name", ""),
                data.get("Block", ""),
                data.get("District", ""),
                data.get("State", "")
            ]
            address = ", ".join([p for p in address_parts if p])  
            if address:
                coords = get_coordinates_from_address(address)

        data["Coordinates"] = coords

        # 5. Insert into DB
        insert_query = """
        INSERT INTO fra_documents (
            patta_holder_name, father_or_husband_name, age, gender, address,
            village_name, block, district, state, total_area_claimed,
            coordinates, land_use, claim_id, date_of_application,
            water_bodies, forest_cover, homestead
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
        """

        values = (
            str(data.get("Patta-Holder Name") or ""),
            str(data.get("Father/Husband Name") or ""),
            str(data.get("Age") or ""),
            str(data.get("Gender") or ""),
            str(data.get("Address") or ""),
            str(data.get("Village Name") or ""),
            str(data.get("Block") or ""),
            str(data.get("District") or ""),
            str(data.get("State") or ""),
            str(data.get("Total Area Claimed") or ""),
            data.get("Coordinates", ""),
            str(data.get("Land Use") or ""),
            str(data.get("Claim ID") or ""),
            str(data.get("Date of Application") or ""),
            str(data.get("Water bodies") or ""),
            str(data.get("Forest cover") or ""),
            str(data.get("Homestead") or "")
        )

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(insert_query, values)
                doc_id = cur.fetchone()[0]
                conn.commit()

        return {"status": "success", "doc_id": doc_id, "data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
