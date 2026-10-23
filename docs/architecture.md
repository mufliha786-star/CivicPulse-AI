# CivicPulse AI — System Architecture & Workflow

## Overview
CivicPulse AI is an end-to-end civic complaint management and accountability platform. It connects citizens to verified government departments, ensures automatic responsibility routing, tracks external delivery separately from authority acknowledgement, and enforces statutory SLA escalation.

```
┌─────────────────────────────────┐       ┌───────────────────────────────────┐
│     Citizen Mobile (Flutter)    │       │     Authority Dashboard (React)   │
│   Tamil / English + Speech/GPS  │       │    SLA Monitor & Hotspot Heatmap  │
└────────────────┬────────────────┘       └─────────────────▲─────────────────┘
                 │                                          │
                 ▼                                          │
┌───────────────────────────────────────────────────────────┴─────────────────┐
│                        CivicPulse AI Core Engine                            │
│                  FastAPI Backend & Gemini AI Processing                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. AI Language & Categorization (Gemini 3.8-Flash + Tamil Fallback)         │
│ 2. Authority Directory & Jurisdiction Rule Matcher                         │
│ 3. Pluggable Delivery Adapters (Municipal API, Email Gateway, Webhooks)     │
│ 4. Separate Delivery State vs Authority Acknowledgement Ledger              │
│ 5. Automated SLA Worker & Escalation Engine (Tier-2 Collectorate Monitor)    │
│ 6. Citizen Resolution Verification & Dispute Workflow                      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              ▼                       ▼                        ▼
    ┌───────────────────┐   ┌───────────────────┐    ┌───────────────────┐
    │  Municipal APIs   │   │  Gov Email Relay  │    │ Signed Webhooks   │
    │  (CCMC / Chennai) │   │  (TWAD / TANGEDCO)│    │  (Field Systems)  │
    └───────────────────┘   └───────────────────┘    └───────────────────┘
```

## State Machine
A complaint strictly transitions through verifiable states:
1. `submitted_internal`: Saved in CivicPulse repository.
2. `awaiting_routing_review`: If AI confidence < 75% or ambiguous jurisdiction.
3. `ready_for_delivery`: Destination determined and validated.
4. `delivered_to_destination`: Configured gateway acknowledged payload receipt with HTTP 200/201.
5. `delivery_failed`: Gateway timeout/error; scheduled for exponential retry.
6. `acknowledged_by_authority`: Official officer records receipt and official ticket number.
7. `in_progress`: Field crew mobilized.
8. `resolution_awaiting_verification`: Work completed with proof photo uploaded.
9. `closed`: Citizen explicitly confirms resolution satisfaction.
10. `escalated`: Breached acknowledgement or resolution SLA forwarded to District Collectorate.

## Security & Privacy Guardrails
- **Geotag Truncation:** Public hotspot displays truncate house numbers to preserve citizen privacy.
- **Auditing:** Every status change records actor, timestamp, and immutable audit details.
- **Idempotency:** Delivery attempts carry cryptographic unique request tokens to prevent duplicate work orders.
