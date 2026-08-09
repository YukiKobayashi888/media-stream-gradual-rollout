import { createInfraiFlags } from "./infrai_flags.js";
import { prepareMediaFlag, selectMediaTransport, setMediaAudience } from "./media_rollout.js";

const viewerId = process.argv[2] ?? "rag-evaluator-42";
const flagKey = process.env.INFRAI_MEDIA_FLAG_KEY ?? "agent-media-streaming";
const flags = createInfraiFlags(process.env.INFRAI_API_KEY);

const prepared = await prepareMediaFlag(flags, flagKey);
try {
  await setMediaAudience(flags, 10, prepared.version, flagKey);
  const transport = await selectMediaTransport(flags, viewerId, flagKey);
  console.log(`Viewer ${viewerId} receives the ${transport} path.`);
} finally {
  if (prepared.created && flags.delete) await flags.delete(flagKey);
}
