const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_RAG_INDEX_EVAL_EMAIL || process.env.CRM_INSIGHT_INBOX_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_RAG_INDEX_EVAL_PASSWORD || process.env.CRM_INSIGHT_INBOX_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_RAG_INDEX_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_RAG_INDEX_EVAL_TIMEOUT_MS || 120000);

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

function collection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
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

async function findSearchProbe(headers) {
  const candidates = [
    { endpoint: "/api/v1/tasks?page=0&size=10", entityType: "task", fields: ["title", "subject", "description"] },
    { endpoint: "/api/v1/cases?page=0&size=10", entityType: "case", fields: ["subject", "title", "description", "caseNumber"] },
    { endpoint: "/api/v1/documents?page=0&size=10", entityType: "document", fields: ["title", "name", "fileName", "description"] },
    { endpoint: "/api/v1/emails?page=0&size=10", entityType: "email", fields: ["subject", "body", "preview"] },
  ];

  for (const candidate of candidates) {
    const { response, data } = await requestJson(`${backendUrl}${candidate.endpoint}`, { method: "GET", headers, timeoutMs: 30000 });
    if (!response.ok) continue;
    for (const record of collection(data)) {
      const query = candidate.fields.map((field) => record?.[field]).find((value) => typeof value === "string" && value.trim().length > 2);
      if (query) {
        return {
          entityType: candidate.entityType,
          query: query.trim().slice(0, 120),
        };
      }
    }
  }
  return null;
}

async function main() {
  console.log("Running Phase 9 AI RAG indexing evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);
  let probe = null;

  await runCheck("RAG indexing capability is exposed", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/capabilities`, { method: "GET", headers });
    assert(response.ok, `Expected capabilities success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.rag_indexing?.enabled === true, "Expected rag_indexing enabled");
    assert(data.rag_indexing.domains.includes("documents"), "Expected documents indexing domain");
    assert(data.rag_indexing.domains.includes("cases"), "Expected cases indexing domain");
    return `${data.rag_indexing.domains.length} RAG indexing domain(s)`;
  });

  await runCheck("Batch RAG index completes", async () => {
    const { response, data } = await requestJson(`${aiUrl}/rag/index`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        domains: ["documents", "emails", "cases", "tasks"],
        limit: 100,
      }),
      timeoutMs,
    });
    assert(response.ok, `Expected RAG index success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Number(data?.total_indexed || 0) > 0, `Expected at least one indexed record: ${JSON.stringify(data)}`);
    assert(!data?.errors || Object.keys(data.errors).length === 0, `Expected no indexing errors: ${JSON.stringify(data.errors)}`);
    return `${data.total_indexed} record(s) indexed across ${data.domains.length} domain(s)`;
  });

  await runCheck("RAG index status reports counts", async () => {
    const { response, data } = await requestJson(`${aiUrl}/rag/index/status`, { method: "GET", headers });
    assert(response.ok, `Expected RAG status success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Number(data?.total || 0) > 0, "Expected indexed embedding count");
    const indexedTypes = Object.entries(data.counts || {}).filter(([, count]) => Number(count) > 0);
    assert(indexedTypes.length > 0, "Expected at least one indexed entity type");
    return `${data.total} total indexed embedding(s)`;
  });

  await runCheck("Semantic search retrieves indexed knowledge", async () => {
    probe = await findSearchProbe(headers);
    assert(probe, "Could not find a seeded task/case/document/email probe record");
    const url = `${aiUrl}/search/semantic?query=${encodeURIComponent(probe.query)}&entity_type=${encodeURIComponent(probe.entityType)}&limit=5`;
    const { response, data } = await requestJson(url, { method: "POST", headers, timeoutMs: 60000 });
    assert(response.ok, `Expected semantic search success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data?.results), "Expected semantic search results array");
    assert(data.results.length > 0, `Expected semantic results for ${probe.entityType}: ${probe.query}`);
    return `${data.results.length} ${probe.entityType} result(s) for "${probe.query.slice(0, 50)}"`;
  });

  await runCheck("RAG index audit event is recorded", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/audit?limit=20&event_type=rag_index_completed`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected audit success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Array.isArray(data?.events), "Expected audit events array");
    assert(data.events.length > 0, "Expected rag_index_completed audit event");
    return `${data.events.length} RAG indexing audit event(s)`;
  });

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 9 AI RAG indexing evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 9 AI RAG indexing eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
