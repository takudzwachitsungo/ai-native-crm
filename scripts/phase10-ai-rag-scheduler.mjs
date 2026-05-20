const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_RAG_SCHEDULER_EVAL_EMAIL || process.env.CRM_RAG_INDEX_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_RAG_SCHEDULER_EVAL_PASSWORD || process.env.CRM_RAG_INDEX_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_RAG_SCHEDULER_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_RAG_SCHEDULER_EVAL_TIMEOUT_MS || 120000);

const results = [];

function createTimeoutSignal(ms = timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
    },
  };
}

async function requestJson(url, options = {}) {
  const { signal, dispose } = createTimeoutSignal(options.timeoutMs || timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        ...(options.headers || {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 200)}`);
      }
    }
    return { response, data };
  } finally {
    dispose();
  }
}

function record(name, status, detail) {
  results.push({ name, status, detail });
  const marker = status === "pass" ? "[PASS]" : status === "skip" ? "[SKIP]" : "[FAIL]";
  console.log(`${marker} ${name}: ${detail}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runCheck(name, fn) {
  try {
    const detail = await fn();
    record(name, "pass", detail);
  } catch (error) {
    record(name, "fail", error instanceof Error ? error.message : String(error));
  }
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login() {
  const { response, data } = await requestJson(`${backendUrl}/api/v1/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      ...(workspaceSlug ? { workspaceSlug } : {}),
    }),
  });
  assert(response.ok, `Login failed with ${response.status}: ${JSON.stringify(data)}`);
  assert(data?.accessToken, "Missing access token");
  return data;
}

async function main() {
  console.log("Running Phase 10 AI RAG scheduler evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);
  let initialRunCount = 0;

  await runCheck("Scheduler and alert capabilities are exposed", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/capabilities`, { method: "GET", headers });
    assert(response.ok, `Expected capabilities success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.runtime?.alert_thresholds, "Expected runtime alert thresholds");
    assert(Number(data.runtime.alert_thresholds.failure_rate_percent) >= 0, "Expected failure threshold");
    assert(data?.rag_indexing?.scheduler?.status_endpoint === "/rag/scheduler/status", "Expected scheduler status endpoint");
    assert(data.rag_indexing.scheduler.run_endpoint === "/rag/scheduler/run", "Expected scheduler run endpoint");
    assert(data.rag_indexing.scheduler.token_rotation?.status, "Expected token rotation metadata");
    assert(data?.actions?.approval_policy?.high, "Expected AI action approval policy");
    return `scheduler ${data.rag_indexing.scheduler.enabled ? "enabled" : "manual"}, thresholds and approval policy exposed`;
  });

  await runCheck("Scheduler status reports configuration", async () => {
    const { response, data } = await requestJson(`${aiUrl}/rag/scheduler/status`, { method: "GET", headers });
    assert(response.ok, `Expected scheduler status success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data?.configured_domains), "Expected configured domains");
    assert(Number(data?.configured_limit || 0) > 0, "Expected configured limit");
    assert(Number(data?.interval_seconds || 0) > 0, "Expected scheduler interval");
    assert(data?.token_rotation?.status, "Expected token rotation status");
    initialRunCount = Number(data.run_count || 0);
    return `${data.configured_domains.join(", ")} / ${data.interval_seconds}s / token ${data.token_rotation.status}`;
  });

  await runCheck("Manual scheduler run indexes CRM knowledge", async () => {
    const { response, data } = await requestJson(`${aiUrl}/rag/scheduler/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        domains: ["documents", "emails", "cases", "tasks"],
        limit: 100,
      }),
      timeoutMs,
    });
    assert(response.ok, `Expected manual scheduler success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Number(data?.result?.total_indexed || 0) > 0, `Expected indexed records: ${JSON.stringify(data)}`);
    assert(Number(data?.state?.run_count || 0) >= initialRunCount + 1, "Expected scheduler run count to increment");
    assert(!data?.result?.errors || Object.keys(data.result.errors).length === 0, `Expected no indexing errors: ${JSON.stringify(data.result.errors)}`);
    return `${data.result.total_indexed} record(s) indexed via scheduler path`;
  });

  await runCheck("Scheduler status reflects last run", async () => {
    const { response, data } = await requestJson(`${aiUrl}/rag/scheduler/status`, { method: "GET", headers });
    assert(response.ok, `Expected scheduler status success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.last_run_at, "Expected last_run_at");
    assert(Number(data?.run_count || 0) >= initialRunCount + 1, "Expected updated run count");
    assert(Number(data?.total_indexed || 0) > 0, "Expected indexed embedding count");
    return `last run ${data.last_run_at}, ${data.total_indexed} embedding(s) indexed`;
  });

  await runCheck("Scheduler run is audit logged", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/audit?limit=30&event_type=rag_index_completed`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected audit success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data?.events), "Expected audit events array");
    const schedulerEvent = data.events.find((event) => event?.metadata?.trigger === "manual_scheduler");
    assert(schedulerEvent, "Expected manual_scheduler audit event");
    return `${data.events.length} RAG audit event(s), scheduler event found`;
  });

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 10 AI RAG scheduler evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 10 AI RAG scheduler eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
