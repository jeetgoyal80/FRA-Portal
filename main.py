from fastapi import FastAPI
from routers.dss_router import router as dss_router
from routers.upload_router import router as upload_router

app = FastAPI()

# Register routers
app.include_router(dss_router)
app.include_router(upload_router)
