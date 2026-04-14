import os
import shutil
import base64
import random

BASE_DIR = "/home/k1r0x/Desktop/breakerxfixer.github.io/assets/challenges"
os.makedirs(BASE_DIR, exist_ok=True)

print("Building CTF Assets...")

# --- M12: Crypto XORacle ---
print("Building M12 (Crypto XOR)...")
m12_dir = os.path.join(BASE_DIR, "M12")
os.makedirs(m12_dir, exist_ok=True)
flag_m12 = b"bxf{x0r_1s_l1k3_4_r0t4t1ng_l0ck}"
key = b"H4x0" # 4-byte repeating key
enc = bytes([flag_m12[i] ^ key[i % len(key)] for i in range(len(flag_m12))])

with open(os.path.join(m12_dir, "encrypt.py"), "w") as f:
    f.write('''def encrypt(data, key):
    return bytes([data[i] ^ key[i % len(key)] for i in range(len(data))])

flag = open("flag.txt", "rb").read()
# key is 4 bytes long!
enc = encrypt(flag, b"????")
open("flag.enc", "wb").write(enc)
''')
with open(os.path.join(m12_dir, "flag.enc"), "wb") as f:
    f.write(enc)

# --- M14: Pwn Overflow 101 ---
print("Building M14 (Pwn Overflow)...")
m14_dir = os.path.join(BASE_DIR, "M14")
os.makedirs(m14_dir, exist_ok=True)
m14_c = os.path.join(m14_dir, "overflow101.c")
with open(m14_c, "w") as f:
    f.write('''#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main() {
    int secret = 0xdeadbeef;
    char buffer[32];
    
    printf("Welcome to Pwn 101. Overwrite the secret!\\n");
    printf("Input: ");
    scanf("%s", buffer); // VULNERABILITY!
    
    if (secret != 0xdeadbeef) {
        printf("WOW! You overwrote the secret variables!\\n");
        printf("Flag: bxf{buff3r_0v3rfl0w_34sy_p34sy}\\n");
    } else {
        printf("Secret is safely 0x%x\\n", secret);
    }
    return 0;
}
''')
os.system(f"gcc -m64 -fno-stack-protector -no-pie -o {os.path.join(m14_dir, 'overflow101')} {m14_c}")

# --- M15: Format String Echo ---
print("Building M15 (Pwn Format String)...")
m15_dir = os.path.join(BASE_DIR, "M15")
os.makedirs(m15_dir, exist_ok=True)
m15_c = os.path.join(m15_dir, "format_echo.c")
with open(m15_c, "w") as f:
    f.write('''#include <stdio.h>

char *secret = "bxf{f0rm4t_str1ng_m3m0ry_l34k}";

int main() {
    char input[64];
    printf("Echo service. Say something: ");
    fgets(input, sizeof(input), stdin);
    printf("You said: ");
    printf(input); // VULNERABILITY!
    printf("\\n");
    return 0;
}
''')
os.system(f"gcc -m64 -o {os.path.join(m15_dir, 'format_echo')} {m15_c}")

# --- M16: PCAP DNS Exfil ---
print("Building M16 (Forensics PCAP)...")
m16_dir = os.path.join(BASE_DIR, "M16")
os.makedirs(m16_dir, exist_ok=True)
# Just generate a text file imitating a DNS query log if we can't build a PCAP easily right now
with open(os.path.join(m16_dir, "capture.txt"), "w") as f:
    f.write("Time\tSource\tDestination\tProtocol\tInfo\n")
    flag_b64 = base64.b64encode(b"bxf{dns_3xf1ltr4t10n_d3t3ct3d}").decode()
    chunks = [flag_b64[i:i+5] for i in range(0, len(flag_b64), 5)]
    for i, chunk in enumerate(chunks):
        f.write(f"1.0{i}\t10.0.0.5\t8.8.8.8\tDNS\tStandard query 0x1234 TXT {chunk}.evil.com\n")

# --- M17: Corrupted Memory (Stego) ---
# Create a dummy image by writing some bytes
print("Building M17 (Forensics Stego)...")
m17_dir = os.path.join(BASE_DIR, "M17")
os.makedirs(m17_dir, exist_ok=True)
with open(os.path.join(m17_dir, "corrupted.jpg"), "wb") as f:
    # Fake JPG header
    f.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00')
    f.write(os.urandom(1024))
    # Append flag at the end
    f.write(b'bxf{lsb_st3g0_1s_n0t_s3cur3}')

# --- M20: Anti-Debugger Trap ---
print("Building M20 (Rev Anti-Debug)...")
m20_dir = os.path.join(BASE_DIR, "M20")
os.makedirs(m20_dir, exist_ok=True)
m20_c = os.path.join(m20_dir, "trap.c")
with open(m20_c, "w") as f:
    f.write('''#include <stdio.h>
#include <sys/ptrace.h>
#include <string.h>

int main(int argc, char* argv[]) {
    if (ptrace(PTRACE_TRACEME, 0, 1, 0) < 0) {
        printf("I sense a debugger! Aborting...\\n");
        return 1;
    }
    
    if (argc < 2) {
        printf("Usage: ./trap [password]\\n");
        return 1;
    }
    
    if (strcmp(argv[1], "N0_D3BUGG3R_PLZ") == 0) {
        printf("Access granted: bxf{4nt1_d3bug_byp4ss3d}\\n");
    } else {
        printf("Incorrect password.\\n");
    }
    return 0;
}
''')
os.system(f"gcc -s -o {os.path.join(m20_dir, 'trap')} {m20_c}")

# --- M22: I2C Chatter ---
print("Building M22 (Hardware I2C)...")
m22_dir = os.path.join(BASE_DIR, "M22")
os.makedirs(m22_dir, exist_ok=True)
flag_m22 = "bxf{12c_bu5_sn1ff1ng}"
with open(os.path.join(m22_dir, "i2c_dump.ascii"), "w") as f:
    f.write("Time [s]\tPacket\tType\tAddress\tData\n")
    for i, c in enumerate(flag_m22):
        f.write(f"0.00{i}123\t0\tWrite\t0x50\t0x{ord(c):02X}\n")

print("Done generating assets!")
