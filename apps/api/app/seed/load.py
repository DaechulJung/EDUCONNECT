"""Seed loading and reset (REQ-11, AD-2 exception: writes every table).

seed/data/*.json is written in API units (AD-6) and validated with each owner's Pydantic schema
(catalog ProgramIn/AfterSchoolIn, family ChildIn) before core/units.py converts it to DB integers.
Plans and child conditions are never seeded (tests create them through the API).
Row ids are uuid5 of the JSON key, so the same seed always has the same ids.
`clear` refuses to touch a database that is not EDUCONNECT's and deletes only this app's Redis keys
(core/safety.py), so a seed reset pointed at another project's ports changes nothing there.
"""

import json
import uuid
from functools import cache
from pathlib import Path
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import redis
from app.core.safety import assert_own_database
from app.core.session import SESSION_PREFIX
from app.core.units import dismissal_to_db, dow_to_int, dows_to_ints, hhmm_to_min
from app.models.auth import Account
from app.models.catalog import Institution, Program, SchoolTimetable
from app.models.family import Child
from app.schemas.catalog import AfterSchoolIn, ProgramIn
from app.schemas.family import ChildIn
from app.services.auth.passwords import hash_password

DATA_DIR = Path(__file__).parent / "data"
_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "educonnect:seed")

TABLES = (
    "plans",
    "child_conditions",
    "children",
    "audit_events",
    "accounts",
    "school_timetables",
    "programs",
    "institutions",
)


class SeedPasswordMissing(RuntimeError):
    """SEED_PASSWORD is empty: seed accounts would have no usable password."""


class AlreadySeeded(RuntimeError):
    """`load` on a database that already has rows; use reset instead."""


def seed_id(key: str) -> uuid.UUID:
    """Stable row id for a seed JSON key (tests and E2E can name seed rows by key)."""
    return uuid.uuid5(_NAMESPACE, key)


@cache
def read(name: str) -> dict[str, Any]:
    return json.loads((DATA_DIR / f"{name}.json").read_text(encoding="utf-8"))


async def clear(db: AsyncSession) -> None:
    await assert_own_database(db)  # before any write: raises ForeignDatabase, nothing cleared
    await db.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))
    async for key in redis.scan_iter(match=f"{SESSION_PREFIX}*"):
        await redis.delete(key)


def _program(
    key: str, institution_id: uuid.UUID, fields: ProgramIn | AfterSchoolIn, **extra: Any
) -> Program:
    return Program(
        id=seed_id(key),
        institution_id=institution_id,
        subject=fields.subject,
        days=dows_to_ints(fields.days),
        start_min=hhmm_to_min(fields.start),
        end_min=hhmm_to_min(fields.end),
        monthly_tuition=fields.monthly_tuition,
        monthly_other=fields.monthly_other,
        instructor=fields.instructor,
        grade_min=fields.grade_min,
        grade_max=fields.grade_max,
        capacity=fields.capacity,
        enrolled=fields.enrolled,
        **extra,
    )


def rows(password: str) -> list[Any]:
    """Every seed row, parents before children, validated by the owners' schemas."""
    out: list[Any] = []
    for school in read("schools")["schools"]:
        school_id = seed_id(school["key"])
        out.append(
            Institution(
                id=school_id,
                kind="school",
                name=school["name"],
                school_level=school["school_level"],
                lat=school["lat"],
                lng=school["lng"],
            )
        )
        for grade, dismissal in school["timetable"].items():
            for dow, minutes in dismissal_to_db(dismissal).items():
                out.append(
                    SchoolTimetable(
                        id=seed_id(f"{school['key']}:{grade}:{dow}"),
                        school_id=school_id,
                        grade=int(grade),
                        dow=int(dow),
                        dismissal_min=minutes,
                    )
                )
        for item in school["after_school"]:
            fields = AfterSchoolIn.model_validate({k: v for k, v in item.items() if k != "key"})
            # stored with the school's location so every seed program has coordinates (AC-11.2)
            out.append(
                _program(
                    item["key"],
                    school_id,
                    fields,
                    type="after_school",
                    lat=school["lat"],
                    lng=school["lng"],
                )
            )
    for academy in read("academies")["academies"]:
        academy_id = seed_id(academy["key"])
        out.append(
            Institution(
                id=academy_id,
                kind="academy",
                name=academy["name"],
                lat=academy["lat"],
                lng=academy["lng"],
            )
        )
        for item in academy["programs"]:
            fields = ProgramIn.model_validate(
                {"lat": academy["lat"], "lng": academy["lng"]}
                | {k: v for k, v in item.items() if k != "key"}
            )
            out.append(
                _program(
                    item["key"],
                    academy_id,
                    fields,
                    type=fields.type,
                    lat=fields.lat,
                    lng=fields.lng,
                )
            )
    for account in read("accounts")["accounts"]:
        out.append(
            Account(
                id=seed_id(account["key"]),
                login_id=account["login_id"],
                password_hash=hash_password(password),
                role=account["role"],
                institution_id=seed_id(account["institution"]) if account["institution"] else None,
            )
        )
    for entry in read("children")["children"]:
        school_id = seed_id(entry["school"])
        child = ChildIn.model_validate(entry["child"] | {"school_id": str(school_id)})
        out.append(
            Child(
                id=seed_id(entry["key"]),
                parent_id=seed_id(entry["parent"]),
                alias=child.alias,
                age=child.age,
                grade=child.grade,
                school_id=school_id,
                interests=child.interests,
                goal=child.goal,
                existing_events=[
                    {
                        "dow": dow_to_int(event.dow),
                        "start_min": hhmm_to_min(event.start),
                        "end_min": hhmm_to_min(event.end),
                        "label": event.label,
                    }
                    for event in child.existing_events
                ],
                manual_dismissal=dismissal_to_db(child.manual_dismissal),
                consent_checked=child.consent_checked,
            )
        )
    return out


def _password(password: str | None) -> str:
    password = settings.seed_password if password is None else password
    if not password:
        raise SeedPasswordMissing("SEED_PASSWORD is empty: set it in the root .env before seeding")
    return password


async def load(db: AsyncSession, password: str | None = None) -> None:
    """Insert the seed into an empty database (call `clear` first, or use `reset`)."""
    password = _password(password)
    await assert_own_database(db)
    if (await db.execute(select(func.count()).select_from(Institution))).scalar_one():
        raise AlreadySeeded("database already has institutions: use `npm run seed -- --reset`")
    for row in rows(password):
        db.add(row)
        await db.flush()  # one table's rows before the next table's foreign keys


async def reset(db: AsyncSession, password: str | None = None) -> None:
    password = _password(password)  # before clear: Redis deletes are not rolled back
    await clear(db)
    await load(db, password)
    await db.commit()
