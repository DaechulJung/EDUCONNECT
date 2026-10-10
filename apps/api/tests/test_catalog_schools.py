"""GET /api/catalog/schools (#4): the school choices of the children form, id and name only."""

from sqlalchemy import text

from tests.conftest import login


def school_rows(sync_db) -> list[dict]:
    with sync_db.connect() as conn:
        rows = conn.execute(
            text("SELECT id::text AS id, name FROM institutions WHERE kind = 'school'")
        )
        return sorted((dict(r) for r in rows.mappings()), key=lambda s: (s["name"], s["id"]))


def test_lists_schools_only_id_and_name(client, make_account, sync_db) -> None:
    make_account("school")  # at least one school so the comparison is not empty
    make_account("academy")  # academies are not schools
    login_id, _, _ = make_account("parent")
    assert login(client, login_id).status_code == 200

    response = client.get("/api/catalog/schools")

    assert response.status_code == 200
    body = response.json()
    # name order comes from the server, not re-sorted here
    assert body and body == school_rows(sync_db)
    assert "시험 academy" not in {s["name"] for s in body}
    assert all(set(s) == {"id", "name"} for s in body)


def test_signed_out_is_401(client) -> None:
    client.cookies.clear()
    assert client.get("/api/catalog/schools").status_code == 401


def test_academy_staff_is_403(client, make_account) -> None:
    login_id, _, _ = make_account("academy")
    assert login(client, login_id).status_code == 200
    assert client.get("/api/catalog/schools").status_code == 403
