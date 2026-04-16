from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class ValidationResult:
    success: bool
    reason: str


def validate_submission(validator_type: str, submission: str, config: dict, *, requires_session: bool) -> ValidationResult:
    value = (submission or "").strip()
    if not value:
        return ValidationResult(False, "EMPTY_SUBMISSION")

    if validator_type == "flag_exact":
        expected = str(config.get("value", ""))
        return ValidationResult(value == expected, "INVALID_SUBMISSION")

    if validator_type == "flag_regex":
        pattern = str(config.get("pattern", ""))
        if not pattern:
            return ValidationResult(False, "MISCONFIGURED_VALIDATOR")
        return ValidationResult(bool(re.match(pattern, value)), "INVALID_SUBMISSION")

    if validator_type == "learn_terminal_marker":
        if not requires_session:
            return ValidationResult(False, "LEARN_SESSION_REQUIRED")
        marker = str(config.get("marker", ""))
        return ValidationResult(value == marker, "INVALID_SUBMISSION")

    return ValidationResult(False, "UNSUPPORTED_VALIDATOR")
