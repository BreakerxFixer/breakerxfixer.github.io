import hashlib

flags = {
    "S1M01": "bxf{r0b0ts_4re_n0t_h3lpful}",
    "S1M02": "bxf{rot13_is_classic}",
    "S1M03": "bxf{inspect_element_is_powerful}",
    "S1M04": "bxf{h34d3rs_can_b3_trust3d?}",
    "S1M05": "bxf{st3g0_1n_plain_s1ght}",
    "S1M06": "bxf{mag1c_byt3s_n3v3r_l1e}"
}

for mid, flag in flags.items():
    h = hashlib.sha256(flag.encode()).hexdigest()
    print(f"('{mid}', '{h}'),")
