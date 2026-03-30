const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_SMOKE_EMAIL || "john@example.com";
const password = process.env.CRM_SMOKE_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_SMOKE_WORKSPACE || "";
const skipAi = /^(1|true|yes)$/i.test(process.env.CRM_SMOKE_SKIP_AI || "");
const timeoutMs = Number(process.env.CRM_SMOKE_TIMEOUT_MS || 20000);

const results = [];

function createTimeoutSignal(ms) {
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
  const { signal, dispose } = createTimeoutSignal(timeoutMs);
  try {
    const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        ...(options.headers || {}),
        ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
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
    return true;
  } catch (error) {
    record(name, "fail", error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function main() {
  console.log("Running CRM smoke checks...");
  console.log(`Backend: ${backendUrl}`);
  console.log(`AI: ${aiUrl}`);

  const backendHealthy = await runCheck("Backend health", async () => {
    const { response, data } = await requestJson(`${backendUrl}/actuator/health`, {
      method: "GET",
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data && data.status === "UP", `Expected status UP, got ${JSON.stringify(data)}`);
    return "Spring Boot actuator reports UP";
  });

  if (!backendHealthy) {
    throw new Error("Backend is not healthy; stopping smoke run.");
  }

  let aiHealthy = false;
  if (skipAi) {
    record("AI health", "skip", "Skipped by CRM_SMOKE_SKIP_AI");
  } else {
    aiHealthy = await runCheck("AI health", async () => {
      const { response, data } = await requestJson(`${aiUrl}/health`, {
        method: "GET",
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}`);
      assert(data && data.status === "healthy", `Expected healthy AI service, got ${JSON.stringify(data)}`);
      return "FastAPI AI service reports healthy";
    });
  }

  let accessToken = "";
  let userId = "";
  let userRole = "";
  let createdLeadId = null;
  let createdTaskId = null;
  let originalLeadWorkflow = null;
  let originalDealRescueWorkflow = null;
  let originalQuotaRiskWorkflow = null;
  let originalDealApprovalWorkflow = null;
  let originalGovernanceOpsWorkflow = null;
  let originalTerritoryEscalationWorkflow = null;
  let createdWorkflowLeadId = null;
  let createdWorkflowTaskId = null;
  let createdDealWorkflowDealId = null;
  let createdDealWorkflowTaskId = null;
  let createdTerritoryLeadId = null;
  let createdTerritoryTaskId = null;
  let createdTerritoryCompanyId = null;
  let createdTerritoryDealId = null;
  let createdTerritoryDealTaskId = null;
  let createdTerritoryRescueTaskId = null;
  let createdRoutingTerritoryId = null;
  let createdGovernanceTerritoryId = null;
  let createdGovernanceUserId = null;
  let governanceTerritory = null;
  const createdQuotaRiskTaskIds = [];
  const createdGovernanceDigestTaskIds = [];
  const createdGovernanceOverdueTaskIds = [];
  const createdGovernanceEscalationTaskIds = [];
  let createdExceptionLeadId = null;
  const createdTerritoryExceptionTaskIds = [];
  let createdEscalationLeadId = null;
  let createdEscalationCompanyId = null;
  let createdEscalationDealId = null;
  const createdTerritoryEscalationTaskIds = [];
  let createdDealId = null;
  let createdDealTaskId = null;
  let createdAccountDealId = null;
  let createdAccountDealTaskId = null;
  let createdAutomationDealId = null;
  let createdApprovalDealId = null;
  let createdApprovalTaskId = null;
  const createdAutomationTaskIds = [];
  let originalRevenueOps = null;
  let routingTerritory = null;
  let insightsCompanyId = null;
  let insightsPrimaryContactId = null;
  const createdContactIds = [];
  const createdCompanyIds = [];
  await runCheck("Login", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/auth/login`, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        ...(workspaceSlug ? { workspaceSlug } : {}),
      }),
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data && typeof data.accessToken === "string" && data.accessToken.length > 0, "Missing accessToken");
    assert(data && typeof data.userId === "string" && data.userId.length > 0, "Missing userId");
    assert(data && typeof data.tenantId === "string" && data.tenantId.length > 0, "Missing tenantId");
    assert(data && typeof data.tenantName === "string" && data.tenantName.length > 0, "Missing tenantName");
    assert(data && typeof data.tenantSlug === "string" && data.tenantSlug.length > 0, "Missing tenantSlug");
    assert(data && typeof data.tenantTier === "string" && data.tenantTier.length > 0, "Missing tenantTier");
    assert(data && typeof data.role === "string" && data.role.length > 0, "Missing role");
    accessToken = data.accessToken;
    userId = data.userId;
    userRole = data.role;
    return `Authenticated as ${data.email || email} in ${data.tenantName} [${data.tenantSlug}] (${data.tenantTier})`;
  });

  if (!accessToken) {
    throw new Error("Login failed; stopping smoke run.");
  }

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
  };

  let firstLeadId = null;

  await runCheck("Leads list", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/leads?size=5`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data && Array.isArray(data.content), "Expected paginated leads response");
    if (data.content.length > 0) {
      firstLeadId = data.content[0].id;
    }
    return `Fetched ${data.content.length} leads from the first page`;
  });

  await runCheck("Lead routing and nurture", async () => {
    const uniqueSuffix = Date.now();
    const { response, data } = await requestJson(`${backendUrl}/api/v1/leads`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Smoke",
        lastName: `Lead${uniqueSuffix}`,
        email: `smoke.lead.${uniqueSuffix}@example.com`,
        phone: "+263771000000",
        company: "Smoke CRM",
        title: "Head of Revenue",
        source: "REFERRAL",
        estimatedValue: 75000,
        notes: "Smoke test lead",
      }),
    });
    assert(response.status === 201, `Expected 201 Created, got ${response.status}`);
    assert(data && typeof data.id === "string" && data.id.length > 0, "Expected lead id");
    assert(typeof data.score === "number" && data.score > 0, "Expected lead score to be assigned");
    assert(typeof data.ownerId === "string" && data.ownerId.length > 0, "Expected lead owner to be assigned");

    createdLeadId = data.id;

    const { response: taskResponse, data: taskData } = await requestJson(
      `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=lead&relatedEntityId=${createdLeadId}`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(taskResponse.ok, `Expected 200 OK for task lookup, got ${taskResponse.status}`);
    assert(taskData && Array.isArray(taskData.content), "Expected paginated task response");

    const nurtureTask = taskData.content.find((task) => task.relatedEntityId === createdLeadId);
    assert(nurtureTask, "Expected follow-up task for created lead");
    createdTaskId = nurtureTask.id;

    return `Lead auto-scored at ${data.score} and routed to ${data.ownerId}`;
  });

  await runCheck("Deals list", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/deals?size=5`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data && Array.isArray(data.content), "Expected paginated deals response");
    return `Fetched ${data.content.length} deals from the first page`;
  });

  await runCheck("Deal collaboration and next step", async () => {
    const { response: companiesResponse, data: companiesData } = await requestJson(`${backendUrl}/api/v1/companies?size=1`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(companiesResponse.ok, `Expected 200 OK for companies, got ${companiesResponse.status}`);
    assert(companiesData?.content?.length > 0, "Expected at least one company to create a deal");
    const companyId = companiesData.content[0].id;

    const { response: contactsResponse, data: contactsData } = await requestJson(`${backendUrl}/api/v1/contacts?size=1&companyId=${companyId}`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(contactsResponse.ok, `Expected 200 OK for contacts, got ${contactsResponse.status}`);
    const contactId = contactsData?.content?.[0]?.id;

    const uniqueSuffix = Date.now();
    const { response, data } = await requestJson(`${backendUrl}/api/v1/deals`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Smoke Collaboration Deal ${uniqueSuffix}`,
        companyId,
        contactId: contactId || null,
        value: 62000,
        stage: "NEGOTIATION",
        probability: 55,
        expectedCloseDate: "2026-04-15",
        dealType: "NEW_BUSINESS",
        leadSource: "REFERRAL",
        competitorName: "Legacy CRM Suite",
        nextStep: "Schedule commercial review with finance and procurement",
        nextStepDueDate: "2026-03-29",
        buyingCommitteeSummary: "Champion in RevOps, procurement needs security approval.",
        notes: "Smoke collaboration flow",
      }),
    });
    assert(response.status === 201, `Expected 201 Created, got ${response.status}`);
    assert(data && typeof data.id === "string" && data.id.length > 0, "Expected created deal id");
    assert(data.competitorName === "Legacy CRM Suite", "Expected competitor name to persist");
    assert(data.nextStep && data.nextStep.includes("commercial review"), "Expected next step to persist");
    createdDealId = data.id;

    const { response: taskResponse, data: taskData } = await requestJson(
      `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=deal&relatedEntityId=${createdDealId}`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(taskResponse.ok, `Expected 200 OK for deal task lookup, got ${taskResponse.status}`);
    assert(taskData && Array.isArray(taskData.content), "Expected paginated task response for deal");
    const nextStepTask = taskData.content.find((task) => task.relatedEntityId === createdDealId);
    assert(nextStepTask, "Expected next-step task for created deal");
    createdDealTaskId = nextStepTask.id;

    return `Created deal with competitor ${data.competitorName} and next-step task ${createdDealTaskId}`;
  });

  await runCheck("Account hierarchy and stakeholders", async () => {
    const uniqueSuffix = Date.now();

    const { response: parentResponse, data: parentData } = await requestJson(`${backendUrl}/api/v1/companies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Smoke Parent ${uniqueSuffix}`,
        email: `parent.${uniqueSuffix}@example.com`,
        industry: "TECHNOLOGY",
        status: "ACTIVE",
      }),
    });
    assert(parentResponse.status === 201, `Expected 201 Created for parent company, got ${parentResponse.status}`);
    assert(parentData && typeof parentData.id === "string", "Expected parent company id");
    createdCompanyIds.push(parentData.id);

    const { response: childResponse, data: childData } = await requestJson(`${backendUrl}/api/v1/companies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Smoke Subsidiary ${uniqueSuffix}`,
        email: `child.${uniqueSuffix}@example.com`,
        industry: "TECHNOLOGY",
        status: "PROSPECT",
        parentCompanyId: parentData.id,
      }),
    });
    assert(childResponse.status === 201, `Expected 201 Created for child company, got ${childResponse.status}`);
    assert(childData && childData.parentCompanyId === parentData.id, "Expected child company to reference parent account");
    createdCompanyIds.push(childData.id);

    const { response: managerResponse, data: managerData } = await requestJson(`${backendUrl}/api/v1/contacts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Smoke",
        lastName: `Manager${uniqueSuffix}`,
        email: `manager.${uniqueSuffix}@example.com`,
        companyId: childData.id,
        title: "VP Technology",
        department: "Technology",
        stakeholderRole: "EXECUTIVE_SPONSOR",
        influenceLevel: "HIGH",
        preferredContactMethod: "EMAIL",
        isPrimary: true,
        status: "ACTIVE",
      }),
    });
    assert(managerResponse.status === 201, `Expected 201 Created for manager contact, got ${managerResponse.status}`);
    assert(managerData && managerData.isPrimary === true, "Expected primary stakeholder contact");
    createdContactIds.push(managerData.id);

    const { response: stakeholderResponse, data: stakeholderData } = await requestJson(`${backendUrl}/api/v1/contacts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Smoke",
        lastName: `Stakeholder${uniqueSuffix}`,
        email: `stakeholder.${uniqueSuffix}@example.com`,
        companyId: childData.id,
        title: "Procurement Lead",
        department: "Procurement",
        stakeholderRole: "DECISION_MAKER",
        influenceLevel: "HIGH",
        preferredContactMethod: "PHONE",
        reportsToId: managerData.id,
        status: "ACTIVE",
      }),
    });
    assert(stakeholderResponse.status === 201, `Expected 201 Created for stakeholder contact, got ${stakeholderResponse.status}`);
    assert(stakeholderData && stakeholderData.reportsToId === managerData.id, "Expected stakeholder contact to link to manager");
    assert(stakeholderData.companyId === childData.id, "Expected stakeholder contact to belong to child company");
    createdContactIds.push(stakeholderData.id);
    insightsCompanyId = childData.id;
    insightsPrimaryContactId = managerData.id;

    return `Created hierarchy ${parentData.name} -> ${childData.name} and stakeholder ${stakeholderData.firstName} ${stakeholderData.lastName}`;
  });

  await runCheck("Account intelligence", async () => {
    assert(insightsCompanyId, "Expected hierarchy check to create a company for account intelligence");

    const uniqueSuffix = Date.now();
    const { response: dealResponse, data: dealData } = await requestJson(`${backendUrl}/api/v1/deals`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Smoke Account Deal ${uniqueSuffix}`,
        companyId: insightsCompanyId,
        contactId: insightsPrimaryContactId || null,
        value: 91000,
        stage: "NEGOTIATION",
        probability: 65,
        expectedCloseDate: "2026-04-18",
        dealType: "EXISTING_BUSINESS",
        leadSource: "REFERRAL",
        competitorName: "Status Quo CRM",
        nextStep: "Confirm executive review and procurement timeline",
        nextStepDueDate: "2026-03-31",
        buyingCommitteeSummary: "Executive sponsor aligned, procurement and finance still need validation.",
      }),
    });
    assert(dealResponse.status === 201, `Expected 201 Created for account deal, got ${dealResponse.status}`);
    assert(dealData && typeof dealData.id === "string", "Expected account deal id");
    createdAccountDealId = dealData.id;

    const { response: dealTaskResponse, data: dealTaskData } = await requestJson(
      `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=deal&relatedEntityId=${createdAccountDealId}`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(dealTaskResponse.ok, `Expected 200 OK for account deal task lookup, got ${dealTaskResponse.status}`);
    assert(dealTaskData && Array.isArray(dealTaskData.content), "Expected paginated task response for account deal");
    const generatedTask = dealTaskData.content.find((task) => task.relatedEntityId === createdAccountDealId);
    assert(generatedTask, "Expected generated task for account deal");
    createdAccountDealTaskId = generatedTask.id;

    const { response: insightsResponse, data: insightsData } = await requestJson(
      `${backendUrl}/api/v1/companies/${insightsCompanyId}/insights`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(insightsResponse.ok, `Expected 200 OK for company insights, got ${insightsResponse.status}`);
    assert(insightsData && insightsData.companyId === insightsCompanyId, "Expected matching company insights payload");
    assert(insightsData.primaryStakeholders >= 1, "Expected at least one primary stakeholder in insights");
    assert(insightsData.decisionMakers >= 1, "Expected at least one decision maker in insights");
    assert(insightsData.activeDeals >= 1, "Expected active deals in account insights");
    assert(insightsData.openTasks >= 1, "Expected open tasks in account insights");
    assert(Array.isArray(insightsData.opportunities) && insightsData.opportunities.length >= 1, "Expected opportunity watchlist in account insights");
    assert(Array.isArray(insightsData.recommendedActions) && insightsData.recommendedActions.length >= 1, "Expected recommended actions in account insights");

    return `Health ${insightsData.healthScore} with ${insightsData.activeDeals} active deals and ${insightsData.stakeholderCoveragePercent}% coverage`;
  });

  await runCheck("Stalled deal automation", async () => {
    assert(insightsCompanyId, "Expected hierarchy check to create a company for stalled automation");

    const uniqueSuffix = Date.now();
    const { response: dealResponse, data: dealData } = await requestJson(`${backendUrl}/api/v1/deals`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Smoke Rescue Deal ${uniqueSuffix}`,
        companyId: insightsCompanyId,
        contactId: insightsPrimaryContactId || null,
        value: 48000,
        stage: "NEGOTIATION",
        probability: 35,
        expectedCloseDate: "2026-03-20",
        dealType: "NEW_BUSINESS",
        leadSource: "REFERRAL",
        competitorName: "Spreadsheet CRM",
        nextStep: "Recover the champion and reset procurement review",
        nextStepDueDate: "2026-03-22",
        buyingCommitteeSummary: "Champion is quiet and procurement has paused the timeline.",
      }),
    });
    assert(dealResponse.status === 201, `Expected 201 Created for rescue deal, got ${dealResponse.status}`);
    assert(dealData && typeof dealData.id === "string", "Expected rescue deal id");
    createdAutomationDealId = dealData.id;

    const { response: summaryResponse, data: summaryData } = await requestJson(`${backendUrl}/api/v1/deals/attention-summary`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(summaryResponse.ok, `Expected 200 OK for attention summary, got ${summaryResponse.status}`);
    assert(summaryData && summaryData.dealsNeedingAttention >= 1, "Expected at least one deal needing attention");
    const flaggedDeal = (summaryData.deals || []).find((item) => item.dealId === createdAutomationDealId);
    assert(flaggedDeal, "Expected created rescue deal in attention summary");
    assert(flaggedDeal.overdueNextStep === true, "Expected rescue deal to be flagged overdue");

    const { response: automationResponse, data: automationData } = await requestJson(`${backendUrl}/api/v1/deals/automation/stalled-review`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    assert(automationResponse.ok, `Expected 200 OK for stalled automation, got ${automationResponse.status}`);
    assert(automationData && automationData.reviewedDeals >= 1, "Expected automation to review flagged deals");
    assert(automationData.rescueTasksCreated >= 1, "Expected automation to create at least one rescue task");
    if (Array.isArray(automationData.createdTaskIds)) {
      createdAutomationTaskIds.push(...automationData.createdTaskIds);
    }

    const { response: taskResponse, data: taskData } = await requestJson(
      `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=deal&relatedEntityId=${createdAutomationDealId}`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(taskResponse.ok, `Expected 200 OK for rescue task lookup, got ${taskResponse.status}`);
    assert(taskData && Array.isArray(taskData.content), "Expected paginated task response for rescue deal");
    const rescueTask = taskData.content.find((task) => typeof task.title === "string" && task.title.startsWith("Rescue stalled deal:"));
    assert(rescueTask, "Expected rescue task for stalled deal");

    return `Automation reviewed ${automationData.reviewedDeals} deals and created ${automationData.rescueTasksCreated} rescue tasks`;
  });

  if (userRole === "ADMIN") {
    await runCheck("Deal approval workflow settings", async () => {
      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/deal-approval`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for deal approval workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "DEAL_APPROVAL", "Expected deal approval workflow");
      originalDealApprovalWorkflow = structuredClone(workflowData);

      const updatedWorkflow = {
        ...workflowData,
        isActive: true,
        requireApprovalForHighRisk: false,
        valueApprovalThreshold: 125000,
        approvalTaskDueDays: 2,
        approvalTaskPriority: "MEDIUM",
      };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/deal-approval`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
      });
      assert(updateResponse.ok, `Expected 200 OK for deal approval workflow update, got ${updateResponse.status}`);
      assert(updatedData?.valueApprovalThreshold === 125000, `Expected updated approval threshold, got ${updatedData?.valueApprovalThreshold}`);
      assert(updatedData?.approvalTaskDueDays === 2, `Expected updated approval task due days, got ${updatedData?.approvalTaskDueDays}`);
      assert(updatedData?.approvalTaskPriority === "MEDIUM", `Expected updated approval task priority, got ${updatedData?.approvalTaskPriority}`);
      assert(updatedData?.requireApprovalForHighRisk === false, "Expected high-risk trigger to be disabled for this smoke run");

      return "Updated deal approval workflow threshold and approval task SLA";
    });

    await runCheck("Governance ops workflow settings", async () => {
      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/governance-ops`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for governance ops workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "GOVERNANCE_OPS", "Expected governance ops workflow");
      originalGovernanceOpsWorkflow = structuredClone(workflowData);

      const updatedWorkflow = {
        ...workflowData,
        isActive: true,
        digestCadenceDays: 2,
        digestTaskDueDays: 2,
        digestTaskPriority: "LOW",
        elevateDigestForSlaBreaches: false,
        watchReviewDays: 1,
        highReviewDays: 2,
        criticalReviewDays: 4,
        overdueReviewTaskPriority: "HIGH",
        overdueEscalationTaskDueDays: 3,
        overdueEscalationTaskPriority: "MEDIUM",
      };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/governance-ops`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
      });
      assert(updateResponse.ok, `Expected 200 OK for governance ops workflow update, got ${updateResponse.status}`);
      assert(updatedData?.digestCadenceDays === 2, `Expected updated governance digest cadence, got ${updatedData?.digestCadenceDays}`);
      assert(updatedData?.digestTaskDueDays === 2, `Expected updated digest task due days, got ${updatedData?.digestTaskDueDays}`);
      assert(updatedData?.digestTaskPriority === "LOW", `Expected updated digest task priority, got ${updatedData?.digestTaskPriority}`);
      assert(updatedData?.elevateDigestForSlaBreaches === false, "Expected digest SLA elevation to be disabled");
      assert(updatedData?.watchReviewDays === 1 && updatedData?.highReviewDays === 2 && updatedData?.criticalReviewDays === 4, "Expected updated governance review thresholds");
      assert(updatedData?.overdueReviewTaskPriority === "HIGH", `Expected updated overdue review priority, got ${updatedData?.overdueReviewTaskPriority}`);
      assert(updatedData?.overdueEscalationTaskDueDays === 3, `Expected updated escalation due days, got ${updatedData?.overdueEscalationTaskDueDays}`);
      assert(updatedData?.overdueEscalationTaskPriority === "MEDIUM", `Expected updated escalation priority, got ${updatedData?.overdueEscalationTaskPriority}`);

      return "Updated governance ops digest cadence and overdue review SLA";
    });

    await runCheck("Territory escalation workflow settings", async () => {
      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/territory-escalation`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for territory escalation workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "TERRITORY_ESCALATION", "Expected territory escalation workflow");
      originalTerritoryEscalationWorkflow = structuredClone(workflowData);

      const updatedWorkflow = {
        ...workflowData,
        isActive: true,
        includeWatchEscalations: true,
        criticalPipelineExposureThreshold: 90000,
        highPipelineExposureThreshold: 15000,
        watchEscalationTaskDueDays: 2,
        highEscalationTaskDueDays: 1,
        criticalEscalationTaskDueDays: 0,
        watchEscalationTaskPriority: "LOW",
        highEscalationTaskPriority: "MEDIUM",
        criticalEscalationTaskPriority: "HIGH",
      };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/territory-escalation`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
      });
      assert(updateResponse.ok, `Expected 200 OK for territory escalation workflow update, got ${updateResponse.status}`);
      assert(updatedData?.highPipelineExposureThreshold === 15000, `Expected updated high exposure threshold, got ${updatedData?.highPipelineExposureThreshold}`);
      assert(updatedData?.watchEscalationTaskDueDays === 2, `Expected updated watch escalation due days, got ${updatedData?.watchEscalationTaskDueDays}`);
      assert(updatedData?.highEscalationTaskPriority === "MEDIUM", `Expected updated high escalation priority, got ${updatedData?.highEscalationTaskPriority}`);

      return "Updated territory escalation thresholds and alert task SLA";
    });
  } else {
    record("Deal approval workflow settings", "skip", "Authenticated user is not a tenant admin");
    record("Governance ops workflow settings", "skip", "Authenticated user is not a tenant admin");
    record("Territory escalation workflow settings", "skip", "Authenticated user is not a tenant admin");
  }

  await runCheck("Deal approval governance", async () => {
    let companyId = insightsCompanyId;
    let contactId = insightsPrimaryContactId || null;

    if (!companyId) {
      const { response: companiesResponse, data: companiesData } = await requestJson(`${backendUrl}/api/v1/companies?size=1`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(companiesResponse.ok, `Expected 200 OK for fallback companies, got ${companiesResponse.status}`);
      assert(companiesData?.content?.length > 0, "Expected at least one company for approval test");
      companyId = companiesData.content[0].id;

      const { response: contactsResponse, data: contactsData } = await requestJson(`${backendUrl}/api/v1/contacts?size=1&companyId=${companyId}`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(contactsResponse.ok, `Expected 200 OK for fallback contacts, got ${contactsResponse.status}`);
      contactId = contactsData?.content?.[0]?.id || null;
    }

    const uniqueSuffix = Date.now();
    const basePayload = {
      name: `Smoke Approval Deal ${uniqueSuffix}`,
      companyId,
      contactId,
      value: 130000,
      stage: "NEGOTIATION",
      probability: 70,
      expectedCloseDate: "2026-04-22",
      dealType: "NEW_BUSINESS",
      leadSource: "REFERRAL",
      competitorName: "Governance CRM",
      nextStep: "Finalize legal approval and procurement review",
      nextStepDueDate: "2026-03-30",
      riskLevel: "MEDIUM",
      buyingCommitteeSummary: "Procurement and security need final sign-off.",
      description: "Smoke approval workflow deal",
      notes: "Testing approval governance",
      winReason: null,
      lossReason: null,
      closeNotes: null,
    };

    const { response: createResponse, data: createData } = await requestJson(`${backendUrl}/api/v1/deals`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(basePayload),
    });
    assert(createResponse.status === 201, `Expected 201 Created for approval deal, got ${createResponse.status}`);
    assert(createData?.approvalRequired === true, "Expected high-value deal to require approval");
    createdApprovalDealId = createData.id;

    const { response: blockedCloseResponse } = await requestJson(`${backendUrl}/api/v1/deals/${createdApprovalDealId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        ...basePayload,
        stage: "CLOSED_WON",
        winReason: "Commercial and security terms aligned",
        closeNotes: "Closed after governance review",
      }),
    });
    assert(blockedCloseResponse.status >= 400, `Expected closing without approval to fail, got ${blockedCloseResponse.status}`);

    const { response: requestResponse, data: requestData } = await requestJson(
      `${backendUrl}/api/v1/deals/${createdApprovalDealId}/request-approval`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ notes: "Need manager sign-off for enterprise pricing and risk." }),
      }
    );
    assert(requestResponse.ok, `Expected 200 OK for approval request, got ${requestResponse.status}`);
    assert(requestData?.approvalStatus === "PENDING", `Expected approval status PENDING, got ${requestData?.approvalStatus}`);

    const { response: approvalTaskResponse, data: approvalTaskData } = await requestJson(
      `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=deal_approval&relatedEntityId=${createdApprovalDealId}`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(approvalTaskResponse.ok, `Expected 200 OK for approval task lookup, got ${approvalTaskResponse.status}`);
    assert(approvalTaskData && Array.isArray(approvalTaskData.content), "Expected paginated approval task response");
    const approvalTask = approvalTaskData.content.find((task) => typeof task.title === "string" && task.title.startsWith("Approve deal:"));
    assert(approvalTask, "Expected approval task to be created");
    createdApprovalTaskId = approvalTask.id;
    const expectedApprovalDueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    assert(typeof approvalTask.dueDate === "string" && approvalTask.dueDate.startsWith(expectedApprovalDueDate), `Expected approval due date ${expectedApprovalDueDate}, got ${approvalTask.dueDate}`);
    assert(approvalTask.priority === "MEDIUM", `Expected approval priority MEDIUM, got ${approvalTask.priority}`);

    const { response: approveResponse, data: approveData } = await requestJson(
      `${backendUrl}/api/v1/deals/${createdApprovalDealId}/approve`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ notes: "Approved for close plan." }),
      }
    );
    assert(approveResponse.ok, `Expected 200 OK for approval action, got ${approveResponse.status}`);
    assert(approveData?.approvalStatus === "APPROVED", `Expected approval status APPROVED, got ${approveData?.approvalStatus}`);

    const { response: closeResponse, data: closeData } = await requestJson(`${backendUrl}/api/v1/deals/${createdApprovalDealId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        ...basePayload,
        stage: "CLOSED_WON",
        winReason: "Commercial and security terms aligned",
        closeNotes: "Closed after governance review",
      }),
    });
    assert(closeResponse.ok, `Expected 200 OK after approval, got ${closeResponse.status}`);
    assert(closeData?.stage === "CLOSED_WON", `Expected deal to close won, got ${closeData?.stage}`);
    assert(closeData?.approvalStatus === "APPROVED", `Expected approval state to stay approved, got ${closeData?.approvalStatus}`);

    return `Blocked premature close, then approved and closed ${createdApprovalDealId} with approval due ${expectedApprovalDueDate}`;
  });

  await runCheck("Documents list", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/documents?size=5`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data && Array.isArray(data.content), "Expected paginated documents response");
    return `Fetched ${data.content.length} documents from the first page`;
  });

  await runCheck("Document upload and download", async () => {
    const uploadForm = new FormData();
    const documentName = `Smoke Upload ${Date.now()}`;
    const fileName = `smoke-upload-${Date.now()}.txt`;
    uploadForm.append("name", documentName);
    uploadForm.append("category", "ASSETS");
    uploadForm.append("description", "Smoke test upload");
    uploadForm.append("file", new Blob(["Smoke test document body"], { type: "text/plain" }), fileName);

    let uploadedDocumentId = null;

    const uploadTimeout = createTimeoutSignal(timeoutMs);
    try {
      const uploadResponse = await fetch(`${backendUrl}/api/v1/documents/upload`, {
        method: "POST",
        signal: uploadTimeout.signal,
        headers: authHeaders,
        body: uploadForm,
      });
      const uploadText = await uploadResponse.text();
      const uploadData = uploadText ? JSON.parse(uploadText) : null;
      assert(uploadResponse.ok, `Expected 201 Created, got ${uploadResponse.status}`);
      assert(uploadData && typeof uploadData.id === "string" && uploadData.id.length > 0, "Expected uploaded document id");
      uploadedDocumentId = uploadData.id;
    } finally {
      uploadTimeout.dispose();
    }

    try {
      const downloadTimeout = createTimeoutSignal(timeoutMs);
      try {
        const downloadResponse = await fetch(`${backendUrl}/api/v1/documents/${uploadedDocumentId}/download`, {
          method: "GET",
          signal: downloadTimeout.signal,
          headers: authHeaders,
        });
        assert(downloadResponse.ok, `Expected 200 OK, got ${downloadResponse.status}`);
        const contentDisposition = downloadResponse.headers.get("content-disposition") || "";
        const fileBuffer = await downloadResponse.arrayBuffer();
        assert(fileBuffer.byteLength > 0, "Expected downloaded file bytes");
        assert(contentDisposition.includes("filename="), "Expected download filename header");
        return `Uploaded and downloaded ${uploadedDocumentId}`;
      } finally {
        downloadTimeout.dispose();
      }
    } finally {
      if (uploadedDocumentId) {
        const cleanupTimeout = createTimeoutSignal(timeoutMs);
        try {
          await fetch(`${backendUrl}/api/v1/documents/${uploadedDocumentId}`, {
            method: "DELETE",
            signal: cleanupTimeout.signal,
            headers: authHeaders,
          });
        } finally {
          cleanupTimeout.dispose();
        }
      }
    }
  });

  await runCheck("Emails list", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/emails?size=5&folder=INBOX`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(data && Array.isArray(data.content), "Expected paginated emails response");
    return `Fetched ${data.content.length} inbox emails from the first page`;
  });

  if (userRole === "ADMIN") {
    await runCheck("Workspace database settings", async () => {
      const { response, data } = await requestJson(`${backendUrl}/api/v1/workspace/database`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}`);
      assert(data && typeof data.tenantSlug === "string" && data.tenantSlug.length > 0, "Expected tenantSlug");
      assert(data && typeof data.routingMode === "string" && data.routingMode.length > 0, "Expected routingMode");
      return `Workspace routing mode is ${data.routingMode}`;
    });

    await runCheck("Lead workflow settings", async () => {
      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/lead-intake`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for lead workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "LEAD_INTAKE", "Expected lead intake workflow");
      originalLeadWorkflow = structuredClone(workflowData);

      const updatedWorkflow = {
        ...workflowData,
        fastTrackScoreThreshold: 95,
        fastTrackValueThreshold: 90000,
        fastTrackFollowUpDays: 2,
        referralFollowUpDays: 1,
        defaultFollowUpDays: 4,
      };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/lead-intake`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
      });
      assert(updateResponse.ok, `Expected 200 OK for lead workflow update, got ${updateResponse.status}`);
      assert(updatedData && updatedData.fastTrackFollowUpDays === 2, "Expected updated fast-track follow-up days");

      const uniqueSuffix = Date.now();
      const { response: leadResponse, data: leadData } = await requestJson(`${backendUrl}/api/v1/leads`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          firstName: "Workflow",
          lastName: `Lead${uniqueSuffix}`,
          email: `workflow.lead.${uniqueSuffix}@example.com`,
          phone: "+263771222222",
          company: "Workflow CRM",
          title: "VP Revenue",
          source: "WEBSITE",
          score: 96,
          estimatedValue: 15000,
          notes: "Smoke test workflow lead",
        }),
      });
      assert(leadResponse.status === 201, `Expected 201 Created for workflow lead, got ${leadResponse.status}`);
      createdWorkflowLeadId = leadData.id;

      const { response: workflowTaskResponse, data: workflowTaskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=lead&relatedEntityId=${createdWorkflowLeadId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(workflowTaskResponse.ok, `Expected 200 OK for workflow task lookup, got ${workflowTaskResponse.status}`);
      assert(workflowTaskData && Array.isArray(workflowTaskData.content), "Expected workflow task response");
      const workflowTask = workflowTaskData.content.find((task) => task.relatedEntityId === createdWorkflowLeadId);
      assert(workflowTask, "Expected workflow follow-up task");
      createdWorkflowTaskId = workflowTask.id;
      assert(workflowTask.title.startsWith("Fast-track follow-up"), "Expected fast-track workflow task title");

      const expectedDueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      assert(typeof workflowTask.dueDate === "string" && workflowTask.dueDate.startsWith(expectedDueDate), `Expected workflow due date ${expectedDueDate}, got ${workflowTask.dueDate}`);
      assert(workflowTask.priority === "HIGH", `Expected fast-track priority HIGH, got ${workflowTask.priority}`);

      return `Updated lead intake workflow and verified fast-track follow-up due on ${expectedDueDate}`;
    });

    await runCheck("Deal rescue workflow settings", async () => {
      assert(insightsCompanyId, "Expected account insights company for deal rescue workflow test");

      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/deal-rescue`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for deal rescue workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "DEAL_RESCUE", "Expected deal rescue workflow");
      originalDealRescueWorkflow = structuredClone(workflowData);

      const updatedWorkflow = {
        ...workflowData,
        stalledDealDays: 3,
        rescueTaskDueDays: 2,
        rescueTaskPriority: "MEDIUM",
      };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/deal-rescue`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
      });
      assert(updateResponse.ok, `Expected 200 OK for deal rescue workflow update, got ${updateResponse.status}`);
      assert(updatedData && updatedData.rescueTaskDueDays === 2, "Expected updated rescue task due days");

      const uniqueSuffix = Date.now();
      const { response: dealResponse, data: dealData } = await requestJson(`${backendUrl}/api/v1/deals`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: `Workflow Rescue Deal ${uniqueSuffix}`,
          companyId: insightsCompanyId,
          contactId: insightsPrimaryContactId || null,
          value: 36000,
          stage: "NEGOTIATION",
          probability: 30,
          expectedCloseDate: "2026-04-10",
          dealType: "NEW_BUSINESS",
          leadSource: "WEBSITE",
          nextStep: "Re-engage the buying committee and recover timeline",
          nextStepDueDate: "2026-03-20",
          buyingCommitteeSummary: "Champion has gone quiet and the deal needs intervention.",
        }),
      });
      assert(dealResponse.status === 201, `Expected 201 Created for workflow rescue deal, got ${dealResponse.status}`);
      createdDealWorkflowDealId = dealData.id;

      const { response: automationResponse, data: automationData } = await requestJson(`${backendUrl}/api/v1/deals/automation/stalled-review`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      assert(automationResponse.ok, `Expected 200 OK for deal rescue automation, got ${automationResponse.status}`);
      assert(typeof automationData?.rescueTasksCreated === "number", "Expected deal rescue automation result");

      const { response: taskResponse, data: taskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=deal&relatedEntityId=${createdDealWorkflowDealId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(taskResponse.ok, `Expected 200 OK for workflow rescue task lookup, got ${taskResponse.status}`);
      assert(taskData && Array.isArray(taskData.content), "Expected paginated workflow rescue task response");
      const rescueTask = taskData.content.find((task) => typeof task.title === "string" && task.title.startsWith("Rescue stalled deal:"));
      assert(rescueTask, "Expected rescue task for workflow rescue deal");
      createdDealWorkflowTaskId = rescueTask.id;

      const expectedDueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      assert(typeof rescueTask.dueDate === "string" && rescueTask.dueDate.startsWith(expectedDueDate), `Expected rescue due date ${expectedDueDate}, got ${rescueTask.dueDate}`);
      assert(rescueTask.priority === "MEDIUM", `Expected rescue priority MEDIUM, got ${rescueTask.priority}`);

      return `Updated deal rescue workflow and verified rescue task due on ${expectedDueDate}`;
    });

    await runCheck("Quota risk workflow settings", async () => {
      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/quota-risk`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for quota risk workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "QUOTA_RISK", "Expected quota risk workflow");
      originalQuotaRiskWorkflow = structuredClone(workflowData);

      const updatedWorkflow = {
        ...workflowData,
        includeWatchReps: true,
        includeAtRiskReps: true,
        watchTaskDueDays: 2,
        atRiskTaskDueDays: 1,
        watchTaskPriority: "LOW",
        atRiskTaskPriority: "MEDIUM",
      };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/quota-risk`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
      });
      assert(updateResponse.ok, `Expected 200 OK for quota risk workflow update, got ${updateResponse.status}`);
      assert(updatedData && updatedData.watchTaskDueDays === 2, "Expected updated watch due days");
      assert(updatedData && updatedData.atRiskTaskDueDays === 1, "Expected updated at-risk due days");
      assert(updatedData && updatedData.watchTaskPriority === "LOW", "Expected updated watch priority");
      assert(updatedData && updatedData.atRiskTaskPriority === "MEDIUM", "Expected updated at-risk priority");

      return "Updated quota risk workflow with distinct watch and at-risk timing";
    });

    await runCheck("Revenue ops summary", async () => {
      const { response: usersResponse, data: usersData } = await requestJson(`${backendUrl}/api/v1/users?page=0&size=100`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(usersResponse.ok, `Expected 200 OK for users list, got ${usersResponse.status}`);
      assert(usersData && Array.isArray(usersData.content), "Expected paginated users response");
      const currentUser = usersData.content.find((member) => member.id === userId);
      assert(currentUser, "Expected current user to appear in user list");

      originalRevenueOps = {
        territory: currentUser.territory ?? null,
        quarterlyQuota: currentUser.quarterlyQuota ?? null,
        annualQuota: currentUser.annualQuota ?? null,
      };

      const uniqueTerritory = `Harare-${Date.now()}`;
      routingTerritory = uniqueTerritory;
      const quarterlyQuota = 125000;
      const annualQuota = 500000;

      const { response: territoryResponse, data: territoryData } = await requestJson(`${backendUrl}/api/v1/territories`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: uniqueTerritory,
          description: "Smoke test governed territory",
          isActive: true,
        }),
      });
      assert(territoryResponse.status === 201, `Expected 201 Created for territory catalog entry, got ${territoryResponse.status}`);
      assert(territoryData && typeof territoryData.id === "string", "Expected created territory id");
      createdRoutingTerritoryId = territoryData.id;

      const { response: updateResponse, data: updateData } = await requestJson(`${backendUrl}/api/v1/users/${userId}/revenue-ops`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          territory: uniqueTerritory,
          quarterlyQuota,
          annualQuota,
        }),
      });
      assert(updateResponse.ok, `Expected 200 OK for revenue ops update, got ${updateResponse.status}`);
      assert(updateData?.territory === uniqueTerritory, "Expected updated territory in response");
      assert(updateData?.quarterlyQuota === quarterlyQuota, "Expected updated quarterly quota in response");
      assert(updateData?.annualQuota === annualQuota, "Expected updated annual quota in response");

      const { response: summaryResponse, data: summaryData } = await requestJson(`${backendUrl}/api/v1/dashboard/revenue-ops`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(summaryResponse.ok, `Expected 200 OK for revenue ops summary, got ${summaryResponse.status}`);
      assert(summaryData && summaryData.activeRepCount >= 1, "Expected at least one active revenue owner");
      assert(typeof summaryData.quarterProgressPercent === "number", "Expected quarter progress percentage");
      assert(summaryData.territoryCatalogCount >= 1, "Expected governed territory catalog count");
      const currentRep = (summaryData.teamProgress || []).find((member) => member.userId === userId);
      assert(currentRep, "Expected current user in revenue ops team progress");
      assert(currentRep.territory === uniqueTerritory, "Expected current user territory in revenue ops summary");
      assert(Number(currentRep.quarterlyQuota) === quarterlyQuota, "Expected current user quota in revenue ops summary");
      assert(typeof currentRep.pipelineCoverageRatio === "number", "Expected coverage ratio in revenue ops summary");
      assert(typeof currentRep.pacingStatus === "string", "Expected pacing status in revenue ops summary");
      assert((summaryData.territorySummaries || []).some((territory) => territory.territory === uniqueTerritory && territory.governed === true), "Expected governed territory summary entry");

      return `Updated ${currentRep.name} to governed territory ${uniqueTerritory} with quarterly quota ${quarterlyQuota}`;
    });

    await runCheck("Territory lead routing", async () => {
      assert(routingTerritory, "Expected revenue ops summary check to assign a routing territory");
      const uniqueSuffix = Date.now();

      const { response, data } = await requestJson(`${backendUrl}/api/v1/leads`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          firstName: "Territory",
          lastName: `Lead${uniqueSuffix}`,
          email: `territory.lead.${uniqueSuffix}@example.com`,
          phone: "+263771111111",
          company: "Territory Routed CRM",
          title: "Regional Buyer",
          territory: routingTerritory,
          source: "REFERRAL",
          estimatedValue: 55000,
          notes: "Smoke test territory-routed lead",
        }),
      });
      assert(response.status === 201, `Expected 201 Created for territory lead, got ${response.status}`);
      assert(data && typeof data.id === "string", "Expected territory lead id");
      assert(data.territory === routingTerritory, `Expected territory ${routingTerritory}, got ${data.territory}`);
      assert(data.ownerId === userId, `Expected lead owner ${userId}, got ${data.ownerId}`);
      createdTerritoryLeadId = data.id;

      const { response: taskResponse, data: taskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=lead&relatedEntityId=${createdTerritoryLeadId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(taskResponse.ok, `Expected 200 OK for territory lead task lookup, got ${taskResponse.status}`);
      assert(taskData && Array.isArray(taskData.content), "Expected paginated task response for territory lead");
      const followUpTask = taskData.content.find((task) => task.relatedEntityId === createdTerritoryLeadId);
      assert(followUpTask, "Expected follow-up task for territory-routed lead");
      createdTerritoryTaskId = followUpTask.id;

      return `Assigned ${createdTerritoryLeadId} to the matching territory owner ${userId}`;
    });

    await runCheck("Territory account and deal alignment", async () => {
      assert(routingTerritory, "Expected revenue ops summary check to assign a routing territory");
      const uniqueSuffix = Date.now();
      const accountTerritory = `Cape Town-${uniqueSuffix}`;

      const { response: companyResponse, data: companyData } = await requestJson(`${backendUrl}/api/v1/companies`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: `Territory Account ${uniqueSuffix}`,
          email: `territory.account.${uniqueSuffix}@example.com`,
          industry: "TECHNOLOGY",
          status: "ACTIVE",
          territory: accountTerritory,
          ownerId: userId,
        }),
      });
      assert(companyResponse.status === 201, `Expected 201 Created for territory company, got ${companyResponse.status}`);
      assert(companyData && typeof companyData.id === "string", "Expected territory company id");
      assert(companyData.territory === accountTerritory, `Expected company territory ${accountTerritory}, got ${companyData.territory}`);
      createdTerritoryCompanyId = companyData.id;
      createdCompanyIds.push(companyData.id);

      const { response: fetchedCompanyResponse, data: fetchedCompanyData } = await requestJson(
        `${backendUrl}/api/v1/companies/${createdTerritoryCompanyId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(fetchedCompanyResponse.ok, `Expected 200 OK for territory company fetch, got ${fetchedCompanyResponse.status}`);
      assert(fetchedCompanyData?.territoryMismatch === true, "Expected company territory mismatch to be flagged");

      const { response: dealResponse, data: dealData } = await requestJson(`${backendUrl}/api/v1/deals`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: `Territory Deal ${uniqueSuffix}`,
          companyId: createdTerritoryCompanyId,
          ownerId: userId,
          value: 43000,
          stage: "PROPOSAL",
          probability: 45,
          territory: accountTerritory,
          expectedCloseDate: "2026-04-20",
          dealType: "NEW_BUSINESS",
          leadSource: "REFERRAL",
          nextStep: "Realign account ownership with territory coverage",
          nextStepDueDate: "2026-03-30",
        }),
      });
      assert(dealResponse.status === 201, `Expected 201 Created for territory deal, got ${dealResponse.status}`);
      assert(dealData && typeof dealData.id === "string", "Expected territory deal id");
      assert(dealData.territory === accountTerritory, `Expected deal territory ${accountTerritory}, got ${dealData.territory}`);
      createdTerritoryDealId = dealData.id;

      const { response: fetchedDealResponse, data: fetchedDealData } = await requestJson(
        `${backendUrl}/api/v1/deals/${createdTerritoryDealId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(fetchedDealResponse.ok, `Expected 200 OK for territory deal fetch, got ${fetchedDealResponse.status}`);
      assert(fetchedDealData?.ownerTerritory === routingTerritory, `Expected owner territory ${routingTerritory}, got ${fetchedDealData?.ownerTerritory}`);
      assert(fetchedDealData?.territoryMismatch === true, "Expected deal territory mismatch to be flagged");

      const { response: taskResponse, data: taskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=deal&relatedEntityId=${createdTerritoryDealId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(taskResponse.ok, `Expected 200 OK for territory deal task lookup, got ${taskResponse.status}`);
      assert(taskData && Array.isArray(taskData.content), "Expected paginated task response for territory deal");
      const followUpTask = taskData.content.find((task) => task.relatedEntityId === createdTerritoryDealId);
      assert(followUpTask, "Expected next-step task for territory deal");
      createdTerritoryDealTaskId = followUpTask.id;

      const { response: automationResponse, data: automationData } = await requestJson(
        `${backendUrl}/api/v1/deals/automation/stalled-review`,
        {
          method: "POST",
          headers: authHeaders,
        }
      );
      assert(automationResponse.ok, `Expected 200 OK for territory automation run, got ${automationResponse.status}`);
      assert(typeof automationData?.rescueTasksCreated === "number", "Expected rescue automation result payload");

      const { response: rescueTaskResponse, data: rescueTaskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=50&relatedEntityType=deal&relatedEntityId=${createdTerritoryDealId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(rescueTaskResponse.ok, `Expected 200 OK for territory rescue task lookup, got ${rescueTaskResponse.status}`);
      assert(rescueTaskData && Array.isArray(rescueTaskData.content), "Expected paginated task response for territory rescue task lookup");
      const rescueTask = rescueTaskData.content.find((task) => typeof task.title === "string" && task.title.startsWith("Rescue stalled deal:"));
      assert(rescueTask, "Expected rescue automation task for territory-mismatched deal");
      createdTerritoryRescueTaskId = rescueTask.id;

      const { response: insightsResponse, data: insightsData } = await requestJson(
        `${backendUrl}/api/v1/companies/${createdTerritoryCompanyId}/insights`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(insightsResponse.ok, `Expected 200 OK for territory company insights, got ${insightsResponse.status}`);
      assert(insightsData?.territory === accountTerritory, `Expected company insights territory ${accountTerritory}, got ${insightsData?.territory}`);
      assert(insightsData?.territoryMismatch === true, "Expected company insights territory mismatch");
      assert((insightsData?.territoryMismatchDeals || 0) >= 1, "Expected territory mismatch deal count in company insights");

      return `Flagged account ${createdTerritoryCompanyId} and deal ${createdTerritoryDealId} for territory reassignment`;
    });

    await runCheck("Territory governance reassignment", async () => {
      assert(createdTerritoryDealId, "Expected territory mismatch deal from prior check");
      assert(createdTerritoryCompanyId, "Expected territory mismatch account from prior check");

      const governanceSuffix = Date.now();
      const governanceEmail = `territory.owner.${governanceSuffix}@example.com`;

      const { response: queueResponse, data: queueData } = await requestJson(
        `${backendUrl}/api/v1/deals/governance/territory-queue`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(queueResponse.ok, `Expected 200 OK for territory governance queue, got ${queueResponse.status}`);
      assert(queueData && Array.isArray(queueData.deals), "Expected governance queue deals array");
      const queuedDeal = queueData.deals.find((item) => item.dealId === createdTerritoryDealId);
      assert(queuedDeal, "Expected mismatched territory deal to appear in governance queue");
        const governanceTerritoryName = queuedDeal.territory;
        assert(typeof governanceTerritoryName === "string" && governanceTerritoryName.length > 0, "Expected governance territory name from queued deal");
        governanceTerritory = governanceTerritoryName;

      const { response: territoryCreateResponse, data: territoryCreateData } = await requestJson(
        `${backendUrl}/api/v1/territories`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            name: governanceTerritoryName,
            description: "Smoke test governance reassignment territory",
            isActive: true,
          }),
        }
      );
      assert(territoryCreateResponse.status === 201, `Expected 201 Created for governance territory, got ${territoryCreateResponse.status}`);
      createdGovernanceTerritoryId = territoryCreateData?.id;

      const { response: userCreateResponse, data: userCreateData } = await requestJson(
        `${backendUrl}/api/v1/users`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            firstName: "Territory",
            lastName: "Owner",
            email: governanceEmail,
            password: "Codex123!",
            role: "SALES_REP",
            isActive: true,
            territory: governanceTerritoryName,
            quarterlyQuota: 90000,
            annualQuota: 360000,
          }),
        }
      );
      assert(userCreateResponse.status === 201, `Expected 201 Created for governance user, got ${userCreateResponse.status}`);
      createdGovernanceUserId = userCreateData?.id;

      const { response: refreshedQueueResponse, data: refreshedQueueData } = await requestJson(
        `${backendUrl}/api/v1/deals/governance/territory-queue`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(refreshedQueueResponse.ok, `Expected 200 OK for refreshed territory governance queue, got ${refreshedQueueResponse.status}`);
      const refreshedQueuedDeal = refreshedQueueData?.deals?.find((item) => item.dealId === createdTerritoryDealId);
      assert(refreshedQueuedDeal, "Expected mismatched territory deal in refreshed governance queue");
      assert(refreshedQueuedDeal.suggestedOwnerId === createdGovernanceUserId, `Expected suggested owner ${createdGovernanceUserId}, got ${refreshedQueuedDeal?.suggestedOwnerId}`);

      const { response: reassignResponse, data: reassignData } = await requestJson(
        `${backendUrl}/api/v1/deals/governance/reassign`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            dealIds: [createdTerritoryDealId],
          }),
        }
      );
      assert(reassignResponse.ok, `Expected 200 OK for territory governance reassignment, got ${reassignResponse.status}`);
      assert(reassignData?.reassignedDeals >= 1, "Expected at least one deal to be reassigned");
      assert(Array.isArray(reassignData?.updatedDealIds) && reassignData.updatedDealIds.includes(createdTerritoryDealId), "Expected reassigned deal id in response");

      const { response: dealResponse, data: dealData } = await requestJson(
        `${backendUrl}/api/v1/deals/${createdTerritoryDealId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(dealResponse.ok, `Expected 200 OK for reassigned deal fetch, got ${dealResponse.status}`);
      assert(dealData?.ownerId === createdGovernanceUserId, `Expected reassigned owner ${createdGovernanceUserId}, got ${dealData?.ownerId}`);
      assert(dealData?.territoryMismatch === false, "Expected territory mismatch to be cleared after reassignment");

      return `Reassigned ${createdTerritoryDealId} to ${dealData.ownerName || createdGovernanceUserId} and cleared the mismatch`;
    });

    await runCheck("Account territory governance reassignment", async () => {
      assert(createdTerritoryCompanyId, "Expected territory mismatch account from prior check");
      assert(createdGovernanceUserId, "Expected territory governance owner from prior check");

      const { response: queueResponse, data: queueData } = await requestJson(
        `${backendUrl}/api/v1/companies/governance/territory-queue`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(queueResponse.ok, `Expected 200 OK for company governance queue, got ${queueResponse.status}`);
      assert(queueData && Array.isArray(queueData.companies), "Expected company governance queue payload");
      const queuedCompany = queueData.companies.find((item) => item.companyId === createdTerritoryCompanyId);
      assert(queuedCompany, "Expected mismatched account to appear in governance queue");
      assert(queuedCompany.suggestedOwnerId === createdGovernanceUserId, `Expected suggested company owner ${createdGovernanceUserId}, got ${queuedCompany?.suggestedOwnerId}`);

      const { response: reassignResponse, data: reassignData } = await requestJson(
        `${backendUrl}/api/v1/companies/governance/reassign`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            companyIds: [createdTerritoryCompanyId],
          }),
        }
      );
      assert(reassignResponse.ok, `Expected 200 OK for company governance reassignment, got ${reassignResponse.status}`);
      assert(reassignData?.reassignedCompanies >= 1, "Expected at least one company to be reassigned");
      assert(Array.isArray(reassignData?.updatedCompanyIds) && reassignData.updatedCompanyIds.includes(createdTerritoryCompanyId), "Expected reassigned company id in response");

      const { response: companyResponse, data: companyData } = await requestJson(
        `${backendUrl}/api/v1/companies/${createdTerritoryCompanyId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(companyResponse.ok, `Expected 200 OK for reassigned company fetch, got ${companyResponse.status}`);
      assert(companyData?.ownerId === createdGovernanceUserId, `Expected reassigned company owner ${createdGovernanceUserId}, got ${companyData?.ownerId}`);
      assert(companyData?.territoryMismatch === false, "Expected company territory mismatch to be cleared after reassignment");

      return `Reassigned account ${createdTerritoryCompanyId} to ${companyData.ownerName || createdGovernanceUserId}`;
    });

    await runCheck("Quota risk alert automation", async () => {
      assert(createdGovernanceUserId, "Expected governance user from prior check");

      const { response: alertsResponse, data: alertsData } = await requestJson(
        `${backendUrl}/api/v1/dashboard/quota-risk-alerts`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(alertsResponse.ok, `Expected 200 OK for quota risk alerts, got ${alertsResponse.status}`);
      assert(alertsData && Array.isArray(alertsData.alerts), "Expected quota risk alerts payload");
      const governanceAlert = alertsData.alerts.find((item) => item.userId === createdGovernanceUserId);
      assert(governanceAlert, "Expected governance user to appear in quota risk alerts");
      assert(governanceAlert.pacingStatus === "AT_RISK" || governanceAlert.pacingStatus === "WATCH", `Expected watch or at risk pacing, got ${governanceAlert?.pacingStatus}`);

      const { response: automationResponse, data: automationData } = await requestJson(
        `${backendUrl}/api/v1/dashboard/quota-risk-alerts/automation`,
        {
          method: "POST",
          headers: authHeaders,
        }
      );
      assert(automationResponse.ok, `Expected 200 OK for quota risk automation, got ${automationResponse.status}`);
      assert(typeof automationData?.tasksCreated === "number", "Expected quota risk automation result payload");

      const { response: taskResponse, data: taskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=quota_risk&relatedEntityId=${createdGovernanceUserId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(taskResponse.ok, `Expected 200 OK for quota risk task lookup, got ${taskResponse.status}`);
      assert(taskData && Array.isArray(taskData.content), "Expected paginated quota risk task response");
      const quotaRiskTask = taskData.content.find((task) => typeof task.title === "string" && task.title.startsWith("Quota risk review:"));
      assert(quotaRiskTask, "Expected quota risk follow-up task for governance user");
      createdQuotaRiskTaskIds.push(quotaRiskTask.id);

      const expectedDueDays = governanceAlert.pacingStatus === "AT_RISK" ? 1 : 2;
      const expectedPriority = governanceAlert.pacingStatus === "AT_RISK" ? "MEDIUM" : "LOW";
      const expectedDueDate = new Date(Date.now() + expectedDueDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      assert(typeof quotaRiskTask.dueDate === "string" && quotaRiskTask.dueDate.startsWith(expectedDueDate), `Expected quota risk due date ${expectedDueDate}, got ${quotaRiskTask.dueDate}`);
      assert(quotaRiskTask.priority === expectedPriority, `Expected quota risk priority ${expectedPriority}, got ${quotaRiskTask.priority}`);

      return `Created quota-risk follow-up for ${governanceAlert.name} (${governanceAlert.pacingStatus}) due ${expectedDueDate} at ${expectedPriority} priority`;
    });

      await runCheck("Territory exception automation", async () => {
        assert(createdGovernanceUserId, "Expected governance owner from prior check");

      const uniqueSuffix = Date.now();
      const mismatchTerritory = `Nairobi-${uniqueSuffix}`;
      const { response: leadResponse, data: leadData } = await requestJson(`${backendUrl}/api/v1/leads`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          firstName: "Exception",
          lastName: `Lead${uniqueSuffix}`,
          email: `exception.lead.${uniqueSuffix}@example.com`,
          phone: "+254700000000",
          company: "Territory Exception CRM",
          title: "Regional Buyer",
          territory: mismatchTerritory,
          ownerId: createdGovernanceUserId,
          source: "REFERRAL",
          estimatedValue: 42000,
          notes: "Smoke territory exception lead",
        }),
      });
      assert(leadResponse.status === 201, `Expected 201 Created for exception lead, got ${leadResponse.status}`);
      assert(leadData && typeof leadData.id === "string", "Expected exception lead id");
      assert(leadData.territoryMismatch === true, "Expected exception lead to be territory-mismatched");
      createdExceptionLeadId = leadData.id;

      const { response: summaryResponse, data: summaryData } = await requestJson(
        `${backendUrl}/api/v1/dashboard/territory-exceptions`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(summaryResponse.ok, `Expected 200 OK for territory exception summary, got ${summaryResponse.status}`);
      assert(summaryData && Array.isArray(summaryData.exceptions), "Expected territory exception summary payload");
      const leadException = summaryData.exceptions.find((item) => item.entityType === "LEAD" && item.entityId === createdExceptionLeadId);
      assert(leadException, "Expected exception lead in territory exception summary");
      assert(leadException.severity === "HIGH" || leadException.severity === "MEDIUM", `Expected lead exception severity, got ${leadException?.severity}`);

      const { response: automationResponse, data: automationData } = await requestJson(
        `${backendUrl}/api/v1/dashboard/territory-exceptions/automation`,
        {
          method: "POST",
          headers: authHeaders,
        }
      );
      assert(automationResponse.ok, `Expected 200 OK for territory exception automation, got ${automationResponse.status}`);
      assert(typeof automationData?.tasksCreated === "number", "Expected territory exception automation result payload");

      const { response: taskResponse, data: taskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=territory_exception_lead&relatedEntityId=${createdExceptionLeadId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(taskResponse.ok, `Expected 200 OK for territory exception task lookup, got ${taskResponse.status}`);
      assert(taskData && Array.isArray(taskData.content), "Expected paginated territory exception task response");
      const territoryTask = taskData.content.find((task) => typeof task.title === "string" && task.title.startsWith("Territory exception:"));
      assert(territoryTask, "Expected territory exception task for mismatched lead");
      createdTerritoryExceptionTaskIds.push(territoryTask.id);

        return `Created territory review task for lead ${createdExceptionLeadId}`;
      });

      await runCheck("Governance inbox and digest", async () => {
        assert(createdGovernanceUserId, "Expected governance owner from prior checks");

        const { response: inboxResponse, data: inboxData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/governance-inbox`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(inboxResponse.ok, `Expected 200 OK for governance inbox, got ${inboxResponse.status}`);
        assert(inboxData && Array.isArray(inboxData.items), "Expected governance inbox payload");
        assert(Array.isArray(inboxData.recentDigests), "Expected governance inbox digest history");
        assert(typeof inboxData.digestDue === "boolean", "Expected governance digest due flag");
        assert(typeof inboxData.reviewSlaStatus === "string", "Expected governance review SLA status");
        const territoryInboxItem = inboxData.items.find((item) => item.itemType === "TERRITORY_ESCALATION");
        assert(territoryInboxItem, "Expected territory escalation item in governance inbox");
        const quotaInboxItem = inboxData.items.find((item) => item.itemType === "QUOTA_RISK" && item.ownerName === "Territory Owner");
        assert(quotaInboxItem, "Expected quota risk item in governance inbox");
        assert(typeof quotaInboxItem.openTaskId === "string" && quotaInboxItem.openTaskId.length > 0, "Expected quota risk governance task id");

        const { response: digestResponse, data: digestData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/governance-digest/automation`,
          {
            method: "POST",
            headers: authHeaders,
          }
        );
        assert(digestResponse.ok, `Expected 200 OK for governance digest automation, got ${digestResponse.status}`);
        assert(typeof digestData?.digestsCreated === "number", "Expected governance digest result payload");

        const { response: digestTaskResponse, data: digestTaskData } = await requestJson(
          `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=governance_digest`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(digestTaskResponse.ok, `Expected 200 OK for governance digest task lookup, got ${digestTaskResponse.status}`);
        assert(digestTaskData && Array.isArray(digestTaskData.content), "Expected paginated governance digest task response");
        const digestTask = digestTaskData.content.find((task) => typeof task.title === "string" && task.title.startsWith("Governance digest:"));
        assert(digestTask, "Expected governance digest task");
        createdGovernanceDigestTaskIds.push(digestTask.id);

        const { response: refreshedInboxResponse, data: refreshedInboxData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/governance-inbox`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(refreshedInboxResponse.ok, `Expected 200 OK for refreshed governance inbox, got ${refreshedInboxResponse.status}`);
        assert(Array.isArray(refreshedInboxData?.recentDigests), "Expected refreshed governance digest history");
        assert(refreshedInboxData.recentDigests.length > 0, "Expected at least one governance digest history item");
        assert(refreshedInboxData.recentDigests[0].title.startsWith("Governance digest:"), "Expected latest digest history item");
        assert(refreshedInboxData.openDigestCount >= 1, "Expected at least one open governance digest");
        assert(refreshedInboxData.digestDue === false, "Expected governance digest to be up to date after creation");
        assert(typeof refreshedInboxData.recentDigests[0].taskId === "string" && refreshedInboxData.recentDigests[0].taskId.length > 0, "Expected governance digest task id in history");

        const { response: acknowledgeQuotaResponse, data: acknowledgeQuotaData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/governance-tasks/${quotaInboxItem.openTaskId}/acknowledge`,
          {
            method: "POST",
            headers: authHeaders,
          }
        );
        assert(acknowledgeQuotaResponse.ok, `Expected 200 OK for governance item acknowledgement, got ${acknowledgeQuotaResponse.status}`);
        assert(acknowledgeQuotaData?.acknowledged === true, "Expected governance item acknowledgement to complete task");

        const { response: acknowledgeDigestResponse, data: acknowledgeDigestData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/governance-tasks/${digestTask.id}/acknowledge`,
          {
            method: "POST",
            headers: authHeaders,
          }
        );
        assert(acknowledgeDigestResponse.ok, `Expected 200 OK for governance digest acknowledgement, got ${acknowledgeDigestResponse.status}`);
        assert(acknowledgeDigestData?.acknowledged === true, "Expected governance digest acknowledgement to complete task");

        const { response: acknowledgedInboxResponse, data: acknowledgedInboxData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/governance-inbox`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(acknowledgedInboxResponse.ok, `Expected 200 OK for acknowledged governance inbox, got ${acknowledgedInboxResponse.status}`);
        const acknowledgedQuotaInboxItem = acknowledgedInboxData.items.find((item) => item.itemType === "QUOTA_RISK" && item.ownerName === "Territory Owner");
        assert(acknowledgedQuotaInboxItem, "Expected quota risk item after acknowledgement");
        assert(acknowledgedQuotaInboxItem.openTaskExists === false, "Expected quota risk item to be cleared after acknowledgement");
        assert(acknowledgedInboxData.recentDigests[0].status === "COMPLETED", "Expected latest governance digest history item to be completed after acknowledgement");

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
        const { response: overdueReviewResponse, data: overdueReviewData } = await requestJson(
          `${backendUrl}/api/v1/tasks`,
          {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              title: `Governance overdue review ${Date.now()}`,
              description: "Smoke overdue governance review",
              dueDate: yesterday,
              priority: "LOW",
              status: "TODO",
              assignedTo: createdGovernanceUserId,
              relatedEntityType: "quota_risk",
              relatedEntityId: createdGovernanceUserId,
            }),
          }
        );
        assert(overdueReviewResponse.status === 201, `Expected 201 Created for overdue governance review task, got ${overdueReviewResponse.status}`);
        createdGovernanceOverdueTaskIds.push(overdueReviewData.id);

        const { response: automationResponse, data: automationData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/governance-ops/automation`,
          {
            method: "POST",
            headers: authHeaders,
          }
        );
        assert(automationResponse.ok, `Expected 200 OK for governance automation, got ${automationResponse.status}`);
        assert(typeof automationData?.overdueTasksEscalated === "number", "Expected governance automation result payload");
        assert(automationData.overdueTasksEscalated >= 1, "Expected overdue governance tasks to be escalated");
        assert(automationData.escalationTasksCreated >= 1 || automationData.alreadyCoveredEscalations >= 1, "Expected overdue governance escalation coverage");

        const { response: escalatedReviewResponse, data: escalatedReviewData } = await requestJson(
          `${backendUrl}/api/v1/tasks/${overdueReviewData.id}`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(escalatedReviewResponse.ok, `Expected 200 OK for overdue governance review lookup, got ${escalatedReviewResponse.status}`);
        assert(escalatedReviewData?.priority === "HIGH", `Expected overdue governance review priority HIGH, got ${JSON.stringify(escalatedReviewData?.priority)}`);

        const { response: automationTaskResponse, data: automationTaskData } = await requestJson(
          `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=governance_overdue_review`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(automationTaskResponse.ok, `Expected 200 OK for governance overdue review task lookup, got ${automationTaskResponse.status}`);
        assert(automationTaskData && Array.isArray(automationTaskData.content), "Expected paginated overdue governance task response");
        const createdEscalationTaskId = Array.isArray(automationData?.createdTaskIds)
          ? automationData.createdTaskIds.find((taskId) => taskId !== overdueReviewData.id)
          : null;
        const escalationTask = createdEscalationTaskId
          ? automationTaskData.content.find((task) => task.id === createdEscalationTaskId)
          : automationTaskData.content.find((task) => typeof task.title === "string" && task.title.startsWith("Governance escalation: overdue reviews"));
        assert(escalationTask, "Expected governance overdue escalation task");
        createdGovernanceEscalationTaskIds.push(escalationTask.id);
        if (createdEscalationTaskId) {
          assert(escalationTask.priority === "MEDIUM", `Expected governance escalation task priority MEDIUM, got ${JSON.stringify(escalationTask.priority)}`);
          const expectedEscalationDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          assert(typeof escalationTask.dueDate === "string" && escalationTask.dueDate.startsWith(expectedEscalationDueDate), `Expected governance escalation due date ${expectedEscalationDueDate}, got ${JSON.stringify(escalationTask.dueDate)}`);
        }

        const { response: automationInboxResponse, data: automationInboxData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/governance-inbox`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(automationInboxResponse.ok, `Expected 200 OK for automation governance inbox, got ${automationInboxResponse.status}`);
        assert(automationInboxData.overdueReviewTaskCount >= 1, "Expected overdue review count in governance inbox");
        assert(automationInboxData.watchReviewCount >= 1, "Expected at least one watch-band overdue review");
        assert(["WATCH", "HIGH", "CRITICAL"].includes(automationInboxData.reviewSlaStatus), `Expected elevated governance review SLA status, got ${JSON.stringify(automationInboxData.reviewSlaStatus)}`);

        return `Governance inbox returned ${inboxData.totalItems} items, created digest ${digestTask.id}, acknowledged live governance tasks, and escalated ${automationInboxData.overdueReviewTaskCount} overdue review(s) at ${automationInboxData.reviewSlaStatus} status`;
      });

      await runCheck("Territory escalation and auto-remediation", async () => {
        assert(createdGovernanceUserId, "Expected governance owner from prior check");
        assert(governanceTerritory, "Expected governance territory from prior check");
        assert(userId && userId !== createdGovernanceUserId, "Expected a different current user to create mismatches");

        const uniqueSuffix = Date.now();

        const { response: escalationLeadResponse, data: escalationLeadData } = await requestJson(`${backendUrl}/api/v1/leads`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            firstName: "Escalation",
            lastName: `Lead${uniqueSuffix}`,
            email: `escalation.lead.${uniqueSuffix}@example.com`,
            phone: "+263770000000",
            company: "Escalation CRM",
            title: "Regional Sponsor",
            territory: governanceTerritory,
            ownerId: userId,
            source: "WEBSITE",
            estimatedValue: 33000,
            notes: "Smoke escalation mismatch lead",
          }),
        });
        assert(escalationLeadResponse.status === 201, `Expected 201 Created for escalation lead, got ${escalationLeadResponse.status}`);
        createdEscalationLeadId = escalationLeadData?.id;

        const { response: escalationCompanyResponse, data: escalationCompanyData } = await requestJson(`${backendUrl}/api/v1/companies`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            name: `Escalation Account ${uniqueSuffix}`,
            industry: "TECHNOLOGY",
            website: `https://escalation-${uniqueSuffix}.example.com`,
            email: `account.${uniqueSuffix}@example.com`,
            phone: "+263770000001",
            city: "Harare",
            country: "Zimbabwe",
            status: "ACTIVE",
            territory: governanceTerritory,
            ownerId: userId,
          }),
        });
        assert(escalationCompanyResponse.status === 201, `Expected 201 Created for escalation company, got ${escalationCompanyResponse.status}`);
        createdEscalationCompanyId = escalationCompanyData?.id;

        const { response: escalationDealResponse, data: escalationDealData } = await requestJson(`${backendUrl}/api/v1/deals`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            name: `Escalation Deal ${uniqueSuffix}`,
            companyId: createdEscalationCompanyId,
            value: 61000,
            stage: "NEGOTIATION",
            probability: 70,
            expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            ownerId: userId,
            territory: governanceTerritory,
            nextStep: "Territory escalation follow-up",
          }),
        });
        assert(escalationDealResponse.status === 201, `Expected 201 Created for escalation deal, got ${escalationDealResponse.status}`);
        createdEscalationDealId = escalationDealData?.id;

        const { response: escalationSummaryResponse, data: escalationSummaryData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/territory-escalations`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(escalationSummaryResponse.ok, `Expected 200 OK for territory escalations, got ${escalationSummaryResponse.status}`);
        assert(escalationSummaryData && Array.isArray(escalationSummaryData.escalations), "Expected territory escalations payload");
        const escalationItem = escalationSummaryData.escalations.find((item) => item.territory === governanceTerritory);
        assert(escalationItem, "Expected escalation item for governance territory");
        assert(escalationItem.totalExceptions >= 3, `Expected grouped exceptions, got ${escalationItem?.totalExceptions}`);
        assert(escalationItem.suggestedOwnerId === createdGovernanceUserId, `Expected suggested owner ${createdGovernanceUserId}, got ${escalationItem?.suggestedOwnerId}`);
        assert(["HIGH", "CRITICAL"].includes(escalationItem.escalationLevel), `Expected elevated escalation level, got ${escalationItem?.escalationLevel}`);

        const { response: escalationAutomationResponse, data: escalationAutomationData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/territory-escalations/automation`,
          {
            method: "POST",
            headers: authHeaders,
          }
        );
        assert(escalationAutomationResponse.ok, `Expected 200 OK for territory escalation automation, got ${escalationAutomationResponse.status}`);
        assert(typeof escalationAutomationData?.tasksCreated === "number", "Expected territory escalation automation result payload");

        const { response: escalationTaskResponse, data: escalationTaskData } = await requestJson(
          `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=territory_coverage_alert&relatedEntityId=${createdGovernanceUserId}`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(escalationTaskResponse.ok, `Expected 200 OK for territory escalation task lookup, got ${escalationTaskResponse.status}`);
        assert(escalationTaskData && Array.isArray(escalationTaskData.content), "Expected paginated territory escalation task response");
        const createdEscalationTaskId = Array.isArray(escalationAutomationData?.createdTaskIds)
          ? escalationAutomationData.createdTaskIds[0]
          : null;
        const escalationTask = createdEscalationTaskId
          ? escalationTaskData.content.find((task) => task.id === createdEscalationTaskId)
          : escalationTaskData.content.find((task) => typeof task.title === "string" && task.title === `Territory coverage alert: ${governanceTerritory}`);
        assert(escalationTask, "Expected territory coverage alert task");
        createdTerritoryEscalationTaskIds.push(escalationTask.id);
        if (createdEscalationTaskId) {
          assert(escalationTask.priority === "HIGH", `Expected territory escalation task priority HIGH, got ${JSON.stringify(escalationTask.priority)}`);
          const expectedEscalationDueDate = new Date().toISOString().slice(0, 10);
          assert(typeof escalationTask.dueDate === "string" && escalationTask.dueDate.startsWith(expectedEscalationDueDate), `Expected territory escalation due date ${expectedEscalationDueDate}, got ${JSON.stringify(escalationTask.dueDate)}`);
        }

        const { response: remediationResponse, data: remediationData } = await requestJson(
          `${backendUrl}/api/v1/dashboard/territory-exceptions/auto-remediate`,
          {
            method: "POST",
            headers: authHeaders,
          }
        );
        assert(remediationResponse.ok, `Expected 200 OK for territory auto-remediation, got ${remediationResponse.status}`);
        assert(remediationData?.leadsReassigned >= 1, "Expected at least one lead to be auto-remediated");
        assert(remediationData?.companiesReassigned >= 1, "Expected at least one company to be auto-remediated");
        assert(remediationData?.dealsReassigned >= 1, "Expected at least one deal to be auto-remediated");

        const { response: remediatedLeadResponse, data: remediatedLeadData } = await requestJson(
          `${backendUrl}/api/v1/leads/${createdEscalationLeadId}`,
          { method: "GET", headers: authHeaders }
        );
        assert(remediatedLeadResponse.ok, `Expected 200 OK for remediated lead fetch, got ${remediatedLeadResponse.status}`);
        assert(remediatedLeadData?.ownerId === createdGovernanceUserId, `Expected remediated lead owner ${createdGovernanceUserId}, got ${remediatedLeadData?.ownerId}`);
        assert(remediatedLeadData?.territoryMismatch === false, "Expected remediated lead territory mismatch to clear");

        const { response: remediatedCompanyResponse, data: remediatedCompanyData } = await requestJson(
          `${backendUrl}/api/v1/companies/${createdEscalationCompanyId}`,
          { method: "GET", headers: authHeaders }
        );
        assert(remediatedCompanyResponse.ok, `Expected 200 OK for remediated company fetch, got ${remediatedCompanyResponse.status}`);
        assert(remediatedCompanyData?.ownerId === createdGovernanceUserId, `Expected remediated company owner ${createdGovernanceUserId}, got ${remediatedCompanyData?.ownerId}`);
        assert(remediatedCompanyData?.territoryMismatch === false, "Expected remediated company territory mismatch to clear");

        const { response: remediatedDealResponse, data: remediatedDealData } = await requestJson(
          `${backendUrl}/api/v1/deals/${createdEscalationDealId}`,
          { method: "GET", headers: authHeaders }
        );
        assert(remediatedDealResponse.ok, `Expected 200 OK for remediated deal fetch, got ${remediatedDealResponse.status}`);
        assert(remediatedDealData?.ownerId === createdGovernanceUserId, `Expected remediated deal owner ${createdGovernanceUserId}, got ${remediatedDealData?.ownerId}`);
        assert(remediatedDealData?.territoryMismatch === false, "Expected remediated deal territory mismatch to clear");

        return `Escalated ${governanceTerritory} and auto-remediated lead ${createdEscalationLeadId}, account ${createdEscalationCompanyId}, and deal ${createdEscalationDealId}`;
      });
    } else {
      record("Workspace database settings", "skip", "Authenticated user is not a tenant admin");
      record("Lead workflow settings", "skip", "Authenticated user is not a tenant admin");
      record("Deal rescue workflow settings", "skip", "Authenticated user is not a tenant admin");
      record("Quota risk workflow settings", "skip", "Authenticated user is not a tenant admin");
      record("Governance ops workflow settings", "skip", "Authenticated user is not a tenant admin");
      record("Territory escalation workflow settings", "skip", "Authenticated user is not a tenant admin");
      record("Revenue ops summary", "skip", "Authenticated user is not a tenant admin");
    record("Territory lead routing", "skip", "Authenticated user is not a tenant admin");
    record("Territory account and deal alignment", "skip", "Authenticated user is not a tenant admin");
      record("Territory governance reassignment", "skip", "Authenticated user is not a tenant admin");
      record("Account territory governance reassignment", "skip", "Authenticated user is not a tenant admin");
      record("Quota risk alert automation", "skip", "Authenticated user is not a tenant admin");
      record("Territory exception automation", "skip", "Authenticated user is not a tenant admin");
      record("Governance inbox and digest", "skip", "Authenticated user is not a tenant admin");
      record("Territory escalation and auto-remediation", "skip", "Authenticated user is not a tenant admin");
    }

  await runCheck("Automation run history", async () => {
    const { response, data } = await requestJson(`${backendUrl}/api/v1/dashboard/automation-runs?size=10`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(response.ok, `Expected 200 OK, got ${response.status}`);
    assert(Array.isArray(data), "Expected automation run history array");
    assert(data.length > 0, "Expected at least one automation run");
    const recentRun = data.find(
      (item) =>
        item.automationKey === "TERRITORY_ESCALATION"
        || item.automationKey === "GOVERNANCE_OPS"
        || item.automationKey === "DEAL_RESCUE"
    );
    assert(recentRun, `Expected recent workflow run, got ${JSON.stringify(data)}`);
    assert(typeof recentRun.runStatus === "string" && recentRun.runStatus.length > 0, "Expected run status");
    assert(typeof recentRun.triggerSource === "string" && recentRun.triggerSource.length > 0, "Expected trigger source");
    return `Tracked ${recentRun.automationKey} via ${recentRun.triggerSource}`;
  });

  if (skipAi || !aiHealthy) {
    record("AI flow checks", "skip", "Skipped because AI checks were disabled or AI health failed");
  } else {
    await runCheck("AI chat", async () => {
      const { response, data } = await requestJson(`${aiUrl}/chat`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          messages: [{ role: "user", content: "Show me a quick summary of my pipeline" }],
          conversation_id: "smoke-chat",
          user_id: userId,
        }),
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}`);
      assert(data && typeof data.message === "string" && data.message.length > 0, "Expected chat message");
      return "Chat returned a non-empty response";
    });

    await runCheck("AI latest forecast", async () => {
      const { response, data } = await requestJson(`${aiUrl}/forecasting/latest`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}`);
      assert(data && data.success === true, `Expected success=true, got ${JSON.stringify(data)}`);
      return `Weighted pipeline ${data.weighted_pipeline ?? 0}`;
    });

    await runCheck("AI report generation", async () => {
      const { response, data } = await requestJson(`${aiUrl}/reports/generate`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          report_type: "sales_pipeline",
          parameters: {},
        }),
      });
      assert(response.ok, `Expected 200 OK, got ${response.status}`);
      assert(data && data.success === true, `Expected success=true, got ${JSON.stringify(data)}`);
      assert(Array.isArray(data.insights), "Expected insights array");
      return `Generated ${data.insights.length} report insights`;
    });

    if (firstLeadId) {
      await runCheck("AI lead scoring", async () => {
        const { response, data } = await requestJson(`${aiUrl}/agents/score-lead`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            lead_id: firstLeadId,
          }),
        });
        assert(response.ok, `Expected 200 OK, got ${response.status}`);
        assert(data && data.success === true, `Expected success=true, got ${JSON.stringify(data)}`);
        assert(typeof data.score === "number", "Expected numeric lead score");
        return `Lead ${firstLeadId} scored at ${data.score}`;
      });
    } else {
      record("AI lead scoring", "skip", "No leads available in the current tenant");
    }
  }

  const failed = results.filter((item) => item.status === "fail");
  const skipped = results.filter((item) => item.status === "skip");

  if (originalLeadWorkflow && userRole === "ADMIN") {
    const restoreWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/lead-intake`, {
        method: "PUT",
        signal: restoreWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalLeadWorkflow),
      });
    } finally {
      restoreWorkflow.dispose();
    }
  }

  if (originalDealRescueWorkflow && userRole === "ADMIN") {
    const restoreDealWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/deal-rescue`, {
        method: "PUT",
        signal: restoreDealWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalDealRescueWorkflow),
      });
    } finally {
      restoreDealWorkflow.dispose();
    }
  }

  if (originalQuotaRiskWorkflow && userRole === "ADMIN") {
    const restoreQuotaWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/quota-risk`, {
        method: "PUT",
        signal: restoreQuotaWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalQuotaRiskWorkflow),
      });
    } finally {
      restoreQuotaWorkflow.dispose();
    }
  }

  if (originalDealApprovalWorkflow && userRole === "ADMIN") {
    const restoreApprovalWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/deal-approval`, {
        method: "PUT",
        signal: restoreApprovalWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalDealApprovalWorkflow),
      });
    } finally {
      restoreApprovalWorkflow.dispose();
    }
  }

  if (originalGovernanceOpsWorkflow && userRole === "ADMIN") {
    const restoreGovernanceWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/governance-ops`, {
        method: "PUT",
        signal: restoreGovernanceWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalGovernanceOpsWorkflow),
      });
    } finally {
      restoreGovernanceWorkflow.dispose();
    }
  }

  if (originalTerritoryEscalationWorkflow && userRole === "ADMIN") {
    const restoreTerritoryEscalationWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/territory-escalation`, {
        method: "PUT",
        signal: restoreTerritoryEscalationWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalTerritoryEscalationWorkflow),
      });
    } finally {
      restoreTerritoryEscalationWorkflow.dispose();
    }
  }

  if (createdWorkflowTaskId && userRole === "ADMIN") {
    const cleanupWorkflowTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdWorkflowTaskId}`, {
        method: "DELETE",
        signal: cleanupWorkflowTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupWorkflowTask.dispose();
    }
  }

  if (createdWorkflowLeadId && userRole === "ADMIN") {
    const cleanupWorkflowLead = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/leads/${createdWorkflowLeadId}`, {
        method: "DELETE",
        signal: cleanupWorkflowLead.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupWorkflowLead.dispose();
    }
  }

  if (createdDealWorkflowTaskId && userRole === "ADMIN") {
    const cleanupDealWorkflowTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdDealWorkflowTaskId}`, {
        method: "DELETE",
        signal: cleanupDealWorkflowTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupDealWorkflowTask.dispose();
    }
  }

  if (createdDealWorkflowDealId && userRole === "ADMIN") {
    const cleanupDealWorkflowDeal = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/deals/${createdDealWorkflowDealId}`, {
        method: "DELETE",
        signal: cleanupDealWorkflowDeal.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupDealWorkflowDeal.dispose();
    }
  }

  if (createdTaskId && userRole === "ADMIN") {
    const cleanupTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdTaskId}`, {
        method: "DELETE",
        signal: cleanupTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupTask.dispose();
    }
  }

  if (createdLeadId && userRole === "ADMIN") {
    const cleanupLead = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/leads/${createdLeadId}`, {
        method: "DELETE",
        signal: cleanupLead.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupLead.dispose();
    }
  }

  if (createdTerritoryTaskId && userRole === "ADMIN") {
    const cleanupTerritoryTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdTerritoryTaskId}`, {
        method: "DELETE",
        signal: cleanupTerritoryTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupTerritoryTask.dispose();
    }
  }

  if (createdTerritoryLeadId && userRole === "ADMIN") {
    const cleanupTerritoryLead = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/leads/${createdTerritoryLeadId}`, {
        method: "DELETE",
        signal: cleanupTerritoryLead.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupTerritoryLead.dispose();
    }
  }

  if (createdTerritoryDealTaskId && userRole === "ADMIN") {
    const cleanupTerritoryDealTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdTerritoryDealTaskId}`, {
        method: "DELETE",
        signal: cleanupTerritoryDealTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupTerritoryDealTask.dispose();
    }
  }

  if (createdTerritoryRescueTaskId && userRole === "ADMIN") {
    const cleanupTerritoryRescueTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdTerritoryRescueTaskId}`, {
        method: "DELETE",
        signal: cleanupTerritoryRescueTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupTerritoryRescueTask.dispose();
    }
  }

  if (createdTerritoryDealId && userRole === "ADMIN") {
    const cleanupTerritoryDeal = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/deals/${createdTerritoryDealId}`, {
        method: "DELETE",
        signal: cleanupTerritoryDeal.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupTerritoryDeal.dispose();
    }
  }

  if (createdDealTaskId && userRole === "ADMIN") {
    const cleanupDealTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdDealTaskId}`, {
        method: "DELETE",
        signal: cleanupDealTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupDealTask.dispose();
    }
  }

  if (createdDealId && userRole === "ADMIN") {
    const cleanupDeal = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/deals/${createdDealId}`, {
        method: "DELETE",
        signal: cleanupDeal.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupDeal.dispose();
    }
  }

  if (createdAccountDealTaskId && userRole === "ADMIN") {
    const cleanupAccountDealTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdAccountDealTaskId}`, {
        method: "DELETE",
        signal: cleanupAccountDealTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupAccountDealTask.dispose();
    }
  }

  if (createdAccountDealId && userRole === "ADMIN") {
    const cleanupAccountDeal = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/deals/${createdAccountDealId}`, {
        method: "DELETE",
        signal: cleanupAccountDeal.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupAccountDeal.dispose();
    }
  }

  if (userRole === "ADMIN") {
    for (const taskId of createdAutomationTaskIds.reverse()) {
      const cleanupAutomationTask = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/tasks/${taskId}`, {
          method: "DELETE",
          signal: cleanupAutomationTask.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupAutomationTask.dispose();
      }
    }
  }

  if (createdAutomationDealId && userRole === "ADMIN") {
    const cleanupAutomationDeal = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/deals/${createdAutomationDealId}`, {
        method: "DELETE",
        signal: cleanupAutomationDeal.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupAutomationDeal.dispose();
    }
  }

  if (createdApprovalTaskId && userRole === "ADMIN") {
    const cleanupApprovalTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdApprovalTaskId}`, {
        method: "DELETE",
        signal: cleanupApprovalTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupApprovalTask.dispose();
    }
  }

  if (createdApprovalDealId && userRole === "ADMIN") {
    const cleanupApprovalDeal = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/deals/${createdApprovalDealId}`, {
        method: "DELETE",
        signal: cleanupApprovalDeal.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupApprovalDeal.dispose();
    }
  }

    if (userRole === "ADMIN") {
      for (const taskId of createdGovernanceEscalationTaskIds.reverse()) {
        const cleanupGovernanceEscalationTask = createTimeoutSignal(timeoutMs);
        try {
          await fetch(`${backendUrl}/api/v1/tasks/${taskId}`, {
            method: "DELETE",
            signal: cleanupGovernanceEscalationTask.signal,
            headers: authHeaders,
          });
        } finally {
          cleanupGovernanceEscalationTask.dispose();
        }
      }

      for (const taskId of createdGovernanceOverdueTaskIds.reverse()) {
        const cleanupGovernanceOverdueTask = createTimeoutSignal(timeoutMs);
        try {
          await fetch(`${backendUrl}/api/v1/tasks/${taskId}`, {
            method: "DELETE",
            signal: cleanupGovernanceOverdueTask.signal,
            headers: authHeaders,
          });
        } finally {
          cleanupGovernanceOverdueTask.dispose();
        }
      }

      for (const taskId of createdGovernanceDigestTaskIds.reverse()) {
        const cleanupGovernanceDigestTask = createTimeoutSignal(timeoutMs);
        try {
          await fetch(`${backendUrl}/api/v1/tasks/${taskId}`, {
            method: "DELETE",
            signal: cleanupGovernanceDigestTask.signal,
            headers: authHeaders,
          });
        } finally {
          cleanupGovernanceDigestTask.dispose();
        }
      }

      for (const taskId of createdTerritoryEscalationTaskIds.reverse()) {
        const cleanupTerritoryEscalationTask = createTimeoutSignal(timeoutMs);
        try {
          await fetch(`${backendUrl}/api/v1/tasks/${taskId}`, {
            method: "DELETE",
            signal: cleanupTerritoryEscalationTask.signal,
            headers: authHeaders,
          });
        } finally {
          cleanupTerritoryEscalationTask.dispose();
        }
      }

      for (const taskId of createdTerritoryExceptionTaskIds.reverse()) {
        const cleanupTerritoryExceptionTask = createTimeoutSignal(timeoutMs);
        try {
          await fetch(`${backendUrl}/api/v1/tasks/${taskId}`, {
            method: "DELETE",
          signal: cleanupTerritoryExceptionTask.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupTerritoryExceptionTask.dispose();
      }
    }

    for (const taskId of createdQuotaRiskTaskIds.reverse()) {
      const cleanupQuotaRiskTask = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/tasks/${taskId}`, {
          method: "DELETE",
          signal: cleanupQuotaRiskTask.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupQuotaRiskTask.dispose();
      }
      }
    }

    if (createdEscalationDealId && userRole === "ADMIN") {
      const cleanupEscalationDeal = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/deals/${createdEscalationDealId}`, {
          method: "DELETE",
          signal: cleanupEscalationDeal.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupEscalationDeal.dispose();
      }
    }

    if (createdEscalationCompanyId && userRole === "ADMIN") {
      const cleanupEscalationCompany = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/companies/${createdEscalationCompanyId}`, {
          method: "DELETE",
          signal: cleanupEscalationCompany.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupEscalationCompany.dispose();
      }
    }

    if (createdEscalationLeadId && userRole === "ADMIN") {
      const cleanupEscalationLead = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/leads/${createdEscalationLeadId}`, {
          method: "DELETE",
          signal: cleanupEscalationLead.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupEscalationLead.dispose();
      }
    }

    if (createdExceptionLeadId && userRole === "ADMIN") {
      const cleanupExceptionLead = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/leads/${createdExceptionLeadId}`, {
        method: "DELETE",
        signal: cleanupExceptionLead.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupExceptionLead.dispose();
    }
  }

  if (originalRevenueOps && userRole === "ADMIN") {
    const cleanupRevenueOps = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/users/${userId}/revenue-ops`, {
        method: "PATCH",
        signal: cleanupRevenueOps.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalRevenueOps),
      });
    } finally {
      cleanupRevenueOps.dispose();
    }
  }

  if (createdRoutingTerritoryId && userRole === "ADMIN") {
    const cleanupTerritoryCatalog = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/territories/${createdRoutingTerritoryId}`, {
        method: "DELETE",
        signal: cleanupTerritoryCatalog.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupTerritoryCatalog.dispose();
    }
  }

  if (createdGovernanceUserId && userRole === "ADMIN") {
    const cleanupGovernanceUserRevenueOps = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/users/${createdGovernanceUserId}/revenue-ops`, {
        method: "PATCH",
        signal: cleanupGovernanceUserRevenueOps.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          territory: null,
          quarterlyQuota: null,
          annualQuota: null,
        }),
      });
    } finally {
      cleanupGovernanceUserRevenueOps.dispose();
    }

    const cleanupGovernanceUserStatus = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/users/${createdGovernanceUserId}/status`, {
        method: "PATCH",
        signal: cleanupGovernanceUserStatus.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      });
    } finally {
      cleanupGovernanceUserStatus.dispose();
    }
  }

  if (createdGovernanceTerritoryId && userRole === "ADMIN") {
    const cleanupGovernanceTerritory = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/territories/${createdGovernanceTerritoryId}`, {
        method: "DELETE",
        signal: cleanupGovernanceTerritory.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupGovernanceTerritory.dispose();
    }
  }

  if (userRole === "ADMIN") {
    for (const contactId of createdContactIds.reverse()) {
      const cleanupContact = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/contacts/${contactId}`, {
          method: "DELETE",
          signal: cleanupContact.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupContact.dispose();
      }
    }

    for (const companyId of createdCompanyIds.reverse()) {
      const cleanupCompany = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/companies/${companyId}`, {
          method: "DELETE",
          signal: cleanupCompany.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupCompany.dispose();
      }
    }
  }

  console.log("");
  console.log(`Completed ${results.length} checks: ${results.length - failed.length - skipped.length} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[FAIL] Smoke runner: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
