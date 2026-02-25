class AppException(Exception):
    def __init__(self, status_code: int = 500, message: str = "서버 오류"):
        self.status_code = status_code
        self.message = message
