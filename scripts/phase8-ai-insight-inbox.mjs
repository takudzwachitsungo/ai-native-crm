const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_INSIGHT_INBOX_EVAL_EMAIL || process.env.CRM_PROVIDER_OPS_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_INSIGHT_INBOX_EVAL_PASSWORD || process.env.CRM_PROVIDER_OPS_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_INSIGHT_INBOX_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_INSIGHT_INBOX_EVAL_TIMEOUT_MS || 60000);

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
  console.log("Running Phase 8 AI insight inbox evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);
  let selectedInsightId = null;

  await runCheck("Insight generation persists inbox records", async () => {
    const { response, data } = await requestJson(`${aiUrl}/insights?context=dashboard&include_inactive=true`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected insight generation success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data?.insights), "Expected insights array");
    assert(data.insights.length > 0, "Expected seeded data to produce at least one insight");
    selectedInsightId = data.insights[0].id;
    assert(selectedInsightId, "Expected stable insight id");
    return `Generated and snapshotted ${data.insights.length} insight(s)`;
  });

  await runCheck("Insight inbox exposes summary and records", async () => {
    const { response, data } = await requestJson(`${aiUrl}/insights/inbox?limit=100`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected inbox success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data?.insights), "Expected inbox insights array");
    assert(data?.summary?.total >= data.insights.length, "Expected inbox summary total");
    assert(data.insights.some((insight) => insight.id === selectedInsightId), "Expected generated insight in inbox");
    assert(data.insights[0]?.first_seen_at, "Expected first_seen_at");
    assert(data.insights[0]?.last_seen_at, "Expected last_seen_at");
    return `${data.summary.total} persisted insight(s), ${data.summary.active} active`;
  });

  await runCheck("Insight assignment persists and filters", async () => {
    const encodedId = encodeURIComponent(selectedInsightId);
    const update = await requestJson(`${aiUrl}/insights/${encodedId}/state`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "assigned",
        assigned_to: email,
        note: "Assigned by Phase 8 insight inbox eval",
      }),
    });
    assert(update.response.ok, `Expected assignment success, got ${update.response.status}: ${JSON.stringify(update.data)}`);
    assert(update.data?.state?.status === "assigned", "Expected assigned state");
    assert(update.data?.state?.assigned_to === email, "Expected assigned_to to persist");

    const filtered = await requestJson(`${aiUrl}/insights/inbox?status=assigned&limit=100`, {
      method: "GET",
      headers,
    });
    assert(filtered.response.ok, `Expected assigned inbox success, got ${filtered.response.status}: ${JSON.stringify(filtered.data)}`);
    assert(filtered.data?.insights?.some((insight) => insight.id === selectedInsightId), "Expected assigned insight in filtered inbox");

    await requestJson(`${aiUrl}/insights/${encodedId}/state`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "active",
        note: "Reset by Phase 8 insight inbox eval",
      }),
    });
    return `Assigned and filtered insight ${selectedInsightId}`;
  });

  await runCheck("Insight inbox audit event is recorded", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/audit?limit=20&event_type=insight_inbox_viewed`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected audit success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data?.events), "Expected audit events array");
    assert(data.events.length > 0, "Expected insight_inbox_viewed audit event");
    return `${data.events.length} inbox audit event(s)`;
  });

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 8 AI insight inbox evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 8 AI insight inbox eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
