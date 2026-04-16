from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from .routes import ctf_routes
from .database import init_db
from collections import defaultdict, deque
from threading import Lock
import os
import time

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

# CORS is explicit by default and configurable with env var.
# Example: CORS_ORIGINS="https://breakerxfixer.github.io,https://www.breakerxfixer.github.io"
default_origins = [
    "https://breakerxfixer.github.io",
    "https://www.breakerxfixer.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
env_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
cors_origins = env_origins if env_origins else default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sliding window in-memory limiter (safe default; still externalize if horizontally scaling).
request_counts: dict[str, deque] = defaultdict(deque)
request_lock = Lock()
RATE_LIMIT = int(os.getenv("RATE_LIMIT_REQUESTS_PER_WINDOW", "5000"))
TIME_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

def _extract_client_ip(request: Request) -> str:
    # Use first IP from X-Forwarded-For when present (proxy setup),
    # otherwise fallback to direct client socket host.
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        first_ip = forwarded.split(",")[0].strip()
        if first_ip:
            return first_ip
    return request.client.host if request.client else "unknown"

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = _extract_client_ip(request)
    now = time.time()

    with request_lock:
        bucket = request_counts[client_ip]
        threshold = now - TIME_WINDOW
        while bucket and bucket[0] < threshold:
            bucket.popleft()

        if len(bucket) >= RATE_LIMIT:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Slow down, hacker."}
            )
        bucket.append(now)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

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
