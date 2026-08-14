# CertMasterAI — POC Automation Strategy

**Project:** CertMasterAI — Microsoft Certification Mock Exam Platform
**Date:** August 2026
**Author:** Engineering Team
**Purpose:** Define a zero-cost, local-machine proof-of-concept for automating the RAG knowledge base pipeline using n8n, ChromaDB, sentence-transformers, and the existing Portkey/Claude Sonnet integration.

---

## Executive Summary

CertMasterAI's core value proposition depends on a continuously accurate, well-indexed knowledge base sourced from Microsoft Learn. Today that knowledge base is maintained entirely through manual effort: an operator must discover URLs, download pages, chunk text, generate embeddings, load them into ChromaDB, and periodically check for content drift — a process that takes approximately 4 hours per refresh cycle and scales poorly as coverage is extended to additional exam codes.

This document defines a practical, stakeholder-presentable automation strategy that operates entirely on a developer's local machine, requires no cloud infrastructure approval, and costs effectively nothing beyond the existing Portkey/Claude Sonnet key that is already in use for question generation.

The strategy is built on five n8n workflows (detailed in `N8N_WORKFLOW_ARCHITECTURE.md`) and relies exclusively on free, self-hosted, or already-purchased components. The POC is achievable in a single working day and produces a running demonstration in which: (1) content changes on Microsoft Learn automatically trigger a re-index pipeline, (2) every generated question traces back to a specific MS Learn article, and (3) a quality verification report confirms retrieval accuracy after each indexing run.

This document serves as the implementation guide and stakeholder briefing for that POC.

---

## Section 1: POC Goals and Constraints

### Goals

1. Demonstrate that the full RAG pipeline (URL discovery → download → index → quality check) can be triggered and completed with zero human intervention beyond an initial approval step.
2. Confirm that ChromaDB with local sentence-transformer embeddings produces retrieval quality equivalent to or better than the current manual process.
3. Validate that n8n can orchestrate the pipeline reliably on a Windows 11 developer machine without specialised infrastructure.
4. Produce a repeatable, documented setup that a second engineer can replicate in under two hours.
5. Generate enough evidence for a stakeholder demo: a content change on MS Learn automatically propagates into the knowledge base within 24 hours of detection.

### Constraints

| Constraint | Detail |
|---|---|
| Zero new cloud spend | No Azure AI Search, no Azure OpenAI embeddings, no paid APIs beyond existing Portkey key |
| No Azure approval required | Azure subscription is pending approval; POC must be fully runnable without it |
| Portkey/Claude Sonnet available | Existing key is in place; ~$0.01–0.05 per question generation batch is acceptable |
| Local machine only | Windows 11 Enterprise, Docker Desktop available, 16 GB RAM assumed |
| No production deployment | POC runs on developer machine; no SSL, no authentication hardening required |
| Existing codebase untouched | No changes to the Next.js frontend or FastAPI backend during the POC phase |

---

## Section 2: Zero-Cost Component Map

The following table maps each pipeline function to its free implementation option.

| Component | Free Option | Why It Works | Catch |
|---|---|---|---|
| **Workflow orchestration** | n8n self-hosted (Docker, community edition) | Apache 2.0 license; full feature set including HTTP, File, Code, Schedule, Webhook nodes; no usage limits | Requires Docker Desktop; initial setup ~30 min |
| **Document ingestion** | n8n HTTP Request node + HTML Extract node | Native n8n nodes; no extra library needed for straightforward article scraping | Complex JS-rendered pages (rare on MS Learn) may need a Code node with Cheerio |
| **Vector storage** | ChromaDB local (already in use) | Already integrated with FastAPI backend; REST API accessible on `localhost:8000`; persistent volume via Docker | Single-node, no replication; fine for POC scale |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` via local HTTP service | 90 MB model; runs on CPU in ~50 ms/chunk on modern hardware; 768-dim vectors; strong English semantic quality | Slower than GPU-accelerated options; ~3 min per exam code at 500 chunks |
| **LLM (question generation)** | Portkey → Claude Sonnet (existing key) | Already integrated and working; ~$0.01–0.05 per exam per batch generation run | Not free; keep batch sizes small during POC |
| **LLM fallback** | Ollama + llama3 (local) | Free; 4–8 GB RAM; no API calls; acceptable quality for question generation | 4–8 GB model download required; ~10x slower than Claude Sonnet |
| **Notifications** | Gmail SMTP (free tier) via n8n Send Email node | n8n has native SMTP support; Gmail allows up to 500 emails/day on free tier | Requires a Gmail app password (2-step verification must be enabled) |
| **Quality scoring** | Python cosine similarity in n8n Code node (JavaScript) | No extra library; cosine similarity between query embedding and result embeddings computable inline | Approximate scoring only; not a full evaluation framework |
| **Content monitoring** | n8n Schedule + HTTP Request + SHA-256 hash | Pure n8n; no external service; daily hash comparison is deterministic | Cannot detect partial rewrites below the hash-change threshold |
| **Storage / file I/O** | Local filesystem (Docker volume or host mount) | Zero cost; fast; no network overhead | Not durable across machine rebuilds unless volume is backed up |
| **URL discovery** | n8n HTTP Request + XML Parse (MS Learn sitemaps) | MS Learn publishes public sitemaps at `/sitemap.xml`; no auth required | Human review step retained; n8n only narrows the candidate list |

**Total incremental cost of POC: $0** (assuming Portkey key is already expensed; Ollama path makes even that optional).

---

## Section 3: POC Use Cases and Automation Status

The following table summarises the seven CertMasterAI operational use cases and their automation readiness as of the POC.

| # | Use Case | Automation Status | Notes |
|---|---|---|---|
| 1 | **Document ingestion** (URL discovery → download → chunk → index) | Fully Automatable | Covered by Workflows 1–3; human approval gate after URL discovery is intentional, not a limitation |
| 2 | **Question generation** (RAG + LLM → question bank) | Working Now | Portkey/Claude integration already operational; no n8n changes needed |
| 3 | **Question validation** (grounding score gate) | Automatable | Existing grounding score threshold in FastAPI; n8n can call the validation endpoint post-generation |
| 4 | **Study plan generation** | Partially Automatable | Requires a new FastAPI endpoint; n8n can call it once built, but the endpoint is not yet implemented |
| 5 | **Automated content refresh** (monitor MS Learn → re-index on change) | Fully Automatable | Covered by Workflow 5; end-to-end automation with human approval gate before re-download |
| 6 | **Notifications** (operators alerted on pipeline events) | Fully Automatable | SMTP email via n8n; all five workflows send summary/alert emails |
| 7 | **RAG experimentation** (chunk size, overlap, retrieval k) | Partially Automatable | n8n can run parameter sweep experiments by calling ChromaDB and the embedding endpoint with different configs; but evaluation of which config is "better" still requires human judgment |

**Summary:** 4 of 7 use cases are fully automatable today. 2 are partially automatable with known next steps. 1 (question generation) is already working without changes.

---

## Section 4: Implementation Priority

The following ordered list reflects the balance between implementation effort and operational value. Items are ordered for a single-day POC sprint.

1. **Content monitoring and notification** (Workflow 5)
   - Value: Highest. This is the use case stakeholders care most about — "does the system know when Microsoft changes exam content?"
   - Effort: 2–3 hours setup including Gmail SMTP credential configuration
   - Deliverable: Daily automated email that either confirms "no changes detected" or requests approval to re-index a specific exam
   - Why first: Produces a visible, compelling result immediately; requires no file system setup

2. **Document download and scrape automation** (Workflow 2)
   - Value: High. Eliminates the most time-consuming manual step (4–6 hours per full refresh)
   - Effort: 1–2 hours (HTTP Request + HTML Extract node configuration; file naming convention)
   - Prerequisite: An `approved_urls.txt` file must exist (created manually for POC, by Workflow 1 thereafter)
   - Deliverable: One `.txt` file per article under `/docs/scraped/{exam_code}/`

3. **Indexing automation** (Workflow 3)
   - Value: Medium-high. Eliminates manual Python scripting for chunking and embedding
   - Effort: 1 hour (ChromaDB upsert API call; local embedding endpoint wiring)
   - Prerequisite: Embedding service must be running on port 8001; ChromaDB on 8000
   - Deliverable: ChromaDB collections populated; chunks visible via ChromaDB API or FastAPI

4. **Quality verification report** (Workflow 4)
   - Value: Medium. Provides evidence of retrieval quality; needed for stakeholder demo
   - Effort: 2 hours (test query bank design; scoring logic in Code node)
   - Deliverable: `quality_report_YYYY-MM-DD.json`; email with per-exam pass rates

5. **URL discovery** (Workflow 1)
   - Value: Lower for POC (URL list can be manually compiled once for 6 exams)
   - Effort: 3 hours (sitemap XML structure varies; keyword filter tuning required)
   - Deliverable: `new_urls_YYYY-MM-DD.json`; weekly automated candidate list generation
   - Note: Highest complexity; most likely to need iteration; schedule last

---

## Section 5: Local Deployment Architecture

The following diagram shows all components running on a single developer machine, with three external dependencies: Portkey gateway, Microsoft Learn (read-only), and Gmail SMTP.

```
+=========================================================+
|                  Developer Machine                       |
|                  Windows 11 Enterprise                   |
|                                                          |
|  +------------------+    +------------------+           |
|  |  n8n             |    |  sentence-        |          |
|  |  (Docker)        |    |  transformers     |          |
|  |  port: 5678      |    |  HTTP service     |          |
|  |                  |    |  (Python/FastAPI) |          |
|  |  Workflow 1-5    |    |  port: 8001       |          |
|  |  Scheduler       |    |                  |           |
|  |  Webhook handler |    |  all-MiniLM-L6-v2|           |
|  +--------+---------+    +--------+---------+           |
|           |                       |                      |
|           | HTTP                  | HTTP /embed          |
|           |                       |                      |
|  +--------v---------+    +--------v---------+           |
|  |  ChromaDB        |    |  FastAPI         |           |
|  |  (Docker)        |    |  Backend         |           |
|  |  port: 8000      |    |  port: 8000*     |           |
|  |                  |    |                  |           |
|  |  Collections:    |    |  /generate       |           |
|  |  - ai_102        |    |  /validate       |           |
|  |  - az_104        |    |  /search         |           |
|  |  - az_305        |    |                  |           |
|  |  - gh_300        |    |  * Note: FastAPI  |          |
|  |  - ab_100        |    |  uses a separate  |          |
|  |  - ai_103        |    |  port (e.g. 8080)|           |
|  +------------------+    +------------------+           |
|                                                          |
|  +--------------------------------------------------+   |
|  |  Local Filesystem                                 |   |
|  |                                                   |   |
|  |  /docs/scraped/{exam_code}/*.txt                  |   |
|  |  /data/registry/known_urls.json                   |   |
|  |  /data/registry/previous_hashes.json              |   |
|  |  /data/output/new_urls_YYYY-MM-DD.json            |   |
|  |  /data/reports/quality_report_YYYY-MM-DD.json     |   |
|  |  /data/logs/failed_urls_YYYY-MM-DD.log            |   |
|  +--------------------------------------------------+   |
|                                                          |
+=========================================================+
          |                 |                 |
          | HTTPS           | HTTPS           | SMTP/TLS
          v                 v                 v
  +---------------+  +-------------+  +-------------+
  |  Portkey      |  |  Microsoft  |  |  Gmail      |
  |  Gateway      |  |  Learn      |  |  SMTP       |
  |               |  |  (read-only)|  |  (free tier)|
  |  → Claude     |  |             |  |             |
  |    Sonnet     |  |  Sitemaps   |  |  Operator   |
  |               |  |  Articles   |  |  Inbox      |
  +---------------+  +-------------+  +-------------+
```

**Network summary:** All intra-service communication is localhost. The only outbound connections are: (1) Portkey → Claude Sonnet for question generation, (2) MS Learn for sitemap/article fetches, (3) Gmail SMTP for notifications. No inbound ports are exposed beyond the developer machine.

---

## Section 6: Get Started in One Day

The following plan assumes Docker Desktop is installed and a Gmail account with app passwords is available.

### Morning (3–4 hours)

**Step 1 — Start ChromaDB and n8n via Docker (15 min)**

```bash
# docker-compose.yml already exists in the project root
# Add n8n service if not already present, then:
docker compose up -d chromadb n8n

# Verify ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Verify n8n
# Open http://localhost:5678 in browser
# Complete initial setup wizard (set admin email/password)
```

**Step 2 — Start the local embedding service (20 min)**

```bash
# In the backend directory, start the embedding sidecar
# (or create a minimal FastAPI wrapper around sentence-transformers)
cd backend
pip install sentence-transformers fastapi uvicorn
uvicorn embedding_service:app --port 8001

# Test
curl -X POST http://localhost:8001/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["test query for azure ai services"]}'
# Expect: {"embeddings": [[0.023, -0.041, ...]]}
```

**Step 3 — Configure n8n credentials (20 min)**

In the n8n UI (`http://localhost:5678`):
- Add credential: **SMTP** — host: `smtp.gmail.com`, port: 587, user/pass (Gmail app password)
- Add credential: **HTTP Header Auth** (optional, for ChromaDB if auth is enabled)
- Set environment variable `N8N_WEBHOOK_BASE` to `http://localhost:5678`

**Step 4 — Import Workflow 5: Content Change Monitor (30 min)**

- In n8n UI: Workflows → Import from JSON
- Paste the Workflow 5 configuration (or build it manually from the node table in `N8N_WORKFLOW_ARCHITECTURE.md`)
- Set the schedule to run immediately for testing (change to daily 06:00 after verification)
- Run once: verify that `previous_hashes.json` is created and an email arrives

**Step 5 — Manually prepare approved URL list for one exam (20 min)**

```
# Create /data/output/approved_urls.txt
# Format: url,exam_code
https://learn.microsoft.com/en-us/azure/ai-services/language-service/key-phrase-extraction/overview,AI-102
https://learn.microsoft.com/en-us/azure/ai-services/language-service/named-entity-recognition/overview,AI-102
# ... (10-20 URLs for the POC demo exam)
```

### Afternoon (3–4 hours)

**Step 6 — Import and test Workflow 2: Download and Scrape (45 min)**

- Import Workflow 2 into n8n
- Set `SCRAPED_ROOT` environment variable in n8n settings
- Trigger manually with the `approved_urls.txt` from Step 5
- Verify: `.txt` files appear under `/docs/scraped/AI-102/`
- Check: metadata header present in each file; failed_urls.log shows any 404s

**Step 7 — Import and test Workflow 3: Indexing (45 min)**

- Import Workflow 3
- Trigger manually (or let Workflow 2 fire the webhook automatically)
- Verify: ChromaDB collection `ai_102` exists and has documents
  ```bash
  curl http://localhost:8000/api/v1/collections/ai_102
  ```
- Verify chunk count is plausible (~400–600 chunks for 20 articles)

**Step 8 — Import and test Workflow 4: Quality Check (45 min)**

- Import Workflow 4
- Add 3 test queries for AI-102 to the Code node
- Trigger manually
- Verify: `quality_report_YYYY-MM-DD.json` created; email received with pass rates

**Step 9 — End-to-end smoke test (30 min)**

- Simulate a content change: modify a hash value in `previous_hashes.json` to force a false positive
- Run Workflow 5: confirm approval email arrives
- Click the "Approve" link in the email
- Observe: Workflow 2 fires automatically → Workflow 3 fires → Workflow 4 fires
- Confirm: quality report email arrives within 10 minutes of clicking Approve
- This is the demo scenario.

**Step 10 — Document and hand off (30 min)**

- Record n8n workflow JSON exports to `/docs/n8n_exports/`
- Note any deviations from the architecture document
- Schedule Workflow 5 for daily 06:00
- Schedule Workflow 1 for weekly Monday 08:00

---

## Section 7: What to Show Stakeholders

### The Demo Narrative

> "Every question in CertMasterAI traces back to a specific Microsoft Learn article. When Microsoft updates exam content — say they revise the AI-102 skills measured page — our system detects the change automatically, overnight. It sends a notification asking for approval to re-index. One click later, the pipeline re-downloads the affected articles, re-chunks them, re-embeds them, and updates the knowledge base. By the time the next question generation batch runs, it is drawing on the updated content. All of this happens on a single developer machine. No cloud spend required."

### The Three Demo Moments

**Moment 1 — Traceability (1 minute)**

Open the FastAPI `/search` endpoint or the CertMasterAI question review UI. Show a generated question. Point to the `source_url` field in the JSON response. Navigate to that MS Learn article in a browser. The question and the article are visibly about the same topic.

**Moment 2 — Automation (2 minutes)**

Open n8n at `http://localhost:5678`. Show the Workflow 5 execution history. Each daily run shows a green success node. Point to the "No change detected" execution logs for 5 exams and the "Change detected — awaiting approval" email in the inbox. Click Approve and show the subsequent workflow chain firing in real time.

**Moment 3 — Quality report (1 minute)**

Open the most recent `quality_report_YYYY-MM-DD.json`. Show per-exam pass rates. "AI-102: 92% pass rate. AZ-104: 88%. All six exams above the 80% threshold." This is a number a stakeholder can put in a slide.

### Key Talking Points

- Zero new cloud cost during POC phase
- Human approval gate ensures no unreviewed content enters the knowledge base
- Quality verification is automated and produces an audit trail
- The same architecture scales to Azure AI Search and managed embeddings when the subscription is approved — n8n workflows call different endpoint URLs, everything else stays the same
- All five workflows together take under 20 minutes of developer setup time per re-run after the initial configuration

---

## Section 8: Limitations and Honest Caveats

The following limitations are real and should be communicated proactively to stakeholders. The goal is a credible demo, not an overpromise.

| Limitation | Detail | Mitigation |
|---|---|---|
| **Local machine dependency** | The entire pipeline stops if the developer machine is off or hibernating | Acceptable for POC; migrate to a small always-on VM or Azure Container Apps when approval arrives |
| **Embedding speed** | CPU-only sentence-transformers: ~50–80 ms per chunk; full 6-exam re-index takes 15–25 minutes | Acceptable for nightly batch; not suitable for real-time retrieval augmentation |
| **No authentication on n8n or ChromaDB** | Both services run without auth on localhost | Fine for local POC; must be addressed before any cloud or shared deployment |
| **MS Learn scraping fragility** | Microsoft may change HTML structure, breaking the CSS selectors in Workflow 2 | HTML Extract selectors need occasional maintenance; n8n failed_urls.log surfaces breakage |
| **Hash-based change detection is coarse** | A change to navigation markup triggers a false positive; a small content edit below the hash threshold is missed | Use text extraction (not full-page hash) to reduce false positives; accepted limitation for POC |
| **Portkey costs money** | ~$0.01–0.05 per question generation batch | Minimal; within any reasonable budget; Ollama fallback available |
| **No data versioning** | ChromaDB upsert overwrites previous chunks; no rollback capability | Out of scope for POC; Git-tracked `.txt` files provide a manual rollback path |
| **No concurrent user support** | ChromaDB and n8n are single-process; concurrent requests during indexing may cause delays | Not a concern during POC; CertMasterAI has limited concurrent users |
| **Windows filesystem paths** | n8n running in Docker uses Linux paths internally; host volume mounts require careful path mapping on Windows 11 | Use `//c/Users/...` path syntax in Docker volume config; document in setup guide |
| **URL discovery still needs human review** | Workflow 1 narrows the candidate list but cannot curate exam relevance automatically | Intentional design decision; human review is retained as a quality gate |

---

## Appendix A: Docker Compose Addition for n8n

The following service block can be appended to the existing `docker-compose.yml` at the project root to add n8n alongside ChromaDB.

```yaml
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=false
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678
      - GENERIC_TIMEZONE=UTC
    volumes:
      - n8n_data:/home/node/.n8n
      - ./docs/scraped:/docs/scraped
      - ./data:/data
    restart: unless-stopped

volumes:
  n8n_data:
```

## Appendix B: Embedding Service Minimal Implementation

A minimal Python file (`backend/embedding_service.py`) to expose sentence-transformers over HTTP, consumed by n8n Workflow 3 and Workflow 4:

```python
# backend/embedding_service.py
# Run with: uvicorn embedding_service:app --port 8001

from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()
model = SentenceTransformer("all-MiniLM-L6-v2")

class EmbedRequest(BaseModel):
    texts: list[str]

@app.post("/embed")
def embed(req: EmbedRequest):
    embeddings = model.encode(req.texts, convert_to_list=True)
    return {"embeddings": embeddings}
```

## Appendix C: Test Query Bank (Starter Set)

Seed queries for Workflow 4 quality verification. Expand to 5 per exam before stakeholder demo.

| Exam | Query | Expected Keywords |
|---|---|---|
| AI-102 | key phrase extraction Azure language service | KeyPhraseExtraction, language service, Text Analytics |
| AI-102 | custom named entity recognition training | NER, custom model, labeling |
| AZ-104 | configure Azure virtual network peering | VNet peering, address space, gateway transit |
| AZ-104 | Azure role-based access control assignment | RBAC, role assignment, scope, contributor |
| AZ-305 | design Azure landing zone architecture | landing zone, management group, policy |
| AZ-305 | hub and spoke network topology Azure | hub-spoke, transit, firewall, peering |
| GH-300 | GitHub Actions workflow trigger on push | on: push, workflow_dispatch, jobs, steps |
| GH-300 | GitHub Advanced Security secret scanning | secret scanning, GHAS, push protection |
| AB-100 | Azure Boards sprint backlog management | sprint, backlog, work items, velocity |
| AB-100 | Azure DevOps pipeline YAML stages | stages, jobs, steps, dependsOn |
| AI-103 | Azure AI Studio prompt flow deployment | prompt flow, deployment, endpoint, Azure AI |
| AI-103 | Azure OpenAI responsible AI content filters | content filtering, responsible AI, safety system |
