const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_DOMAIN_ACTION_EVAL_EMAIL || process.env.CRM_DOMAIN_EVAL_EMAIL || process.env.CRM_ACTION_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_DOMAIN_ACTION_EVAL_PASSWORD || process.env.CRM_DOMAIN_EVAL_PASSWORD || process.env.CRM_ACTION_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_DOMAIN_ACTION_EVAL_WORKSPACE || process.env.CRM_DOMAIN_EVAL_WORKSPACE || process.env.CRM_ACTION_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_DOMAIN_ACTION_EVAL_TIMEOUT_MS || process.env.CRM_DOMAIN_EVAL_TIMEOUT_MS || process.env.CRM_ACTION_EVAL_TIMEOUT_MS || 45000);

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

async function propose(headers, payload) {
  const { response, data } = await requestJson(`${aiUrl}/actions/propose`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  assert(response.ok, `Expected proposal success, got ${response.status}: ${JSON.stringify(data)}`);
  assert(data?.proposal_id, "Missing proposal id");
  assert(data?.can_execute === true, `Expected executable proposal, got ${JSON.stringify(data)}`);
  return data;
}

async function execute(headers, proposal, confirmed = true) {
  const { response, data } = await requestJson(`${aiUrl}/actions/execute`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      proposal_id: proposal.proposal_id,
      action_type: proposal.action_type,
      payload: proposal.payload,
      confirmed,
    }),
  });
  return { response, data };
}

async function cleanupTasks(headers, tasks) {
  const taskList = Array.isArray(tasks) ? tasks : tasks ? [tasks] : [];
  for (const task of taskList) {
    if (!task?.id) {
      continue;
    }
    try {
      await requestJson(`${backendUrl}/api/v1/tasks/${task.id}`, {
        method: "DELETE",
        headers,
        timeoutMs: 10000,
      });
    } catch {
      // Best effort cleanup.
    }
  }
}

async function main() {
  console.log("Running Phase 5 AI domain action evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);

  await runCheck("Domain safe action capabilities", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/capabilities`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
    const actionTypes = new Set((data?.actions?.supported_actions || []).map((action) => action.type));
    for (const expected of [
      "create_case_followup_task",
      "draft_case_response_email",
      "create_campaign_followup_sequence",
      "draft_contract_renewal_email",
      "create_work_order_followup_task",
      "create_revenue_ops_review_task",
    ]) {
      assert(actionTypes.has(expected), `Missing supported domain action ${expected}`);
    }
    return `Capabilities expose ${actionTypes.size} action types`;
  });

  await runCheck("Unconfirmed domain action execution is blocked", async () => {
    const proposal = await propose(headers, {
      intent: "Create a support case follow-up task but do not confirm it",
      action_type: "create_case_followup_task",
      entity_type: "case",
      payload: {
        title: "Unconfirmed support case follow-up",
        priority: "LOW",
      },
    });
    const { response } = await execute(headers, proposal, false);
    assert(response.status === 400, `Expected 400 for unconfirmed action, got ${response.status}`);
    return "Execution rejected without explicit confirmation";
  });

  await runCheck("Create support case follow-up task", async () => {
    const proposal = await propose(headers, {
      intent: "Create a support case follow-up task for SLA review",
      action_type: "create_case_followup_task",
      entity_type: "case",
      payload: {
        title: "Phase 5 eval support case SLA review",
        description: "Created by Phase 5 AI domain action eval",
        priority: "LOW",
      },
    });
    const { response, data } = await execute(headers, proposal, true);
    assert(response.ok, `Expected task creation success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.success === true, `Expected success=true, got ${JSON.stringify(data)}`);
    await cleanupTasks(headers, data.result);
    return "Created and cleaned up support case follow-up task";
  });

  await runCheck("Create campaign follow-up sequence", async () => {
    const proposal = await propose(headers, {
      intent: "Create a two-step campaign nurture follow-up cadence",
      action_type: "create_campaign_followup_sequence",
      entity_type: "campaign",
      payload: {
        description: "Phase 5 campaign sequence eval",
        steps: [
          { title: "Phase 5 campaign first touch", daysFromNow: 1, priority: "LOW" },
          { title: "Phase 5 campaign second touch", daysFromNow: 3, priority: "LOW" },
        ],
      },
    });
    const { response, data } = await execute(headers, proposal, true);
    assert(response.ok, `Expected sequence execution success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.result?.createdCount === 2, `Expected 2 tasks, got ${JSON.stringify(data)}`);
    await cleanupTasks(headers, data.result.tasks);
    return "Created and cleaned up campaign follow-up sequence";
  });

  await runCheck("Draft support case response email", async () => {
    const proposal = await propose(headers, {
      intent: "Draft a support case response update for the customer",
      action_type: "draft_case_response_email",
      entity_type: "case",
      payload: {
        toEmail: "qa-case@example.com",
        fromEmail: email,
        caseNumber: "QA-CASE",
      },
    });
    assert(proposal.payload?.isDraft === true, "Expected case response to remain a draft");
    assert(proposal.payload?.isSent === false, "Expected case response not to be sent");
    return `Prepared support response draft to ${proposal.payload.toEmail}`;
  });

  await runCheck("Draft contract renewal email", async () => {
    const proposal = await propose(headers, {
      intent: "Draft a contract renewal email for the customer",
      action_type: "draft_contract_renewal_email",
      entity_type: "contract",
      payload: {
        toEmail: "qa-renewal@example.com",
        fromEmail: email,
        contractNumber: "QA-CONTRACT",
      },
    });
    assert(proposal.payload?.isDraft === true, "Expected renewal email to remain a draft");
    assert(proposal.payload?.isSent === false, "Expected renewal email not to be sent");
    return `Prepared renewal draft to ${proposal.payload.toEmail}`;
  });

  await runCheck("Create work-order follow-up task", async () => {
    const proposal = await propose(headers, {
      intent: "Create a field service work-order follow-up task",
      action_type: "create_work_order_followup_task",
      entity_type: "work_order",
      payload: {
        title: "Phase 5 eval work-order follow-up",
        priority: "LOW",
      },
    });
    const { response, data } = await execute(headers, proposal, true);
    assert(response.ok, `Expected work-order task success, got ${response.status}: ${JSON.stringify(data)}`);
    await cleanupTasks(headers, data.result);
    return "Created and cleaned up work-order follow-up task";
  });

  await runCheck("Create revenue-ops review task", async () => {
    const proposal = await propose(headers, {
      intent: "Create a revenue ops quota review task",
      action_type: "create_revenue_ops_review_task",
      entity_type: "revenue_ops",
      payload: {
        title: "Phase 5 eval revenue ops review",
        priority: "LOW",
      },
    });
    const { response, data } = await execute(headers, proposal, true);
    assert(response.ok, `Expected revenue-ops task success, got ${response.status}: ${JSON.stringify(data)}`);
    await cleanupTasks(headers, data.result);
    return "Created and cleaned up revenue-ops review task";
  });

  await runCheck("Domain action audit summary updated", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/summary?limit=120`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected summary success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(Number(data?.by_type?.action_proposed || 0) > 0, "Expected action_proposed events");
    assert(Number(data?.by_type?.action_executed || 0) > 0, "Expected action_executed events");
    return `${data.by_type.action_proposed || 0} proposals and ${data.by_type.action_executed || 0} executions in recent audit window`;
  });

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");
  const passed = results.length - failed.length - skipped.length;

  console.log("");
  console.log(`Phase 5 AI domain action evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 5 AI domain action eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
