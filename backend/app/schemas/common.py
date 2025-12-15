from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="메세지")
    data: Optional[T] = Field(None, description="응답 데이터(성공 시)")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "요청이 성공적으로 처리되었습니다.",
                "data": None,
            }
        }
