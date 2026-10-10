"""이동 근사 계산 (AD-7). 추천·일정·영향이 모두 이 함수 하나만 쓴다."""

import math

EARTH_RADIUS_KM = 6371.0
ROUTE_FACTOR = 1.4
SPEED_KMH = 15.0
MIN_TRAVEL_MIN = 5

type Point = tuple[float, float]


def haversine_km(a: Point, b: Point) -> float:
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def travel_minutes(a: Point | None, b: Point | None) -> int:
    """두 장소 사이 이동 근사(분). 장소를 모르면 0(이동 계산에서 뺀다), 같은 장소면 0."""
    if a is None or b is None:
        return 0
    km = haversine_km(a, b)
    if km == 0:
        return 0
    return max(MIN_TRAVEL_MIN, math.ceil(km * ROUTE_FACTOR / SPEED_KMH * 60))
