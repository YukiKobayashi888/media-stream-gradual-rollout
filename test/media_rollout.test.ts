import assert from "node:assert/strict";
import test from "node:test";
import type { FlagApi } from "../src/infrai_flags.js";
import {
  MEDIA_STREAM_FLAG,
  prepareMediaFlag,
  selectMediaTransport,
  setMediaAudience,
} from "../src/media_rollout.js";

test("selects streaming for a viewer included by the flag", async () => {
  const flags: FlagApi = {
    set: async () => ({ version: 1 }),
    rollout: async () => ({}),
    is_enabled: async (key, viewerId) => key === MEDIA_STREAM_FLAG && viewerId === "viewer-a",
  };

  assert.equal(await selectMediaTransport(flags, "viewer-a"), "stream");
  assert.equal(await selectMediaTransport(flags, "viewer-b"), "download");
});

test("rejects an invalid rollout percentage before calling the API", async () => {
  let called = false;
  const flags: FlagApi = {
    set: async () => ({ version: 1 }),
    rollout: async () => { called = true; },
    is_enabled: async () => false,
  };

  await assert.rejects(setMediaAudience(flags, 101, 1), RangeError);
  assert.equal(called, false);
});

test("uses the version returned by the flag update for rollout", async () => {
  let rolloutVersion: number | undefined;
  const flags: FlagApi = {
    set: async () => ({ version: 7 }),
    rollout: async (_key, input) => { rolloutVersion = input.version; },
    is_enabled: async () => false,
  };

  const { version } = await prepareMediaFlag(flags);
  await setMediaAudience(flags, 10, version);

  assert.equal(rolloutVersion, 7);
});

test("reuses the existing flag version when creation reports a conflict", async () => {
  let fetchedKey: string | undefined;
  const flags: FlagApi = {
    set: async () => { throw new Error("flag 'agent-media-streaming' already exists"); },
    get: async (key) => { fetchedKey = key; return { version: 9 }; },
    rollout: async () => {},
    is_enabled: async () => false,
  };

  assert.deepEqual(await prepareMediaFlag(flags), { version: 9, created: false });
  assert.equal(fetchedKey, MEDIA_STREAM_FLAG);
});
