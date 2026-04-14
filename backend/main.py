from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from .routes import ctf_routes
from .database import init_db

app = FastAPI(
    title="BreakerxFixer CTF API",
    description="Nothing to see here.",
    version="1.0.0",
    docs_url=None,    # Disable Swagger UI — recon is part of the challenge
    redoc_url=None,   # Disable ReDoc
    openapi_url=None  # Disable OpenAPI schema endpoint
)

@app.on_event("startup")
async def startup_event():
    init_db()

# Configuración CORS — El backend es un laboratorio público de CTF
# Se permiten todos los orígenes para que cualquier usuario pueda acceder
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [NEW] Simple Rate Limiting Middleware
# This keeps track of requests per IP in memory (for lab purposes)
from collections import defaultdict
import time

request_counts = defaultdict(list)
RATE_LIMIT = 5000 # requests (Aumentado para permitir fuzzeo en el CTF)
TIME_WINDOW = 60 # seconds

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    now = time.time()
    
    # Filter out old requests
    request_counts[client_ip] = [t for t in request_counts[client_ip] if now - t < TIME_WINDOW]
    
    if len(request_counts[client_ip]) >= RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Slow down, hacker."}
        )
    
    request_counts[client_ip].append(now)
    return await call_next(request)

# Reto 9: Information Disclosure en errores (405 Method Not Allowed)
@app.exception_handler(405)
async def method_not_allowed_handler(request: Request, exc: HTTPException):
    headers = {"X-Backend-Flag": "bxf{1nf0_d1scl0sur3_1n_3rr0rs}"}
    return JSONResponse(
        status_code=405,
        content={"detail": "Method Not Allowed - Did you look at the headers?"},
        headers=headers
    )

app.include_router(ctf_routes.router, prefix="/api/v1")

@app.get("/robots.txt", response_class=PlainTextResponse)
def get_robots():
    return "User-agent: *\nDisallow: /api/v1/s1/unseen_path\n\n# Keep digging, the flag is not far."

@app.get("/")
def read_root():
    return {"message": "Welcome to the BreakerxFixer Backend! Nothing vulnerable here... right?"}
