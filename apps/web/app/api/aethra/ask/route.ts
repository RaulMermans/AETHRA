import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEvidenceCatalog } from "@/lib/agent/cards";
import { orchestrateAsk } from "@/lib/agent/orchestrate";
import { AGENT_STATUSES } from "@/lib/agent/types";

export const runtime = "nodejs";

function loadCatalog() {
  const path = join(process.cwd(), "public/data/evidence-cards.json");
  return parseEvidenceCatalog(JSON.parse(readFileSync(path, "utf8")));
}

export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const answer = await orchestrateAsk(raw, loadCatalog());
    if (!AGENT_STATUSES.includes(answer.status)) {
      return Response.json({ error: "Internal answer failed validation" }, { status: 500 });
    }
    return Response.json(answer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ask failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
