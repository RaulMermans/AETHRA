import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { answerQuestion } from "./ask.ts";
import { parseEvidenceCatalog } from "./cards.ts";
import { runEvalSuite } from "./evals/suite.ts";
import { paraphraseIsFaithful } from "./llm/validate-paraphrase.ts";
import { orchestrateAsk } from "./orchestrate.ts";
import { runAgentTool } from "./tools/catalog.ts";

const here = dirname(fileURLToPath(import.meta.url));
const cardsPath = join(here, "../../public/data/evidence-cards.json");

async function main(): Promise<void> {
  const catalog = parseEvidenceCatalog(JSON.parse(readFileSync(cardsPath, "utf8")));
  let fails = 0;
  const suite = runEvalSuite(catalog);
  for (const c of suite.cases) {
    if (c.pass) console.log("PASS", c.id);
    else {
      fails += 1;
      console.log("FAIL", c.id, c.problems.join("; "));
    }
  }

  const temp = answerQuestion(
    { question: "What is the temperature trend over Peninsula + Balearics?", session: {} },
    catalog,
  );
  if (!paraphraseIsFaithful(temp, temp.responseText)) {
    fails += 1;
    console.log("FAIL paraphrase-self");
  } else {
    console.log("PASS paraphrase-self");
  }
  if (paraphraseIsFaithful(temp, `${temp.responseText} also 99.99 extra`)) {
    fails += 1;
    console.log("FAIL paraphrase-rejects-new-number");
  } else {
    console.log("PASS paraphrase-rejects-new-number");
  }
  const banned = runAgentTool("shell", {}, catalog);
  if (banned.ok) {
    fails += 1;
    console.log("FAIL tool-allowlist");
  } else {
    console.log("PASS tool-allowlist");
  }
  const ok = runAgentTool("get_evidence_card", { id: "gate-a-temperature-R0" }, catalog);
  if (!ok.ok) {
    fails += 1;
    console.log("FAIL tool-get-card");
  } else {
    console.log("PASS tool-get-card");
  }

  const wired = await orchestrateAsk(
    { question: "What is the temperature trend over Peninsula + Balearics?", session: { sessionId: "policy-test" } },
    catalog,
  );
  if (wired.llm?.configured !== false || wired.llm.usedFor !== "none") {
    fails += 1;
    console.log("FAIL orchestrate-llm-off");
  } else {
    console.log("PASS orchestrate-llm-off");
  }
  if (!wired.evals || wired.evals.passed !== wired.evals.total) {
    fails += 1;
    console.log("FAIL runtime-eval", wired.evals?.checks.filter((c) => !c.pass).map((c) => c.id).join(","));
  } else {
    console.log("PASS runtime-eval");
  }

  const wind = await orchestrateAsk(
    {
      question: "que sitios son mejores para desarrollar una instalacion eolica en españa",
      session: { sessionId: "policy-wind" },
    },
    catalog,
  );
  if (wind.status !== "INSUFFICIENT_EVIDENCE" || wind.intent !== "joint_low_trend") {
    fails += 1;
    console.log("FAIL runtime-wind-domain", wind.status, wind.intent);
  } else if (!wind.responseText.includes("41.60") && !wind.responseText.includes("Aragón")) {
    fails += 1;
    console.log("FAIL runtime-wind-coords");
  } else {
    console.log("PASS runtime-wind-domain");
  }
  if (!(wind.skillsApplied ?? []).includes("research-recommendations")) {
    fails += 1;
    console.log("FAIL runtime-skills");
  } else {
    console.log("PASS runtime-skills");
  }
  if (!(wind.toolsInvoked ?? []).includes("retrieve_evidence")) {
    fails += 1;
    console.log("FAIL runtime-tools");
  } else {
    console.log("PASS runtime-tools");
  }

  const burgos = await orchestrateAsk(
    {
      question: "Does that warming apply to Burgos, and can I use it to rank a wind site there?",
      session: { sessionId: "exam-burgos", regionScope: "age" },
    },
    catalog,
  );
  if (burgos.status !== "NOT_AVAILABLE" || burgos.findings.some((f) => f.evidenceId === "gate-a-temperature-R0")) {
    fails += 1;
    console.log("FAIL exam-burgos-session", burgos.status, burgos.findings.map((f) => f.evidenceId).join(","));
  } else {
    console.log("PASS exam-burgos-session");
  }

  const mix = answerQuestion(
    {
      question:
        "If MERRA-2 2 m air temperature warmed over Peninsula + Balearics, does that prove Spanish photovoltaic plants generate fewer MWh, and why or why not?",
      session: {},
    },
    catalog,
  );
  if (mix.intent !== "mixed_warming_pv" || !mix.responseText.includes("does not imply")) {
    fails += 1;
    console.log("FAIL exam-warming-not-mwh");
  } else {
    console.log("PASS exam-warming-not-mwh");
  }

  const stats = answerQuestion(
    {
      question: "What is Theil-Sen versus OLS for messy climate series, and why does autocorrelation reduce effective sample size?",
      session: {},
    },
    catalog,
  );
  if (!stats.responseText.includes("Theil") || !stats.responseText.includes("effective sample")) {
    fails += 1;
    console.log("FAIL exam-theil-sen-text");
  } else {
    console.log("PASS exam-theil-sen-text");
  }

  if (fails) process.exit(1);
}

void main();
