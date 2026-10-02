# Repository and retained prospect data implementation plan

**Goal:** Keep a private single-user Sheets CRM, develop from GitHub, and retain prospect information only from sources that permit it.

**Architecture:** Apps Script serves the existing responsive website. A separately imported, openly licensed Overture Places catalog supplies reusable business facts. Google Places remains an explicitly temporary lookup option; its results never populate the permanent catalog. GitHub is code storage, never client-data storage. clasp deploys tested code to the existing Google web-app deployment.

**Scope:** This is an extension of the approved Phase 1 app, not a new hosting platform. The user authorized repository setup and resolution of permanent storage. Work runs in the dedicated clone of the empty target repository; another worktree is unnecessary.

## Constraints and review focus

- Retain source, release, upstream datasets, license and import date alongside catalog facts.
- No claim that a branch number is a manager number. Missing phones remain visible.
- Snapshot refresh must not overwrite rep-entered CRM details or activity history.
- Rank at most the requested raw count from the imported territory; exclusions reduce the result count and do not cause top-ups.
- GitHub contains code and fictional fixtures only. Credentials, exports, catalog downloads and client records are ignored.
- Tests on every push and PR. Deployment is opt-in until script ID, OAuth credentials and deployment ID exist.
- Verify unsupported source/license, stale edits, duplicate identities, formula-like content, and partial acquisition limits.

## Tasks

- [x] Research retention rights, candidate coverage, phone limitations, costs and refresh strategy; write source-linked decision.
- [x] Add pinned clasp tooling, allowlisted upload files, tests and opt-in deployment workflows; verify file selection and missing-secret failure.
- [x] Correct the previously reproduced CRM concurrency, duplicate identity, draft-loss and partial-budget bugs through RED→GREEN tests.
- [x] Add validated Overture snapshot conversion/import and local catalog selection, with source provenance and explicit Google/retained separation; run regression tests.
- [ ] Review the complete repository, run unit/browser checks, publish the initial commit to the supplied empty GitHub repository, and verify the remote commit.

## Account-dependent completion

OAuth login, actual Apps Script installation, deployment credentials, the rep's eight ZIP codes and real-device verification require account/user information not presently available. Prepare exact setup steps and report these as pending; do not describe a configured CI file as an already connected Google deployment.
