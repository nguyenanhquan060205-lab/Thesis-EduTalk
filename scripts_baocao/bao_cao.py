"""Sinh báo cáo Word so sánh research2 (7 khối HUIT) và research3 (9 nhóm chia lại).

Đọc thẳng từ file kết quả của hai pipeline — KHÔNG gõ tay con số nào, nên báo cáo
không bao giờ lệch với code.

    python bao_cao.py     →  docs/BaoCao_SoSanh_research2_research3.docx
"""
import json, pathlib, sys
import pandas as pd
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import parse_xml

M_NS = 'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"'


def _r(t):
    """Một run trong công thức."""
    return f"<m:r><m:t xml:space='preserve'>{t}</m:t></m:r>"


def _f(tu, mau):
    """Phân số tử/mẫu."""
    return f"<m:f><m:num>{tu}</m:num><m:den>{mau}</m:den></m:f>"


def _sub(goc, chi):
    """Chỉ số dưới: goc_chi"""
    return f"<m:sSub><m:e>{goc}</m:e><m:sub>{chi}</m:sub></m:sSub>"


def _sup(goc, mu):
    return f"<m:sSup><m:e>{goc}</m:e><m:sup>{mu}</m:sup></m:sSup>"

GOC = pathlib.Path(__file__).resolve().parent.parent
RA = GOC / "docs" / "BaoCao_SoSanh_research2_research3.docx"
NHANH = [("research2", "7 khối ngành HUIT"), ("research3", "9 nhóm ngành chia lại")]

GD = ["01_LamSachKhaoSat", "02_ChuanBiTTTH", "03_TachTrainTest", "04_MocChuan",
      "05_HocPhanPhoi", "06_GA_TangCuong", "07_KiemDinhGA", "08_TrainFinal",
      "09_TinhChinh", "10_ChotModel"]


def doc(r, gd, ten):
    f = GOC / r / "data" / "processed" / gd / ten
    if not f.exists():
        return None
    try:
        return (json.loads(f.read_text(encoding="utf-8")) if ten.endswith(".json")
                else pd.read_csv(f))
    except Exception:
        return None


def hinh_cua(r, gd):
    d = GOC / r / "data" / "processed" / gd
    return sorted(d.glob("hinh_*.png")) if d.exists() else []


def pc(v, n=1):
    return "—" if v is None else f"{float(v)*100:.{n}f}%"


def kn(a, b):
    if a is None or b is None or float(b) >= 1:
        return None
    return (float(a) - float(b)) / (1 - float(b))


# ═══════════════════════════════════════════════════════════════════════════
class BaoCao:
    def __init__(self):
        self.d = Document()
        st = self.d.styles["Normal"]
        st.font.name = "Times New Roman"
        st.font.size = Pt(12)
        st.paragraph_format.space_after = Pt(6)
        st.paragraph_format.line_spacing = 1.25
        # Style Heading mặc định của Word có màu XANH — ép về đen
        for n in ("Heading 1", "Heading 2", "Heading 3", "Title"):
            try:
                f = self.d.styles[n].font
                f.color.rgb = RGBColor(0, 0, 0)
                f.name = "Times New Roman"
            except KeyError:
                pass
        for s in self.d.sections:
            s.left_margin = s.right_margin = Cm(2.2)
            s.top_margin = s.bottom_margin = Cm(2.0)
        self._n_hinh = 0

    DEN = RGBColor(0x00, 0x00, 0x00)

    def h(self, txt, lv=1):
        p = self.d.add_heading(txt, level=lv)
        for r in p.runs:
            r.font.name = "Times New Roman"
            r.font.color.rgb = self.DEN          # tất cả chữ màu đen
        return p

    def p(self, txt="", dam=False, ngh=False, co=12, giua=False, lui=0):
        pr = self.d.add_paragraph()
        if lui:
            pr.paragraph_format.left_indent = Cm(lui)
        r = pr.add_run(txt)
        r.bold, r.italic, r.font.size = dam, ngh, Pt(co)
        r.font.color.rgb = self.DEN
        if giua:
            pr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        return pr

    def ct(self, omml, chu=""):
        """Chèn CÔNG THỨC WORD THẬT (OMML) — Word đọc được như công thức,
        không phải ảnh hay chữ đều. Mở bằng Equation Editor sửa được."""
        pr = self.d.add_paragraph()
        pr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pr.paragraph_format.space_before = Pt(6)
        pr.paragraph_format.space_after = Pt(6)
        pr._p.append(parse_xml(f"<m:oMath {M_NS}>{omml}</m:oMath>"))
        if chu:
            c = self.d.add_paragraph(); c.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = c.add_run(chu); r.italic = True; r.font.size = Pt(10)
            r.font.color.rgb = self.DEN
        return pr

    def ma(self, txt, co=10):
        """Khối mã / công thức — nền xám, chữ đều."""
        pr = self.d.add_paragraph()
        pr.paragraph_format.left_indent = Cm(0.8)
        pr.paragraph_format.space_before = Pt(4)
        pr.paragraph_format.space_after = Pt(8)
        r = pr.add_run(txt)
        r.font.name = "Consolas"; r.font.size = Pt(co)
        r.font.color.rgb = self.DEN
        return pr

    def gach(self, muc, dam_dau=False):
        for m in muc:
            pr = self.d.add_paragraph(style="List Bullet")
            if dam_dau and " — " in m:
                a, b = m.split(" — ", 1)
                r = pr.add_run(a); r.bold = True; r.font.size = Pt(11)
                r2 = pr.add_run(" — " + b); r2.font.size = Pt(11)
            else:
                r = pr.add_run(m); r.font.size = Pt(11)
            for rr in pr.runs:
                rr.font.color.rgb = self.DEN

    def bang(self, dau, hang, co=9.5, rong=None):
        t = self.d.add_table(rows=1, cols=len(dau))
        t.style = "Table Grid"        # khung đen, không phải xanh
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, c in enumerate(dau):
            cell = t.rows[0].cells[i]; cell.text = ""
            r = cell.paragraphs[0].add_run(str(c))
            r.bold = True; r.font.size = Pt(co); r.font.color.rgb = self.DEN
        for h_ in hang:
            cells = t.add_row().cells
            for i, v in enumerate(h_):
                cells[i].text = ""
                r = cells[i].paragraphs[0].add_run("" if v is None else str(v))
                r.font.size = Pt(co); r.font.color.rgb = self.DEN
                if i == 0:
                    r.bold = True
        if rong:
            for i, w in enumerate(rong):
                for row in t.rows:
                    row.cells[i].width = Cm(w)
        self.d.add_paragraph()
        return t

    def hinh(self, duong, chu="", rong=15.5):
        if not pathlib.Path(duong).exists():
            return
        self._n_hinh += 1
        self.d.add_picture(str(duong), width=Cm(rong))
        self.d.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
        if chu:
            pr = self.d.add_paragraph(); pr.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = pr.add_run(chu); r.italic = True; r.font.size = Pt(9.5)
            r.font.color.rgb = self.DEN

    def ngat(self):
        self.d.add_page_break()

    def luu(self, f):
        f.parent.mkdir(parents=True, exist_ok=True)
        self.d.save(str(f))
        return self._n_hinh
