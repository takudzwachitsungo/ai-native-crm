const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_QA_EMAIL || process.env.CRM_SMOKE_EMAIL || "john@example.com";
const password = process.env.CRM_QA_PASSWORD || process.env.CRM_SMOKE_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_QA_WORKSPACE || process.env.CRM_SMOKE_WORKSPACE || "";
const skipAi = /^(1|true|yes)$/i.test(process.env.CRM_QA_SKIP_AI || process.env.CRM_SMOKE_SKIP_AI || "");
const timeoutMs = Number(process.env.CRM_QA_TIMEOUT_MS || process.env.CRM_SMOKE_TIMEOUT_MS || 30000);

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

async function request(url, options = {}) {
  const { signal, dispose } = createTimeoutSignal(options.timeoutMs || timeoutMs);
  try {
    const hasBody = options.body !== undefined && options.body !== null;
    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        ...(options.headers || {}),
        ...(hasBody && !options.rawBody ? { "Content-Type": "application/json" } : {}),
      },
    });
    return response;
  } finally {
    dispose();
  }
}

async function requestJson(url, options = {}) {
  const response = await request(url, options);
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
    return true;
  } catch (error) {
    record(name, "fail", error instanceof Error ? error.message : String(error));
    return false;
  }
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function summarizeContent(data) {
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const rows = sections.reduce((count, section) => {
    const content = section?.content;
    if (Array.isArray(content?.rows)) {
      return count + content.rows.length;
    }
    if (Array.isArray(content)) {
      return count + content.length;
    }
    return count;
  }, 0);
  return { sections: sections.length, rows };
}

async function main() {
  console.log("Running Phase 1 QA stabilization checks...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}${skipAi ? " (skipped)" : ""}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const backendHealthy = await runCheck("Backend health", async () => {
    const { response, data } = await requestJson(`${backendUrl}/actuator/health`, { method: "GET" });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data?.status === "UP", `Expected status UP, got ${JSON.stringify(data)}`);
    return "Spring Boot actuator reports UP";
  });

  if (!backendHealthy) {
    throw new Error("Backend is not healthy; stopping Phase 1 QA run.");
  }

  let aiHealthy = false;
  if (skipAi) {
    record("AI health", "skip", "Skipped by CRM_QA_SKIP_AI");
  } else {
    aiHealthy = await runCheck("AI health", async () => {
      const { response, data } = await requestJson(`${aiUrl}/health`, { method: "GET" });
      assert(response.ok, `Expected 200 OK, got ${response.status}`);
      assert(data?.status === "healthy", `Expected healthy AI service, got ${JSON.stringify(data)}`);
      return "FastAPI AI service reports healthy";
    });
  }

  let accessToken = "";
  let userId = "";
  let tenantId = "";
  let tenantSlug = workspaceSlug;

  await runCheck("Authenticated login payload", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/auth/login`, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        ...(workspaceSlug ? { workspaceSlug } : {}),
      }),
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
    assert(typeof data?.accessToken === "string" && data.accessToken.length > 0, "Missing accessToken");
    assert(typeof data?.userId === "string" && data.userId.length > 0, "Missing userId");
    assert(typeof data?.tenantId === "string" && data.tenantId.length > 0, "Missing tenantId");
    assert(typeof data?.tenantSlug === "string" && data.tenantSlug.length > 0, "Missing tenantSlug");
    assert(Array.isArray(data?.permissions) && data.permissions.length > 0, "Missing permissions");
    assert(Array.isArray(data?.dataScopes) && data.dataScopes.length > 0, "Missing data scopes");
    accessToken = data.accessToken;
    userId = data.userId;
    tenantId = data.tenantId;
    tenantSlug = data.tenantSlug;
    return `Authenticated ${data.email || email} in tenant ${tenantSlug}`;
  });

  if (!accessToken) {
    throw new Error("Login failed; stopping Phase 1 QA run.");
  }

  const headers = authHeaders(accessToken);

  await runCheck("Unauthenticated API is blocked", async () => {
    const { response } = await requestJson(`${backendUrl}/api/v1/dashboard/stats`, { method: "GET" });
    assert([401, 403].includes(response.status), `Expected 401/403 without token, got ${response.status}`);
    return `Blocked with ${response.status}`;
  });

  const protectedEndpoints = [
    ["Dashboard stats", `${backendUrl}/api/v1/dashboard/stats?period=30d`, (data) => typeof data?.totalDeals === "number"],
    ["Tasks list", `${backendUrl}/api/v1/tasks?page=0&size=10`, (data) => Array.isArray(data?.content) || Array.isArray(data)],
    ["Deals list", `${backendUrl}/api/v1/deals?page=0&size=10&sort=value,desc`, (data) => Array.isArray(data?.content) || Array.isArray(data)],
    ["Events list", `${backendUrl}/api/v1/events?page=0&size=10`, (data) => Array.isArray(data?.content) || Array.isArray(data)],
    ["Notification preferences", `${backendUrl}/api/v1/account/notifications`, (data) => data && typeof data === "object"],
  ];

  for (const [name, url, validate] of protectedEndpoints) {
    await runCheck(`${name} authorized`, async () => {
      const { response, data } = await requestJson(url, { method: "GET", headers });
      assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
      assert(validate(data), `Unexpected response shape: ${JSON.stringify(data)}`);
      return "Authenticated request succeeded";
    });
  }

  await runCheck("Realtime stream authorization", async () => {
    const response = await request(`${backendUrl}/api/v1/realtime/stream`, {
      method: "GET",
      headers,
      timeoutMs: 5000,
    });
    assert(response.ok, `Expected 200 OK for authenticated realtime stream, got ${response.status}`);
    await response.body?.cancel();
    return "Authenticated SSE stream opened without 403";
  });

  await runCheck("Realtime stream blocks anonymous access", async () => {
    const response = await request(`${backendUrl}/api/v1/realtime/stream`, {
      method: "GET",
      timeoutMs: 5000,
    });
    assert([401, 403].includes(response.status), `Expected 401/403 without token, got ${response.status}`);
    await response.body?.cancel();
    return `Anonymous SSE blocked with ${response.status}`;
  });

  let reportType = "sales_pipeline_summary";
  await runCheck("Standard report templates", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/reports/templates`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
    const templates = data?.templates || data?.data || [];
    assert(Array.isArray(templates) && templates.length > 0, "Expected at least one standard report template");
    reportType = templates[0]?.id || templates[0]?.reportType || reportType;
    return `Found ${templates.length} standard report templates`;
  });

  await runCheck("Standard report generation", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/reports/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reportType,
        reportMode: "SUMMARY",
        dateRange: {
          start: "2026-01-01",
          end: "2026-12-31",
        },
        filters: {},
      }),
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.success !== false, `Expected successful report response, got ${JSON.stringify(data)}`);
    const content = data?.report || data?.content || data;
    const summary = summarizeContent(content);
    assert(summary.sections > 0 || Array.isArray(content?.rows), `Expected report sections or rows, got ${JSON.stringify(data).slice(0, 500)}`);
    return `Generated ${reportType} with ${summary.sections} sections and ${summary.rows} rows`;
  });

  await runCheck("Standard report PDF export", async () => {
    const response = await request(`${backendUrl}/api/v1/reports/export/pdf`, {
      method: "POST",
      headers: {
        ...headers,
        Accept: "application/pdf",
      },
      body: JSON.stringify({
        reportType,
        reportMode: "SUMMARY",
        dateRange: {
          start: "2026-01-01",
          end: "2026-12-31",
        },
        filters: {},
      }),
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    assert(contentType.includes("pdf") || contentType.includes("octet-stream"), `Expected PDF-like content type, got ${contentType}`);
    const bytes = await response.arrayBuffer();
    assert(bytes.byteLength > 100, `Expected non-empty PDF export, got ${bytes.byteLength} bytes`);
    return `PDF export returned ${bytes.byteLength} bytes`;
  });

  if (skipAi || !aiHealthy) {
    record("AI authenticated flows", "skip", "Skipped because AI checks were disabled or AI health failed");
  } else {
    const conversationId = `phase1-qa:${Date.now()}`;

    await runCheck("AI chat uses authenticated context", async () => {
      const { response, data } = await requestJson(`${aiUrl}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversation_id: conversationId,
          messages: [{ role: "user", content: "Give me a concise pipeline health summary using CRM data." }],
          context: {
            page: "phase1-qa",
            tenant_id: tenantId,
          },
        }),
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
      assert(typeof data?.message === "string" && data.message.trim().length > 0, "Expected non-empty AI response");
      return `Chat response received with ${Array.isArray(data.tool_calls) ? data.tool_calls.length : 0} tool calls`;
    });

    await runCheck("AI conversation history is persisted", async () => {
      const { response, data } = await requestJson(
        `${aiUrl}/conversation/history?user_id=${encodeURIComponent(userId)}&conversation_id=${encodeURIComponent(conversationId)}&limit=10`,
        { method: "GET", headers }
      );
      assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
      assert(Array.isArray(data?.messages) && data.messages.length >= 2, `Expected persisted user and assistant messages, got ${JSON.stringify(data)}`);
      return `Loaded ${data.messages.length} persisted messages`;
    });

    await runCheck("AI conversation history blocks user spoofing", async () => {
      const spoofedUserId = "00000000-0000-0000-0000-000000000000";
      const { response } = await requestJson(
        `${aiUrl}/conversation/history?user_id=${spoofedUserId}&conversation_id=${encodeURIComponent(conversationId)}&limit=10`,
        { method: "GET", headers }
      );
      assert(response.status === 403, `Expected 403 for spoofed user_id, got ${response.status}`);
      return "Spoofed user_id was blocked";
    });

    await runCheck("AI insights endpoint", async () => {
      const { response, data } = await requestJson(`${aiUrl}/insights?context=dashboard&include_inactive=true`, {
        method: "GET",
        headers,
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
      assert(Array.isArray(data?.insights), `Expected insights array, got ${JSON.stringify(data)}`);
      return `Generated ${data.insights.length} dashboard insights`;
    });

    await runCheck("AI governance capabilities", async () => {
      const { response, data } = await requestJson(`${aiUrl}/governance/capabilities`, {
        method: "GET",
        headers,
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
      assert(data?.audit_logging === true, "Expected audit logging enabled");
      assert(data?.insight_lifecycle === true, "Expected insight lifecycle enabled");
      assert(Array.isArray(data?.actions?.supported_actions), "Expected supported AI action list");
      return `Governance reports ${data.actions.supported_actions.length} safe actions`;
    });

    await runCheck("AI governance summary", async () => {
      const { response, data } = await requestJson(`${aiUrl}/governance/summary?limit=50`, {
        method: "GET",
        headers,
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
      assert(typeof data?.total_events === "number", "Expected total_events number");
      assert(typeof data?.storage === "string" && data.storage.length > 0, "Expected audit storage mode");
      return `Summary has ${data.total_events} events using ${data.storage}`;
    });

    await runCheck("AI safe action proposal", async () => {
      const { response, data } = await requestJson(`${aiUrl}/actions/propose`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          intent: "Create a follow-up task for QA validation tomorrow",
          action_type: "create_task",
          entity_type: "qa",
          entity_id: "phase1",
          payload: {
            title: "QA follow-up validation",
            priority: "MEDIUM",
          },
        }),
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
      assert(data?.requires_confirmation === true, "Expected action confirmation requirement");
      assert(data?.can_execute === true, "Expected create_task to be executable after confirmation");
      return `Proposal ${data.proposal_id} requires confirmation`;
    });
  }

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 1 QA completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 1 QA runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
