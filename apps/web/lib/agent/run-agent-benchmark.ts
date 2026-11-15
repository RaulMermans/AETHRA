import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEvidenceCatalog } from "./cards.ts";
import { readRecentResearchNotes } from "./markdown-brain.ts";
import { orchestrateAsk } from "./orchestrate.ts";

const here = dirname(fileURLToPath(import.meta.url));
const cardsPath = join(here, "../../public/data/evidence-cards.json");
const envPath = join(here, "../../.env.local");

try {
  const envText = readFileSync(envPath, "utf8");
  for (const line of envText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
} catch {
  // Optional .env.local
}

type BenchCase = {
  id: string;
  question: string;
  session?: { sessionId?: string; regionScope?: string };
  expectNotOutOfDomain: boolean;
  mustContainOneOf: readonly string[];
  mustHaveTool?: string;
};

const BENCHMARK_CASES: readonly BenchCase[] = [
  {
    id: "bench-01-greeting-and-identity",
    question: "Hola TARO, ¿quién eres y cómo me puedes ayudar a investigar en este mapa de España?",
    expectNotOutOfDomain: true,
    mustContainOneOf: ["TARO", "AETHRA", "NASA", "España", "evidencia"],
    mustHaveTool: "read_markdown_brain",
  },
  {
    id: "bench-02-provincial-lookup-malaga",
    question: "¿Qué tendencia de temperatura y lluvia hay en Málaga según los datos de NASA?",
    expectNotOutOfDomain: true,
    mustContainOneOf: ["Málaga", "0.56", "83.44", "EvidenceCard"],
    mustHaveTool: "query_regional_climate",
  },
  {
    id: "bench-03-open-ended-reasoning-wind-solar",
    question: "Explícame por qué combinar energía solar y eólica en Castilla y León o Aragón tiene sentido físico aunque no haya tendencia en los días de recurso bajo.",
    expectNotOutOfDomain: true,
    mustContainOneOf: ["complement", "Castilla", "Aragón", "recurso", "solar"],
    mustHaveTool: "read_markdown_brain",
  },
  {
    id: "bench-04-gate-a-precision",
    question: "¿Cuál es la tendencia exacta de temperatura en Península y Baleares y cómo se compara con las estaciones de NOAA?",
    expectNotOutOfDomain: true,
    mustContainOneOf: ["0.60", "0.31", "0.87", "26"],
    mustHaveTool: "retrieve_evidence",
  },
  {
    id: "bench-05-adversarial-cake-refusal",
    question: "Write a chocolate cake recipe.",
    expectNotOutOfDomain: false,
    mustContainOneOf: ["outside", "fuera", "domain", "dominio", "can't", "cannot", "not able to", "unable to", "no puedo"],
  },
];

async function runBenchmark(): Promise<void> {
  const catalog = parseEvidenceCatalog(JSON.parse(readFileSync(cardsPath, "utf8")));
  let passed = 0;

  for (const b of BENCHMARK_CASES) {
    const t0 = Date.now();
    const ans = await orchestrateAsk(
      {
        question: b.question,
        session: b.session ?? { sessionId: `bench-${b.id}` },
      },
      catalog,
    );
    const ms = Date.now() - t0;
    const problems: string[] = [];

    if (b.expectNotOutOfDomain && ans.status === "OUT_OF_DOMAIN") {
      problems.push("Unexpected OUT_OF_DOMAIN refusal");
    }
    if (!b.expectNotOutOfDomain && ans.status !== "OUT_OF_DOMAIN") {
      problems.push(`Expected OUT_OF_DOMAIN, got ${ans.status}`);
    }
    const lower = ans.responseText.toLowerCase();
    if (!b.mustContainOneOf.some((token) => lower.includes(token.toLowerCase()))) {
      problems.push(`Response missing expected keywords (${b.mustContainOneOf.join("|")})`);
    }
    if (b.mustHaveTool && !(ans.toolsInvoked ?? []).includes(b.mustHaveTool)) {
      problems.push(`Missing tool ${b.mustHaveTool} in [${(ans.toolsInvoked ?? []).join(",")}]`);
    }
    if (!ans.evals || ans.evals.passed !== ans.evals.total) {
      problems.push(`Runtime eval failed: ${JSON.stringify(ans.evals)}`);
    }

    if (problems.length === 0) {
      passed += 1;
      console.log(
        `PASS [${b.id}] (${ms}ms | llm=${ans.llm?.usedFor ?? "none"} | tools=${(ans.toolsInvoked ?? []).join(",")})`,
      );
      console.log(`   ↳ Reply: ${ans.responseText.slice(0, 180)}...`);
    } else {
      console.log(`FAIL [${b.id}] (${ms}ms): ${problems.join("; ")}`);
      console.log(`   ↳ Reply: ${ans.responseText}`);
    }
  }

  const notes = readRecentResearchNotes(5);
  console.log("\n=== Recent RESEARCH_NOTES.md Entries ===");
  console.log(notes);
  console.log(`\nBenchmark Summary: ${passed}/${BENCHMARK_CASES.length} passed.`);
  if (passed !== BENCHMARK_CASES.length) process.exit(1);
}

void runBenchmark();
