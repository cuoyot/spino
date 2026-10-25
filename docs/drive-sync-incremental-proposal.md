# Incremental improvements to the existing Drive connection

Status: phase one implemented for beta 6.1.6-beta.1 on 25 October 2026. The owner requests improved scaling without reconnecting or migrating notebooks. Phases two and three remain proposals.

Release-base correction: the initial inventory/audit used an older checkout. Stable 6.1.5 already has four parallel reads, deferred score assets and an optional single gzip checkpoint. This beta extends acceleration to bounded reusable segments rather than introducing those existing improvements. Original source files and the v2 connection remain unchanged. See `docs/releases/6.1.6-beta.1.md` and the benchmark for final behavior and limits.

## Current behavior and measured inventory

The inspected notebook has 96 commit files (27,370 bytes), 275 content objects (35,831,238 bytes) and one 303-byte descriptor. This is stored size, not measured network traffic. Score content, initial data and historical record versions all contribute; the retained/current split has not been measured.

Unchanged polls use the Drive changes feed. Verified object content persists in IndexedDB, including across ordinary restarts and disconnects. Incoming changes invalidate the in-memory materialized graph; reconstruction traverses retained commit history, normally using cached old objects. A new device also downloads uncached dependencies through bounded parallel reads in stable 6.1.5. Updates store complete values of changed records, rather than field-level patches. Immutable content is deduplicated by SHA-256. There is no history compaction.

Google documents 500,000 direct children per My Drive folder, excluding the My Drive root: <https://developers.google.com/workspace/drive/api/guides/folder#file_and_folder_limits>. The application currently rejects inventories above 100,000 objects and graphs above 100,000 commits. Moving files into subfolders alone does not bypass these application limits or reduce graph work.

## Compatibility contract

- Keep the current descriptor file ID, notebook ID, root ID, folder ID, connection settings, QR and record IDs.
- Keep the existing `spino-notebook-v2` commit and content representations. Existing clients continue reading and writing normally.
- Add optional acceleration artifacts with distinct markers. Older clients ignore them. Absence, incomplete publication, corruption or unsupported encoding falls back to the existing verified object path.
- Do not rename or move existing live object files as part of rollout. Do not change personal Drive data while developing or benchmarking this feature.
- No reconnect, destination picker, export/import or owner-driven migration.

## First delivery: fewer requests without changing merge semantics

Add optional immutable compressed packs containing the exact existing object texts, keyed by their existing SHA-256 hashes. Pack a verified commit's required dependencies with it. A separately published bounded index maps hashes to packs and identifies the covered commits. Publish the index only after every referenced pack verifies. Select complete valid coverage, not the latest device timestamp; independently published packs can coexist.

The new reader registers individual objects as today, discovers optional pack indexes, and fills its existing verified cache from packs before issuing individual content requests. Verify each unpacked object's hash and notebook scope, not just the pack checksum. Keep the existing merge graph and individual-file fallback. Cover missing, damaged, duplicate and partially published packs, cancellation and lost upload responses.

Use bounded pack/index sizes compatible with the current native bridge; do not transfer a whole multi-megabyte notebook in one bridge message. An initial implementation can use compressed data in a JSON envelope with a distinct marker, with strict compressed-size, expanded-size, object-count and per-object limits. Encoding and target sizes require benchmark results. Discover indexes once per connection/feed update; avoid a new lookup per missing hash.

This stage reduces cold-start request count and compressed bytes. It does **not** bound remote storage, delete old files or eliminate historical graph processing. It adds a bounded amount of acceleration data; avoid repeatedly packing identical coverage. Keep object bytes unchanged so current IDs and causal references remain valid.

## Second delivery: reuse a verified materialized state

Persist a versioned local checkpoint together with its verified commit coverage, current record versions, deletion information and causal graph information. Apply newly discovered commits incrementally where sufficient causal context exists; fall back to the full verified reconstruction otherwise. Commit checkpoint/cursor updates atomically. A cache shortcut must not hide a missing object, accept a changed immutable object or ignore a concurrent branch.

A remote checkpoint may later accelerate new devices further. It cannot contain only the final JSON and a timestamp: offline edits, causal predecessors, deletions and concurrent conflicts still need verifiable context. Validate it against full replay on synthetic histories before enabling it.

## Third delivery: bounded retention through an automatic upgrade

Deleting original files while old clients still require them is incompatible with transparent old-client support. Packs alone cannot solve this. Require a separately designed compatibility/retention stage before any deletion: supported readers must resolve packed objects and handle compacted causal boundaries, including a device returning after a long offline period and delayed writes from an older client. Known-device acknowledgments alone do not cover forgotten devices, in-flight writes or unknown old installations.

Once that contract is proven, compact verified history automatically, preserve a recovery generation and retire redundant objects with explicit reachability and concurrency checks. Clients must distinguish intentional retirement from the current missing-object error. This can use the same connected notebook and IDs; it does not require an owner-driven migration. Until then, keep original objects. Optional new-write folder rotation addresses the provider's direct-child limit only, and must not be described as retention or a solution to the current 100,000-object inventory limit.

## Measurement and acceptance

Benchmark synthetic notebooks at 100, 1,000 and 10,000 commits with small notes, sessions, PDF assets, repeated edits, deletions and two concurrent devices. Record HTTP count, request/response bytes, time, memory, IndexedDB work and object/file growth separately for unchanged polling, one incoming edit, local save, restart, empty-cache join and conflict recovery. Inject representative request latency; in-memory test timing is not physical-device evidence.

Required gates:

- Warm unchanged polling does not gain requests or download packs.
- A cold join uses materially fewer requests and bytes; publish measured results before setting a product target.
- Packed and individual reads produce identical records, causal versions, conflicts, PDF bytes and annotations.
- New and current clients can write concurrently with no reconnect or ID changes.
- Interruption, offline return, missing objects, corrupt packs and quota errors preserve local data and retry safely.
- Retention remains disabled until its separate old-client/offline/concurrency gates pass.

Implement and measure the first delivery before introducing binary asset storage, field-level patches or a new record format. Those are separate compatibility decisions, not prerequisites for an initial improvement.
