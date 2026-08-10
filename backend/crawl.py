import urllib.request
try:
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/news/crawl', method='POST')
    res = urllib.request.urlopen(req)
    print(res.read().decode())
except Exception as e:
    print('Error:', e)
