import requests
import time

BASE_URL = "http://127.0.0.1:8001/api/v1"

def test_ssrf_blocklist():
    print("--- Testing SSRF Blocklist (M11 Hardening) ---")
    
    # Attempting to fetch localhost (Forbidden)
    targets = [
        "http://127.0.0.1:8001/api/v1/internal/admin-flag",
        "http://localhost:8001",
        "http://192.168.1.1",
        "http://10.0.0.1"
    ]
    
    for t in targets:
        url = f"{BASE_URL}/fetch?url={t}"
        print(f"[*] Testing target: {t}")
        try:
            response = requests.get(url)
            print(f"  [>] Response: {response.json()}")
            if "Access Denied" in str(response.json()):
                print("  [+] SUCCESS: Blocked correctly.")
            else:
                print("  [-] FAILED: Not blocked.")
        except Exception as e:
            print(f"  [!] Error: {e}")

def test_fastapi_rate_limit():
    print("\n--- Testing FastAPI Rate Limit Middleware ---")
    print("[*] Sending 60 requests rapidly (Limit is 50/min)...")
    
    blocked = False
    for i in range(60):
        try:
            response = requests.get(f"{BASE_URL}/")
            if response.status_code == 429:
                print(f"[+] Request {i+1}: Blocked (429 Too Many Requests)")
                blocked = True
                break
        except Exception as e:
            print(f"[!] Error at request {i}: {e}")
            break
            
    if not blocked:
        print("[-] FAILED: Rate limit not triggered.")

if __name__ == "__main__":
    # Note: Backend must be running on port 8001
    test_ssrf_blocklist()
    test_fastapi_rate_limit()
