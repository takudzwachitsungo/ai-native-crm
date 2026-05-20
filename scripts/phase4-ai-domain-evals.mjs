const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_DOMAIN_EVAL_EMAIL || process.env.CRM_ACTION_EVAL_EMAIL || process.env.CRM_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_DOMAIN_EVAL_PASSWORD || process.env.CRM_ACTION_EVAL_PASSWORD || process.env.CRM_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_DOMAIN_EVAL_WORKSPACE || process.env.CRM_ACTION_EVAL_WORKSPACE || process.env.CRM_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_DOMAIN_EVAL_TIMEOUT_MS || process.env.CRM_ACTION_EVAL_TIMEOUT_MS || process.env.CRM_EVAL_TIMEOUT_MS || 45000);

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

function getToolNames(data) {
  return (data?.tool_calls || data?.toolCalls || [])
    .map((toolCall) => toolCall?.tool || toolCall?.name)
    .filter(Boolean);
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
  assert(data?.userId, "Missing user id");
  return data;
}

async function checkEndpoint(headers, path) {
  const { response, data } = await requestJson(`${backendUrl}${path}`, {
    method: "GET",
    headers,
  });
  assert(response.ok, `Expected 200 from ${path}, got ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

async function chat(headers, loginData, content) {
  const { response, data } = await requestJson(`${aiUrl}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      conversation_id: `phase4-domain:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      user_id: loginData.userId,
      messages: [{ role: "user", content }],
      context: {
        page: "phase4-ai-domain-evals",
        tenant_id: loginData.tenantId,
      },
    }),
  });
  assert(response.ok, `Expected 200 from AI chat, got ${response.status}: ${JSON.stringify(data)}`);
  assert(typeof data?.message === "string" && data.message.trim().length > 0, "Expected non-empty assistant response");
  return data;
}

async function assertChatUsesTools(name, headers, loginData, content, expectedTools) {
  await runCheck(name, async () => {
    const data = await chat(headers, loginData, content);
    const tools = getToolNames(data);
    for (const expectedTool of expectedTools) {
      assert(tools.includes(expectedTool), `Expected ${expectedTool}; got ${tools.join(", ") || "none"}. Response: ${data.message}`);
    }
    return `Used ${expectedTools.join(", ")} with ${data.message.length} response chars`;
  });
}

async function main() {
  console.log("Running Phase 4 AI domain evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  await runCheck("Backend health", async () => {
    const { response, data } = await requestJson(`${backendUrl}/actuator/health`);
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data?.status === "UP", `Expected status UP, got ${JSON.stringify(data)}`);
    return "Backend is healthy";
  });

  await runCheck("AI health", async () => {
    const { response, data } = await requestJson(`${aiUrl}/health`);
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data?.status === "healthy", `Expected healthy AI service, got ${JSON.stringify(data)}`);
    return "AI service is healthy";
  });

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);

  await runCheck("Governance exposes enterprise AI domains", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/capabilities`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected capabilities success, got ${response.status}: ${JSON.stringify(data)}`);
    const domains = new Set(data?.tool_domains || []);
    for (const expected of ["campaigns", "support_cases", "contracts", "field_service", "integrations", "revenue_ops"]) {
      assert(domains.has(expected), `Missing AI tool domain ${expected}`);
    }
    const toolNames = new Set((data?.tools || []).map((tool) => tool.name));
    for (const expected of ["search_campaigns", "search_cases", "search_contracts", "search_work_orders", "get_integrations", "get_revenue_ops_summary"]) {
      assert(toolNames.has(expected), `Missing AI tool ${expected}`);
    }
    return `${domains.size} domains and ${toolNames.size} tools exposed`;
  });

  await runCheck("Backend enterprise module endpoints reachable", async () => {
    await checkEndpoint(headers, "/api/v1/campaigns?page=0&size=1");
    await checkEndpoint(headers, "/api/v1/cases?page=0&size=1");
    await checkEndpoint(headers, "/api/v1/contracts?page=0&size=1");
    await checkEndpoint(headers, "/api/v1/field-service/work-orders?page=0&size=1");
    await checkEndpoint(headers, "/api/v1/settings/integrations");
    await checkEndpoint(headers, "/api/v1/dashboard/revenue-ops");
    return "Campaigns, cases, contracts, field service, integrations, and revenue ops endpoints responded";
  });

  await assertChatUsesTools(
    "Campaign AI grounding",
    headers,
    loginData,
    "Summarize campaign performance, nurture journeys, and ROI using live campaign data.",
    ["search_campaigns", "get_campaign_statistics"],
  );

  await assertChatUsesTools(
    "Support case AI grounding",
    headers,
    loginData,
    "Show support case SLA risk, overdue cases, and assignment queue items.",
    ["search_cases", "get_case_statistics", "get_case_assignment_queue"],
  );

  await assertChatUsesTools(
    "Contract AI grounding",
    headers,
    loginData,
    "Show contract renewals and contract value using live contract data.",
    ["search_contracts"],
  );

  await assertChatUsesTools(
    "Field service AI grounding",
    headers,
    loginData,
    "Summarize field service work orders, technician workload, and urgent dispatch items.",
    ["search_work_orders", "get_work_order_statistics"],
  );

  await assertChatUsesTools(
    "Integration AI grounding",
    headers,
    loginData,
    "Which third-party integrations are connected or need attention?",
    ["get_integrations"],
  );

  await assertChatUsesTools(
    "Revenue ops AI grounding",
    headers,
    loginData,
    "Summarize revenue ops quota attainment by territory.",
    ["get_revenue_ops_summary"],
  );

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 4 AI domain evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 4 AI domain eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
