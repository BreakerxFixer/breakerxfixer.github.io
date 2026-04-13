from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes import ctf_routes

app = FastAPI(
    title="BreakerxFixer CTF API",
    description="A safe and controlled vulnerable API for CTF challenges.",
    version="1.0.0"
)

# Configuración CORS para permitir llamadas desde el frontend de GitHub Pages
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:5500", 
    "http://127.0.0.1:5500",
    "https://breakerxfixer.github.io"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
