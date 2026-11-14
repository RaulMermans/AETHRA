import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEvidenceCatalog } from "@/lib/agent/cards";
import { runEvalSuite } from "@/lib/agent/evals/suite";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const path = join(process.cwd(), "public/data/evidence-cards.json");
  const catalog = parseEvidenceCatalog(JSON.parse(readFileSync(path, "utf8")));
  const suite = runEvalSuite(catalog);
  return Response.json({
    name: "TARO evals",
    kind: "offline-policy-suite",
    passed: suite.passed,
    total: suite.total,
    cases: suite.cases,
  });
}
