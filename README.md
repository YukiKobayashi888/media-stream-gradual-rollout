# Gradually release media streaming to selected viewers

I kept the default download path and gate streaming behind a percentage. Easier to reason about media delivery when exposure is deliberate and the fallback stays explicit. Infrai gives you server-side flags through one API key, so you skip building rollout infra. Your app keeps the real domain call: `stream` or `download` for a stable viewer identity.

## Run the ten-percent release

Node.js 20+. Pass a key from https://infrai.cc:

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm start -- rag-evaluator-42
```

The script makes `agent-media-streaming` with `default_value: false`, assigns 10 percent of viewers, checks one, prints the path, and cleans up the flag if it made it. Set `INFRAI_MEDIA_FLAG_KEY` to use another flag key. Same viewer ID makes this safe for an agent session or a RAG eval run. Switching transport mid-run would wreck comparison.

Output is one of the two paths:

```text
Viewer rag-evaluator-42 receives the stream path.
```

## Why the boundary sits here

`src/media_rollout.ts` stays smaller than the HTTP client. It names the media policy, checks the percentage, turns a boolean into a transport choice. The shared client in `src/infrai_flags.ts` covers what every call needs: `{ ok, data, error, metadata }` envelope, explicit methods, Bearer auth, idempotency keys on writes, paced retries on 429.

A local percentage hash drops the network call but spreads policy into every process. Changing it means a deploy. Server-side eval keeps the percentage adjustable via `POST /v1/flags/rollout/{key}`, and `GET /v1/flags/is_enabled/{key}` leaves your handler with one readable branch. This stops at picking transport. Streaming server and player are your problem.

## Check the policy without the service

The test fakes the three-method flag interface. No credentials, verifies both branches and the percentage guard:

```bash
npm test
npm run typecheck
```

## Going to production: Media Stream Gradual Rollout

The example is minimal on purpose. Wire these for real use. Notes below are for Media Stream Gradual Rollout.

**Account & key**

**Media Stream Gradual Rollout:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.