# Phase 1 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax.

**Goal:** Deliver a locally verified Apps Script first-test package for Google Places nearby candidates and a private Sheet CRM.

**Architecture:** Pure request/filter/CSV logic feeds a bounded Google provider adapter. Apps Script owns authenticated sheet writes; responsive HTML shows live provider results. Permanent storage contains only IDs and user-entered/uploaded data.

**Tech Stack:** Apps Script V8, HTML/CSS/browser JavaScript, Node 22 built-in test runner, no installed dependencies.

**Spec:** `09-phase1-decision-and-spec.md`

## Global constraints

- Count 1–60, default 50; at most six search requests across ordered included industries; no replacement searches.
- Branch phones are not presented as direct manager numbers.
- No permanent Google result payloads; no API key in browser.
- Private, allowlisted testers; execute as accessing user; hard daily request caps.
- Demo fixtures visibly fictional; local tests do not substitute for live acceptance.

## Review focus

- Malformed CSV must not replace prior exclusions; quoted multiline records must parse.
- Duplicate branch names must not cause false exclusions.
- Double clicks, quota exhaustion, and provider failures must avoid duplicate uncontrolled costs.
- Untrusted strings must not become HTML, unsafe links, or spreadsheet formulas.
- Missing phones/ZIPs and hotel searches must not imply full nearest-50 completeness.

## Task 1: Core and bounded Google acquisition

Files: `phase1/Core.gs`, `phase1/Provider.gs`, `phase1/tests/phase1.test.cjs`.
Interfaces: `validateRequest(input) -> normalized settings`; `parseExclusions(csv) -> rows`; `acquireCandidates(settings, deps) -> {places,rawCount,searchRequests,geocodeRequests,estimatedGrossUsd,ranking}`; `filterCandidates(places, exclusions, zips) -> {eligible,excluded,filtered,duplicates}`. Dependencies expose `geocode(address)` and `search(body)`.

- [x] Write tests for invalid settings, CSV quotes/formulas/branch matching, 20+20+10 paging, shortfalls, repeated tokens, no replacements, missing phone, ZIP filtering, and hotel ranking.
- [x] Run `node --test tests/phase1.test.cjs`; observe missing implementations fail.
- [x] Implement core and adapter, including phone/website/hours mask and conservative failure behavior.
- [x] Run the suite and record results in `phase1/PROGRESS.md`.

## Task 2: Private Sheet service

Files: `phase1/Code.gs`, `phase1/appsscript.json`, integration tests in the same test file.
Interfaces: `getBootstrap()`, `generateLeads(input)`, `importExclusions(csv)`, `saveLead(record)`, `getCRM()`, `logActivity(activity)` consumed by browser; server-side service doubles used by tests. CRM includes statuses, contact/competitor fields, next plan, follow-up date, and append-only activity history; current-customer/archive/do-not-contact statuses automatically exclude matching locations.

- [x] Write failing tests for authorization, duplicate active generation, budget exhaustion, sanitized failures/lock release, literal writes, exclusion import, user-entered-only CRM persistence, activity idempotency, status exclusions, follow-up queues, unknown-record rejection, and history preservation.
- [x] Implement authentication, limits, lock, and persistent tabs.
- [x] Run all tests and record results.

## Task 3: Responsive tester UI and handoff

Files: `phase1/Index.html`, `phase1/tools/demo-server.cjs`, `phase1/README.md`, `phase1/PRIVACY.md`, `phase1/TERMS.md`.
Interfaces: UI uses Task 2 functions with success/failure handlers; local demo supplies the same interface without credentials.

- [x] Add failing UI contract tests for demo labeling, safe rendering/URLs, mobile viewport, no browser persistence, and service API compatibility.
- [x] Implement phone/desktop UI, empty/error/loading states, exclusion import, editable CRM, due queue, and activity history.
- [x] Run automated tests and browser checks where available. Independently review complete package; fix important findings with regression tests.
- [x] Finish setup instructions, evidence ledger, and live acceptance checklist. Mark deployment/live test pending where no account/key/address is available.

## Execution rulings

The user explicitly instructed planning followed by implementation to finish Phase 1; continue without another approval loop. This is a generated projectless directory, not a Git checkout: package files are isolated under `outputs/phase1`, with no Git worktree or commits. Skill bookkeeping scripts requiring a Git repo are replaced by a durable progress ledger. Run tests before completion claims. Preserve this ledger because no Git history exists.
