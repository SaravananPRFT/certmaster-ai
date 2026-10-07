#!/usr/bin/env python3
"""
Download and scrape Microsoft Learn / GitHub docs pages into plain text files.

Usage:
    python scripts/download_docs.py --exam AI-102
    python scripts/download_docs.py --all
    python scripts/download_docs.py --all --delay 0.5 --output ./data/scraped

The script reads URL lists from data/urls/<exam>.txt and writes:
    data/scraped/<exam-lower>/<filename>.txt        (clean article text)
    data/scraped/<exam-lower>/<filename>.meta.json  (url, title, exam_code)
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: Missing dependencies. Run: pip install requests beautifulsoup4 lxml")
    sys.exit(1)

EXAM_CODES = ["ai-102", "az-104", "az-305", "gh-300", "ab-100", "ai-103", "ai-901"]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CertMasterAI-RAG/1.0; educational use)"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def clean_text(html: str) -> tuple[str, str]:
    """Return (clean_body_text, page_title) from raw HTML."""
    soup = BeautifulSoup(html, "lxml")

    title = ""
    title_tag = soup.find("h1") or soup.find("title")
    if title_tag:
        title = title_tag.get_text(strip=True)

    for tag in soup.find_all(["nav", "header", "footer", "aside", "script",
                               "style", "noscript", "form", "button", "iframe",
                               "svg", "img"]):
        tag.decompose()

    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(id=re.compile(r"main|content|article", re.I))
        or soup.find(class_=re.compile(r"content|article|main-column", re.I))
        or soup.body
    )
    if not main:
        return "", title

    text = main.get_text(separator="\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = [ln.strip() for ln in text.splitlines() if len(ln.strip()) > 25]
    return "\n".join(lines), title


def url_to_filename(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/").replace("/", "_")
    if not path:
        path = parsed.netloc
    if len(path) > 80:
        path = path[:60] + "_" + hashlib.md5(url.encode()).hexdigest()[:8]
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", path)


def download_exam(exam_code: str, urls_dir: Path, output_dir: Path, delay: float) -> tuple[int, int]:
    urls_file = urls_dir / f"{exam_code}.txt"
    if not urls_file.exists():
        print(f"  [WARN] URL list not found: {urls_file}")
        return 0, 0

    urls = [
        ln.strip()
        for ln in urls_file.read_text(encoding="utf-8").splitlines()
        if ln.strip() and not ln.startswith("#")
    ]
    if not urls:
        print(f"  [WARN] No URLs in {urls_file}")
        return 0, 0

    exam_out = output_dir / exam_code
    exam_out.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update(HEADERS)
    ok = fail = 0

    for url in urls:
        fname = url_to_filename(url)
        txt_path = exam_out / f"{fname}.txt"
        meta_path = exam_out / f"{fname}.meta.json"

        if txt_path.exists():
            print(f"  [SKIP] {fname} (already downloaded)")
            ok += 1
            continue

        try:
            print(f"  [GET ] {url}")
            resp = session.get(url, timeout=25, allow_redirects=True)
            resp.raise_for_status()
            text, title = clean_text(resp.text)

            if len(text) < 150:
                print(f"  [THIN] Too little content ({len(text)} chars), skipping")
                fail += 1
                continue

            txt_path.write_text(text, encoding="utf-8")
            meta_path.write_text(
                json.dumps({"url": url, "title": title, "exam_code": exam_code.upper()}, indent=2),
                encoding="utf-8",
            )
            ok += 1
            time.sleep(delay)

        except requests.HTTPError as exc:
            print(f"  [FAIL] HTTP {exc.response.status_code}: {url}")
            fail += 1
        except Exception as exc:
            print(f"  [FAIL] {exc}: {url}")
            fail += 1

    return ok, fail


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download MS Learn / GitHub docs for CertMasterAI RAG"
    )
    parser.add_argument("--exam", help="Single exam code, e.g. AI-102")
    parser.add_argument("--all", action="store_true", help="Download all exams")
    parser.add_argument("--urls-dir", default="./data/urls", help="Directory containing <exam>.txt URL lists")
    parser.add_argument("--output", default="./data/scraped", help="Output directory")
    parser.add_argument("--delay", type=float, default=1.2, help="Seconds between requests (be polite)")
    args = parser.parse_args()

    if not args.exam and not args.all:
        parser.print_help()
        sys.exit(1)

    urls_dir = Path(args.urls_dir)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    exams = EXAM_CODES if args.all else [args.exam.lower()]
    total_ok = total_fail = 0

    for exam in exams:
        print(f"\n=== {exam.upper()} ===")
        ok, fail = download_exam(exam, urls_dir, output_dir, args.delay)
        total_ok += ok
        total_fail += fail
        print(f"    {ok} downloaded, {fail} failed")

    print(f"\nTotal: {total_ok} OK, {total_fail} failed")


if __name__ == "__main__":
    main()
