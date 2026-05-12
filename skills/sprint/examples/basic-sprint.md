# Example: Basic Sprint Lifecycle

> A single-feature sprint at Trust Level L3 (default recommendation).

## Setup

```
/sprint init my-feature --name "My Feature" --trust L3
```

This creates `.bkit/state/sprints/my-feature.json` with an initial `phase: prd`
entry and emits `SprintCreated` to the audit log.

## Run

```
/sprint start my-feature
```

The skill handler composes Sprint 3 adapters, then calls Sprint 2
`startSprint`. The auto-run loop advances through:

```
prd -> plan -> design -> do -> iterate -> qa -> report  (stop)
```

At each transition the state file is rewritten atomically and a
`SprintPhaseChanged` audit log entry is appended.

## Inspect

```
/sprint status my-feature
```

Returns the full Sprint entity (Sprint 1 typedef) loaded from disk.

## Archive

After review the user advances explicitly:

```
/sprint archive my-feature
```

This invokes Sprint 2 `archiveSprint`, which enforces the S4
`archiveReadiness` gate when the source phase is `report`, then writes
`status: 'archived'` to disk and emits `SprintArchived`.

## What you should see on disk

```
.bkit/state/sprints/my-feature.json    # Sprint entity, status=active->archived
.bkit/state/sprint-status.json         # Root index entry
.bkit/audit/<today>.jsonl              # 1 SprintCreated + 6 SprintPhaseChanged + 1 SprintArchived
```
