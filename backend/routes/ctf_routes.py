from fastapi import APIRouter, Header, Request, HTTPException, Form
from typing import Optional, Any
from pydantic import BaseModel
import jwt
import sqlite3
import requests
import time
import random
import os
from ..database import get_db

router = APIRouter()

# JWT Configuration
JWT_SECRET = os.getenv("CTF_JWT_SECRET", "secret123") # Weak by default for challenge design
JWT_ALGORITHM = "HS256"

# Modelos
class LoginSqlite(BaseModel):
    username: str
    password: str

class LoginNoSql(BaseModel):
    username: str
    # password can be a dict for NoSQL injection logic bypass
    password: Any 

class MathAnswer(BaseModel):
    answer: int
    token: str

# Helper for Rate Limiting
def check_rate_limit(ip: str):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT attempts FROM rate_limits WHERE ip = ?", (ip,))
        row = cursor.fetchone()
        if not row:
            cursor.execute("INSERT INTO rate_limits (ip, attempts) VALUES (?, ?)", (ip, 0))
            conn.commit()
            return 0
        return row['attempts']
    finally:
        conn.close()

def increment_rate_limit(ip: str):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE rate_limits SET attempts = attempts + 1 WHERE ip = ?", (ip,))
        conn.commit()
    finally:
        conn.close()

# Reto 1: Reconocimiento y Fuzzing (Hidden Endpoint)
@router.get("/dev/secret", include_in_schema=False)
def hidden_endpoint():
    return {"message": "You found the hidden endpoint!", "flag": "bxf{fuzz1ng_1s_k3y_t0_d1sc0v3ry}"}

# Reto 2: Insecure Direct Object Reference (IDOR)
@router.get("/user/{user_id}")
def get_user(user_id: int):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role, flag FROM mock_users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
    
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    
        if user['id'] == 1:
            return {"message": "Admin area accessed!", "flag": user["flag"]}
        return {"message": "User info", "user": user["username"]}
    finally:
        conn.close()

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
    
    attempts = check_rate_limit(ip)
    increment_rate_limit(ip)
    
    if attempts >= 3:
        if ip == "127.0.0.1":
            pass # Bypass as we trust localhost mock
        else:
            raise HTTPException(status_code=429, detail="Too Many Requests. Rate limit exceeded.")
            
    if attempts >= 3 and ip == "127.0.0.1":
        return {"message": "Rate limit bypassed via trusted IP!", "flag": "bxf{x_f0rw4rd3d_byp4ss_r4t3}"}
    
    return {"message": "Invalid password, try again.", "attempts": attempts + 1}


# Reto 5: Inyección SQL Emulada (Auth Bypass)
@router.post("/login-sql")
def login_sql(credentials: LoginSqlite):
    pw = credentials.password
    # This is a mock SQLi, we don't actually run a vulnerable query here for safety
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

# Reto 9: Information Disclosure (Method Not Allowed)
@router.post("/system/status", include_in_schema=False)
def system_status():
    """Only POST allowed. GET will trigger 405 handled in main.py"""
    return {"status": "operational", "version": "1.2.4-stable"}

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

# Reto 11: Server-Side Request Forgery (SSRF)
@router.get("/internal/admin-flag", include_in_schema=False)
def internal_admin_flag():
    # Only "local" requests can see this (simulated)
    return {"message": "INTERNAL_ACCESS_GRANTED", "flag": "bxf{ssrf_1nt3rn4l_r3c0n_succ3ss}"}

@router.get("/fetch")
def fetch_url(url: str):
    import ipaddress
    from urllib.parse import urlparse
    
    try:
        # [SEC] SSRF Mitigation: Block internal/private IP ranges
        parsed_url = urlparse(url)
        hostname = parsed_url.hostname
        
        # Check if it's a valid IP and block private ranges
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback:
                 return {"error": "Access Denied", "hint": "I cannot fetch from internal or loopback addresses. Security first!"}
        except ValueError:
            # It's a domain, in a real env we would resolve it and check the IP
            # For this lab, we'll allow it but monitor for 'localhost' keywords
            if hostname in ['localhost', '127.0.0.1', '0.0.0.0']:
                return {"error": "Access Denied", "hint": "Localhost addresses are strictly forbidden."}

        # Simple SSRF vulnerability: fetching user-supplied URL
        # NOTE: Even with filters, logic bugs can exist!
        response = requests.get(url, timeout=2)
        return {
            "status": "fetched",
            "url": url,
            "content_preview": response.text[:200]
        }
    except Exception as e:
        return {"error": str(e), "hint": "I can only fetch valid URLs. Try scanning the internal network."}


# ----------------------------------------------------
# RETO 21 / M21 : Programming - The Math API
# ----------------------------------------------------
@router.get("/math-challenge")
def get_math_challenge():
    operators = ['+', '-', '*']
    op = random.choice(operators)
    a, b = random.randint(10, 100), random.randint(1, 10)
    
    if op == '+': ans = a + b
    elif op == '-': ans = a - b
    else: ans = a * b
    
    equation = f"{a} {op} {b}"
    
    # Store state in a fast JWT token
    payload = {
        "ans": ans,
        "streak": 0,
        "start_time": time.time(),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    
    return {
        "message": "Welcome to the Math API! Solve 100 equations within 5 seconds to get the flag.",
        "equation": equation,
        "token": token
    }

@router.post("/math-challenge")
def post_math_challenge(data: MathAnswer):
    try:
        payload = jwt.decode(data.token, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return {"error": "Invalid token. Start with GET /math-challenge"}
        
    if time.time() - payload.get("start_time", 0) > 5.0:
        return {"error": "Too slow! Your session expired. Max 5 seconds total! Start over."}
        
    if payload.get("ans") != data.answer:
        return {"error": "Wrong answer! Back to 0."}
        
    new_streak = payload.get("streak", 0) + 1
    
    if new_streak >= 100:
        return {
            "success": True,
            "message": "Incredible speed! Are you a bot?",
            "flag": "bxf{m4th_4p1_scr1pt_m4st3r}"
        }
        
    operators = ['+', '-', '*']
    op = random.choice(operators)
    a, b = random.randint(10, 500), random.randint(1, 50)
    if op == '+': ans = a + b
    elif op == '-': ans = a - b
    else: ans = a * b
    
    equation = f"{a} {op} {b}"
    new_payload = {
        "ans": ans,
        "streak": new_streak,
        "start_time": payload["start_time"],
    }
    
    return {
        "message": f"Correct! Streak: {new_streak}/100",
        "equation": equation,
        "token": jwt.encode(new_payload, JWT_SECRET, algorithm="HS256")
    }


# --- SEASON 1 CHALLENGE ROUTES ---

@router.get("/s1/unseen_path", include_in_schema=False)
def s1_hidden_endpoint():
    return {"message": "You found the traditional hidden endpoint for Season 1!", "flag": "bxf{r0b0ts_4re_n0t_h3lpful}"}

@router.get("/s1/custom-auth")
def s1_custom_auth(x_admin_auth: Optional[str] = Header(default="")):
    if x_admin_auth == "enabled":
        return {"message": "X-Admin-Auth accepted!", "flag": "bxf{h34d3rs_can_b3_trust3d?}"}
    raise HTTPException(status_code=403, detail="Forbidden: Missing X-Admin-Auth: enabled")

@router.get("/s1/search")
def s1_search(q: str):
    # Simulated UNION-based SQLi
    if "UNION" in q.upper() and "SELECT" in q.upper():
        return {
            "results": [
                {"id": 1, "name": "Public Data"},
                {"id": 1337, "name": "SECRET_FLAG", "value": "bxf{un10n_bas3d_leak}"}
            ]
        }
    return {"results": [{"id": 1, "name": "Public Data"}]}

@router.get("/s1/profile")
def s1_profile(user_role: Optional[str] = None, request: Request = None):
    # This checks for a 'user_role' cookie or query param
    role = user_role
    if not role:
        # Check standard cookie if available in headers (simulated simplified)
        cookies = request.headers.get("cookie", "")
        if "user_role=admin" in cookies:
             role = "admin"
    
    if role == "admin":
        return {"message": "Welcome Great Administrator!", "flag": "bxf{c00k13_m0nster_appr0ves}"}
    return {"message": "Welcome guest. To see the flag, you must be 'admin'.", "hint": "Check your cookies."}

@router.get("/s1/verify-token")
def s1_verify_jwt_none(authorization: Optional[str] = Header(default="")):
    if not authorization.startswith("Bearer "):
         raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.split(" ")[1]
    
    try:
        # Vulnerable decoder that allows 'none' algorithm
        header = jwt.get_unverified_header(token)
        if header.get("alg") == "none":
            payload = jwt.decode(token, options={"verify_signature": False})
            if payload.get("role") == "admin":
                return {"message": "Algorithm NONE accepted!", "flag": "bxf{jwt_n0ne_is_danger0us}"}
        
        # Normal path
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"message": f"Hello {payload.get('user')}"}
    except Exception:
        raise HTTPException(status_code=401, detail="Auth failed")

@router.post("/s1/ping-v2")
def s1_ping_v2(target: str = Form(...)):
    # Simulating a filtered command injection
    forbidden = [";", "|", "&", "$", "(", ")", "`", ">", "<"]
    if any(f in target for f in forbidden):
        return {"output": "Malicious character detected! Filter active."}
    if "cat" in target and "flag" in target:
         return {"output": "bxf{rce_w1thout_spac3s}"}
    return {"output": f"Pinging {target}..."}

@router.get("/s1/internal-metadata")
def s1_ssrf_target(user_agent: str = Header(default="")):
    if "InternalFetcher/2.0" in user_agent:
        return {"metadata": {"instance_id": "i-0987654321", "flag": "bxf{metadata_imds_v1_leak}"}}
    return {"error": "Access Denied"}
