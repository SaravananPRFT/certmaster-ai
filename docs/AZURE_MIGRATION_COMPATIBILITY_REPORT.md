# CertMasterAI — Azure Migration Compatibility Report

**Project:** CertMasterAI — Microsoft Certification Mock Exam Platform
**Date:** August 2026
**Prepared for:** Engineering & Product Leadership
**Purpose:** Assess how the n8n automation workflows built during the local POC phase can be migrated to Azure-native services with minimal rework, and provide a phased transition roadmap.

---

## Executive Summary

The CertMasterAI POC was deliberately architected so that every external dependency is accessed through a single integration point — an HTTP call or a vendor-specific n8n node — making Azure migration a matter of swapping individual nodes rather than rewriting any workflow logic. n8n's node-based design creates a natural seam between business logic (which lives in the workflow graph and never changes) and infrastructure (which is expressed as node configuration and can be replaced service by service). The five automation workflows built for the POC — URL discovery, document download and scraping, ChromaDB indexing, quality verification, and content change monitoring — are already production-grade in terms of their error handling, retry patterns, scheduling, and human approval gates; those characteristics transfer directly to production Azure deployments. Azure migration effort across all workflows is estimated at less than five engineering days in total, concentrated in ChromaDB-to-Azure-AI-Search and quality-reporting changes; all other service swaps are URL and credential changes measured in hours. The recommended strategy is to complete the full POC using local components first, then migrate services incrementally in the order: Azure OpenAI, Azure Blob Storage, Azure Functions, and finally Azure AI Search.

---

## Section 1: Migration Philosophy

### 1.1 Swap Nodes, Not Workflows

The governing principle of this migration is that n8n workflows are **not rewritten** when migrating to Azure — they are **reconfigured**. Each workflow node represents a single integration point. Replacing a local ChromaDB node with an HTTP Request node targeting Azure AI Search does not affect the surrounding workflow: the trigger remains the same, the loop structure remains the same, the error branch remains the same, and the downstream notification chain remains the same. Engineers familiar with the n8n graph after POC will find the Azure-configured workflow immediately recognizable.

### 1.2 One-to-One Component Mapping

Every POC component has a direct Azure equivalent, and every integration method used in the POC (HTTP Request, Write Binary File, Email, Code node) has a direct Azure analogue. There are no gaps that would require new workflow design. The only nuance is that Azure AI Search does not have a dedicated n8n node (as of mid-2026), so the existing pattern of using the generic HTTP Request node — already used for local embedding calls — applies there as well.

### 1.3 Phased Migration

Because each Azure service can be adopted independently, migration can proceed one service at a time without disrupting other running workflows. The system can operate in a hybrid state indefinitely: for example, using Azure OpenAI for embeddings while still indexing into local ChromaDB. This eliminates migration risk from big-bang cutovers and allows each Azure service to be validated in isolation before the next migration begins.

### 1.4 Native n8n Azure Support

n8n includes a native **Azure Blob Storage node** (no HTTP Request wiring required). All other Azure services — Azure OpenAI, Azure AI Search, Azure Monitor, Azure Communication Services — are accessed via the generic **HTTP Request node**, which supports OAuth2, API Key, and Bearer Token authentication schemes and is already used extensively in the POC workflows. No additional n8n plugins or custom nodes are needed for the full Azure migration.

---

## Section 2: Component Mapping Table

| POC Component | n8n POC Node / Method | Azure Equivalent | n8n Azure Node / Method | Migration Effort |
|---|---|---|---|---|
| Local filesystem (scraped docs) | Write Binary File node | Azure Blob Storage | Azure Blob Storage node (native n8n) | Low |
| ChromaDB (local vector store) | ChromaDB Vector Store node | Azure AI Search | HTTP Request → Azure Search REST API | Medium |
| sentence-transformers (local :8001) | HTTP Request → localhost:8001 | Azure OpenAI text-embedding-3-large | HTTP Request → Azure OpenAI endpoint | Low — change URL + add `api-key` header |
| Portkey → Claude Sonnet (generation) | HTTP Request / Portkey node | Azure OpenAI GPT-4o | HTTP Request → Azure OpenAI chat completions endpoint | Low — change URL + add `api-key` header |
| Local quality report JSON file | Write File node | Azure Monitor / Log Analytics | HTTP Request → Azure Monitor Data Collection API | Medium |
| Gmail SMTP notifications | Email node | Azure Communication Services / Logic Apps | HTTP Request or Email node (SMTP config change) | Low |
| FastAPI backend calls | HTTP Request → localhost:8000 | Azure Functions | HTTP Request → Azure Function URL | Low — same node, different base URL |
| n8n self-hosted (Docker) | Self-hosted Docker Compose | n8n Cloud or Azure Container Apps | Deployment change only | Medium |

**Effort scale:** Low = under 4 hours; Medium = 1–2 days; High = more than 2 days.

---

## Section 3: Per-Azure-Service Migration Guide

### 3A. Azure AI Search

**What changes in the workflow:**
- The ChromaDB Vector Store node (used for upsert during indexing and for query during quality verification) is replaced by an HTTP Request node targeting the Azure AI Search REST API.
- Index creation is a one-time HTTP PUT to create the index schema before the first workflow run.

**n8n approach:**

| Operation | HTTP Method | Endpoint Pattern |
|---|---|---|
| Create index (one-time) | `PUT` | `https://<search-service>.search.windows.net/indexes/<index-name>?api-version=2023-11-01` |
| Index documents (batch upsert) | `POST` | `.../indexes/<index-name>/docs/index?api-version=2023-11-01` |
| Vector search query | `POST` | `.../indexes/<index-name>/docs/search?api-version=2023-11-01` |

Authentication: `api-key` header using the Azure AI Search admin key, stored as an n8n Credential of type Header Auth.

**What stays identical:**
- Chunking logic (500-word chunks, 50-word overlap)
- Metadata field structure attached to each document chunk
- Batch processing loop structure (batch size, loop counter, merge node pattern)
- Error handling branches and retry logic
- All downstream nodes (quality check, notification, logging)

**Estimated migration effort:** 1 day (index schema design + HTTP Request node configuration + end-to-end test run)

---

### 3B. Azure OpenAI

**What changes for embeddings:**
- HTTP Request node base URL: `http://localhost:8001/embed` → `https://<resource>.openai.azure.com/openai/deployments/text-embedding-3-large/embeddings?api-version=2024-02-01`
- Add `api-key` header using Azure OpenAI key stored as n8n Header Auth credential
- Model name parameter in request body: `"model": "text-embedding-3-large"` (Azure ignores this field but it can remain)

**What changes for generation:**
- HTTP Request (or Portkey node) base URL → `https://<resource>.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01`
- Add `api-key` header
- Remove Portkey-specific headers (`x-portkey-provider`, `x-portkey-api-key`)

**What stays identical:**
- All prompt templates (system message, user message, JSON schema instruction)
- Response parsing (JSON parse node, field extraction)
- Token usage tracking fields
- All downstream nodes that consume the generated or embedded output

**Estimated migration effort:** 2 hours per workflow endpoint (embedding + generation = approximately half a day total)

---

### 3C. Azure Blob Storage

**What changes:**
- Write Binary File node → Azure Blob Storage node (available natively in n8n)
- Configure the node with: Storage Account name, Container name, Blob name (can reuse the existing file-naming convention expression)
- Add Azure Blob Storage credential (Account Name + Account Key or SAS token)

**What this enables beyond POC:**
- Scraped documents are versioned and accessible to Azure Functions and Azure AI Search indexers without local filesystem dependency
- Multiple services (backend, n8n, Azure Functions) can read from a shared blob container
- Container lifecycle policies can automate cleanup of stale document versions

**What stays identical:**
- File naming convention expressions already used in Write Binary File node
- Metadata attached to blobs mirrors the current file metadata structure
- The surrounding download/scrape workflow logic is unchanged

**Estimated migration effort:** 2–3 hours

---

### 3D. Azure Functions

**What changes in n8n:**
- HTTP Request nodes that call FastAPI endpoints change their base URL from `http://localhost:8000` to the Azure Function app URL (`https://<function-app>.azurewebsites.net/api/...`)
- Add `x-functions-key` header for function-level authentication, stored as n8n Header Auth credential

**What stays identical (n8n perspective):**
- The HTTP Request node itself — same node type, same configuration pattern
- Request body structure and response parsing
- Error handling branches (4xx/5xx detection, retry logic)
- All workflow logic that prepares the request or consumes the response

**Note:** The Azure Functions deployment is a backend engineering task. From the n8n workflows' perspective, the migration effort is near zero — it is a base URL change and a credential addition. The backend team handles the translation of FastAPI route handlers to Azure Function handlers independently.

**Estimated migration effort (n8n only):** Near zero — less than 1 hour across all workflows

---

### 3E. Azure Monitor

**What changes:**
- Write File node (outputs quality report JSON to local filesystem) is replaced by an HTTP Request node targeting the Azure Monitor Data Collection API
- A Data Collection Endpoint (DCE) and Data Collection Rule (DCR) must be set up in Azure once before workflow execution

**n8n approach:**

| Step | Action |
|---|---|
| Authenticate | OAuth2 credential using Azure service principal (n8n supports OAuth2 Client Credentials natively) |
| Send log | HTTP POST to `https://<dce>.ingest.monitor.azure.com/dataCollectionRules/<dcr-immutable-id>/streams/<stream-name>?api-version=2023-01-01` |
| Payload | JSON array of quality score records matching the DCR schema |

**What this adds over the POC:**
- Azure Monitor dashboards with historical quality score trending
- Configurable alerts when quality scores fall below threshold (without n8n polling)
- Log retention and audit trail for compliance purposes

**What stays identical:**
- The quality scoring logic and thresholds in the Code node
- The data structure of quality score records
- Workflow trigger and scheduling

**Estimated migration effort:** 1 day (DCE/DCR setup in Azure + HTTP Request node configuration + dashboard creation)

---

## Section 4: Migration Phasing Plan

| Phase | Label | Active Services | n8n Workflow State | Estimated Azure Cost |
|---|---|---|---|---|
| **Phase 1** | POC — fully local | ChromaDB local, sentence-transformers local, filesystem, n8n self-hosted Docker, FastAPI local | All workflows as-built; no changes | $0 |
| **Phase 2** | Partial Azure — AI services only | Azure OpenAI (embeddings + generation), ChromaDB still local, filesystem, n8n self-hosted | Change embedding endpoint URL + credential; change generation endpoint URL + credential. Estimated: ~4 hours across all workflows | Azure OpenAI usage charges only (embeddings + completions tokens) |
| **Phase 3** | Full production Azure | Azure AI Search, Azure OpenAI, Azure Blob Storage, Azure Monitor, Azure Functions | Replace ChromaDB nodes with HTTP Request (Azure Search); replace Write Binary File with Azure Blob node; replace Write File with Azure Monitor HTTP Request; update FastAPI URLs to Function URLs | Full production pricing — Azure AI Search (Basic ~$75/mo), Azure OpenAI (usage-based), Blob Storage (minimal), Azure Monitor (ingestion-based) |

**Phase transition summaries:**

- **Phase 1 → Phase 2:** Edit 2 HTTP Request nodes per workflow that perform embedding or generation calls (change URL, swap credential). No structural workflow changes. Run a single test document through the indexing workflow to verify output parity.
- **Phase 2 → Phase 3:** Replace ChromaDB nodes with HTTP Request nodes (requires index schema to be pre-created in Azure AI Search); replace Write Binary File with Azure Blob node; replace local quality file write with Azure Monitor POST; update FastAPI base URLs to Azure Function URLs. Each service change is independently testable. Total estimated effort: 3–4 engineering days.

---

## Section 5: What Never Changes

The following workflow elements are infrastructure-agnostic and remain identical across all three migration phases, regardless of which Azure services are active:

- **All five workflow trigger configurations** — cron schedules, webhook endpoints, manual execution triggers
- **URL discovery logic** — Microsoft Learn sitemap parsing, URL filtering, deduplication
- **Document download and scrape logic** — HTTP fetch, HTML-to-markdown conversion, retry on failure
- **Chunking algorithm** — 500-word chunks with 50-word overlap, implemented in a Code node
- **Metadata structure** — exam objective ID, blueprint section, source URL, chunk index, timestamp fields
- **Exam blueprint and objective definitions** — embedded in Code nodes as configuration constants
- **Quality scoring thresholds** — relevance score cutoffs, coverage percentage targets
- **Batch processing loop structure** — SplitInBatches node, merge pattern, loop counter
- **Email and notification content** — subject lines, body templates, routing rules, recipient lists
- **Error handling branches** — 4xx/5xx detection, exponential backoff retry, dead-letter logging
- **Human approval gate** — the Wait node pause and webhook-resume pattern for content refresh approvals
- **Workflow-to-workflow communication** — webhook triggers between workflows remain unchanged
- **All Code node business logic** — scoring algorithms, metadata normalization, deduplication checks

---

## Section 6: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Azure AI Search has no native n8n node — must use HTTP Request | High (confirmed as of mid-2026) | Low — HTTP Request node is fully capable and already used in POC | Document the exact API call format (endpoint pattern, headers, body schema) during Phase 1 so Phase 3 migration is a copy-paste, not a design task |
| Azure throttling during bulk indexing (429 responses) | Medium | Medium — indexing run fails partway, index is partially populated | Add a Wait node (configurable delay) between SplitInBatches iterations; implement 429-specific retry branch with exponential backoff |
| Azure OpenAI regional availability or quota delay | Low | High — blocks both embedding and generation if quota not approved | Keep Portkey configured as a fallback gateway; Portkey supports Azure OpenAI as a provider and can route to Claude Sonnet as backup |
| Cost overrun during migration testing (Phase 2 → Phase 3) | Medium | Medium — unexpected token or search unit charges during validation runs | Create a separate Azure subscription or resource group for migration testing; use Azure AI Search free tier (up to 3 indexes) and Azure OpenAI with low quota limits during testing |
| n8n self-hosted → n8n Cloud migration: localhost ChromaDB not accessible from cloud | High — if n8n Cloud is chosen | High — all ChromaDB nodes break immediately | Keep n8n self-hosted until the Azure AI Search migration (Phase 3) is complete, at which point there is no remaining localhost dependency; then migrate n8n to Cloud or Azure Container Apps |
| Index schema mismatch between ChromaDB metadata fields and Azure AI Search field definitions | Medium | Medium — indexing succeeds but queries return wrong results or fail | Map current ChromaDB metadata fields to Azure AI Search field names before Phase 3 begins; create index schema as a checked-in JSON file and review against ChromaDB metadata output |

---

## Section 7: Decision Checklist

Complete the following before beginning any Phase 2 or Phase 3 migration work:

**Azure Subscription and Access**
- [ ] Azure subscription approved and accessible to the engineering team
- [ ] Resource group created for CertMasterAI production resources
- [ ] Azure role assignments configured (Contributor for engineering, Reader for QA)

**Azure AI Search**
- [ ] Azure AI Search tier selected — Basic tier ($75/month) recommended for POC-to-production; Free tier acceptable for initial testing (3 indexes maximum)
- [ ] Index schema designed and documented, with field names explicitly mapped to current ChromaDB metadata fields (`exam_objective_id`, `blueprint_section`, `source_url`, `chunk_index`, `content`, `embedding`)
- [ ] Decision made on semantic search tier (Standard required for semantic ranking; Basic supports only keyword + vector)

**Azure OpenAI**
- [ ] Azure OpenAI resource created in chosen region
- [ ] Quota requested for `text-embedding-3-large` deployment (embeddings)
- [ ] Quota requested for `gpt-4o` deployment (generation)
- [ ] Portkey fallback strategy documented: Portkey configured to route to Claude Sonnet if Azure OpenAI returns 5xx or quota exceeded

**Azure Blob Storage**
- [ ] Storage account created and container named (`certmaster-docs` or equivalent)
- [ ] Access key or SAS token generated and stored in n8n Credentials vault
- [ ] Blob lifecycle policy configured (e.g., delete blobs older than 90 days in staging container)

**Azure Monitor**
- [ ] Decision made on Log Analytics workspace: shared workspace or dedicated CertMasterAI workspace
- [ ] Data Collection Endpoint (DCE) created
- [ ] Data Collection Rule (DCR) created with schema matching quality score record structure
- [ ] Baseline dashboard created in Azure Monitor workbooks

**n8n Infrastructure**
- [ ] Decision made: keep n8n self-hosted on-premises, migrate to Azure Container Apps, or migrate to n8n Cloud
- [ ] If Azure Container Apps: networking plan confirmed so n8n can reach Azure services via private endpoints or public endpoints with key auth
- [ ] n8n Credentials vault backed up before any infrastructure migration

---

## Section 8: Conclusion

The n8n automation workflows built during the CertMasterAI POC represent a direct and lasting investment in production automation infrastructure. Because n8n encapsulates all integration logic inside individually configurable nodes, Azure migration does not require any workflow redesign, logic rewriting, or re-testing of business rules. Every hour spent building the POC workflows — the chunking logic, the quality scoring algorithm, the human approval gate, the error handling patterns — transfers unchanged to the production Azure deployment. The migration is purely a configuration exercise: swap the node, update the credential, run a validation document through the workflow, verify parity.

The phased migration approach removes the primary risk of large-scale infrastructure transitions. By migrating one Azure service at a time and validating each in isolation, the team avoids the compounded risk of simultaneous changes and retains the ability to roll back any individual service swap without affecting the others. Phase 2 (Azure OpenAI adoption) can be completed in half a day and immediately unlocks production-grade embedding quality and generation capability while the ChromaDB local index continues operating as-is. This allows the team to demonstrate Azure OpenAI value to stakeholders before the more involved Azure AI Search migration is scheduled.

The recommended migration sequence — Azure OpenAI first, Azure Blob Storage second, Azure Functions third, Azure AI Search last — orders changes from least to most complex and preserves a working end-to-end system at every point. Azure AI Search is last because it is the only service requiring schema design work and the only service without a native n8n node; completing all other migrations first means that when Azure AI Search work begins, every other system component is already stable and production-validated. By the time Azure AI Search migration is executed, the engineering team will have built confidence with the Azure credential and HTTP Request patterns on simpler services, and the Azure AI Search work will proceed faster as a result.

---

*This document was prepared as a migration planning artifact for CertMasterAI. It reflects the state of n8n (v1.x), Azure AI Search REST API (2023-11-01), and Azure OpenAI API (2024-02-01) as of August 2026. API versions should be verified against Azure documentation at migration time.*
