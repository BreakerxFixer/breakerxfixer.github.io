from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routes import ctf_routes
from .database import init_db

app = FastAPI(
    title="BreakerxFixer CTF API",
    description="A safe and controlled vulnerable API for CTF challenges.",
    version="1.0.0"
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
RATE_LIMIT = 50 # requests
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

@app.get("/")
def read_root():
    return {"message": "Welcome to the BreakerxFixer Backend! Nothing vulnerable here... right?"}
