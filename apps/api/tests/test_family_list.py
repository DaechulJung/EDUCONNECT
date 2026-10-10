"""GET /api/children: the signed-in parent's own children only (the chat screen needs it, #5).

Create and read one stay 501 until #4 and #1; the update is in test_family_update.py.
"""

from tests.conftest import login
from tests.test_chat_api import make_child  # noqa: F401  (fixture)


def test_lists_only_own_children(client, make_account, make_child) -> None:  # noqa: F811
    mine_login, mine, _ = make_account("parent")
    _, other, _ = make_account("parent")
    child_id = make_child(mine)
    make_child(other)
    assert login(client, mine_login).status_code == 200

    response = client.get("/api/children")

    assert response.status_code == 200
    body = response.json()
    assert [c["id"] for c in body] == [child_id]
    assert body[0]["alias"] == "하늘" and body[0]["grade"] == 5
    assert body[0]["existing_events"] == [] and body[0]["manual_dismissal"] == {}


def test_list_needs_parent_role(client, make_account) -> None:
    academy_login, _, _ = make_account("academy")
    assert login(client, academy_login).status_code == 200
    assert client.get("/api/children").status_code == 403
