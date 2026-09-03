"""Che bớt thông tin cá nhân trước khi trả ra ngoài.

Nguyên tắc: chỉ **chính chủ** mới thấy đầy đủ email, số điện thoại, ngày sinh.
Mọi trường hợp khác (kể cả admin xem danh sách người dùng) đều nhận bản đã che.
Che ở tầng API chứ không phải ở giao diện — giấu bằng CSS thì mở DevTools là thấy.
"""


def che_email(email: str | None) -> str | None:
    """`concuatroix06@gmail.com` → `co**********@gmail.com`

    Giữ 2 ký tự đầu và toàn bộ tên miền để còn nhận ra được là hộp thư nào,
    nhưng không đủ để người khác dùng lại địa chỉ đó.
    """
    if not email or "@" not in email:
        return email
    ten, mien = email.split("@", 1)
    if len(ten) <= 2:
        return f"{ten[0] if ten else ''}*@{mien}"
    return f"{ten[:2]}{'*' * (len(ten) - 2)}@{mien}"


def che_sdt(phone: str | None) -> str | None:
    """`0908192311` → `090****311` — đủ để chính chủ nhận ra số của mình."""
    if not phone:
        return phone
    so = phone.strip()
    if len(so) <= 6:
        return "*" * len(so)
    return f"{so[:3]}{'*' * (len(so) - 6)}{so[-3:]}"


def che_ngay_sinh(dob: str | None) -> str | None:
    """`06/02/2009` → `**/**/2009` — giữ năm vì đó là thứ hữu ích cho thống kê,
    còn ngày/tháng là dữ liệu hay bị dùng để xác minh danh tính."""
    if not dob:
        return dob
    phan = dob.split("/")
    if len(phan) == 3:
        return f"**/**/{phan[2]}"
    return "*" * len(dob)


def che_ho_so(doc: dict) -> dict:
    """Trả bản sao đã che của một tài liệu người dùng.

    Không sửa `doc` gốc để tránh vô tình ghi ngược bản đã che xuống cơ sở dữ liệu.
    """
    ra = dict(doc)
    ra["email"] = che_email(ra.get("email"))
    ra["phone"] = che_sdt(ra.get("phone"))
    ra["dob"] = che_ngay_sinh(ra.get("dob"))
    # Token thiết bị không phục vụ việc hiển thị, mà lộ ra thì gửi được thông báo giả
    ra.pop("fcmToken", None)
    # `disabled` giữ nguyên để trang quản trị hiện được trạng thái khoá
    ra["daCheThongTin"] = True
    return ra
