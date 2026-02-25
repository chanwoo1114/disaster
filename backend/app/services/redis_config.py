import logging
import os

import redis

logger = logging.getLogger(__name__)

redis_client: redis.Redis | None = None


def redis_config():
    global redis_client

    try:
        redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=int(os.getenv("REDIS_DB", 0)),
            decode_responses=True,
        )
        redis_client.ping()
        logger.info("Redis 연결 성공")

    except Exception as e:
        logger.warning(f"Redis 연결 실패: {e}")
        redis_client = None
