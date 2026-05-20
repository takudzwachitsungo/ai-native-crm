const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_OPS_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_OPS_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_OPS_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_OPS_EVAL_TIMEOUT_MS || 90000);

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
  console.log("Running Phase 6 AI ops evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);

  await runCheck("Governance exposes AI runtime safely", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/capabilities`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.audit_logging === true, "Expected audit logging to be enabled");
    assert(data?.runtime?.model, "Expected runtime model metadata");
    assert(data?.runtime?.provider, "Expected runtime provider metadata");
    assert(data?.runtime?.streaming === true, "Expected streaming capability metadata");
    assert(data?.runtime?.rag?.enabled === true, "Expected RAG capability metadata");
    assert(data?.runtime?.secrets && typeof data.runtime.secrets.groq_configured === "boolean", "Expected non-secret configuration flags");
    assert(!Object.keys(data.runtime).some((key) => key.toLowerCase().includes("key")), "Runtime response should not expose secret keys");
    assert(Array.isArray(data?.tool_domains) && data.tool_domains.length >= 10, "Expected enterprise tool domain coverage");
    assert(Array.isArray(data?.tools) && data.tools.length >= 5, "Expected available tool list");
    return `${data.runtime.provider}/${data.runtime.model}, ${data.tool_domains.length} domains, ${data.tools.length} tools`;
  });

  await runCheck("Ops summary exposes health metrics", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/summary?limit=120`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected summary success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.health?.status, "Expected health status");
    assert(typeof data?.failure_rate === "number", "Expected failure_rate");
    assert(typeof data?.fallback_rate === "number", "Expected fallback_rate");
    assert(data?.latency && typeof data.latency.count === "number", "Expected latency summary");
    assert(data?.tool_counts && typeof data.tool_counts === "object", "Expected tool_counts");
    assert(data?.events_by_day && typeof data.events_by_day === "object", "Expected events_by_day");
    return `Health=${data.health.status}, failures=${data.failure_rate}%, fallback=${data.fallback_rate}%`;
  });

  await runCheck("Chat audit captures latency and tool context", async () => {
    const { response, data } = await requestJson(`${aiUrl}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "For ops QA, summarize my top deals in one short numbered list.",
          },
        ],
        context: { page: "ai-ops-eval" },
      }),
      timeoutMs,
    });
    assert(response.ok, `Expected chat success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(typeof data?.message === "string" && data.message.trim().length > 0, "Expected assistant response");

    const summary = await requestJson(`${aiUrl}/governance/summary?limit=120`, {
      method: "GET",
      headers,
    });
    assert(summary.response.ok, `Expected summary after chat, got ${summary.response.status}: ${JSON.stringify(summary.data)}`);
    assert(Number(summary.data?.by_type?.chat_completion || 0) > 0, "Expected chat_completion audit event");
    assert(Number(summary.data?.latency?.count || 0) > 0, "Expected at least one latency sample");
    return `Chat audited with ${summary.data.latency.count} latency sample(s)`;
  });

  await runCheck("Audit event filtering works", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/audit?limit=20&event_type=chat_completion`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected audit list success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data?.events), "Expected events array");
    assert(data.events.every((event) => event.event_type === "chat_completion"), "Filtered audit contained another event type");
    return `${data.events.length} chat_completion event(s) returned`;
  });

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 6 AI ops evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 6 AI ops eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
