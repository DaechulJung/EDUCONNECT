"""BASE-01.4: login issues ec_session (HttpOnly, SameSite=Lax, Max-Age=28800), /me returns the
role and institution, the same cookie is 401 after logout, and hashes start with scrypt$."""

from sqlalchemy import text

from tests.conftest import TEST_PASSWORD, login


def _set_cookie(response) -> str:
    headers = [v for k, v in response.headers.multi_items() if k.lower() == "set-cookie"]
    assert len(headers) == 1, headers
    return headers[0]


def test_login_cookie_me_and_logout(client, make_account) -> None:
    login_id, account_id, institution_id = make_account("academy")
    response = login(client, login_id)
    assert response.status_code == 200, response.text
    cookie = _set_cookie(response)
    attributes = [part.strip().lower() for part in cookie.split(";")]
    assert attributes[0].startswith("ec_session=")
    assert "httponly" in attributes
    assert "samesite=lax" in attributes
    assert "max-age=28800" in attributes
    assert "path=/" in attributes
    token = client.cookies.get("ec_session")

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json() == {
        "account_id": account_id,
        "login_id": login_id,
        "role": "academy",
        "institution_id": institution_id,
    }

    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.clear()
    client.cookies.set("ec_session", token)
    after = client.get("/api/auth/me")
    assert after.status_code == 401
    assert after.json() == {"detail": "unauthenticated"}


def test_wrong_password_sets_no_cookie(client, make_account) -> None:
    login_id, _, _ = make_account("parent")
    response = login(client, login_id, TEST_PASSWORD + "x")
    assert response.status_code == 401
    assert response.json() == {"detail": "invalid_credentials"}
    assert "set-cookie" not in {k.lower() for k in response.headers}


def test_unknown_login_id_is_the_same_error(client) -> None:
    response = login(client, "nobody-here")
    assert response.status_code == 401
    assert response.json() == {"detail": "invalid_credentials"}


def test_stored_password_is_scrypt(sync_db, make_account) -> None:
    _, account_id, _ = make_account("parent")
    with sync_db.connect() as conn:
        stored = conn.scalar(
            text("SELECT password_hash FROM accounts WHERE id = :id"), {"id": account_id}
        )
    assert stored.startswith("scrypt$16384$8$1$")
    assert TEST_PASSWORD not in stored


def test_five_failures_lock_for_fifteen_minutes(client, make_account) -> None:
    from app.core import clock

    login_id, _, _ = make_account("parent")
    for _ in range(5):
        assert login(client, login_id, "wrong").status_code == 401
    locked = login(client, login_id)
    assert locked.status_code == 401
    assert locked.json() == {"detail": "account_locked"}
    clock.advance(15)
    assert login(client, login_id).status_code == 200
