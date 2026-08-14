# CertMasterAI — n8n Workflow Architecture

**Project:** CertMasterAI — Microsoft Certification Mock Exam Platform
**Date:** August 2026
**Author:** Engineering Team
**Purpose:** Define the five n8n automation workflows that together form the RAG knowledge base pipeline: URL discovery, document download, ChromaDB indexing, quality verification, and content change monitoring.

---

## Overview

The five workflows below are designed to run in sequence, with each workflow optionally triggering the next via webhook. Human approval gates are inserted at two points: after URL discovery (before downloading) and after content change detection (before re-indexing). Every workflow is idempotent — re-running it is safe and will not create duplicate records in ChromaDB.

```
[Workflow 1: URL Discovery]
        |
        v  (human review of new_urls.json)
[Workflow 2: Download & Scrape]
        |
        v  (webhook on completion)
[Workflow 3: ChromaDB Indexing]
        |
        v  (webhook on completion)
[Workflow 4: Quality Verification]

[Workflow 5: Content Monitor]  <-- runs independently daily
        |
        v  (human approval gate)
   triggers Workflow 2 with changed exam_code
```

Exam codes covered: **AI-102, AZ-104, AZ-305, GH-300, AB-100, AI-103**

---

## Workflow 1 — URL Discovery Workflow

### Purpose

Crawl Microsoft Learn's public sitemap XML, filter candidate article URLs by exam-relevant keyword patterns, deduplicate against the existing known-URL registry, and output a human-reviewable `new_urls.json` list. Intended to run weekly or on demand when new exam coverage is needed.

### ASCII Flow Diagram

```
+---------------------------+
|  Schedule Trigger         |
|  (weekly Mon 08:00 UTC)   |
|  OR Manual Trigger        |
+---------------------------+
             |
             v
+---------------------------+
|  HTTP Request             |
|  GET /sitemap.xml         |
|  (MS Learn root sitemap)  |
+---------------------------+
             |
             v
+---------------------------+
|  XML Parse                |
|  Extract <loc> elements   |
|  → array of sub-sitemap   |
|    URLs                   |
+---------------------------+
             |
             v
+---------------------------+
|  Split in Batches         |
|  (process sub-sitemaps    |
|   one at a time)          |
+---------------------------+
             |
             v
+---------------------------+
|  HTTP Request             |
|  GET each sub-sitemap URL |
+---------------------------+
             |
             v
+---------------------------+
|  XML Parse                |
|  Extract <loc> from each  |
|  sub-sitemap              |
+---------------------------+
             |
             v
+---------------------------+
|  Code (Filter)            |
|  Regex match exam keyword |
|  patterns per exam code:  |
|  azure-ai, key-phrase,    |
|  azure-openai, az-104,    |
|  github-actions, etc.     |
+---------------------------+
             |
             v
+---------------------------+
|  Read Binary File         |
|  known_urls.json          |
|  (existing URL registry)  |
+---------------------------+
             |
             v
+---------------------------+
|  IF Node                  |
|  Is URL already in        |
|  known_urls.json?         |
+---------------------------+
        |          |
     YES: skip   NO: pass
        |          |
        v          v
   [Discard]  +------------------+
              |  Aggregate       |
              |  Collect new URLs|
              |  with exam_code  |
              +------------------+
                      |
                      v
              +------------------+
              |  Write File      |
              |  new_urls.json   |
              |  (output dir)    |
              +------------------+
                      |
                      v
              +------------------+
              |  Send Email      |
              |  Summary:        |
              |  "N new URLs     |
              |   found for      |
              |   human review"  |
              +------------------+
```

### Node Description Table

| Step | Node Type | Purpose | Config Notes |
|------|-----------|---------|--------------|
| 1 | Schedule Trigger | Run weekly Monday 08:00 UTC | Also expose as Manual Trigger for ad-hoc runs |
| 2 | HTTP Request | Fetch `https://learn.microsoft.com/sitemap.xml` | Method: GET; Response format: Text |
| 3 | XML Parse | Extract all `<loc>` child sitemap URLs from root sitemap | XPath: `//sitemap/loc` |
| 4 | Split in Batches | Process sub-sitemaps 5 at a time to avoid rate limiting | Batch size: 5 |
| 5 | HTTP Request | Fetch each sub-sitemap XML | Method: GET; timeout: 10s; continue on fail: true |
| 6 | XML Parse | Extract all `<loc>` article URLs from each sub-sitemap | XPath: `//url/loc` |
| 7 | Code (Filter) | Apply per-exam keyword regex against URL path segments | Keywords defined as constant map: `{ "AI-102": ["azure-ai", "key-phrase", "azure-openai", "language-service"], "AZ-104": ["azure-administrator", "azure-virtual-network", "azure-active-directory"], "AZ-305": ["azure-solutions-architect", "azure-design"], "GH-300": ["github-actions", "github-copilot", "github-advanced-security"], "AB-100": ["azure-boards", "azure-devops"], "AI-103": ["azure-ai-studio", "azure-openai", "prompt-flow"] }` |
| 8 | Read Binary File | Load existing `known_urls.json` to enable deduplication | Path: `/data/registry/known_urls.json`; create if missing |
| 9 | IF Node | Skip URLs already present in the known registry | Condition: `!knownUrls.includes(currentUrl)` |
| 10 | Aggregate | Collect all net-new URLs into a single array with `exam_code` tag | Accumulate across all batches |
| 11 | Write File | Save `new_urls.json` for human review | Path: `/data/output/new_urls_{{ $now.format('YYYY-MM-DD') }}.json` |
| 12 | Send Email | Notify operator that a new URL list is ready for review | Include count per exam code in email body |

### Data Flow

- **Input:** None (schedule-triggered); MS Learn root sitemap URL is hardcoded
- **Between steps 2-6:** Raw XML text → parsed URL arrays → flattened URL list
- **Between steps 7-9:** Filtered URL list (with `exam_code` annotation) → deduplicated against known registry
- **Output:** `new_urls_YYYY-MM-DD.json` — array of `{ url, exam_code, discovered_at }` objects

### Expected Execution Time

15–25 minutes per run (network-bound; MS Learn has approximately 40–60 sub-sitemaps totaling 30,000+ URLs).

### Error Handling

- HTTP Request nodes set to **Continue on Fail** — a single failed sub-sitemap fetch does not abort the run.
- A secondary Code node after XML Parse checks for empty parse results and logs a warning.
- If the known_urls.json file is missing, the Code node initialises it as an empty array.
- Final email always includes a count of skipped (failed) sub-sitemaps.

---

## Workflow 2 — Document Download and Scrape Workflow

### Purpose

Read an operator-approved URL list, download each Microsoft Learn article, extract clean article body text (stripping navigation, headers, footers, and code tabs), attach metadata, and save `.txt` files organised by exam code. Emits a completion webhook to trigger Workflow 3.

### ASCII Flow Diagram

```
+----------------------------+
|  Webhook Trigger           |
|  POST /webhook/start-scrape|
|  body: { exam_code?,       |
|           url_file }       |
|  OR Manual Trigger         |
+----------------------------+
             |
             v
+----------------------------+
|  Read Binary File          |
|  approved_urls.txt         |
|  (operator-approved list)  |
+----------------------------+
             |
             v
+----------------------------+
|  Code (Parse)              |
|  Parse file into URL array |
|  Filter by exam_code if    |
|  provided in webhook body  |
+----------------------------+
             |
             v
+----------------------------+
|  Split in Batches          |
|  10 URLs per batch         |
+----------------------------+
             |
             v
+----------------------------+
|  HTTP Request              |
|  GET each article URL      |
|  (return HTML)             |
+----------------------------+
             |
        +---------+
     200 OK      Non-200
        |            |
        v            v
+-------------+  +-------------------+
|HTML Extract |  |  Append to File   |
|CSS Selector:|  |  failed_urls.log  |
|article body |  +-------------------+
|strip: nav,  |
|footer,      |
|.nav-primary |
+-------------+
        |
        v
+----------------------------+
|  Code (Clean + Metadata)   |
|  - Normalise whitespace    |
|  - Remove duplicate lines  |
|  - Add metadata header:    |
|    url, title, exam_code,  |
|    scraped_at              |
+----------------------------+
             |
             v
+----------------------------+
|  Write Binary File         |
|  /docs/scraped/{exam_code}/|
|  {slug}.txt                |
+----------------------------+
             |
             v
+----------------------------+
|  Set (Stats Accumulator)   |
|  downloaded++              |
|  bytes_total += filesize   |
+----------------------------+
             |
             v  (after all batches)
+----------------------------+
|  HTTP Request (Webhook)    |
|  POST /webhook/start-index |
|  body: { exam_code,        |
|          files_written,    |
|          failed_count }    |
+----------------------------+
             |
             v
+----------------------------+
|  Send Email                |
|  "Scrape complete:         |
|   X pages downloaded,      |
|   Y failed"                |
+----------------------------+
```

### Node Description Table

| Step | Node Type | Purpose | Config Notes |
|------|-----------|---------|--------------|
| 1 | Webhook / Manual Trigger | Accept approved URL list filename and optional exam_code filter | Webhook path: `/webhook/start-scrape` |
| 2 | Read Binary File | Load the operator-approved URL file | Path from webhook body or default `approved_urls.txt` |
| 3 | Code (Parse) | Split file into array; apply exam_code filter if provided | Returns `[{ url, exam_code }]` |
| 4 | Split in Batches | Process 10 URLs at a time | Avoids overwhelming MS Learn; batch size configurable |
| 5 | HTTP Request | Fetch article HTML | Method: GET; timeout: 15s; full response; continue on fail: true |
| 6 | IF Node | Branch on HTTP status code | `statusCode === 200` |
| 7a | HTML Extract | Extract main article content | CSS selectors: `main`, `article`, `.content`; strip: `nav`, `footer`, `.breadcrumb`, `.feedback-section` |
| 7b | Append to File | Log failed URL with status code | Path: `/data/logs/failed_urls_{{ $now.format('YYYY-MM-DD') }}.log` |
| 8 | Code (Clean + Metadata) | Normalise text; prepend metadata block | Metadata format: `--- url: {url}\ntitle: {title}\nexam_code: {exam_code}\nscraped_at: {iso_timestamp}\n---` |
| 9 | Write Binary File | Save `.txt` file per article | Path: `/docs/scraped/{exam_code}/{url-slug}.txt` |
| 10 | Set | Accumulate download stats across batches | Fields: `files_written`, `bytes_total`, `failed_count` |
| 11 | HTTP Request | Fire webhook to trigger Workflow 3 | POST to Workflow 3 webhook URL with stats payload |
| 12 | Send Email | Operator summary email | Include per-exam counts and link to failed_urls.log |

### Data Flow

- **Input:** `approved_urls.txt` — newline-delimited list of `url,exam_code` pairs
- **Between steps 5-8:** Raw HTML → extracted article text → cleaned text with metadata header
- **Between steps 9-10:** Written file path → stats accumulator
- **Output:** One `.txt` file per article under `/docs/scraped/{exam_code}/`; `failed_urls.log`; webhook payload to Workflow 3

### Expected Execution Time

Approximately 2–5 minutes per 100 URLs (network-bound; 10 concurrent with batch splitting).

### Error Handling

- 404s and 5xx responses branch to `failed_urls.log` and do not abort the batch.
- Empty HTML Extract output (page with unusual structure) logs a warning and writes a stub file with the URL for manual inspection.
- Workflow 3 webhook is only fired after all batches complete, ensuring Workflow 3 always receives a complete picture.

---

## Workflow 3 — Indexing Workflow (ChromaDB)

### Purpose

Read scraped `.txt` files, split each into overlapping 500-word chunks, generate sentence-transformer embeddings via a local HTTP endpoint, and upsert all chunks into ChromaDB with full metadata. Triggers Workflow 4 on completion.

### ASCII Flow Diagram

```
+-------------------------------+
|  Webhook Trigger              |
|  POST /webhook/start-index    |
|  body: { exam_code?,          |
|           files_written }     |
|  OR Schedule Trigger (nightly)|
+-------------------------------+
               |
               v
+-------------------------------+
|  Code (Resolve Paths)         |
|  Build list of .txt files     |
|  from /docs/scraped/          |
|  Filter by exam_code if set   |
+-------------------------------+
               |
               v
+-------------------------------+
|  Loop Over Items              |
|  (per exam_code folder)       |
+-------------------------------+
               |
               v
+-------------------------------+
|  Read Binary File             |
|  Read each .txt file          |
+-------------------------------+
               |
               v
+-------------------------------+
|  Code (Chunker)               |
|  Split text into 500-word     |
|  chunks, 50-word overlap      |
|  Attach metadata per chunk:   |
|  exam_code, url, title,       |
|  chunk_index, total_chunks    |
+-------------------------------+
               |
               v
+-------------------------------+
|  HTTP Request                 |
|  POST /embed                  |
|  local sentence-transformers  |
|  endpoint (port 8001)         |
|  body: { texts: [chunk...] }  |
+-------------------------------+
               |
               v
+-------------------------------+
|  HTTP Request                 |
|  POST /api/v1/collections/    |
|  {exam_code}/upsert           |
|  ChromaDB REST API            |
|  body: { ids, embeddings,     |
|           documents,          |
|           metadatas }         |
+-------------------------------+
               |
          +--------+
        OK          Error
          |              |
          v              v
  +-------------+  +-------------------+
  |  Set        |  |  Send Notification|
  |  stats:     |  |  Slack / Email    |
  |  chunks++   |  |  "Indexing error: |
  |  per exam   |  |   {exam_code}"    |
  +-------------+  +-------------------+
          |
          v  (after all files)
+-------------------------------+
|  HTTP Request (Webhook)       |
|  POST /webhook/start-quality  |
|  body: { chunks_total,        |
|           exams_indexed }     |
+-------------------------------+
               |
               v
+-------------------------------+
|  Send Notification            |
|  "Indexing complete:          |
|   2,847 chunks across 6 exams"|
+-------------------------------+
```

### Node Description Table

| Step | Node Type | Purpose | Config Notes |
|------|-----------|---------|--------------|
| 1 | Webhook / Schedule Trigger | Accept trigger from Workflow 2 or run nightly | Webhook: `/webhook/start-index`; Schedule: daily 02:00 UTC |
| 2 | Code (Resolve Paths) | Enumerate `.txt` files under `/docs/scraped/` | Uses Node.js `fs.readdirSync`; filters by `exam_code` if present in webhook body |
| 3 | Loop Over Items | Iterate over file list | n8n Loop node — processes each file path as a separate item |
| 4 | Read Binary File | Read `.txt` content | File path from loop item |
| 5 | Code (Chunker) | Split document into 500-word chunks with 50-word overlap | Pure JS string split on whitespace; assigns `chunk_id = "{url_hash}_{chunk_index}"` for deterministic upsert IDs |
| 6 | HTTP Request | Send batch of chunks to local embedding service | POST `http://localhost:8001/embed`; body: `{ texts: string[] }`; returns `{ embeddings: float[][] }` |
| 7 | HTTP Request | Upsert chunk batch into ChromaDB | POST `http://localhost:8000/api/v1/collections/{exam_code}/upsert`; ChromaDB collection per exam code |
| 8 | IF Node | Check for upsert error | Branch on HTTP status != 200 |
| 9a | Set | Accumulate indexing stats | `chunks_added`, `files_processed` per exam |
| 9b | Send Notification | Alert on indexing error | Email / Slack; include exam_code, error message, file path |
| 10 | HTTP Request | Trigger Workflow 4 via webhook | POST to Workflow 4 with `{ chunks_total, exams_indexed: string[] }` |
| 11 | Send Notification | Completion summary | Email: chunk counts per exam, total time elapsed |

### Data Flow

- **Input:** Webhook payload with optional `exam_code` filter; `.txt` files on local filesystem
- **Between steps 5-6:** Array of chunk text strings → embedding vectors (768-dim from all-MiniLM-L6-v2)
- **Between steps 6-7:** `{ chunk_text, embedding_vector, metadata }` → ChromaDB upsert payload
- **Output:** ChromaDB collections updated; stats payload forwarded to Workflow 4

### Expected Execution Time

3–8 minutes per exam code (CPU-bound on embedding generation; approximately 400–600 chunks per exam at 500 words/chunk).

### Error Handling

- ChromaDB upsert uses document hash as ID — re-running the workflow is safe; existing chunks are overwritten, not duplicated.
- Embedding endpoint failures retry once after 5 seconds before branching to the error notification.
- If the ChromaDB collection for an exam code does not exist, a prior Code node creates it via the `/api/v1/collections` endpoint before upserting.

---

## Workflow 4 — Quality Verification Workflow

### Purpose

After indexing completes, run a fixed set of test queries (one per exam objective area) against ChromaDB, inspect the top-5 retrieved results for keyword relevance, compile a pass/fail report per exam, and alert operators if any exam falls below the 80% threshold.

### ASCII Flow Diagram

```
+-------------------------------+
|  Webhook Trigger              |
|  POST /webhook/start-quality  |
|  body: { exams_indexed }      |
|  OR Manual Trigger            |
+-------------------------------+
               |
               v
+-------------------------------+
|  Code (Load Test Queries)     |
|  Hardcoded map: exam_code →   |
|  [{ query, expected_keywords  |
|     objective }]              |
|  Filter to exams_indexed      |
+-------------------------------+
               |
               v
+-------------------------------+
|  Split in Batches             |
|  One query at a time          |
+-------------------------------+
               |
               v
+-------------------------------+
|  HTTP Request                 |
|  POST /embed  (query vector)  |
|  local embeddings endpoint    |
+-------------------------------+
               |
               v
+-------------------------------+
|  HTTP Request                 |
|  POST /api/v1/collections/    |
|  {exam_code}/query            |
|  n_results: 5                 |
|  ChromaDB nearest-neighbour   |
+-------------------------------+
               |
               v
+-------------------------------+
|  Code (Score Results)         |
|  For each of top-5 results:   |
|  check if expected_keywords   |
|  appear in document text      |
|  → pass/fail per query        |
|  → pass_rate per exam         |
+-------------------------------+
               |
               v
+-------------------------------+
|  Aggregate                    |
|  Compile pass/fail across     |
|  all queries per exam         |
+-------------------------------+
               |
               v
+-------------------------------+
|  Write File                   |
|  quality_report_YYYY-MM-DD    |
|  .json                        |
+-------------------------------+
               |
               v
+-------------------------------+
|  IF Node                      |
|  Any exam < 80% pass rate?    |
+-------------------------------+
        |               |
      YES               NO
        |               |
        v               v
+-----------+   +-----------------+
|Send ALERT |   |Send OK Email    |
|Email:     |   |"Quality check   |
|"FAILED:   |   | PASSED — all 6  |
| GH-300    |   | exams verified" |
| re-index  |   +-----------------+
| needed"   |
+-----------+
```

### Node Description Table

| Step | Node Type | Purpose | Config Notes |
|------|-----------|---------|--------------|
| 1 | Webhook / Manual Trigger | Accept trigger from Workflow 3 or run on demand | Webhook: `/webhook/start-quality` |
| 2 | Code (Load Test Queries) | Define 3–5 test queries per exam with expected keyword lists | Example: `{ exam: "AI-102", query: "key phrase extraction Azure", expected: ["KeyPhraseExtraction", "language service", "Text Analytics"] }` |
| 3 | Split in Batches | Process queries individually | Batch size: 1 |
| 4 | HTTP Request | Embed the test query string | POST `http://localhost:8001/embed`; body: `{ texts: [query] }` |
| 5 | HTTP Request | Query ChromaDB for top 5 nearest neighbours | POST `http://localhost:8000/api/v1/collections/{exam_code}/query`; `n_results: 5` |
| 6 | Code (Score) | Keyword presence check across top-5 results | Returns `{ query, exam_code, pass_rate, matched_keywords, top_result_excerpt }` |
| 7 | Aggregate | Collect all query scores into exam-level summary | Groups by `exam_code`; computes mean pass rate per exam |
| 8 | Write File | Save JSON quality report | Path: `/data/reports/quality_report_{{ $now.format('YYYY-MM-DD') }}.json` |
| 9 | IF Node | Threshold check | Condition: `exams.some(e => e.pass_rate < 0.80)` |
| 10a | Send Email (Alert) | Notify operator of failing exams | List which exams failed; include pass rates and recommended action |
| 10b | Send Email (OK) | Confirm quality check passed | Include per-exam pass rates for audit trail |

### Data Flow

- **Input:** Webhook payload with `exams_indexed` list; hardcoded test query bank
- **Between steps 4-5:** Query embedding vector → ChromaDB similarity search → top-5 document chunks
- **Between steps 6-7:** Per-query `{ pass, fail, keywords_found }` → exam-level aggregation
- **Output:** `quality_report_YYYY-MM-DD.json`; email notification (alert or OK)

### Expected Execution Time

2–4 minutes (30 test queries total across 6 exams, each requiring an embed + ChromaDB query call).

### Error Handling

- If ChromaDB returns zero results for a query, that query is scored 0% and counts toward the failure threshold.
- An empty collection (exam not yet indexed) is reported as a special `NOT_INDEXED` status rather than a numeric failure.
- The quality report is always written regardless of pass/fail outcome, providing a persistent audit trail.

---

## Workflow 5 — Content Change Monitor and Auto-Refresh

### Purpose

Daily check of each exam's "Skills Measured" page on Microsoft Learn. Computes a content hash and compares against the stored previous hash. When a change is detected, sends an approval email to the operator. If approved, automatically triggers Workflow 2 for the affected exam code.

### ASCII Flow Diagram

```
+--------------------------------+
|  Schedule Trigger              |
|  Daily 06:00 UTC               |
+--------------------------------+
                |
                v
+--------------------------------+
|  Code (Build URL List)         |
|  One "Skills measured" URL     |
|  per exam code                 |
+--------------------------------+
                |
                v
+--------------------------------+
|  Split in Batches              |
|  One exam at a time            |
+--------------------------------+
                |
                v
+--------------------------------+
|  HTTP Request                  |
|  GET skills page HTML          |
+--------------------------------+
                |
                v
+--------------------------------+
|  HTML Extract                  |
|  Extract .skills-measured      |
|  section text only             |
+--------------------------------+
                |
                v
+--------------------------------+
|  Code (Hash)                   |
|  SHA-256 of extracted text     |
|  → { exam_code, hash,          |
|       fetched_at }             |
+--------------------------------+
                |
                v
+--------------------------------+
|  Read File                     |
|  previous_hashes.json          |
+--------------------------------+
                |
                v
+--------------------------------+
|  IF Node                       |
|  hash !== previous[exam_code]? |
+--------------------------------+
        |               |
    NO CHANGE       CHANGED
        |               |
        v               v
+----------+   +------------------+
|  Set     |   |  Code            |
|  Update  |   |  Identify which  |
|  timestamp   |  exam changed    |
|  only    |   +------------------+
+----------+           |
                       v
              +------------------+
              |  Send Email      |
              |  "AI-102 skills  |
              |   page changed.  |
              |   Approve        |
              |   re-index?      |
              |   [Approve link] |
              |   [Reject link]" |
              +------------------+
                       |
                       v
              +------------------+
              |  Wait Node       |
              |  Wait for        |
              |  webhook:        |
              |  /approve-reindex|
              |  or /reject      |
              |  Timeout: 48 hrs |
              +------------------+
                       |
              +--------+---------+
           APPROVED           REJECTED
              |                    |
              v                    v
   +------------------+   +------------------+
   |  HTTP Request    |   |  Code            |
   |  Trigger         |   |  Log skip reason |
   |  Workflow 2      |   |  Update hash     |
   |  POST /webhook/  |   |  timestamp only  |
   |  start-scrape    |   +------------------+
   |  { exam_code }   |
   +------------------+
              |
              v
   +------------------+
   |  Write File      |
   |  Update          |
   |  previous_hashes |
   |  .json           |
   +------------------+
```

### Node Description Table

| Step | Node Type | Purpose | Config Notes |
|------|-----------|---------|--------------|
| 1 | Schedule Trigger | Run daily at 06:00 UTC | Configurable; avoids MS Learn peak hours |
| 2 | Code (Build URL List) | Hardcode one "Skills Measured" URL per exam | `{ "AI-102": "https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-102/", ... }` |
| 3 | Split in Batches | Process exams one at a time | Batch size: 1; prevents rate limiting |
| 4 | HTTP Request | Fetch skills page HTML | GET; timeout: 10s; continue on fail: true |
| 5 | HTML Extract | Extract skills section text | CSS selector: `.skills-measured`, `#skills-measured`, or fallback to `main` |
| 6 | Code (Hash) | Compute SHA-256 of extracted text | Returns `{ exam_code, hash, fetched_at: ISO string }` |
| 7 | Read File | Load stored hash registry | Path: `/data/registry/previous_hashes.json`; initialise empty if missing |
| 8 | IF Node | Compare current hash to stored hash | `currentHash !== storedHashes[exam_code]` |
| 9a | Set | No change — update only `checked_at` timestamp | Preserves existing hash; marks exam as up-to-date |
| 9b | Code | Identify changed exam and build approval email body | Include diff summary if available (character count change) |
| 10 | Send Email | Approval request with one-click approve/reject links | Links are n8n webhook URLs with pre-encoded `exam_code` and `action` params |
| 11 | Wait | Pause execution pending human webhook response | Timeout: 48 hours; on timeout → auto-reject and log |
| 12a | HTTP Request | Trigger Workflow 2 for the changed exam | POST `/webhook/start-scrape` with `{ exam_code, url_file: "approved_urls_{exam_code}.txt" }` |
| 12b | Code | Log rejection with reason | Writes to `/data/logs/rejected_reindex.log` |
| 13 | Write File | Persist updated hash registry | Merges new hash for changed exam into `previous_hashes.json` |

### Data Flow

- **Input:** None (schedule-triggered); exam URL map is hardcoded in Workflow
- **Between steps 4-6:** Raw HTML → extracted skills text → SHA-256 hash string
- **Between steps 7-8:** Current hash vs. stored hash → change detected boolean
- **Between steps 10-11:** Operator email → webhook callback `{ exam_code, action: "approve"|"reject" }`
- **Output:** Updated `previous_hashes.json`; optional trigger of Workflow 2; audit log entry

### Expected Execution Time

3–6 minutes for full daily check across all 6 exams (network-bound).

### Error Handling

- HTTP failures for individual exams are logged but do not prevent other exams from being checked.
- The Wait node timeout (48 hours) prevents the workflow from hanging indefinitely if an operator does not respond to the approval email.
- If `previous_hashes.json` is missing or corrupt, the Code node initialises a fresh registry — all exams will appear as "changed" on the first run, triggering a full re-index approval request.
- The hash comparison is on extracted text only (not full HTML), so changes to page navigation or footer do not produce false positives.

---

## Appendix: Workflow Interconnection Summary

| Trigger Type | From | To | Condition |
|---|---|---|---|
| Webhook (automatic) | Workflow 2 completes | Workflow 3 starts | Always — after all pages downloaded |
| Webhook (automatic) | Workflow 3 completes | Workflow 4 starts | Always — after indexing complete |
| Webhook (human-gated) | Workflow 5 detects change | Workflow 2 starts | Operator approves re-index email |
| Manual | Operator | Any workflow | Ad-hoc via n8n UI or webhook URL |
| Schedule | n8n scheduler | Workflow 1 | Weekly (URL discovery) |
| Schedule | n8n scheduler | Workflow 5 | Daily (change monitoring) |
| Schedule | n8n scheduler | Workflow 3 | Nightly fallback (indexing, if Workflow 2 did not fire) |

## Appendix: Environment Variables Required

| Variable | Purpose | Example Value |
|---|---|---|
| `EMBEDDING_ENDPOINT` | Local sentence-transformers service URL | `http://localhost:8001` |
| `CHROMADB_ENDPOINT` | Local ChromaDB REST API URL | `http://localhost:8000` |
| `SMTP_HOST` | Email notification server | `smtp.gmail.com` |
| `SMTP_USER` | Email sender address | `certmaster-alerts@example.com` |
| `SMTP_PASS` | Email password or app password | (stored in n8n credentials) |
| `NOTIFY_EMAIL` | Operator email for alerts | `ops-team@example.com` |
| `DATA_ROOT` | Base path for file I/O | `/data` |
| `SCRAPED_ROOT` | Base path for scraped .txt files | `/docs/scraped` |
| `N8N_WEBHOOK_BASE` | Base URL for self-hosted n8n | `http://localhost:5678` |
