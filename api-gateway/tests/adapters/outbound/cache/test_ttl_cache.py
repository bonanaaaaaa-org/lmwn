import asyncio
from dataclasses import dataclass

import pytest

from app.adapters.outbound.cache.ttl_cache import TtlCache
from app.application.errors import GuideNotFound, SourceUnavailable
from tests.fakes import FakeClock


@dataclass
class Loader:
    """Counts loads and returns `value`, or raises `error` when set."""

    value: str = "fresh"
    error: Exception | None = None
    calls: int = 0
    gate: asyncio.Event | None = None

    async def __call__(self) -> str:
        self.calls += 1
        if self.gate is not None:
            await self.gate.wait()
        if self.error is not None:
            raise self.error
        return self.value


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def cache(clock: FakeClock) -> TtlCache[str, str]:
    return TtlCache(ttl_seconds=60, clock=clock)


async def test_a_repeat_read_within_the_ttl_is_served_from_memory(
    cache: TtlCache[str, str], clock: FakeClock
) -> None:
    load = Loader()

    first = await cache.get_or_load("k", load)
    clock.now += 59.9
    second = await cache.get_or_load("k", load)

    assert (first, second) == ("fresh", "fresh")
    assert load.calls == 1


async def test_an_entry_expires_once_the_ttl_has_passed(
    cache: TtlCache[str, str], clock: FakeClock
) -> None:
    load = Loader(value="old")
    await cache.get_or_load("k", load)

    clock.now += 60
    load.value = "new"

    assert await cache.get_or_load("k", load) == "new"
    assert load.calls == 2


async def test_keys_are_cached_separately(cache: TtlCache[str, str]) -> None:
    a, b = Loader(value="a"), Loader(value="b")

    assert await cache.get_or_load("a", a) == "a"
    assert await cache.get_or_load("b", b) == "b"
    assert await cache.get_or_load("a", a) == "a"
    assert (a.calls, b.calls) == (1, 1)


@pytest.mark.parametrize("error", [SourceUnavailable("down"), GuideNotFound("missing")])
async def test_a_failed_load_is_not_cached(
    cache: TtlCache[str, str], error: Exception
) -> None:
    load = Loader(error=error)

    with pytest.raises(type(error)):
        await cache.get_or_load("k", load)
    load.error = None

    assert await cache.get_or_load("k", load) == "fresh"
    assert load.calls == 2


async def test_concurrent_misses_for_one_key_share_one_load(
    cache: TtlCache[str, str],
) -> None:
    gate = asyncio.Event()
    load = Loader(gate=gate)

    waiters = [asyncio.create_task(cache.get_or_load("k", load)) for _ in range(5)]
    await asyncio.sleep(0)
    gate.set()

    assert await asyncio.gather(*waiters) == ["fresh"] * 5
    assert load.calls == 1


async def test_concurrent_waiters_all_see_a_shared_failure_and_it_is_not_cached(
    cache: TtlCache[str, str],
) -> None:
    gate = asyncio.Event()
    load = Loader(error=SourceUnavailable("down"), gate=gate)

    waiters = [asyncio.create_task(cache.get_or_load("k", load)) for _ in range(3)]
    await asyncio.sleep(0)
    gate.set()
    results = await asyncio.gather(*waiters, return_exceptions=True)

    assert all(isinstance(r, SourceUnavailable) for r in results)
    load.error = None
    assert await cache.get_or_load("k", load) == "fresh"
    assert load.calls == 2


async def test_cancelling_one_waiter_does_not_cancel_the_shared_load(
    cache: TtlCache[str, str],
) -> None:
    gate = asyncio.Event()
    load = Loader(gate=gate)
    cancelled = asyncio.create_task(cache.get_or_load("k", load))
    survivor = asyncio.create_task(cache.get_or_load("k", load))
    await asyncio.sleep(0)

    cancelled.cancel()
    gate.set()

    assert await survivor == "fresh"
    with pytest.raises(asyncio.CancelledError):
        await cancelled
    assert load.calls == 1


async def test_expired_entries_are_dropped_when_a_new_value_is_stored(
    cache: TtlCache[str, str], clock: FakeClock
) -> None:
    await cache.get_or_load("old", Loader())
    clock.now += 60

    await cache.get_or_load("new", Loader())

    assert len(cache) == 1


async def test_a_load_that_fails_after_every_waiter_left_logs_no_error(
    cache: TtlCache[str, str], caplog: pytest.LogCaptureFixture
) -> None:
    gate = asyncio.Event()
    load = Loader(error=SourceUnavailable("down"), gate=gate)
    waiter = asyncio.create_task(cache.get_or_load("k", load))
    await asyncio.sleep(0)

    waiter.cancel()
    with pytest.raises(asyncio.CancelledError):
        await waiter
    gate.set()
    for _ in range(5):
        await asyncio.sleep(0)

    assert [r for r in caplog.records if r.levelname == "ERROR"] == []
    load.error = None
    assert await cache.get_or_load("k", load) == "fresh"
