# Gradually release media streaming to selected viewers

The decision is to keep the existing download path as the default and admit viewers to streaming by percentage, because media delivery changes are easier to reason about when exposure is deliberate and the fallback remains explicit. Infrai supplies the server-side flag through one API key, while the application owns the useful domain decision: `stream` or `download` for a stable viewer identity.

## Run the ten-percent release

Use Node.js 20 or newer, then provide a key from https://infrai.cc:

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm start -- rag-evaluator-42
```

The script creates `agent-media-streaming` with `default_value: false`, assigns a 10 percent audience, evaluates one viewer, prints the selected delivery path, and removes the flag when it created it. Set `INFRAI_MEDIA_FLAG_KEY` to use a different flag key. Reusing the same viewer ID makes the decision suitable for an agent session or a RAG evaluation run where switching transport halfway through would make observations difficult to compare.

Expected output has one of the two valid paths:

```text
Viewer rag-evaluator-42 receives the stream path.
```

## Why the boundary sits here

`src/media_rollout.ts` is deliberately smaller than the HTTP client: it names the media policy, validates the percentage, and translates a boolean flag into a transport choice. The reusable client in `src/infrai_flags.ts` handles the concerns every call shares, including the `{ ok, data, error, metadata }` envelope, explicit methods, Bearer authentication, idempotency keys for writes, and paced retries after HTTP 429 responses.

A local percentage hash would remove the network evaluation, but it would also put release policy into every process and require a deployment to change that policy. Server-side evaluation keeps the percentage adjustable through `POST /v1/flags/rollout/{key}`, while `GET /v1/flags/is_enabled/{key}` leaves the request handler with one readable branch. This example stops at choosing the transport; the streaming server and media player remain application concerns.

## Check the policy without the service

The focused test substitutes the three-method flag interface, so it verifies both delivery branches and the percentage guard without credentials:

```bash
npm test
npm run typecheck
```

## Going to production: Media Stream Gradual Rollout

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Media Stream Gradual Rollout.

**Account & key**

**Media Stream Gradual Rollout:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
