"""A small in-memory cache whose entries expire after a fixed time-to-live."""

import asyncio
import time
from collections.abc import Awaitable, Callable, Hashable
from dataclasses import dataclass

type Clock = Callable[[], float]
"""Seconds on a monotonic scale (`time.monotonic` in production)."""


@dataclass(frozen=True, slots=True)
class _Entry[V]:
    value: V
    expires_at: float


class TtlCache[K: Hashable, V]:
    """Remembers each successful load for `ttl_seconds`.

    - A failed load (any exception) is never stored; the next call loads again.
    - Concurrent misses for one key share a single load, so a burst of requests
      makes one upstream call. Cancelling one caller does not cancel the load for
      the others.
    - Expired entries are dropped whenever a new value is stored, so memory stays
      bounded by the keys read within one TTL.
    """

    def __init__(self, *, ttl_seconds: float, clock: Clock = time.monotonic) -> None:
        self._ttl = ttl_seconds
        self._clock = clock
        self._entries: dict[K, _Entry[V]] = {}
        self._loading: dict[K, asyncio.Future[V]] = {}

    def __len__(self) -> int:
        return len(self._entries)

    async def get_or_load(self, key: K, load: Callable[[], Awaitable[V]]) -> V:
        entry = self._entries.get(key)
        if entry is not None and self._clock() < entry.expires_at:
            return entry.value
        pending = self._loading.get(key)
        if pending is None:
            pending = asyncio.ensure_future(self._load_and_store(key, load))
            # Retrieve the outcome even if every caller was cancelled, so a failure
            # is not reported as "never retrieved".
            pending.add_done_callback(_consume_outcome)
            self._loading[key] = pending
        # Waiting (not awaiting) leaves the shared load running if this caller is
        # cancelled; unlike asyncio.shield it logs nothing when the load later fails.
        await asyncio.wait((pending,))
        return pending.result()

    async def _load_and_store(self, key: K, load: Callable[[], Awaitable[V]]) -> V:
        try:
            value = await load()
        finally:
            del self._loading[key]
        now = self._clock()
        self._entries = {k: e for k, e in self._entries.items() if now < e.expires_at}
        self._entries[key] = _Entry(value, now + self._ttl)
        return value


def _consume_outcome[T](future: asyncio.Future[T]) -> None:
    if not future.cancelled():
        future.exception()
