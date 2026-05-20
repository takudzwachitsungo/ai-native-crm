const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_EVAL_EMAIL || process.env.CRM_QA_EMAIL || process.env.CRM_SMOKE_EMAIL || "john@example.com";
const password = process.env.CRM_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || process.env.CRM_SMOKE_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || process.env.CRM_SMOKE_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_EVAL_TIMEOUT_MS || process.env.CRM_QA_TIMEOUT_MS || 45000);

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

async function runEval(name, fn) {
  try {
    const detail = await fn();
    record(name, "pass", detail);
  } catch (error) {
    record(name, "fail", error instanceof Error ? error.message : String(error));
  }
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function textContains(text, value) {
  const normalizedValue = normalize(value);
  return normalizedValue.length > 0 && normalize(text).includes(normalizedValue);
}

function currency(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function dealValue(deal) {
  return currency(deal?.value ?? deal?.amount);
}

function dealName(deal) {
  return deal?.name || deal?.title || deal?.dealName || "";
}

function dealOwner(deal) {
  return deal?.ownerName || deal?.owner || deal?.assignedToName || "";
}

function hasNumberedList(text) {
  return /^\s*1\.\s+/m.test(text);
}

function getToolNames(data) {
  return (data?.tool_calls || data?.toolCalls || [])
    .map((toolCall) => toolCall?.tool || toolCall?.name)
    .filter(Boolean);
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
  assert(data?.userId, "Missing userId");
  return data;
}

async function getAllPages(url, headers, maxPages = 10) {
  const items = [];
  for (let page = 0; page < maxPages; page += 1) {
    const separator = url.includes("?") ? "&" : "?";
    const { response, data } = await requestJson(`${url}${separator}page=${page}&size=100`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected 200 from ${url}, got ${response.status}: ${JSON.stringify(data)}`);
    const pageItems = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    items.push(...pageItems);
    if (!data?.content || data.last === true || pageItems.length < 100) {
      break;
    }
  }
  return items;
}

async function chat({ token, userId, conversationId, content, context = {} }) {
  const { response, data } = await requestJson(`${aiUrl}/chat`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      conversation_id: conversationId,
      user_id: userId,
      messages: [{ role: "user", content }],
      context: {
        page: "phase2-ai-evals",
        ...context,
      },
    }),
  });
  assert(response.ok, `Expected 200 from AI chat, got ${response.status}: ${JSON.stringify(data)}`);
  assert(typeof data?.message === "string" && data.message.trim().length > 0, "Expected non-empty assistant response");
  return data;
}

function summarizeBestRep(deals) {
  const totals = new Map();
  for (const deal of deals) {
    const owner = dealOwner(deal);
    if (!owner) {
      continue;
    }
    const wonValue = String(deal.stage || "").toUpperCase() === "CLOSED_WON" ? dealValue(deal) : 0;
    const current = totals.get(owner) || { owner, wonValue: 0, totalValue: 0, dealCount: 0 };
    current.wonValue += wonValue;
    current.totalValue += dealValue(deal);
    current.dealCount += 1;
    totals.set(owner, current);
  }
  return [...totals.values()].sort((a, b) => {
    if (b.wonValue !== a.wonValue) {
      return b.wonValue - a.wonValue;
    }
    if (b.totalValue !== a.totalValue) {
      return b.totalValue - a.totalValue;
    }
    return b.dealCount - a.dealCount;
  })[0];
}

async function main() {
  console.log("Running Phase 2 AI quality evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  await runEval("Backend health", async () => {
    const { response, data } = await requestJson(`${backendUrl}/actuator/health`);
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data?.status === "UP", `Expected status UP, got ${JSON.stringify(data)}`);
    return "Backend is healthy";
  });

  await runEval("AI health", async () => {
    const { response, data } = await requestJson(`${aiUrl}/health`);
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data?.status === "healthy", `Expected healthy AI service, got ${JSON.stringify(data)}`);
    return "AI service is healthy";
  });

  const loginData = await login();
  const token = loginData.accessToken;
  const userId = loginData.userId;
  const headers = authHeaders(token);

  const deals = await getAllPages(`${backendUrl}/api/v1/deals?sort=value,desc`, headers);
  const leads = await getAllPages(`${backendUrl}/api/v1/leads`, headers);
  const topDeals = [...deals].sort((a, b) => dealValue(b) - dealValue(a)).filter((deal) => dealName(deal)).slice(0, 3);
  const bestRep = summarizeBestRep(deals);

  if (topDeals.length === 0) {
    record("Top deals grounding", "skip", "No named deals available in this workspace");
  } else {
    await runEval("Top deals grounding", async () => {
      const data = await chat({
        token,
        userId,
        conversationId: `phase2-top-deals:${Date.now()}`,
        content: "Show me my top deals ranked by value. Use a numbered list and include owner, stage, and value.",
        context: { tenant_id: loginData.tenantId },
      });
      const toolNames = getToolNames(data);
      assert(toolNames.includes("search_deals"), `Expected search_deals tool call, got ${toolNames.join(", ") || "none"}`);
      assert(hasNumberedList(data.message), `Expected numbered list formatting, got: ${data.message}`);
      const mentioned = topDeals.filter((deal) => textContains(data.message, dealName(deal)));
      assert(mentioned.length >= 1, `Expected at least one real top deal name (${topDeals.map(dealName).join(", ")}), got: ${data.message}`);
      assert(!/i don't have (any|that) data|no data to work/i.test(data.message), `Assistant claimed missing data despite ${deals.length} deals`);
      return `Mentioned ${mentioned.map(dealName).join(", ")} from ${topDeals.length} expected top deals`;
    });
  }

  if (!bestRep?.owner) {
    record("Sales rep performance grounding", "skip", "No deal owners available in this workspace");
  } else {
    await runEval("Sales rep performance grounding", async () => {
      const data = await chat({
        token,
        userId,
        conversationId: `phase2-best-reps:${Date.now()}`,
        content: "Who are my best performing sales reps? Rank them using real deal data and explain the basis.",
        context: { tenant_id: loginData.tenantId },
      });
      const toolNames = getToolNames(data);
      assert(toolNames.includes("search_deals"), `Expected search_deals tool call, got ${toolNames.join(", ") || "none"}`);
      assert(hasNumberedList(data.message), `Expected numbered ranking, got: ${data.message}`);
      assert(textContains(data.message, bestRep.owner), `Expected top rep ${bestRep.owner} in response, got: ${data.message}`);
      return `Grounded response includes top expected rep ${bestRep.owner}`;
    });
  }

  if (leads.length === 0) {
    record("Lead lifecycle grounding", "skip", "No leads available in this workspace");
  } else {
    await runEval("Lead lifecycle grounding", async () => {
      const statusCounts = new Map();
      for (const lead of leads) {
        const status = lead.status || "UNKNOWN";
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      }
      const [largestStatus] = [...statusCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      const data = await chat({
        token,
        userId,
        conversationId: `phase2-leads:${Date.now()}`,
        content: "Summarize my leads by status and call out what needs attention.",
        context: { tenant_id: loginData.tenantId },
      });
      const toolNames = getToolNames(data);
      assert(toolNames.includes("search_leads"), `Expected search_leads tool call, got ${toolNames.join(", ") || "none"}`);
      assert(textContains(data.message, largestStatus), `Expected dominant lead status ${largestStatus}, got: ${data.message}`);
      return `Grounded response includes lead status ${largestStatus}`;
    });
  }

  if (topDeals.length > 0) {
    await runEval("Follow-up context retention", async () => {
      const conversationId = `phase2-follow-up:${Date.now()}`;
      await chat({
        token,
        userId,
        conversationId,
        content: "Show me my top deal and who owns it.",
        context: { tenant_id: loginData.tenantId },
      });
      const data = await chat({
        token,
        userId,
        conversationId,
        content: "What should we do next on that deal?",
        context: { tenant_id: loginData.tenantId },
      });
      const expected = topDeals[0];
      const hasDealName = textContains(data.message, dealName(expected));
      const hasOwnerName = textContains(data.message, dealOwner(expected));
      assert(hasDealName || hasOwnerName, `Expected follow-up to retain top deal context (${dealName(expected)} / ${dealOwner(expected)}), got: ${data.message}`);
      return `Follow-up retained context for ${dealName(expected)}`;
    });
  }

  await runEval("Governance audit captures eval activity", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/summary?limit=100`, {
      headers,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Number(data?.total_events || 0) > 0, "Expected AI audit events after eval chats");
    assert(Number(data?.tool_call_count || 0) > 0, "Expected tool_call_count after grounded eval chats");
    return `${data.total_events} events and ${data.tool_call_count} tool calls in recent audit window`;
  });

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 2 AI evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 2 AI eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
