def rule_baseline(weeks_silent: int) -> dict:
    """Deterministic baseline rule for dormant wallet reactivation.

    Fired iff weeks_silent >= 3 -> {"fired": True, "action": "message_everyone"}.
    Otherwise -> {"fired": False, "action": "none"}.
    """
    if weeks_silent >= 3:
        return {"fired": True, "action": "message_everyone"}
    return {"fired": False, "action": "none"}
