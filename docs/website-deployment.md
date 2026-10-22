# Website deployment

Production is [spinoapp.com](https://spinoapp.com/), served by the Cloudflare Worker
`spino` in account `546011d1072de05b93dda100285c2f9a`. `wrangler.jsonc` binds the
committed `site/` directory as `ASSETS`; the Worker handles video ranges and split
APK, AAB and ZIP downloads. Deploy both together with Wrangler.

## Publication and authentication

Use direct Wrangler deployment for an authorized website publication. On
21 October 2026, several pushes to `master` produced no corresponding Workers
Builds run despite builds being enabled. The underlying trigger failure remains
unconfirmed. Beta 9 and stable 6.1.1 were subsequently published through Wrangler.
A successful push is therefore not evidence that the website is live. Do not
create empty or documentation-only commits just to retry a missing build.

The owner authorized Wrangler as part of the normal website deployment routine
on 22 October 2026. Reuse the existing local OAuth session for the same account,
Worker and scope. A request to publish includes this deployment step; do not ask
for the same permission again. This does not schedule unattended publications.

Use Node 22 and Wrangler 4.151.3, the combination verified for the current
deployment. On the current Mac, Node 22 is at `/opt/homebrew/opt/node@22/bin/node`.
Use the normal user environment so Wrangler can reuse and refresh its stored
session; do not change `HOME` or clear authentication between deployments.

```sh
npx --yes wrangler@4.151.3 deployments list --config wrangler.jsonc
```

If the session is missing, or Cloudflare reports an expired or revoked session that cannot refresh, renew
the already authorized login with these scopes:

```sh
npx --yes wrangler@4.151.3 login --scopes account:read workers:write workers_scripts:write
```

Wrangler adds `offline_access` to allow refresh. The owner may still need to
complete Cloudflare's browser consent screen. Do not request broader scopes or
switch accounts as part of a routine deploy. Do not copy credentials into the
repository, logs or chat. A sandbox DNS failure or log-file `EPERM` is an
execution restriction, not evidence of expired OAuth: use the authorized
network-enabled execution path instead of restarting login. `WRANGLER_LOG_PATH`
can place diagnostic logs in a writable temporary directory.

## Prepare the reviewed revision

1. Inspect the working tree and recent commits. Preserve unrelated changes and
   staged work. Confirm which full commit is authorized for publication.
2. Generate `site/` with `node scripts/site/build-site.mjs` when its inputs change.
   Validate the website and inspect affected responsive layouts before committing
   the generated assets and their Worker dependencies. Use the website checks in
   [the publishing guide](play-store/README.md#search-and-answer-engine-metadata).
3. Push the reviewed revision. Check the current live deployment and any active
   Cloudflare build before proceeding. If that revision is already live, verify
   it without uploading again. If another task has published a newer release,
   verify whether it includes the requested changes; do not overwrite it with
   an older snapshot.
4. Export the exact reviewed commit to a disposable directory. Do not deploy a
   shared dirty working tree or regenerate files inside the exported snapshot.

The following shell commands assume Node 22 is on `PATH`. Replace
`REVIEWED_FULL_COMMIT_SHA` with the verified commit, keeping the variables in the
same shell for the remaining steps:

```sh
spino_revision=$(git rev-parse 'REVIEWED_FULL_COMMIT_SHA^{commit}')
spino_snapshot=$(mktemp -d "${TMPDIR:-/tmp}/spino-web.XXXXXX")
spino_evidence=$(mktemp -d "${TMPDIR:-/tmp}/spino-web-evidence.XXXXXX")
git archive --format=tar --output="$spino_evidence/source.tar" "$spino_revision" site scripts/site wrangler.jsonc docs/releases
tar -xf "$spino_evidence/source.tar" -C "$spino_snapshot"
npx --yes wrangler@4.151.3 deploy --config "$spino_snapshot/wrangler.jsonc" --dry-run
```

Stop on a failed command. Inspect the dry-run output for the expected Worker,
asset directory and `ASSETS` binding. Keep existing custom-domain routing.

## Deploy and verify

Recheck the latest deployment immediately before uploading to avoid replacing a
newer concurrent publication. Run the deployment once, retaining its exit code
and ordinary command output:

```sh
if npx --yes wrangler@4.151.3 deploy --config "$spino_snapshot/wrangler.jsonc" --message "Website commit $spino_revision" > "$spino_evidence/wrangler-deploy.log" 2>&1; then
  cat "$spino_evidence/wrangler-deploy.log"
else
  cat "$spino_evidence/wrangler-deploy.log"
  exit 1
fi
npx --yes wrangler@4.151.3 deployments list --config "$spino_snapshot/wrangler.jsonc"
```

Record the full source commit, Wrangler version, deployment exit code, reported
`Current Version ID`, deployment-log SHA-256 and provider URL in dated evidence.
Verify that Cloudflare's current deployment uses that version. Preserve earlier
evidence rather than overwriting a previous release's record.

Compare the public Spanish, English and Catalan HTML bytes with the exported
files, without cache-busting query strings. Check affected assets, download
manifests and complete new download hashes, video `206` byte-range responses,
and the relevant browser behavior. For contrast or console changes, run
Lighthouse on production and record the actual audit results. Report a
successful publication only after the public checks pass.

For an app release, use `python3 scripts/site/verify-public-release.py VERSION COMMIT
--direct-deployment-evidence=PATH` with the evidence schema exemplified by
`docs/releases/6.1.1-direct-deployment.json`. The verifier reads expected assets
from its own checkout, so run the exported copy from the reviewed snapshot's root,
copying the new direct-deployment evidence and log there first. Copy its resulting
publication report back to the release evidence directory. Its optional legacy
range-only mode additionally requires the retained full artifacts and prior
publication proof described in the script. Website-only changes should use a new
dated evidence directory without replacing an app release's publication report.

If Git-triggered builds resume, avoid racing them with a direct upload: require a
successful provider result for the exact full commit and the same public checks.
Do not claim the Git integration is repaired solely because a direct deploy works.
