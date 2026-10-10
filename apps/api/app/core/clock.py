"""The only source of the current time (AD-11): tests move it with POST /api/test/clock."""

from datetime import UTC, datetime, timedelta

_offset = timedelta()


def now() -> datetime:
    return datetime.now(UTC) + _offset


def advance(minutes: int) -> datetime:
    global _offset
    _offset += timedelta(minutes=minutes)
    return now()


def reset() -> None:
    global _offset
    _offset = timedelta()
