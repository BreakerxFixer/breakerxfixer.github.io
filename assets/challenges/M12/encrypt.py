def encrypt(data, key):
    return bytes([data[i] ^ key[i % len(key)] for i in range(len(data))])

flag = open("flag.txt", "rb").read()
# key is 4 bytes long!
enc = encrypt(flag, b"????")
open("flag.enc", "wb").write(enc)
