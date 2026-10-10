"""`npm run seed` loads the seed into an empty database; `npm run seed -- --reset` clears it first.

Reads SEED_PASSWORD and the database address like the app (core/config.py); never prints them.
"""

import argparse
import asyncio
import sys

from app.core.db import SessionLocal, engine
from app.core.redis import redis
from app.core.safety import ForeignDatabase
from app.seed import load


async def main(reset: bool) -> int:
    try:
        async with SessionLocal() as db:
            if reset:
                await load.reset(db)
            else:
                await load.load(db)
                await db.commit()
    except (load.SeedPasswordMissing, load.AlreadySeeded, ForeignDatabase) as error:
        print(f"seed: {error}", file=sys.stderr)
        return 1
    finally:
        await engine.dispose()
        await redis.aclose()
    print("seed: loaded" + (" after reset" if reset else ""))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog="npm run seed --")
    parser.add_argument("--reset", action="store_true", help="clear every table first")
    sys.exit(asyncio.run(main(parser.parse_args().reset)))
