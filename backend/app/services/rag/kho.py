"""Kho vector Chroma — dựng lại từ artifact, không gọi API lúc khởi động.

Chroma ở đây đứng đúng vị trí của `model_nganh.json` bên research: một **artifact
dựng lại được**, không phải bản sao thứ hai của tri thức.

    data/kho_tri_thuc/*.md   ← nguồn gốc, người viết, git theo dõi
            │  scripts/nap_kho.py   (chạy tay, khi nào sửa .md thì chạy lại)
            ▼
    data/kho_vector/kho.json ← artifact: chunk + vector + metadata
            │  lúc backend khởi động
            ▼
    Chroma trong RAM         ← index truy vấn

Vì sao vector nằm trong artifact chứ không nhúng lại lúc khởi động:

- Render free **ngủ đông sau ~15 phút** không ai truy cập. Nhúng lại mỗi lần thức
  dậy thì thí sinh đầu tiên phải ngồi chờ.
- Gói free của Gemini có trần lượt gọi mỗi phút. Nhúng vài trăm chunk một lúc dễ
  bị chặn — và khi đó backend khởi động lên với kho RỖNG, chatbot lặng lẽ tụt về
  chế độ không-RAG, không có lỗi nào báo.

Vì sao dùng `EphemeralClient` (trong RAM) chứ không `PersistentClient` (ghi đĩa):
đĩa Render là ephemeral, ghi ra rồi cũng mất sau mỗi lần redeploy. Dựng lại từ
artifact trong ~1 giây thì đơn giản hơn và không có trạng thái nào để hỏng.
"""

import json
import logging
import pathlib

from app.core import paths
from app.services.rag.nhung import nhung_cau_hoi

log = logging.getLogger(__name__)

F_KHO = paths.KHO_VECTOR / "kho.json"
TEN_COLLECTION = "kho_tri_thuc_huit"  # Chroma 1.x bắt tên dài 3–512 ký tự
TOP_K = 4


class KhoVector:
    def __init__(self, duong_dan: pathlib.Path | None = None):
        self.duong_dan = duong_dan or F_KHO
        self._col = None
        self.thong_tin: dict = {}

    # ────────────────────────────────────────────────────────────────────
    def nap(self) -> bool:
        """Dựng index. Trả về False nếu chưa có artifact — KHÔNG ném lỗi.

        Chưa chạy `nap_kho.py` là chuyện bình thường lúc mới clone về. Chatbot
        vẫn phải chạy được ở chế độ không-RAG; chỉ có điều phải ghi log rõ ràng,
        vì "im lặng tụt về không-RAG" đúng là cái bẫy cần tránh.
        """
        if not self.duong_dan.exists():
            log.warning(
                "Chưa có %s — chatbot chạy KHÔNG có RAG. "
                "Chạy `python scripts/nap_kho.py` để dựng kho.",
                self.duong_dan,
            )
            return False

        d = json.loads(self.duong_dan.read_text(encoding="utf-8"))
        chunk = d["chunk"]
        if not chunk:
            log.warning("Artifact %s rỗng — chatbot chạy KHÔNG có RAG", self.duong_dan)
            return False

        import chromadb
        from chromadb.config import Settings

        # anonymized_telemetry mặc định BẬT — Chroma gửi số liệu sử dụng về
        # PostHog. Đồ án của trường thì không để dữ liệu đi ra ngoài lặng lẽ.
        client = chromadb.EphemeralClient(Settings(anonymized_telemetry=False))
        col = client.get_or_create_collection(
            TEN_COLLECTION, metadata={"hnsw:space": "cosine"}
        )
        col.add(
            ids=[c["id"] for c in chunk],
            documents=[c["noi_dung"] for c in chunk],
            metadatas=[c["meta"] for c in chunk],
            embeddings=[c["vector"] for c in chunk],
        )
        self._col = col
        self.thong_tin = {
            "so_chunk": len(chunk),
            "model_nhung": d.get("model_nhung"),
            "so_chieu": d.get("so_chieu"),
            "tao_luc": d.get("tao_luc"),
        }
        log.info(
            "Kho vector: %d chunk · %s · %d chiều",
            len(chunk), d.get("model_nhung"), d.get("so_chieu", 0),
        )
        return True

    @property
    def san_sang(self) -> bool:
        return self._col is not None

    # ────────────────────────────────────────────────────────────────────
    def liet_ke(self, tim: str = "", loai: str = "", bo_qua: int = 0, lay: int = 20):
        """Duyệt chunk trong kho — phục vụ trang quản trị.

        Lọc bằng Python chứ không bằng `where_document` của Chroma: kho chỉ vài
        trăm chunk nên quét thẳng là đủ nhanh, mà lại tìm được không dấu (thí sinh
        lẫn quản trị viên đều hay gõ không dấu) — thứ `where_document` không làm được.
        """
        if self._col is None:
            return [], 0

        from app.services.rag.nguon_co_cau_truc import bo_dau

        d = self._col.get(include=["documents", "metadatas"])
        ds = list(zip(d["ids"], d["documents"], d["metadatas"], strict=False))

        if loai:
            ds = [x for x in ds if x[2].get("loai") == loai]
        if tim:
            k = bo_dau(tim)
            ds = [x for x in ds if k in bo_dau(x[1]) or k in bo_dau(str(x[2]))]

        tong = len(ds)
        ds.sort(key=lambda x: x[0])
        return [
            {"id": i, "noi_dung": nd, "meta": m, "so_tu": len(nd.split())}
            for i, nd, m in ds[bo_qua : bo_qua + lay]
        ], tong

    # ────────────────────────────────────────────────────────────────────
    def truy_xuat(self, cau_hoi: str, k: int = TOP_K, loc: dict | None = None) -> list[dict]:
        """Tìm k đoạn gần nghĩa nhất. Lỗi mạng thì trả rỗng, KHÔNG ném lên trên.

        Nhúng câu hỏi cũng là một lệnh gọi API, có thể lỗi mạng hoặc bị chặn tần
        suất. Khi đó chatbot vẫn phải trả lời được, chứ không được ném 500 vào
        mặt thí sinh.
        """
        if self._col is None:
            return []
        try:
            qv = nhung_cau_hoi(cau_hoi)
        except Exception as e:  # noqa: BLE001
            log.error("Không nhúng được câu hỏi (%s) — bỏ qua RAG lượt này", type(e).__name__)
            return []

        r = self._col.query(query_embeddings=[qv], n_results=k, where=loc or None)
        return [
            {"noi_dung": d, "meta": m, "khoang_cach": kc}
            for d, m, kc in zip(
                r["documents"][0], r["metadatas"][0], r["distances"][0], strict=False
            )
        ]


_kho: KhoVector | None = None


def lay_kho() -> KhoVector:
    """Một bản duy nhất cho cả tiến trình. Nạp lười, lần gọi đầu mới dựng."""
    global _kho
    if _kho is None:
        _kho = KhoVector()
        _kho.nap()
    return _kho
