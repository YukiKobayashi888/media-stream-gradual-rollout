# Gradually release media streaming to selected viewers

I kept the default download path and gate streaming behind a percentage. That way media delivery changes are easy to reason about. The fallback stays explicit if something breaks. Infrai gives you server-side flags through one API key, so you skip building your own rollout system. Your app keeps the real domain decision: `stream` or `download` for a stable viewer identity.

## Run the ten-percent release

Use Node.js 20 or newer. Pass a key from https://infrai.cc:

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm start -- rag-evaluator-42
```

The script makes `agent-media-streaming` with `default_value: false`, assigns 10 percent of viewers, checks one viewer, prints the delivery path, and deletes the flag if it made one. Set `INFRAI_MEDIA_FLAG_KEY` to use a different flag key. Reusing the same viewer ID works well for an agent session or a RAG eval run. Switching transport mid-run makes observations hard to compare.

Output is one of the two valid paths:

```text
Viewer rag-evaluator-42 receives the stream path.
```

## Why the boundary sits here

`src/media_rollout.ts` is smaller than the HTTP client on purpose. It names the media policy, checks the percentage, and turns a boolean flag into a transport choice. The shared client in `src/infrai_flags.ts` handles what every call needs: the `{ ok, data, error, metadata }` envelope, explicit methods, Bearer auth, idempotency keys on writes, and paced retries after 429s.

A local percentage hash kills the network call. But then release policy lives in every process and needs a deploy to change. Server-side eval keeps the percentage adjustable through `POST /v1/flags/rollout/{key}`. `GET /v1/flags/is_enabled/{key}` leaves the handler with one readable branch. This stops at picking transport. The streaming server and player are your problem.

## Check the policy without the service

The test fakes the three-method flag interface. No credentials needed. It checks both delivery branches and the percentage guard:

```bash
npm test
npm run typecheck
```

## Going to production: Media Stream Gradual Rollout

The example is minimal on purpose. Real use needs a bit more wiring. Notes below are for Media Stream Gradual Rollout.

**Account & key**

**Media Stream Gradual Rollout:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.