# CertMasterAI — n8n Automation Cost Analysis Report

**Project:** CertMasterAI — Microsoft Certification Mock Exam Platform
**Date:** August 2026
**Author:** Engineering Team
**Purpose:** Provide a detailed cost breakdown for adopting n8n workflow automation in the CertMasterAI content pipeline, comparing self-hosted, cloud, and hybrid deployment options against the current manual baseline.

---

## Executive Summary

The CertMasterAI content pipeline currently relies on manual developer effort to collect, download, index, and monitor Microsoft Learn content for six exam tracks (AI-102, AZ-104, AZ-305, GH-300, AB-100, AI-103). This report quantifies the cost of introducing n8n automation across three deployment models: self-hosted (recommended for POC), n8n Cloud, and a set of hybrid configurations. The key finding is that a self-hosted n8n deployment adds **zero incremental licensing cost** to the project, with total POC infrastructure cost remaining at approximately **$0/month** for the automation layer itself. The only variable cost is Portkey API usage for LLM calls, which is already incurred by the existing application. Adopting n8n self-hosted is the financially optimal path and is the model recommended for the six-month POC period.

---

## Section A: Self-Hosted n8n

### Overview

n8n can be installed and run on any machine that has Node.js 18+ or Docker. For the CertMasterAI POC, the most practical deployment is a Docker Compose service running alongside the existing backend stack.

### License

| Component | License | Cost |
|---|---|---|
| n8n Core (Community Edition) | Apache 2.0 | Free |
| n8n Enterprise Features (SSO, audit logs, RBAC) | n8n Enterprise License | Paid (not required for POC) |

The community edition includes all features needed for the CertMasterAI pipeline: all built-in nodes, LangChain integration nodes, scheduling, webhooks, credential storage, and execution history. Enterprise features (multi-user RBAC, SAML SSO, external secrets vault) are not required for a single-developer or small-team POC.

### Infrastructure Requirements

Self-hosted n8n can run on the developer's existing machine or on the same server hosting ChromaDB and FastAPI. There is no dedicated server required for the POC.

| Requirement | Minimum | Recommended for CertMasterAI |
|---|---|---|
| CPU | 1 core | 2 cores |
| RAM | 512 MB | 1–2 GB |
| Disk | 1 GB | 5 GB (for execution logs and binary data) |
| Node.js | 18+ | 20 LTS |
| Docker | 20+ | 24+ (with Compose V2) |

### Installation Options

**Option A — npm (local development):**

```
npm install -g n8n
n8n start
```

This launches n8n on `http://localhost:5678` with a SQLite database for workflow and execution storage. Suitable for development and light usage.

**Option B — Docker Compose (recommended for integration with CertMasterAI stack):**

Adding n8n as a service in the existing `docker-compose.yml` alongside ChromaDB and FastAPI ensures the n8n container has network and filesystem access to the ChromaDB data volume and can trigger FastAPI endpoints via the Docker internal network. The service definition requires a volume mount for the n8n data directory and a bind mount to the ChromaDB data path.

This is the recommended deployment model for the CertMasterAI POC.

### Self-Hosted Limitations

| Limitation | Impact for CertMasterAI |
|---|---|
| No built-in cloud storage for binary artifacts | Low — downloaded HTML artifacts can be stored in a local volume |
| No native multi-user collaboration | Low — single developer or small team for POC |
| No SSO / enterprise RBAC | Low — not required at POC stage |
| No managed uptime / auto-restart | Medium — requires a process manager (Docker restart policy or systemd) |
| No automatic version upgrades | Low — manual `docker pull` + restart required for upgrades |

### Self-Hosted Cost Summary

| Item | Monthly Cost |
|---|---|
| n8n Community Edition license | $0.00 |
| Hosting (developer's existing machine) | $0.00 |
| Storage (local disk) | $0.00 |
| **Total monthly cost (self-hosted)** | **$0.00** |

---

## Section B: n8n Cloud

### Overview

n8n offers a fully managed cloud service at `app.n8n.cloud`. The cloud edition handles infrastructure, automatic updates, SSL certificates, and uptime monitoring. It is the fastest way to get started without any local setup.

### Plans and Pricing (August 2026)

| Plan | Monthly Price | Executions/Month | Active Workflows | Users |
|---|---|---|---|---|
| **Starter** | ~$20 / month | 2,500 | 5 | 1 |
| **Pro** | ~$50 / month | 10,000 | Unlimited | 5 |
| **Enterprise** | Custom pricing | Unlimited | Unlimited | Unlimited |
| **Free Trial** | $0 (14 days) | Pro-level | Pro-level | 1 |

> Note: Execution counts and pricing are indicative based on publicly available information as of mid-2026. Verify current pricing at `https://n8n.io/pricing` before committing to a plan.

### Execution Volume Estimate for CertMasterAI

For the CertMasterAI pipeline running weekly refreshes across 6 exams with an estimated ~200 URLs total:

| Workflow | Executions per Run | Runs per Month | Monthly Executions |
|---|---|---|---|
| Content monitoring (change detection) | ~200 (one per URL) | 4 | ~800 |
| Download workflow (changed pages only, est. 10%) | ~20 | 4 | ~80 |
| Indexing workflow | ~20 | 4 | ~80 |
| Quality check workflow | ~50 test queries | 4 | ~200 |
| **Total** | — | — | **~1,160 / month** |

At ~1,160 executions per month, the **Starter plan (~$20/month)** is sufficient, with comfortable headroom below the 2,500-execution limit.

### n8n Cloud Pros and Cons

**Pros:**

- No local infrastructure to manage — zero DevOps overhead.
- Automatic updates, SSL, uptime monitoring, and backups are included.
- Accessible from any browser on any machine.
- Built-in credential encryption and audit logging.
- Free 14-day trial allows full evaluation before any cost commitment.

**Cons:**

- All workflow data, credentials, and execution logs are stored on n8n's servers (outside the developer's machine). This is a consideration if Microsoft Learn scraping involves any authenticated requests in the future.
- Monthly recurring cost (~$20/month for Starter) that does not apply to the self-hosted model.
- Execution limits per plan; exceeding the Starter limit requires an upgrade to Pro.
- The n8n Cloud instance cannot directly access `localhost` services (ChromaDB, FastAPI running locally). A public endpoint, ngrok tunnel, or cloud-deployed backend is required — adding architectural complexity.

> **Key constraint for CertMasterAI POC:** Because ChromaDB is deployed locally and the n8n Cloud instance cannot reach `localhost`, the Cloud option requires either exposing ChromaDB via a tunnel (not recommended for production) or migrating ChromaDB to a cloud-accessible instance. This makes n8n Cloud **less suitable** for the current POC architecture than self-hosted.

---

## Section C: Hybrid Approach Analysis

Three hybrid configurations are worth evaluating, reflecting CertMasterAI's current architecture (local ChromaDB, Portkey → Claude Sonnet via AWS Bedrock) and potential future evolution.

---

### Option C1: Local n8n + Cloud AI (Portkey / Claude Sonnet via AWS Bedrock)

**Architecture:** n8n runs locally (Docker Compose) and calls the Portkey gateway for any LLM-assisted steps (e.g., generating test queries for quality checking, summarising change diffs). ChromaDB and FastAPI remain local.

**Cost:**

| Component | Cost |
|---|---|
| n8n self-hosted | $0.00 / month |
| Portkey gateway (free tier) | $0.00 / month (up to 10,000 requests/month) |
| Claude Sonnet via AWS Bedrock (per quality-check run) | ~$0.01–$0.05 per batch of 50 test queries |
| **Total monthly** | **~$0.05–$0.20 / month** |

**Assessment:** This is the **recommended configuration** for the CertMasterAI POC. It adds effectively zero cost over the current baseline (Portkey and Bedrock are already in use by the application), while enabling LLM-powered quality-check summarisation in the automation pipeline.

---

### Option C2: Local n8n + Local LLMs (Ollama + Llama 3)

**Architecture:** n8n runs locally and calls a local Ollama instance for LLM-assisted steps instead of Portkey/Claude. All components are fully local with no external API dependencies.

**Cost:**

| Component | Cost |
|---|---|
| n8n self-hosted | $0.00 / month |
| Ollama (open source) | $0.00 / month |
| Llama 3 model (weights, one-time download) | $0.00 |
| Additional GPU/CPU compute (if running on developer machine) | ~$0 incremental (existing hardware) |
| **Total monthly** | **$0.00 / month** |

**Assessment:** Truly zero cost, and appropriate if the team has concerns about external API usage or if Portkey/Bedrock access is not available during a development sprint. The trade-off is response quality — Llama 3 8B is meaningfully less capable than Claude Sonnet for nuanced quality-check summarisation. Suitable as a fallback or for non-critical automation steps.

---

### Option C3: Local n8n + Future Azure Migration

**Architecture:** Begin with local n8n (zero cost) during POC. When the CertMasterAI platform migrates to Azure (Azure Container Apps + Azure AI Search), migrate the n8n instance to an Azure Container Instance or Azure Container Apps job, and point workflows at the cloud-hosted ChromaDB replacement (Azure AI Search) and FastAPI endpoint.

**Cost:**

| Phase | n8n Cost | Notes |
|---|---|---|
| POC (now) | $0.00 / month | Local Docker Compose |
| Azure migration | ~$15–$30 / month | Azure Container Apps (consumption plan) + storage |
| Steady state (post-migration) | ~$15–$30 / month | Scales to zero when workflows are not running |

**Assessment:** This is the most forward-compatible architecture. Starting local preserves zero POC cost, and the migration path to Azure is straightforward since n8n is containerised. Azure Container Apps' consumption-based billing means n8n only incurs cost while workflows are actively executing, keeping steady-state costs low.

---

## Section D: Total POC Cost Breakdown

The following table covers the full CertMasterAI infrastructure cost for the six-month POC, using the **recommended configuration** (self-hosted n8n + Portkey/Bedrock, Option C1).

| Component | Purpose | Unit Cost | Monthly Cost | 6-Month POC Cost |
|---|---|---|---|---|
| **n8n Community Edition** | Workflow automation engine | $0.00 (Apache 2.0) | $0.00 | $0.00 |
| **ChromaDB** | Local vector store for RAG embeddings | $0.00 (Apache 2.0) | $0.00 | $0.00 |
| **sentence-transformers** | Embedding model (all-MiniLM-L6-v2 or similar) | $0.00 (Apache 2.0) | $0.00 | $0.00 |
| **Portkey Gateway** | LLM gateway to AWS Bedrock (free tier) | $0.00 (up to 10k req/mo) | $0.00 | $0.00 |
| **Claude Sonnet (AWS Bedrock)** | LLM for quality-check summarisation + exam Q generation | ~$0.003/1k input tokens | ~$1–5 / month (light usage) | ~$6–30 |
| **Microsoft Learn scraping** | Content acquisition (HTTP requests, no API cost) | $0.00 | $0.00 | $0.00 |
| **Notifications (email SMTP)** | Change alerts, quality reports via n8n Email node | $0.00 (using existing SMTP) | $0.00 | $0.00 |
| **Developer machine hosting** | Electricity / compute for local Docker stack | ~$2–5 / month (incremental) | ~$3 | ~$18 |
| **Total** | | | **~$4–8 / month** | **~$24–48** |

> Note: The Claude Sonnet cost assumes the pipeline uses the LLM only for quality-check report summarisation (approximately 10–20 LLM calls per week). If Claude is used for more automation steps, costs scale accordingly but remain negligible relative to the engineering time saved.

---

## Section E: Cost Comparison — Manual vs. Automation Options

| Cost Category | Manual (Current) | n8n Self-Hosted (Recommended) | n8n Cloud (Starter) |
|---|---|---|---|
| **Setup cost** | $0 (no tooling to install) | ~2–4 hrs developer time (~$200–400 at market rate) | $0 (sign up + free trial) |
| **Monthly licensing cost** | $0 | $0 | ~$20 / month |
| **Per-refresh operational cost** | ~3.8 hrs developer time (~$190–380/refresh) | ~45 min developer time (~$37–75/refresh) | ~45 min developer time (~$37–75/refresh) |
| **Infrastructure cost (monthly)** | $0 (no tooling) | ~$3–5 (incremental compute) | $20 (plan fee) |
| **Total 6-month POC cost (tooling only)** | $0 | ~$18–30 | ~$120 |
| **Total 6-month cost (developer time at $100/hr)** | ~$4,560 (24 refresh cycles × 1.9 hrs avg) | ~$900 (24 refresh cycles × 22.5 min avg) | ~$1,020 ($120 plan + $900 developer time) |
| **6-month net saving vs. manual** | Baseline | **~$3,660** | **~$3,540** |

> Assumptions: 24 refresh cycles over 6 months (monthly full refresh + bi-weekly monitoring checks); developer billing rate of $100/hour used for illustrative comparison only. Actual savings depend on team billing rate.

**Key takeaway:** The self-hosted option delivers the same operational efficiency as n8n Cloud at zero incremental licensing cost, and it avoids the architectural complexity of exposing local services to the cloud. The payback period on the initial setup investment (~2–4 developer hours) is less than one refresh cycle.

---

## Section F: Recommendation

### Recommended Configuration: Self-Hosted n8n (Option C1)

For the CertMasterAI six-month POC, **self-hosted n8n running as a Docker Compose service is the clear recommendation**. It is free, keeps all data local, integrates directly with the existing ChromaDB and FastAPI containers via the Docker internal network, and requires no architectural changes to the current stack.

**Action plan:**

| Step | Action | Estimated Effort |
|---|---|---|
| 1 | Add n8n service to `docker-compose.yml` with a named volume for workflow data and a bind mount to the ChromaDB data directory | 1–2 hours |
| 2 | Implement Task 2 (download) workflow as a proof of concept | 2–3 hours |
| 3 | Implement Task 3 (indexing) workflow triggered by webhook from step 2 | 1–2 hours |
| 4 | Validate end-to-end pipeline on a single exam track (e.g., AI-102) | 1 hour |
| 5 | Add Task 5 (monitoring) workflow with Schedule Trigger and change-detection logic | 2–3 hours |
| 6 | Add Task 4 (quality check) workflow with automated scoring and Slack/email notification | 2–3 hours |
| **Total** | | **9–14 hours (1–2 developer days)** |

### Upgrade Path

If the project graduates beyond POC and requires multi-user collaboration, cloud access, or migration to Azure:

1. **Short term:** Upgrade to n8n Cloud Pro (~$50/month) once ChromaDB is accessible via a public or VPN-accessible endpoint.
2. **Medium term:** Migrate n8n to Azure Container Apps alongside the rest of the CertMasterAI stack, leveraging the containerised deployment already established in step 1 above.

### Decision Matrix

| Criterion | Weight | Self-Hosted | n8n Cloud | Manual |
|---|---|---|---|---|
| Zero licensing cost | High | ✓ | — | ✓ |
| Works with local ChromaDB | High | ✓ | — | ✓ |
| Operational effort reduction | High | ✓ | ✓ | — |
| No infrastructure overhead | Medium | — | ✓ | ✓ |
| Data stays local | Medium | ✓ | — | ✓ |
| Easy Azure migration path | Low | ✓ | — | — |
| **Overall recommendation** | | **Recommended** | Alternative | Baseline |

---

*Report prepared by the CertMasterAI Engineering Team — August 2026*
*Companion document: `docs/N8N_FEASIBILITY_REPORT.md`*
