import hashlib

flags = {
    "S1M01": "bxf{r0b0ts_4re_n0t_h3lpful}",
    "S1M02": "bxf{rot13_is_classic}",
    "S1M03": "bxf{inspect_element_is_powerful}",
    "S1M04": "bxf{h34d3rs_can_b3_trust3d?}",
    "S1M05": "bxf{st3g0_1n_plain_s1ght}",
    "S1M06": "bxf{mag1c_byt3s_n3v3r_l1e}",
    "S1M07": "bxf{g1t_h1st0ry_n3v3r_f0rg3ts}",
    "S1M08": "bxf{r3turn_addre55_h1jack3d}",
    "S1M09": "bxf{un10n_bas3d_leak}",
    "S1M10": "bxf{v1g3n3r3_1s_n0t_3n0ugh}",
    "S1M11": "bxf{gps_exif_data_found}",
    "S1M12": "bxf{c00k13_m0nster_appr0ves}",
    "S1M13": "bxf{jwt_n0ne_is_danger0us}",
    "S1M14": "bxf{str1ngs_found_1n_elf}",
    "S1M15": "bxf{rce_w1thout_spac3s}",
    "S1M16": "bxf{audi0_spectr0graph_h1nts}",
    "S1M17": "bxf{xor_loop_decrypted}",
    "S1M18": "bxf{s3_buckets_must_be_private}",
    "S1M19": "bxf{dns_txt_record_secret}",
    "S1M20": "bxf{fmt_strING_WR1TE_4NYWHERE}",
    "S1M21": "bxf{z1p_bomb_traversa1}",
    "S1M22": "bxf{metadata_imds_v1_leak}"
}

print("-- SQL INSERT for Season 1 Secrets")
print("INSERT INTO public.challenge_secrets (id, flag_hash) VALUES")
for i, (mid, flag) in enumerate(flags.items()):
    h = hashlib.sha256(flag.encode()).hexdigest()
    comma = "," if i < len(flags) - 1 else ""
    print(f"('{mid}', '{h}'){comma} -- {flag}")
print("ON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;")
