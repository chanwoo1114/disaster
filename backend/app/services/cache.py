from cachetools import TTLCache

from ..config import CACHE_MAXSIZE, CACHE_TTL

cache = TTLCache(maxsize=CACHE_MAXSIZE, ttl=CACHE_TTL)
