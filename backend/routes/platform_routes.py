from __future__ import annotations

import json
import secrets
import time
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..challenge_engine import validate_submission
from ..platform_db import get_platform_db

router = APIRouter()


class SubmitChallengePayload(BaseModel):
    challenge_id: str = Field(min_length=3, max_length=64)
    value: str = Field(min_length=1, max_length=5000)
    session_id: Optional[str] = Field(default=None, max_length=128)


def _require_user_id(x_user_id: Optional[str]) -> str:
    user_id = (x_user_id or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-Id header")
    return user_id


def _challenge_row(challenge_id: str):
    conn = get_platform_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, track_id, season_id, title_en, title_es, category, difficulty, points,
                   description_en, description_es, sort_order
            FROM challenges_v2
            WHERE id = ? AND status = 'published'
            """,
            (challenge_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


@router.get("/health")
def health():
    return {"status": "ok", "namespace": "platform-v2", "ts": int(time.time())}


@router.get("/catalog")
def get_catalog(track: Optional[str] = None, season_id: Optional[int] = None):
    conn = get_platform_db()
    try:
        cur = conn.cursor()
        clauses = ["status = 'published'"]
        params: list[Any] = []
        if track:
            clauses.append("track_id = ?")
            params.append(track)
        if season_id is not None:
            clauses.append("season_id = ?")
            params.append(season_id)
        where = " AND ".join(clauses)
        cur.execute(
            f"""
            SELECT id, track_id, season_id, title_en, title_es, category, difficulty, points,
                   description_en, description_es, sort_order
            FROM challenges_v2
            WHERE {where}
            ORDER BY season_id ASC, sort_order ASC
            """,
            params,
        )
        rows = [dict(row) for row in cur.fetchall()]
        return {"items": rows}
    finally:
        conn.close()


@router.get("/user-progress")
def get_user_progress(x_user_id: Optional[str] = Header(default=None)):
    user_id = _require_user_id(x_user_id)
    conn = get_platform_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT challenge_id, points_awarded, solved_at FROM challenge_solves_v2 WHERE user_id = ?",
            (user_id,),
        )
        solves = [dict(row) for row in cur.fetchall()]
        cur.execute(
            "SELECT COALESCE(SUM(delta), 0) as total_points FROM points_ledger_v2 WHERE user_id = ?",
            (user_id,),
        )
        points = int(cur.fetchone()["total_points"])
        return {"user_id": user_id, "total_points": points, "solves": solves}
    finally:
        conn.close()


@router.post("/learn-session/start")
def start_learn_session(payload: dict[str, str], x_user_id: Optional[str] = Header(default=None)):
    user_id = _require_user_id(x_user_id)
    challenge_id = str(payload.get("challenge_id") or "").strip()
    row = _challenge_row(challenge_id)
    if not row or row["track_id"] != "learn":
        raise HTTPException(status_code=404, detail="Learn challenge not found")

    session_id = secrets.token_urlsafe(24)
    expires_at = int(time.time()) + 60 * 45
    conn = get_platform_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO learn_sessions_v2 (session_id, user_id, challenge_id, expires_at, is_closed)
            VALUES (?, ?, ?, ?, 0)
            """,
            (session_id, user_id, challenge_id, expires_at),
        )
        conn.commit()
    finally:
        conn.close()
    return {"session_id": session_id, "challenge_id": challenge_id, "expires_at": expires_at}


@router.post("/submit-challenge")
def submit_challenge(payload: SubmitChallengePayload, x_user_id: Optional[str] = Header(default=None)):
    user_id = _require_user_id(x_user_id)
    conn = get_platform_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT c.id, c.track_id, c.points, v.validator_type, v.config_json
            FROM challenges_v2 c
            JOIN challenge_validators_v2 v ON v.challenge_id = c.id
            WHERE c.id = ? AND c.status = 'published'
            """,
            (payload.challenge_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Challenge not found")

        validator_type = row["validator_type"]
        config = json.loads(row["config_json"] or "{}")
        incoming = payload.value.strip()
        if validator_type == "learn_terminal_marker":
            if not payload.session_id:
                raise HTTPException(status_code=400, detail="session_id required for learn marker")
            cur.execute(
                """
                SELECT is_closed, expires_at, challenge_id
                FROM learn_sessions_v2
                WHERE session_id = ? AND user_id = ?
                """,
                (payload.session_id, user_id),
            )
            srow = cur.fetchone()
            if not srow:
                raise HTTPException(status_code=403, detail="invalid learn session")
            if int(srow["is_closed"]) == 1 or int(srow["expires_at"]) < int(time.time()):
                raise HTTPException(status_code=403, detail="learn session expired")

        result = validate_submission(
            validator_type,
            incoming,
            config,
            requires_session=bool(payload.session_id),
        )
        success = result.success

        cur.execute(
            """
            INSERT INTO challenge_attempts_v2 (user_id, challenge_id, submitted_value, success)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, payload.challenge_id, incoming[:5000], 1 if success else 0),
        )

        if not success:
            conn.commit()
            return {"success": False, "message": result.reason}

        cur.execute(
            """
            SELECT 1 FROM challenge_solves_v2
            WHERE user_id = ? AND challenge_id = ?
            """,
            (user_id, payload.challenge_id),
        )
        if cur.fetchone():
            conn.commit()
            return {"success": False, "message": "ALREADY_SOLVED"}

        points = int(row["points"])
        cur.execute(
            """
            INSERT INTO challenge_solves_v2 (user_id, challenge_id, points_awarded)
            VALUES (?, ?, ?)
            """,
            (user_id, payload.challenge_id, points),
        )
        cur.execute(
            """
            INSERT INTO points_ledger_v2 (user_id, challenge_id, delta, source)
            VALUES (?, ?, ?, 'challenge_solve')
            """,
            (user_id, payload.challenge_id, points),
        )
        if payload.session_id:
            cur.execute("UPDATE learn_sessions_v2 SET is_closed = 1 WHERE session_id = ?", (payload.session_id,))
        conn.commit()
        return {"success": True, "message": "SOLVED", "points_earned": points}
    finally:
        conn.close()


@router.get("/leaderboard")
def leaderboard(limit: int = 100):
    cap = max(1, min(limit, 200))
    conn = get_platform_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT user_id, COALESCE(SUM(delta), 0) AS points, MAX(created_at) AS last_event_at
            FROM points_ledger_v2
            GROUP BY user_id
            ORDER BY points DESC, last_event_at ASC
            LIMIT ?
            """,
            (cap,),
        )
        rows = [dict(row) for row in cur.fetchall()]
        for idx, row in enumerate(rows, start=1):
            row["rank"] = idx
        return {"items": rows}
    finally:
        conn.close()


@router.post("/reset-total")
def reset_total(payload: dict[str, str], x_user_id: Optional[str] = Header(default=None)):
    user_id = _require_user_id(x_user_id)
    scope = str(payload.get("scope") or "all").strip().lower()
    if scope not in {"all", "ctf", "learn"}:
        raise HTTPException(status_code=400, detail="scope must be all|ctf|learn")

    conn = get_platform_db()
    try:
        cur = conn.cursor()
        if scope in {"all", "ctf"}:
            cur.execute(
                """
                DELETE FROM challenge_solves_v2
                WHERE user_id = ?
                  AND challenge_id IN (SELECT id FROM challenges_v2 WHERE track_id = 'ctf')
                """,
                (user_id,),
            )
            cur.execute(
                """
                DELETE FROM challenge_attempts_v2
                WHERE user_id = ?
                  AND challenge_id IN (SELECT id FROM challenges_v2 WHERE track_id = 'ctf')
                """,
                (user_id,),
            )
        if scope in {"all", "learn"}:
            cur.execute(
                """
                DELETE FROM challenge_solves_v2
                WHERE user_id = ?
                  AND challenge_id IN (SELECT id FROM challenges_v2 WHERE track_id = 'learn')
                """,
                (user_id,),
            )
            cur.execute(
                """
                DELETE FROM challenge_attempts_v2
                WHERE user_id = ?
                  AND challenge_id IN (SELECT id FROM challenges_v2 WHERE track_id = 'learn')
                """,
                (user_id,),
            )
            cur.execute("DELETE FROM learn_sessions_v2 WHERE user_id = ?", (user_id,))
        cur.execute("DELETE FROM points_ledger_v2 WHERE user_id = ?", (user_id,))
        conn.commit()
        return {"ok": True, "scope": scope}
    finally:
        conn.close()
