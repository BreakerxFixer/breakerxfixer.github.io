import json
import os
import sqlite3
from typing import Any

DB_PATH = os.path.join(os.path.dirname(__file__), "platform_v2.db")


def get_platform_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _seed_if_empty(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as count FROM tracks")
    if cur.fetchone()["count"] == 0:
        cur.executemany(
            "INSERT INTO tracks (id, name, is_active) VALUES (?, ?, ?)",
            [("ctf", "CTF Missions", 1), ("learn", "Learn Labs", 1)],
        )

    cur.execute("SELECT COUNT(*) as count FROM seasons")
    if cur.fetchone()["count"] == 0:
        cur.executemany(
            "INSERT INTO seasons (id, track_id, name, is_active, sort_order) VALUES (?, ?, ?, ?, ?)",
            [
                (0, "ctf", "Season 0", 1, 0),
                (1, "ctf", "Season 1", 1, 1),
                (100, "learn", "Learn Core", 1, 0),
            ],
        )

    cur.execute("SELECT COUNT(*) as count FROM challenges_v2")
    if cur.fetchone()["count"] > 0:
        return

    catalog: list[tuple[Any, ...]] = [
        ("CTF-001", "ctf", 0, "Ghost Endpoint Reborn", "Endpoint Fantasma Renacido", "Web", "easy", 80, "Recover leaked debug payload.", "Recupera el payload de depuración filtrado.", 1),
        ("CTF-002", "ctf", 0, "Header Masquerade", "Mascarada de Cabeceras", "Web", "easy", 90, "Bypass role checks using trusted headers.", "Evita controles de rol con cabeceras confiables.", 2),
        ("CTF-003", "ctf", 0, "Token Fracture", "Fractura de Token", "Web", "medium", 150, "Exploit weak token validation path.", "Explota una validación débil de token.", 3),
        ("CTF-004", "ctf", 0, "Traversal Echo", "Eco de Traversal", "Web", "medium", 160, "Read forbidden file through path confusion.", "Lee archivo prohibido por confusión de rutas.", 4),
        ("CTF-005", "ctf", 1, "NoSQL Spiral", "Espiral NoSQL", "Web", "hard", 260, "Break auth logic with JSON operators.", "Rompe lógica auth con operadores JSON.", 5),
        ("CTF-006", "ctf", 1, "Metadata Pivot", "Pivot de Metadatos", "Web", "hard", 320, "Reach internal metadata context safely.", "Alcanza metadatos internos de forma segura.", 6),
        ("CTF-007", "ctf", 1, "Packet Cipher", "Cifrado de Paquetes", "Forensics", "medium", 180, "Extract hidden key from packet dump.", "Extrae clave oculta de volcado de paquetes.", 7),
        ("CTF-008", "ctf", 1, "Reverse Pulse", "Pulso Reverso", "Rev", "hard", 280, "Patch binary checks to reveal flag.", "Parchea checks binarios para revelar flag.", 8),
        ("LRN-001", "learn", 100, "Arch Linux Essentials", "Fundamentos de Arch Linux", "Learn", "easy", 60, "Navigate filesystem and package basics.", "Navega sistema de archivos y paquetes básicos.", 1),
        ("LRN-002", "learn", 100, "Bash Automation", "Automatización Bash", "Learn", "easy", 70, "Build scripts for file workflows.", "Crea scripts para flujos de archivos.", 2),
        ("LRN-003", "learn", 100, "Networking Drill", "Drill de Networking", "Learn", "medium", 90, "Inspect sockets, routes and DNS.", "Inspecciona sockets, rutas y DNS.", 3),
        ("LRN-004", "learn", 100, "Incident Triage", "Triage de Incidentes", "Learn", "medium", 100, "Collect evidence and isolate anomaly.", "Recolecta evidencias y aísla anomalías.", 4),
    ]
    cur.executemany(
        """
        INSERT INTO challenges_v2 (
          id, track_id, season_id, title_en, title_es, category, difficulty, points,
          description_en, description_es, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        catalog,
    )

    validators = [
        ("CTF-001", "flag_exact", {"value": "bxf{ghost_endpoint_reborn}"}),
        ("CTF-002", "flag_exact", {"value": "bxf{header_masquerade_chain}"}),
        ("CTF-003", "flag_regex", {"pattern": r"^bxf\{token_fracture_[a-z0-9_]+\}$"}),
        ("CTF-004", "flag_exact", {"value": "bxf{traversal_echo_master}"}),
        ("CTF-005", "flag_exact", {"value": "bxf{nosql_spiral_break}"}),
        ("CTF-006", "flag_exact", {"value": "bxf{metadata_pivot_path}"}),
        ("CTF-007", "flag_exact", {"value": "bxf{packet_cipher_keyfound}"}),
        ("CTF-008", "flag_exact", {"value": "bxf{reverse_pulse_patch}"}),
        ("LRN-001", "learn_terminal_marker", {"marker": "ARCH_BASICS_DONE"}),
        ("LRN-002", "learn_terminal_marker", {"marker": "BASH_AUTOMATION_DONE"}),
        ("LRN-003", "learn_terminal_marker", {"marker": "NETWORK_DRILL_DONE"}),
        ("LRN-004", "learn_terminal_marker", {"marker": "TRIAGE_DONE"}),
    ]
    cur.executemany(
        "INSERT INTO challenge_validators_v2 (challenge_id, validator_type, config_json) VALUES (?, ?, ?)",
        [(cid, vtype, json.dumps(cfg)) for cid, vtype, cfg in validators],
    )


def init_platform_db() -> None:
    conn = get_platform_db()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS seasons (
          id INTEGER PRIMARY KEY,
          track_id TEXT NOT NULL REFERENCES tracks(id),
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS challenges_v2 (
          id TEXT PRIMARY KEY,
          track_id TEXT NOT NULL REFERENCES tracks(id),
          season_id INTEGER NOT NULL REFERENCES seasons(id),
          title_en TEXT NOT NULL,
          title_es TEXT NOT NULL,
          category TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          points INTEGER NOT NULL,
          description_en TEXT NOT NULL,
          description_es TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'published',
          sort_order INTEGER NOT NULL DEFAULT 0,
          metadata_json TEXT NOT NULL DEFAULT '{}'
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS challenge_validators_v2 (
          challenge_id TEXT PRIMARY KEY REFERENCES challenges_v2(id) ON DELETE CASCADE,
          validator_type TEXT NOT NULL,
          config_json TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS challenge_attempts_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          challenge_id TEXT NOT NULL REFERENCES challenges_v2(id) ON DELETE CASCADE,
          submitted_value TEXT NOT NULL,
          success INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS challenge_solves_v2 (
          user_id TEXT NOT NULL,
          challenge_id TEXT NOT NULL REFERENCES challenges_v2(id) ON DELETE CASCADE,
          points_awarded INTEGER NOT NULL,
          solved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, challenge_id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS points_ledger_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          challenge_id TEXT,
          delta INTEGER NOT NULL,
          source TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS learn_sessions_v2 (
          session_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          challenge_id TEXT NOT NULL REFERENCES challenges_v2(id) ON DELETE CASCADE,
          expires_at INTEGER NOT NULL,
          is_closed INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    _seed_if_empty(conn)
    conn.commit()
    conn.close()
