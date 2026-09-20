"""Dịch vụ tài khoản.

`auth_service` là thực thể dùng chung cho toàn ứng dụng. Trước đây 5 router mỗi
nơi tự `AuthService()`, riêng `predict.py` còn dựng mới trong TỪNG request.
Lớp này không giữ trạng thái theo request nên dùng chung là an toàn.
"""

from .service import AuthService, TokenExpired

auth_service = AuthService()

__all__ = ["AuthService", "TokenExpired", "auth_service"]
