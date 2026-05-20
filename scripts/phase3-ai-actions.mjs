const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_ACTION_EVAL_EMAIL || process.env.CRM_EVAL_EMAIL || process.env.CRM_QA_EMAIL || "john@example.com";
const password = process.env.CRM_ACTION_EVAL_PASSWORD || process.env.CRM_EVAL_PASSWORD || process.env.CRM_QA_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_ACTION_EVAL_WORKSPACE || process.env.CRM_EVAL_WORKSPACE || process.env.CRM_QA_WORKSPACE || "";
const timeoutMs = Number(process.env.CRM_ACTION_EVAL_TIMEOUT_MS || process.env.CRM_EVAL_TIMEOUT_MS || 45000);

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
  for (const task of tasks || []) {
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
      // Cleanup is best effort; the eval should not fail after writeback has succeeded.
    }
  }
}

async function main() {
  console.log("Running Phase 3 AI action evals...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);
  console.log(`User: ${email}${workspaceSlug ? ` / workspace ${workspaceSlug}` : ""}`);
  console.log("");

  const loginData = await login();
  const headers = authHeaders(loginData.accessToken);

  let firstDeal = null;
  const { response: dealsResponse, data: dealsData } = await requestJson(`${backendUrl}/api/v1/deals?page=0&size=1&sort=value,desc`, {
    method: "GET",
    headers,
  });
  if (dealsResponse.ok && Array.isArray(dealsData?.content) && dealsData.content.length > 0) {
    firstDeal = dealsData.content[0];
  }

  await runCheck("Expanded safe action capabilities", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/capabilities`, {
      method: "GET",
      headers,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}: ${JSON.stringify(data)}`);
    const actionTypes = new Set((data?.actions?.supported_actions || []).map((action) => action.type));
    for (const expected of ["create_task", "create_followup_sequence", "draft_email", "draft_proposal_email", "update_deal_stage"]) {
      assert(actionTypes.has(expected), `Missing supported action ${expected}`);
    }
    return `Capabilities expose ${actionTypes.size} action types`;
  });

  await runCheck("Unconfirmed action execution is blocked", async () => {
    const proposal = await propose(headers, {
      intent: "Create a QA validation task but do not confirm it",
      action_type: "create_task",
      payload: {
        title: "Unconfirmed QA validation task",
        description: "This should not execute",
        priority: "LOW",
      },
    });
    const { response } = await execute(headers, proposal, false);
    assert(response.status === 400, `Expected 400 for unconfirmed action, got ${response.status}`);
    return "Execution rejected without explicit confirmation";
  });

  await runCheck("Create follow-up sequence execution", async () => {
    const proposal = await propose(headers, {
      intent: "Create a two-step QA follow-up sequence",
      action_type: "create_followup_sequence",
      payload: {
        description: "Phase 3 AI action eval sequence",
        steps: [
          { title: "Phase 3 eval first follow-up", daysFromNow: 1, priority: "LOW" },
          { title: "Phase 3 eval second follow-up", daysFromNow: 2, priority: "LOW" },
        ],
      },
    });
    assert(proposal.can_execute === true, "Expected follow-up sequence to be executable");
    const { response, data } = await execute(headers, proposal, true);
    assert(response.ok, `Expected sequence execution success, got ${response.status}: ${JSON.stringify(data)}`);
    assert(data?.success === true, `Expected success=true, got ${JSON.stringify(data)}`);
    assert(data?.result?.createdCount === 2, `Expected 2 created tasks, got ${JSON.stringify(data)}`);
    await cleanupTasks(headers, data.result.tasks);
    return "Created and cleaned up two follow-up tasks";
  });

  await runCheck("Draft proposal email proposal", async () => {
    const proposal = await propose(headers, {
      intent: "Draft a proposal email for the top opportunity",
      action_type: "draft_proposal_email",
      entity_type: firstDeal ? "deal" : undefined,
      entity_id: firstDeal?.id,
      payload: {
        toEmail: "qa-proposal@example.com",
        fromEmail: email,
        companyName: firstDeal?.companyName || firstDeal?.company || "QA Account",
        value: firstDeal?.value,
      },
    });
    assert(proposal.can_execute === true, "Expected proposal email draft to be executable");
    assert(proposal.payload?.isDraft === true, "Expected proposal email to remain a draft");
    assert(proposal.payload?.isSent === false, "Expected proposal email not to be sent");
    return `Prepared draft proposal email to ${proposal.payload.toEmail}`;
  });

  if (!firstDeal?.id) {
    record("Deal stage update proposal", "skip", "No deal available for stage proposal");
  } else {
    await runCheck("Deal stage update proposal", async () => {
      const proposal = await propose(headers, {
        intent: "Move this deal to proposal stage after review",
        action_type: "update_deal_stage",
        entity_type: "deal",
        entity_id: firstDeal.id,
        payload: {
          stage: "PROPOSAL",
          reason: "Phase 3 action eval proposal only",
        },
      });
      assert(proposal.can_execute === true, "Expected deal stage action to be executable");
      assert(proposal.payload?.dealId === firstDeal.id, "Expected proposal payload to include target deal id");
      assert(proposal.payload?.stage === "PROPOSAL", `Expected normalized stage PROPOSAL, got ${proposal.payload?.stage}`);
      return `Prepared stage proposal for ${firstDeal.name || firstDeal.id}`;
    });
  }

  await runCheck("Action audit summary updated", async () => {
    const { response, data } = await requestJson(`${aiUrl}/governance/summary?limit=100`, {
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
  console.log(`Phase 3 AI action evals completed: ${passed} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Phase 3 AI action eval runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
