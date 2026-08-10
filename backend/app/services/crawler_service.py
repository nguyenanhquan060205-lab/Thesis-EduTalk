import asyncio
import httpx
from bs4 import BeautifulSoup
from datetime import datetime
import google.generativeai as genai
import os
import json
from app.core.mongodb import get_db

class CrawlerService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
        
        self.summary_model = genai.GenerativeModel(
            model_name="gemini-flash-lite-latest",
            system_instruction="Bạn là chuyên viên tổng hợp tin tức giáo dục. Hãy tóm tắt bài báo tuyển sinh đại học sau đây thành 1 đoạn ngắn khoảng 2-3 câu, giọng điệu thân thiện với Gen Z, tập trung vào thông tin cốt lõi nhất.",
        )
    
    async def summarize_text(self, text: str) -> str:
        if not self.api_key or not text:
            return "Không có tóm tắt AI."
        try:
            # Rút gọn text nếu quá dài
            short_text = text[:3000]
            response = await self.summary_model.generate_content_async(short_text)
            return response.text or "Không có tóm tắt AI."
        except Exception as e:
            print(f"Lỗi AI tóm tắt: {e}")
            return "Lỗi khi dùng AI tóm tắt."

    async def scrape_news(self):
        """
        Cào dữ liệu tin tức mẫu.
        Do không có link cụ thể, ta cào từ trang giáo dục hoặc sử dụng dữ liệu mẫu (mock scrape).
        Thực tế: Hàm này sẽ fetch URL thật của trường HUIT.
        """
        print("[Crawler] Bắt đầu cào dữ liệu...")
        db = get_db()
        collection = db["news"]

        # ── HUIT Tuyen Sinh ──
        url = "https://ts.huit.edu.vn/tin-tuyen-sinh"
        base_url = "https://ts.huit.edu.vn"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                
            soup = BeautifulSoup(response.text, "html.parser")
            # Tìm thẻ div chứa bài báo
            articles = soup.find_all("div", class_="card", limit=5)
            
            new_articles = 0
            for article in articles:
                title_elem = article.find("h3")
                if not title_elem:
                    continue
                    
                a_tag = title_elem.find("a")
                title = a_tag.text.strip() if a_tag else title_elem.text.strip()
                link = a_tag["href"] if a_tag else ""
                
                # Nếu link là relative thì thêm base_url
                if link.startswith("/"):
                    link = base_url + link
                
                # Tránh trùng lặp
                exists = await collection.find_one({"sourceUrl": link})
                if exists:
                    continue
                
                desc_elem = article.find("p", class_="card-text")
                excerpt = desc_elem.text.strip() if desc_elem else ""
                
                img_elem = article.find("img")
                image = img_elem["src"] if img_elem and "src" in img_elem.attrs else "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3"
                if image.startswith("/"):
                    image = base_url + image

                # Lấy nội dung chi tiết của bài báo
                content_html = ""
                try:
                    if link:
                        async with httpx.AsyncClient(timeout=10.0) as detail_client:
                            detail_resp = await detail_client.get(link)
                        detail_soup = BeautifulSoup(detail_resp.text, "html.parser")
                        post_content = detail_soup.find("div", class_="post-content")
                        if post_content:
                            # Chỉnh sửa lại các link tương đối thành tuyệt đối
                            for tag in post_content.find_all(['img', 'a']):
                                if tag.name == 'img' and tag.has_attr('src') and tag['src'].startswith('/'):
                                    tag['src'] = base_url + tag['src']
                                elif tag.name == 'a' and tag.has_attr('href') and tag['href'].startswith('/'):
                                    tag['href'] = base_url + tag['href']
                            content_html = str(post_content)
                except Exception as ex:
                    print(f"Lỗi khi cào nội dung chi tiết {link}: {ex}")

                # Sinh tóm tắt bằng AI
                full_text = f"{title}. {excerpt}"
                ai_summary = await self.summarize_text(full_text)
                
                new_doc = {
                    "title": title,
                    "excerpt": excerpt,
                    "image": image,
                    "date": datetime.now().strftime("%d/%m/%Y"),
                    "category": "Tin tức nổi bật",
                    "sourceUrl": link,
                    "content_html": content_html,
                    "ai_summary": ai_summary,
                    "status": "pending",
                    "isHot": False,
                    "createdAt": datetime.now().isoformat()
                }
                
                await collection.insert_one(new_doc)
                new_articles += 1
                
            print(f"[Crawler] Đã cào xong. Số bài mới (pending): {new_articles}")
        except Exception as e:
            print(f"[Crawler] Lỗi cào dữ liệu: {e}")
