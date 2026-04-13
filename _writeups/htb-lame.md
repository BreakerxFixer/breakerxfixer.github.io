---
title: HTB - Lame
layout: writeup
date: 2026-04-13
dificultad: Easy
plataforma: HackTheBox
---

# 🔍 Enumeración

```bash
nmap -sC -sV 10.10.10.3

Servicios detectados:

Samba vulnerable
💥 Explotación

Usamos exploit:

msfconsole
use exploit/multi/samba/usermap_script
🧠 Privilege Escalation

Acceso root directo debido a mala configuración.

🏁 Conclusión

Máquina fácil, ideal para principiantes.

---

# 📄 4️⃣ `writeups.html` PRO (listado dinámico)

```bash
