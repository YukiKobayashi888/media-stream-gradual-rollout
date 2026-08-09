import type { FlagApi } from "./infrai_flags.js";

export const MEDIA_STREAM_FLAG = "agent-media-streaming";

export async function prepareMediaFlag(
  flags: FlagApi,
  key = MEDIA_STREAM_FLAG,
): Promise<{ version: number; created: boolean }> {
  try {
    const flag = await flags.set({
      key,
      type: "bool",
      default_value: false,
      enabled: true,
    });
    return { version: flag.version, created: true };
  } catch (error) {
    if (!(error instanceof Error) || !/already exists/i.test(error.message) || !flags.get) {
      throw error;
    }
    return { version: (await flags.get(key)).version, created: false };
  }
}

export async function setMediaAudience(
  flags: FlagApi,
  percentage: number,
  version: number,
  key = MEDIA_STREAM_FLAG,
): Promise<void> {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new RangeError("percentage must be an integer from 0 through 100");
  }
  await flags.rollout(key, {
    key,
    percentage,
    salt: "media-streaming-v1",
    sticky_unit: "user_id",
    version,
  });
}

export async function selectMediaTransport(
  flags: FlagApi,
  viewerId: string,
  key = MEDIA_STREAM_FLAG,
): Promise<"stream" | "download"> {
  const enabled = await flags.is_enabled(key, viewerId);
  return enabled ? "stream" : "download";
}
