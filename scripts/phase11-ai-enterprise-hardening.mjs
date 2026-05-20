import { readFile } from "node:fs/promises";

const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_AI_ENTERPRISE_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_AI_ENTERPRISE_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_AI_ENTERPRISE_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_AI_ENTERPRISE_EVAL_TIMEOUT_MS || 120000);

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
    if ((response.headers.get("content-type") || "").includes("application/json") && text) {
      data = JSON.parse(text);
    }
    return { response, data, text };
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
  if (!condition) throw new Error(message);
}

async function runCheck(name, fn) {
  try {
    record(name, "pass", await fn());
  } catch (error) {
    record(name, "fail", error instanceof Error ? error.message : String(error));
  }
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login() {
  const { response, data, text } = await request(`${backendUrl}/api/v1/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password, ...(workspaceSlug ? { workspaceSlug } : {}) }),
  });
  assert(response.ok, `Login failed with ${response.status}: ${text}`);
  assert(data?.accessToken, "Missing access token");
  return data;
}

async function chat(token, userId, prompt) {
  const { response, data, text } = await request(`${aiUrl}/chat`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      user_id: userId,
      conversation_id: `phase11-${Date.now()}`,
      messages: [{ role: "user", content: prompt }],
      context: { page: "phase11-ai-enterprise-hardening" },
    }),
    timeoutMs,
  });
  assert(response.ok, `AI chat failed with ${response.status}: ${text}`);
  assert(typeof data?.message === "string" && data.message.trim().length > 0, "Expected non-empty AI response");
  return data;
}

async function main() {
  console.log("Running Phase 11 AI enterprise hardening evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);

  await runCheck("Governance exposes enterprise hardening capabilities", async () => {
    const { response, data, text } = await request(`${aiUrl}/governance/capabilities`, { headers });
    assert(response.ok, `Capabilities failed with ${response.status}: ${text}`);
    assert(data?.observability?.metrics_endpoint === "/metrics", "Expected metrics endpoint metadata");
    assert(data?.approvals?.enabled === true, "Expected approvals enabled");
    assert(data?.rag_indexing?.scheduler?.auth_mode, "Expected scheduler auth mode");
    assert(data?.rag_indexing?.scheduler?.token_rotation?.auth_mode, "Expected token rotation auth mode");
    return `${data.observability.metrics_format}, scheduler auth ${data.rag_indexing.scheduler.auth_mode}`;
  });

  await runCheck("Prometheus metrics endpoint is available", async () => {
    const { response, text } = await request(`${aiUrl}/metrics`);
    assert(response.ok, `Metrics failed with ${response.status}: ${text}`);
    for (const metric of ["crm_ai_audit_events_total", "crm_ai_latency_p95_ms", "crm_ai_rag_scheduler_configured"]) {
      assert(text.includes(metric), `Missing metric ${metric}`);
    }
    return "Core AI metrics exported";
  });

  await runCheck("External observability assets are present", async () => {
    const [prometheus, alerts, dashboard] = await Promise.all([
      readFile("ops/observability/prometheus.yml", "utf8"),
      readFile("ops/observability/alerts/ai-service.rules.yml", "utf8"),
      readFile("ops/observability/grafana/dashboards/crm-ai-service-overview.json", "utf8"),
    ]);
    assert(prometheus.includes("crm-ai-service"), "Prometheus scrape config missing AI job");
    assert(alerts.includes("CRMAIProviderErrors"), "AI provider alert missing");
    assert(dashboard.includes("CRM AI Service Overview"), "Grafana AI dashboard missing");
    return "Prometheus, alerts, and Grafana dashboard files found";
  });

  await runCheck("High-risk action approval workflow is functional", async () => {
    const proposalResponse = await request(`${aiUrl}/actions/propose`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        intent: "Bulk update selected stale leads",
        action_type: "bulk_update_records",
        entity_type: "lead",
        payload: { recordIds: ["00000000-0000-0000-0000-000000000001"], changes: { status: "CONTACTED" } },
      }),
    });
    assert(proposalResponse.response.ok, `Proposal failed: ${proposalResponse.text}`);
    const proposal = proposalResponse.data;
    assert(proposal?.risk_level === "high", "Expected high-risk proposal");
    assert(proposal?.can_execute === false, "High-risk proposal should not execute directly");

    const createResponse = await request(`${aiUrl}/actions/approvals`, {
      method: "POST",
      headers,
      body: JSON.stringify({ proposal, reason: "Phase 11 approval workflow eval" }),
    });
    assert(createResponse.response.ok, `Approval create failed: ${createResponse.text}`);
    const approvalId = createResponse.data?.approval?.id;
    assert(approvalId, "Missing approval id");

    const approveResponse = await request(`${aiUrl}/actions/approvals/${approvalId}/approve`, {
      method: "POST",
      headers,
      body: JSON.stringify({ note: "Approved by eval" }),
    });
    assert(approveResponse.response.ok, `Approval review failed: ${approveResponse.text}`);
    assert(approveResponse.data?.approval?.status === "approved", "Expected approved status");

    const listResponse = await request(`${aiUrl}/actions/approvals?status=approved&limit=20`, { headers });
    assert(listResponse.response.ok, `Approval list failed: ${listResponse.text}`);
    assert(
      (listResponse.data?.approvals || []).some((approval) => approval.id === approvalId),
      "Reviewed approval was not returned by list endpoint"
    );
    return `approval ${approvalId} approved`;
  });

  await runCheck("Real-user AI question set responds", async () => {
    const prompts = [
      "Who are my best performing sales reps? Give a numbered answer.",
      "Show me my top deals and mention deal values if available.",
      "Which open tasks or customer issues need attention next?",
    ];
    for (const prompt of prompts) {
      const data = await chat(loginData.accessToken, loginData.userId, prompt);
      assert(data.message.length > 40, `Response too short for prompt: ${prompt}`);
    }
    return `${prompts.length} real CRM questions answered`;
  });

  await runCheck("Semantic search edge case stays safe", async () => {
    const { response, data, text } = await request(
      `${aiUrl}/search/semantic?query=${encodeURIComponent("unlikely nonsense query zzz-no-match")}&entity_type=all&limit=5`,
      { method: "POST", headers }
    );
    assert(response.ok, `Semantic search failed with ${response.status}: ${text}`);
    assert(Array.isArray(data?.results), "Expected semantic results array");
    return `${data.results.length} result(s) returned safely`;
  });

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;
  console.log("");
  console.log(`Phase 11 AI enterprise hardening evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[FAIL] Phase 11 AI enterprise hardening eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
