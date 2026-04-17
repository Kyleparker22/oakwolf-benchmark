import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import assessments, context, responses, scoring, leads, results, ai

load_dotenv()

app = FastAPI(
    title="Oakwolf Epic Security Benchmark API",
    description="Deterministic benchmarking engine for Epic Security and IAM maturity assessment.",
    version="1.0.0",
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assessments.router)
app.include_router(context.router)
app.include_router(responses.router)
app.include_router(scoring.router)
app.include_router(leads.router)
app.include_router(results.router)
app.include_router(ai.router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "oakwolf-benchmark-api"}

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Oakwolf Epic Security Benchmark API",
        "docs": "/docs",
        "health": "/health",
    }
