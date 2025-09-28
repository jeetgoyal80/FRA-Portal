from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.dss_router import router as dss_router
from routers.upload_router import router as upload_router
from routers.model_pred import router as model_pred


app = FastAPI()

# ✅ Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 👈 You can restrict to ["http://localhost:3000"] later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(dss_router)
app.include_router(upload_router)
app.include_router(model_pred)