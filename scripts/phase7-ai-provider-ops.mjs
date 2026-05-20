const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_PROVIDER_OPS_EVAL_EMAIL || process.env.CRM_OPS_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_PROVIDER_OPS_EVAL_PASSWORD || process.env.CRM_OPS_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_PROVIDER_OPS_EVAL_WORKSPACE || process.env.CRM_OPS_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_PROVIDER_OPS_EVAL_TIMEOUT_MS || 90000);

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
  console.log("Running Phase 7 AI provider ops evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);

  await runCheck("Provider runtime exposes cost tracking safely", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/capabilities`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected capabilities success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.runtime?.provider, "Expected runtime provider");
    assert(data?.runtime?.model, "Expected runtime model");
    assert(data?.runtime?.cost_tracking, "Expected cost_tracking block");
    assert(typeof data.runtime.cost_tracking.enabled === "boolean", "Expected cost tracking enabled flag");
    assert(data.runtime.cost_tracking.currency === "USD", "Expected USD cost tracking currency");
    assert(!JSON.stringify(data).toLowerCase().includes("api_key"), "Capabilities must not expose API keys");
    return `${data.runtime.provider}/${data.runtime.model}, cost tracking configured=${data.runtime.cost_tracking.enabled}`;
  });

  await runCheck("Chat audit captures provider usage metadata", async () => {
    const { response, data } = await requestJson(`${aiUrl}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "For provider ops QA, give me a short pipeline summary with one numbered recommendation.",
          },
        ],
        context: { page: "ai-provider-ops-eval" },
      }),
      timeoutMs,
    });
    assert(response.ok, `Expected chat success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(typeof data?.message === "string" && data.message.trim(), "Expected assistant response");

    const audit = await requestJson(`${aiUrl}/governance/audit?limit=5&event_type=chat_completion`, {
      method: "GET",
      headers,
    });
    assert(audit.response.ok, `Expected audit success, got ${audit.response.status}: ${JSON.stringify(audit.data)}`);
    const latestChat = audit.data?.events?.[0];
    assert(latestChat?.metadata?.runtime_provider, "Expected runtime_provider in chat audit metadata");
    assert(latestChat?.metadata?.runtime_model, "Expected runtime_model in chat audit metadata");
    assert(latestChat?.metadata?.usage && typeof latestChat.metadata.usage.calls === "number", "Expected usage metadata with call count");
    assert(latestChat?.metadata?.cost && typeof latestChat.metadata.cost.pricing_configured === "boolean", "Expected cost metadata");
    assert(Array.isArray(latestChat?.metadata?.provider_errors), "Expected provider_errors array");
    return `${latestChat.metadata.usage.calls} LLM call(s), ${latestChat.metadata.usage.total_tokens || 0} token(s)`;
  });

  await runCheck("Governance summary aggregates provider ops", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/summary?limit=120`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected summary success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.token_usage && typeof data.token_usage.llm_calls === "number", "Expected token_usage summary");
    assert(data?.usage_by_model && typeof data.usage_by_model === "object", "Expected usage_by_model summary");
    assert(data?.provider_errors && typeof data.provider_errors.total === "number", "Expected provider_errors summary");
    assert(data?.cost && typeof data.cost.pricing_configured === "boolean", "Expected cost summary");
    assert(data.token_usage.llm_calls > 0, "Expected at least one audited LLM call after chat");
    return `${data.token_usage.llm_calls} calls, ${data.token_usage.total_tokens} tokens, provider errors=${data.provider_errors.total}`;
  });

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 7 AI provider ops evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 7 AI provider ops eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
