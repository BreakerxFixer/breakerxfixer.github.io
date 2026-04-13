from fastapi import APIRouter, Header, Request, HTTPException, Form
from typing import Optional, Any
from pydantic import BaseModel
import jwt

router = APIRouter()

# Variables / "Databases" mockeadas
MOCK_USERS = {
    1: {"id": 1, "username": "admin", "role": "admin", "flag": "bxf{1d0r_m4st3r_4dm1n}"},
    10: {"id": 10, "username": "guest_user", "role": "guest", "flag": "Nothing here"}
}

RATE_LIMIT_STORE = {}

JWT_SECRET = "secret123" # Weak secret intentionally
JWT_ALGORITHM = "HS256"

# Modelos
class LoginSqlite(BaseModel):
    username: str
    password: str

class LoginNoSql(BaseModel):
    username: str
    # password can be a dict for NoSQL injection logic bypass
    password: Any 

# Reto 1: Reconocimiento y Fuzzing (Hidden Endpoint)
@router.get("/dev/secret", include_in_schema=False)
def hidden_endpoint():
    # include_in_schema=False hace que no aparezca en Swagger/Redoc
    return {"message": "You found the hidden endpoint!", "flag": "bxf{fuzz1ng_1s_k3y_t0_d1sc0v3ry}"}

# Reto 2: Insecure Direct Object Reference (IDOR)
@router.get("/user/{user_id}")
def get_user(user_id: int):
    # Supuestamente el usuario normal es id=10, pero puede pedir id=1
    user = MOCK_USERS.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_id == 1:
        return {"message": "Admin area accessed!", "flag": user["flag"]}
    return {"message": "User info", "user": user["username"]}

# Reto 3: Spoofing de Cabeceras (User-Agent)
@router.get("/internal-portal")
def internal_portal(user_agent: Optional[str] = Header(default="")):
    if user_agent == "AdminBrowser/1.0":
        return {"message": "Welcome Admin", "flag": "bxf{sp00f1ng_h34d3rs_1s_34sy}"}
    raise HTTPException(status_code=403, detail="Forbidden: You are not using AdminBrowser/1.0")

# Reto 4: Bypass de Rate Limiting
@router.post("/bruteforce-login")
def bruteforce_login(request: Request, x_forwarded_for: Optional[str] = Header(default=None)):
    ip = x_forwarded_for if x_forwarded_for else request.client.host
    
    if ip not in RATE_LIMIT_STORE:
        RATE_LIMIT_STORE[ip] = 0
    RATE_LIMIT_STORE[ip] += 1
    
    if RATE_LIMIT_STORE[ip] > 3:
        if ip == "127.0.0.1":
            pass # Bypass as we trust localhost mock
        else:
            raise HTTPException(status_code=429, detail="Too Many Requests. Rate limit exceeded.")
            
    if RATE_LIMIT_STORE.get(ip, 0) > 3 and ip == "127.0.0.1":
        return {"message": "Rate limit bypassed via trusted IP!", "flag": "bxf{x_f0rw4rd3d_byp4ss_r4t3}"}
    
    return {"message": "Invalid password, try again.", "attempts": RATE_LIMIT_STORE[ip]}


# Reto 5: Inyección SQL Emulada (Auth Bypass)
@router.post("/login-sql")
def login_sql(credentials: LoginSqlite):
    pw = credentials.password
    if "OR 1=1" in pw.upper() or "OR '1'='1" in pw.upper():
        return {"message": "Login successful Admin!", "flag": "bxf{sql1_byp4ss_m0ck3d_succ3ss}"}
    return {"message": "Invalid credentials", "status": "failed"}

# Reto 6: Path Traversal Restringido
@router.get("/download")
def download_file(file: str):
    if file == "../../../../etc/passwd":
        return {"content": "root:x:0:0:root:/root:/bin/bash\nflag_user:x:1000:1000:bxf{p4th_tr4v3rs4l_3mul4t3d}:/home/flag:/bin/bash"}
    elif ".." in file:
        return {"content": "Access Denied. Nice try but only complete paths work!"}
    return {"message": "File not found"}

# Reto 7: Command Injection Mockeada
@router.post("/ping")
def ping_server(target: str = Form(...)):
    if "; cat flag.txt" in target or "| cat flag.txt" in target:
        return {"output": "PING 8.8.8.8\n64 bytes from 8.8.8.8\n\nbxf{c0mm4nd_1nj3ct10n_s4f3ly_m0ck3d}"}
    return {"output": f"PING {target}\n64 bytes from {target}..."}

# Reto 8: JWT Weak Secret
@router.get("/jwt-auth")
def get_jwt_token():
    token = jwt.encode({"user": "guest", "role": "guest"}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token, "hint": "Get admin role. Also, the secret is very weak."}

@router.get("/jwt-verify")
def verify_jwt(authorization: Optional[str] = Header(default="")):
    if not authorization.startswith("Bearer "):
         raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.split(" ")[1]
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") == "admin":
            return {"message": "Welcome Admin!", "flag": "bxf{w34k_jwt_s3cr3t_cr4ck3d}"}
        return {"message": f"Welcome {payload.get('user')}. You are only a {payload.get('role')}."}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid signature")


# Reto 10: JSON Logic / NoSQL Auth Bypass
@router.post("/login-nosql")
def login_nosql(credentials: LoginNoSql):
    pw = credentials.password
    if isinstance(pw, dict):
        if "$ne" in pw or "$gt" in pw:
            return {"message": "Auth bypassed via NoSQL injection!", "flag": "bxf{n0sql_j50n_byp4ss}"}
    
    if pw == "admin_password_123":
        return {"message": "Logged in exactly"}
        
    return {"message": "Invalid password"}
