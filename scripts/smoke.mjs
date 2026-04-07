const backendUrl = process.env.CRM_API_URL || "http://localhost:8080";
const aiUrl = process.env.CRM_AI_URL || "http://localhost:8000";
const email = process.env.CRM_SMOKE_EMAIL || "john@example.com";
const password = process.env.CRM_SMOKE_PASSWORD || "Codex123!";
const workspaceSlug = process.env.CRM_SMOKE_WORKSPACE || "";
const skipAi = /^(1|true|yes)$/i.test(process.env.CRM_SMOKE_SKIP_AI || "");
const timeoutMs = Number(process.env.CRM_SMOKE_TIMEOUT_MS || 45000);

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
  let tenantSlug = workspaceSlug;
  let createdLeadId = null;
  let createdTaskId = null;
  let createdCampaignSegmentId = null;
  let createdCampaignSegmentLeadId = null;
  let createdNurtureJourneyId = null;
  let createdSegmentJourneyCampaignId = null;
  let originalLeadWorkflow = null;
  let originalCampaignNurtureWorkflow = null;
  let originalCaseAssignmentWorkflow = null;
  let originalCaseSlaWorkflow = null;
  let originalDealRescueWorkflow = null;
  let originalQuotaRiskWorkflow = null;
  let originalDealApprovalWorkflow = null;
  let originalGovernanceOpsWorkflow = null;
  let originalTerritoryEscalationWorkflow = null;
  let createdWorkflowLeadId = null;
  let createdWorkflowTaskId = null;
  let createdCampaignWorkflowCampaignId = null;
  let createdCampaignWorkflowJourneyId = null;
  let createdCampaignWorkflowLeadId = null;
  let createdCampaignWorkflowTaskId = null;
  let createdCampaignWorkflowNextTaskId = null;
  const createdAutomationRuleIds = [];
  let createdAutomationLeadId = null;
  let createdAutomationCaseId = null;
  let createdCaseWorkflowCaseId = null;
  let createdCaseResponseTaskId = null;
  let createdCaseResolutionTaskId = null;
  let createdCaseEscalationTaskId = null;
  let createdAssignmentCaseId = null;
  let createdAssignmentTaskId = null;
  let createdCaseAssignmentWorkflowCaseId = null;
  let createdCaseAssignmentWorkflowTaskId = null;
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
  let scopedManagerId = null;
  let scopedOwnerRepId = null;
  let scopedTerritoryRepId = null;
  let scopedOutsiderRepId = null;
  let scopedLeadId = null;
  let scopedTeamTerritoryId = null;
  let scopedOutsideTerritoryId = null;
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
  let createdAutomationGenericDealId = null;
  let createdApprovalDealId = null;
  let createdApprovalTaskId = null;
  let createdQuoteId = null;
  let createdCpqQuoteId = null;
  let createdContractId = null;
  let createdRenewedContractId = null;
  const createdAutomationTaskIds = [];
  const createdInvoiceIds = [];
  const createdProductIds = [];
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
    assert(Array.isArray(data.permissions) && data.permissions.length > 0, "Missing permissions");
    assert(Array.isArray(data.dataScopes) && data.dataScopes.length > 0, "Missing dataScopes");
    assert(data.permissions.includes("USERS_MANAGE") || data.permissions.includes("SUPPORT_VIEW"), "Expected permission payload in auth response");
    accessToken = data.accessToken;
    userId = data.userId;
    userRole = data.role;
    tenantSlug = data.tenantSlug || tenantSlug;
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

  await runCheck("Scoped RBAC data access", async () => {
    assert(userRole === "ADMIN", "Scoped access verification requires an admin smoke user");

    const uniqueSuffix = Date.now();
    const teamTerritoryName = `RBAC Team ${uniqueSuffix}`;
    const outsideTerritoryName = `RBAC Outside ${uniqueSuffix}`;
    const sharedPassword = "Codex123!";

    const { response: createTeamTerritoryResponse, data: createdTeamTerritory } = await requestJson(`${backendUrl}/api/v1/territories`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: teamTerritoryName,
        description: "Smoke scoped access team territory",
        isActive: true,
      }),
    });
    assert(createTeamTerritoryResponse.ok, `Expected 200 OK for team territory create, got ${createTeamTerritoryResponse.status}`);
    scopedTeamTerritoryId = createdTeamTerritory?.id;

    const { response: createOutsideTerritoryResponse, data: createdOutsideTerritory } = await requestJson(`${backendUrl}/api/v1/territories`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: outsideTerritoryName,
        description: "Smoke scoped access outside territory",
        isActive: true,
      }),
    });
    assert(createOutsideTerritoryResponse.ok, `Expected 200 OK for outside territory create, got ${createOutsideTerritoryResponse.status}`);
    scopedOutsideTerritoryId = createdOutsideTerritory?.id;

    const { response: managerCreateResponse, data: managerUser } = await requestJson(`${backendUrl}/api/v1/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Scope",
        lastName: "Manager",
        email: `scope-manager-${uniqueSuffix}@example.com`,
        password: sharedPassword,
        role: "MANAGER",
        isActive: true,
        territory: teamTerritoryName,
      }),
    });
    assert(managerCreateResponse.status === 201, `Expected 201 Created for manager user, got ${managerCreateResponse.status}`);
    scopedManagerId = managerUser?.id;

    const { response: ownerCreateResponse, data: ownerUser } = await requestJson(`${backendUrl}/api/v1/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Scope",
        lastName: "Owner",
        email: `scope-owner-${uniqueSuffix}@example.com`,
        password: sharedPassword,
        role: "SALES_REP",
        isActive: true,
        territory: teamTerritoryName,
        managerId: scopedManagerId,
      }),
    });
    assert(ownerCreateResponse.status === 201, `Expected 201 Created for owner rep, got ${ownerCreateResponse.status}`);
    scopedOwnerRepId = ownerUser?.id;

    const { response: territoryCreateResponse, data: territoryUser } = await requestJson(`${backendUrl}/api/v1/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Scope",
        lastName: "Territory",
        email: `scope-territory-${uniqueSuffix}@example.com`,
        password: sharedPassword,
        role: "SALES_REP",
        isActive: true,
        territory: teamTerritoryName,
      }),
    });
    assert(territoryCreateResponse.status === 201, `Expected 201 Created for territory rep, got ${territoryCreateResponse.status}`);
    scopedTerritoryRepId = territoryUser?.id;

    const { response: outsiderCreateResponse, data: outsiderUser } = await requestJson(`${backendUrl}/api/v1/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Scope",
        lastName: "Outsider",
        email: `scope-outsider-${uniqueSuffix}@example.com`,
        password: sharedPassword,
        role: "SALES_REP",
        isActive: true,
        territory: outsideTerritoryName,
      }),
    });
    assert(outsiderCreateResponse.status === 201, `Expected 201 Created for outsider rep, got ${outsiderCreateResponse.status}`);
    scopedOutsiderRepId = outsiderUser?.id;

    const loginFor = async (scopedEmail) => {
      const { response, data } = await requestJson(`${backendUrl}/api/v1/auth/login`, {
        method: "POST",
        body: JSON.stringify({
          email: scopedEmail,
          password: sharedPassword,
          workspaceSlug: tenantSlug,
        }),
      });
      assert(response.ok, `Expected scoped login success for ${scopedEmail}, got ${response.status}`);
      assert(typeof data?.accessToken === "string" && data.accessToken.length > 0, `Missing access token for ${scopedEmail}`);
      return {
        token: data.accessToken,
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
        },
      };
    };

    const managerSession = await loginFor(`scope-manager-${uniqueSuffix}@example.com`);
    const ownerSession = await loginFor(`scope-owner-${uniqueSuffix}@example.com`);
    const territorySession = await loginFor(`scope-territory-${uniqueSuffix}@example.com`);
    const outsiderSession = await loginFor(`scope-outsider-${uniqueSuffix}@example.com`);

    const { response: createLeadResponse, data: createdScopedLead } = await requestJson(`${backendUrl}/api/v1/leads`, {
      method: "POST",
      headers: ownerSession.headers,
      body: JSON.stringify({
        firstName: "Scoped",
        lastName: "Lead",
        email: `scoped-lead-${uniqueSuffix}@example.com`,
        phone: "+263771234567",
        company: "Scoped Access Co",
        title: "Operations Director",
        territory: teamTerritoryName,
        source: "WEBSITE",
        status: "NEW",
        estimatedValue: 12500,
        notes: "Created by owner rep",
        ownerId: scopedOwnerRepId,
      }),
    });
    assert(createLeadResponse.status === 201, `Expected 201 Created for scoped lead, got ${createLeadResponse.status}`);
    scopedLeadId = createdScopedLead?.id;

    const { response: territoryReadResponse, data: territoryReadLead } = await requestJson(`${backendUrl}/api/v1/leads/${scopedLeadId}`, {
      method: "GET",
      headers: territorySession.headers,
    });
    assert(territoryReadResponse.ok, `Expected territory rep to read scoped lead, got ${territoryReadResponse.status}`);
    assert(territoryReadLead?.id === scopedLeadId, "Expected territory rep to read the scoped lead");

    const { response: territoryWriteResponse } = await requestJson(`${backendUrl}/api/v1/leads/${scopedLeadId}`, {
      method: "PUT",
      headers: territorySession.headers,
      body: JSON.stringify({
        firstName: "Scoped",
        lastName: "Lead",
        email: `scoped-lead-${uniqueSuffix}@example.com`,
        phone: "+263771234567",
        company: "Scoped Access Co",
        title: "Operations Director",
        territory: teamTerritoryName,
        source: "WEBSITE",
        status: "NEW",
        estimatedValue: 12500,
        notes: "Territory peer attempted write",
        ownerId: scopedOwnerRepId,
      }),
    });
    assert(territoryWriteResponse.status === 403, `Expected 403 for territory peer write, got ${territoryWriteResponse.status}`);

    const { response: outsiderReadResponse } = await requestJson(`${backendUrl}/api/v1/leads/${scopedLeadId}`, {
      method: "GET",
      headers: outsiderSession.headers,
    });
    assert(outsiderReadResponse.status === 403, `Expected 403 for outsider lead read, got ${outsiderReadResponse.status}`);

    const { response: managerReadResponse } = await requestJson(`${backendUrl}/api/v1/leads/${scopedLeadId}`, {
      method: "GET",
      headers: managerSession.headers,
    });
    assert(managerReadResponse.ok, `Expected manager to read team lead, got ${managerReadResponse.status}`);

    const { response: managerWriteResponse, data: managerWriteLead } = await requestJson(`${backendUrl}/api/v1/leads/${scopedLeadId}`, {
      method: "PUT",
      headers: managerSession.headers,
      body: JSON.stringify({
        firstName: "Scoped",
        lastName: "Lead",
        email: `scoped-lead-${uniqueSuffix}@example.com`,
        phone: "+263771234567",
        company: "Scoped Access Co",
        title: "Operations Director",
        territory: teamTerritoryName,
        source: "WEBSITE",
        status: "CONTACTED",
        estimatedValue: 12500,
        notes: "Manager team update applied",
        ownerId: scopedOwnerRepId,
      }),
    });
    assert(managerWriteResponse.ok, `Expected manager to update team lead, got ${managerWriteResponse.status}`);
    assert(managerWriteLead?.notes === "Manager team update applied", `Expected manager note update, got ${managerWriteLead?.notes}`);

    return `Verified own/team/territory scopes: peer read only, outsider blocked, manager write allowed on team lead ${scopedLeadId}`;
  });

  await runCheck("Campaign CRUD and stats", async () => {
    const uniqueSuffix = Date.now();
    const campaignName = `Smoke Campaign ${uniqueSuffix}`;

    const { response: createResponse, data: createdCampaign } = await requestJson(`${backendUrl}/api/v1/campaigns`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: campaignName,
        type: "EMAIL",
        status: "PLANNED",
        channel: "EMAIL",
        targetAudience: "Finance leaders",
        segmentType: "INDUSTRY",
        segmentName: "Finance Directors",
        primaryPersona: "Finance Director",
        territoryFocus: "Harare",
        journeyStage: "AWARENESS",
        autoEnrollNewLeads: true,
        nurtureCadenceDays: 4,
        nurtureTouchCount: 5,
        primaryCallToAction: "Book a pipeline review",
        audienceSize: 2500,
        budget: 12000,
        expectedRevenue: 45000,
        actualRevenue: 8000,
        leadsGenerated: 24,
        opportunitiesCreated: 6,
        conversions: 2,
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        description: "Smoke campaign coverage",
      }),
    });
    assert(createResponse.status === 201, `Expected 201 Created, got ${createResponse.status}`);
    assert(createdCampaign && typeof createdCampaign.id === "string" && createdCampaign.id.length > 0, "Expected campaign id");

    const { response: listResponse, data: listData } = await requestJson(
      `${backendUrl}/api/v1/campaigns?search=${encodeURIComponent(campaignName)}&size=10`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(listResponse.ok, `Expected 200 OK for campaign list, got ${listResponse.status}`);
    assert(listData && Array.isArray(listData.content), "Expected paginated campaigns response");
    const listedCampaign = listData.content.find((item) => item.id === createdCampaign.id);
    assert(listedCampaign, "Expected created campaign in campaign list");
    assert(listedCampaign.segmentName === "Finance Directors", `Expected segment name, got ${listedCampaign?.segmentName}`);
    assert(listedCampaign.nurtureTouchCount === 5, `Expected nurture touch count, got ${listedCampaign?.nurtureTouchCount}`);

    const { response: statsResponse, data: statsData } = await requestJson(`${backendUrl}/api/v1/campaigns/statistics`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(statsResponse.ok, `Expected 200 OK for campaign stats, got ${statsResponse.status}`);
    assert(statsData && typeof statsData.totalCampaigns === "number" && statsData.totalCampaigns > 0, "Expected campaign stats totalCampaigns");

    const { response: deleteResponse } = await requestJson(`${backendUrl}/api/v1/campaigns/${createdCampaign.id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    assert(deleteResponse.status === 204, `Expected 204 No Content on campaign delete, got ${deleteResponse.status}`);

    return `Created, listed, measured, and archived campaign ${campaignName}`;
  });

  await runCheck("Campaign segments and nurture journeys", async () => {
    const uniqueSuffix = Date.now();

    const { response: segmentResponse, data: segmentData } = await requestJson(`${backendUrl}/api/v1/campaigns/segments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Finance Segment ${uniqueSuffix}`,
        description: "Reusable finance persona segment",
        segmentType: "PERSONA",
        targetAudience: "Finance leaders",
        primaryPersona: "Director",
        territoryFocus: "Harare",
        minLeadScore: 60,
        minEstimatedValue: 9000,
        maxEstimatedValue: 20000,
        titleKeyword: "Finance",
        companyKeyword: "Segment",
        sourceFilters: ["WEBSITE", "EVENT"],
        statusFilters: ["NEW", "CONTACTED", "QUALIFIED"],
        includeCampaignAttributedOnly: false,
        isActive: true,
        notes: "Smoke reusable segment",
      }),
    });
    assert(segmentResponse.status === 201, `Expected 201 Created for campaign segment, got ${segmentResponse.status}`);
    createdCampaignSegmentId = segmentData?.id;

    const { response: segmentLeadResponse, data: segmentLeadData } = await requestJson(`${backendUrl}/api/v1/leads`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Segment",
        lastName: `Lead${uniqueSuffix}`,
        email: `segment.lead.${uniqueSuffix}@example.com`,
        company: `Segment Finance ${uniqueSuffix}`,
        title: "Finance Director",
        territory: "Harare",
        source: "WEBSITE",
        estimatedValue: 12000,
        notes: "Smoke lead for advanced segment matching",
      }),
    });
    assert(segmentLeadResponse.status === 201, `Expected 201 Created for advanced segment lead, got ${segmentLeadResponse.status}`);
    createdCampaignSegmentLeadId = segmentLeadData?.id;
    assert(segmentLeadData?.score >= 60, `Expected advanced segment lead score >= 60, got ${segmentLeadData?.score}`);

    const { response: previewResponse, data: previewData } = await requestJson(`${backendUrl}/api/v1/campaigns/segments/${createdCampaignSegmentId}/preview`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(previewResponse.ok, `Expected 200 OK for campaign segment preview, got ${previewResponse.status}`);
    assert(typeof previewData?.matchedLeadCount === "number" && previewData.matchedLeadCount >= 1, "Expected campaign segment preview count");

    const { response: journeyResponse, data: journeyData } = await requestJson(`${backendUrl}/api/v1/campaigns/journeys`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Expansion Journey ${uniqueSuffix}`,
        description: "Reusable nurture journey",
        journeyStage: "CONSIDERATION",
        autoEnrollNewLeads: true,
        defaultCadenceDays: 2,
        defaultTouchCount: 5,
        defaultCallToAction: "Book a discovery call",
        successMetric: "Qualified meetings booked",
        isActive: true,
        notes: "Smoke reusable journey",
      }),
    });
    assert(journeyResponse.status === 201, `Expected 201 Created for nurture journey, got ${journeyResponse.status}`);
    createdNurtureJourneyId = journeyData?.id;

    const { response: stepResponse, data: stepData } = await requestJson(`${backendUrl}/api/v1/campaigns/journeys/${createdNurtureJourneyId}/steps`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Discovery Email",
        sequenceOrder: 1,
        waitDays: 3,
        channel: "EMAIL",
        taskPriority: "MEDIUM",
        objective: "Book a discovery conversation",
        taskTitleTemplate: "Discovery email for {leadName}",
        taskDescriptionTemplate: "Send the discovery email and ask {leadName} to {callToAction}.",
        callToAction: "book a discovery call",
        isActive: true,
      }),
    });
    assert(stepResponse.status === 201, `Expected 201 Created for nurture journey step, got ${stepResponse.status}`);
    assert(stepData?.journeyId === createdNurtureJourneyId, `Expected journey step to belong to journey, got ${stepData?.journeyId}`);

    const { response: stepsResponse, data: stepsData } = await requestJson(`${backendUrl}/api/v1/campaigns/journeys/${createdNurtureJourneyId}/steps`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(stepsResponse.ok, `Expected 200 OK for nurture journey steps, got ${stepsResponse.status}`);
    assert(Array.isArray(stepsData) && stepsData.length >= 1, "Expected nurture journey steps");
    assert(stepsData[0]?.name === "Discovery Email", `Expected first nurture journey step, got ${stepsData[0]?.name}`);

    const { response: journeyDetailResponse, data: journeyDetailData } = await requestJson(`${backendUrl}/api/v1/campaigns/journeys/${createdNurtureJourneyId}`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(journeyDetailResponse.ok, `Expected 200 OK for nurture journey detail, got ${journeyDetailResponse.status}`);
    assert(journeyDetailData?.stepCount === 1, `Expected journey step count 1, got ${journeyDetailData?.stepCount}`);
    assert(journeyDetailData?.firstActiveStepName === "Discovery Email", `Expected first active journey step name, got ${journeyDetailData?.firstActiveStepName}`);

    const { response: campaignResponse, data: campaignData } = await requestJson(`${backendUrl}/api/v1/campaigns`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Segment Journey Campaign ${uniqueSuffix}`,
        type: "EMAIL",
        status: "ACTIVE",
        channel: "EMAIL",
        segmentId: createdCampaignSegmentId,
        journeyId: createdNurtureJourneyId,
        budget: 15000,
        expectedRevenue: 60000,
        actualRevenue: 12000,
        leadsGenerated: 18,
        opportunitiesCreated: 5,
        conversions: 2,
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        description: "Smoke campaign using reusable segment and journey",
      }),
    });
    assert(campaignResponse.status === 201, `Expected 201 Created for segment/journey campaign, got ${campaignResponse.status}`);
    createdSegmentJourneyCampaignId = campaignData?.id;
    assert(campaignData.segmentId === createdCampaignSegmentId, `Expected linked segment id, got ${campaignData?.segmentId}`);
    assert(campaignData.journeyId === createdNurtureJourneyId, `Expected linked journey id, got ${campaignData?.journeyId}`);
    assert(campaignData.segmentName === `Finance Segment ${uniqueSuffix}`, `Expected segment template name, got ${campaignData?.segmentName}`);
    assert(campaignData.journeyName === `Expansion Journey ${uniqueSuffix}`, `Expected journey name, got ${campaignData?.journeyName}`);
    assert(campaignData.journeyStepCount === 1, `Expected campaign journey step count 1, got ${campaignData?.journeyStepCount}`);
    assert(campaignData.firstJourneyStepName === "Discovery Email", `Expected campaign first journey step name, got ${campaignData?.firstJourneyStepName}`);
    assert(campaignData.nurtureCadenceDays === 2, `Expected journey cadence 2, got ${campaignData?.nurtureCadenceDays}`);
    assert(campaignData.nurtureTouchCount === 5, `Expected journey touch count 5, got ${campaignData?.nurtureTouchCount}`);
    assert(campaignData.primaryCallToAction === "Book a discovery call", `Expected inherited CTA, got ${campaignData?.primaryCallToAction}`);

    const { response: insightsResponse, data: insightsData } = await requestJson(`${backendUrl}/api/v1/campaigns/${createdSegmentJourneyCampaignId}/insights`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(insightsResponse.ok, `Expected 200 OK for campaign insights, got ${insightsResponse.status}`);
    assert(insightsData?.segmentId === createdCampaignSegmentId, `Expected linked segment in insights, got ${insightsData?.segmentId}`);
    assert(insightsData?.journeyId === createdNurtureJourneyId, `Expected linked journey in insights, got ${insightsData?.journeyId}`);
    assert(insightsData?.journeyStepCount === 1, `Expected linked journey step count in insights, got ${insightsData?.journeyStepCount}`);
    assert(insightsData?.firstJourneyStepName === "Discovery Email", `Expected first journey step in insights, got ${insightsData?.firstJourneyStepName}`);
    assert(typeof insightsData?.segmentMatchedLeadCount === "number", "Expected segment matched lead count in insights");
    assert(typeof insightsData?.attributedConversionRate === "number", "Expected attributed conversion rate in insights");
    assert(typeof insightsData?.attributedOpportunityRate === "number", "Expected attributed opportunity rate in insights");
    assert(insightsData?.conversionFunnel && typeof insightsData.conversionFunnel === "object", "Expected conversion funnel in insights");

    const { response: statsResponse, data: statsData } = await requestJson(`${backendUrl}/api/v1/campaigns/statistics`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(statsResponse.ok, `Expected 200 OK for campaign statistics, got ${statsResponse.status}`);
    assert(typeof statsData?.totalSegments === "number" && statsData.totalSegments >= 1, "Expected campaign segment totals in stats");
    assert(typeof statsData?.totalJourneys === "number" && statsData.totalJourneys >= 1, "Expected nurture journey totals in stats");
    assert(typeof statsData?.campaignsUsingSegments === "number" && statsData.campaignsUsingSegments >= 1, "Expected campaigns using segments in stats");
    assert(typeof statsData?.campaignsUsingJourneys === "number" && statsData.campaignsUsingJourneys >= 1, "Expected campaigns using journeys in stats");

    return `Created reusable segment and journey, linked them to campaign ${campaignData.name}, and verified funnel analytics`;
  });

  await runCheck("Support case CRUD and stats", async () => {
    const uniqueSuffix = Date.now();
    const caseTitle = `Smoke Case ${uniqueSuffix}`;

    const { response: createResponse, data: createdCase } = await requestJson(`${backendUrl}/api/v1/cases`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: caseTitle,
        status: "OPEN",
        priority: "MEDIUM",
        customerTier: "STANDARD",
        source: "PHONE",
        ownerId: userId,
        customerImpact: "Billing question",
        description: "Customer needs help with invoice billing reconciliation",
      }),
    });
    assert(createResponse.status === 201, `Expected 201 Created, got ${createResponse.status}`);
    assert(createdCase && typeof createdCase.id === "string" && createdCase.id.length > 0, "Expected support case id");
    assert(typeof createdCase.caseNumber === "string" && createdCase.caseNumber.length > 0, "Expected generated case number");
    assert(typeof createdCase.responseDueAt === "string" && createdCase.responseDueAt.length > 0, "Expected default response SLA target");
    assert(typeof createdCase.resolutionDueAt === "string" && createdCase.resolutionDueAt.length > 0, "Expected default resolution SLA target");
    assert(createdCase.firstRespondedAt == null, "Expected first response timestamp to be empty on a new open case");
      assert(
        createdCase.responseSlaStatus === "ON_TRACK" || createdCase.responseSlaStatus === "WATCH",
        `Expected ON_TRACK or WATCH response SLA status, got ${createdCase.responseSlaStatus}`
      );
    assert(createdCase.caseType === "BILLING", `Expected BILLING case type, got ${createdCase.caseType}`);
    assert(createdCase.supportQueue === "BILLING", `Expected BILLING support queue, got ${createdCase.supportQueue}`);

    const { response: updateResponse, data: updatedCase } = await requestJson(`${backendUrl}/api/v1/cases/${createdCase.id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        title: caseTitle,
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        customerTier: "STANDARD",
        source: "PHONE",
        ownerId: userId,
        responseDueAt: createdCase.responseDueAt,
        resolutionDueAt: createdCase.resolutionDueAt,
        customerImpact: "Billing question",
        description: "Customer needs help with invoice billing reconciliation",
      }),
    });
    assert(updateResponse.ok, `Expected 200 OK for case update, got ${updateResponse.status}`);
    assert(typeof updatedCase.firstRespondedAt === "string" && updatedCase.firstRespondedAt.length > 0, "Expected first response timestamp after moving case in progress");
    assert(updatedCase.responseSlaStatus === "MET", `Expected MET response SLA status, got ${updatedCase.responseSlaStatus}`);

    const { response: listResponse, data: listData } = await requestJson(
      `${backendUrl}/api/v1/cases?search=${encodeURIComponent(caseTitle)}&size=10`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(listResponse.ok, `Expected 200 OK for case list, got ${listResponse.status}`);
    assert(listData && Array.isArray(listData.content), "Expected paginated support case response");
    assert(listData.content.some((item) => item.id === createdCase.id), "Expected created case in case list");

    const { response: statsResponse, data: statsData } = await requestJson(`${backendUrl}/api/v1/cases/statistics`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(statsResponse.ok, `Expected 200 OK for case stats, got ${statsResponse.status}`);
    assert(statsData && typeof statsData.totalCases === "number" && statsData.totalCases > 0, "Expected support case stats totalCases");
    assert(typeof statsData.responseWatchCases === "number", "Expected responseWatchCases in support case stats");
    assert(typeof statsData.escalatedCases === "number", "Expected escalatedCases in support case stats");
    assert(typeof statsData.casesByType?.BILLING === "number" && statsData.casesByType.BILLING >= 1, "Expected casesByType.BILLING in support case stats");
    assert(typeof statsData.casesByQueue?.BILLING === "number" && statsData.casesByQueue.BILLING >= 1, "Expected casesByQueue.BILLING in support case stats");
    assert(typeof statsData.openCasesByQueue?.BILLING === "number", "Expected openCasesByQueue.BILLING in support case stats");

    const { response: deleteResponse } = await requestJson(`${backendUrl}/api/v1/cases/${createdCase.id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    assert(deleteResponse.status === 204, `Expected 204 No Content on case delete, got ${deleteResponse.status}`);

    return `Created, auto-targeted, responded to, measured, and archived support case ${createdCase.caseNumber}`;
  });

  await runCheck("Support case assignment queue", async () => {
    const uniqueSuffix = Date.now();
    const caseTitle = `Smoke Assignment Case ${uniqueSuffix}`;

    const { response: createResponse, data: createdCase } = await requestJson(`${backendUrl}/api/v1/cases`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: caseTitle,
        status: "OPEN",
        priority: "HIGH",
          customerTier: "STRATEGIC",
        source: "PORTAL",
        customerImpact: "Customer locked out of workspace",
        description: "Smoke support case assignment coverage for login access issue",
      }),
    });
    assert(createResponse.status === 201, `Expected 201 Created, got ${createResponse.status}`);
    assert(createdCase && typeof createdCase.id === "string" && createdCase.id.length > 0, "Expected support case id for assignment automation");
    assert(!createdCase.ownerId, `Expected unassigned support case, got owner ${createdCase.ownerId}`);
    assert(createdCase.caseType === "ACCESS", `Expected ACCESS case type, got ${createdCase.caseType}`);
    assert(createdCase.supportQueue === "TIER_2", `Expected TIER_2 support queue, got ${createdCase.supportQueue}`);
    createdAssignmentCaseId = createdCase.id;

    const { response: queueResponse, data: queueData } = await requestJson(`${backendUrl}/api/v1/cases/assignment-queue`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(queueResponse.ok, `Expected 200 OK for assignment queue, got ${queueResponse.status}`);
    assert(queueData && Array.isArray(queueData.items), "Expected assignment queue response");

    const queueItem = queueData.items.find((item) => item.caseId === createdAssignmentCaseId);
    assert(queueItem, "Expected created support case in assignment queue");
    assert(queueItem.queueReason === "UNASSIGNED", `Expected UNASSIGNED queue reason, got ${queueItem?.queueReason}`);
    assert(queueItem.caseType === "ACCESS", `Expected ACCESS queue item type, got ${queueItem?.caseType}`);
    assert(queueItem.supportQueue === "TIER_2", `Expected TIER_2 queue item queue, got ${queueItem?.supportQueue}`);
    assert(typeof queueItem.suggestedOwnerId === "string" && queueItem.suggestedOwnerId.length > 0, "Expected suggested owner for assignment queue item");
    assert(typeof queueItem.recommendedAction === "string" && queueItem.recommendedAction.length > 0, "Expected recommended action for assignment queue item");
    assert(typeof queueItem.suggestedReason === "string" && queueItem.suggestedReason.length > 0, "Expected suggested reason for assignment queue item");
    assert(typeof queueData.casesByQueue?.TIER_2 === "number" && queueData.casesByQueue.TIER_2 >= 1, "Expected TIER_2 assignment queue count");

    const { response: automationResponse, data: automationData } = await requestJson(`${backendUrl}/api/v1/cases/automation/assign`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    assert(automationResponse.ok, `Expected 200 OK for assignment automation, got ${automationResponse.status}`);
    assert(automationData && typeof automationData.reviewedCases === "number", "Expected assignment automation result payload");
    assert(automationData.reviewedCases >= 1, `Expected at least one reviewed case, got ${automationData.reviewedCases}`);
    assert(automationData.updatedCaseIds.includes(createdAssignmentCaseId), "Expected created support case to be updated by assignment automation");

    const { response: caseResponse, data: assignedCase } = await requestJson(`${backendUrl}/api/v1/cases/${createdAssignmentCaseId}`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(caseResponse.ok, `Expected 200 OK for assigned case lookup, got ${caseResponse.status}`);
    assert(typeof assignedCase.ownerId === "string" && assignedCase.ownerId.length > 0, "Expected support case owner after assignment automation");

    const { response: taskResponse, data: taskData } = await requestJson(
      `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=case_assignment&relatedEntityId=${createdAssignmentCaseId}`,
      {
        method: "GET",
        headers: authHeaders,
      }
    );
    assert(taskResponse.ok, `Expected 200 OK for case assignment task lookup, got ${taskResponse.status}`);
    assert(taskData && Array.isArray(taskData.content), "Expected paginated task response for case assignment");

    const assignmentTask = taskData.content.find((task) => task.relatedEntityId === createdAssignmentCaseId);
    assert(assignmentTask, "Expected assignment task for support case");
    createdAssignmentTaskId = assignmentTask.id;
    assert(
      typeof assignmentTask.description === "string" && assignmentTask.description.includes("Queue reason: UNASSIGNED"),
      `Expected assignment task description to retain queue reason, got ${assignmentTask.description}`
    );
    assert(
      assignmentTask.description.includes("Support queue: TIER_2") && assignmentTask.description.includes("Case type: ACCESS"),
      `Expected assignment task specialization context, got ${assignmentTask.description}`
    );

      return `Queued case ${createdCase.caseNumber} assigned to ${assignedCase.ownerName || assignedCase.ownerId} with task ${createdAssignmentTaskId}`;
    });

  await runCheck("Support operations dashboard", async () => {
    const uniqueSuffix = Date.now();
    const caseTitle = `Smoke Dashboard Case ${uniqueSuffix}`;

    const { response: createResponse, data: createdCase } = await requestJson(`${backendUrl}/api/v1/cases`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: caseTitle,
        status: "OPEN",
        priority: "HIGH",
        customerTier: "STRATEGIC",
        source: "EMAIL",
        ownerId: userId,
        customerImpact: "API sync issue impacting renewals",
        description: "Smoke support dashboard coverage for api sync error affecting customer success operations",
      }),
    });
    assert(createResponse.status === 201, `Expected 201 Created for support dashboard case, got ${createResponse.status}`);
    assert(createdCase?.caseType === "TECHNICAL", `Expected TECHNICAL case type, got ${createdCase?.caseType}`);
    assert(createdCase?.supportQueue === "TIER_2", `Expected TIER_2 support queue, got ${createdCase?.supportQueue}`);

    const { response: dashboardResponse, data: dashboardData } = await requestJson(`${backendUrl}/api/v1/cases/dashboard/operations`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(dashboardResponse.ok, `Expected 200 OK for support operations dashboard, got ${dashboardResponse.status}`);
      assert(typeof dashboardData?.activeCases === "number" && dashboardData.activeCases >= 1, "Expected active cases in support dashboard");
      assert(Array.isArray(dashboardData?.queueSummaries), "Expected queue summaries in support dashboard");
      assert(Array.isArray(dashboardData?.caseTypeSummaries), "Expected case type summaries in support dashboard");
      assert(Array.isArray(dashboardData?.tierSummaries), "Expected tier summaries in support dashboard");
      assert(Array.isArray(dashboardData?.ownerWorkloads), "Expected owner workloads in support dashboard");

      const tierTwoSummary = dashboardData.queueSummaries.find((item) => item.supportQueue === "TIER_2");
      assert(tierTwoSummary && tierTwoSummary.activeCases >= 1, "Expected TIER_2 active workload in support dashboard");
      assert(typeof tierTwoSummary.healthStatus === "string" && tierTwoSummary.healthStatus.length > 0, "Expected TIER_2 health status in support dashboard");
      assert(typeof tierTwoSummary.staffedOwners === "number" && tierTwoSummary.staffedOwners >= 1, "Expected staffed owners in TIER_2 support dashboard");
      assert(typeof tierTwoSummary.oldestActiveCaseHours === "number", "Expected oldest active case age in support dashboard");
      assert(typeof tierTwoSummary.recommendedAction === "string" && tierTwoSummary.recommendedAction.length > 0, "Expected queue recommended action in support dashboard");

      const technicalSummary = dashboardData.caseTypeSummaries.find((item) => item.caseType === "TECHNICAL");
      assert(technicalSummary && technicalSummary.activeCases >= 1, "Expected TECHNICAL workload in support dashboard");

      const strategicSummary = dashboardData.tierSummaries.find((item) => item.customerTier === "STRATEGIC");
      assert(strategicSummary && strategicSummary.activeCases >= 1, "Expected STRATEGIC workload in support dashboard");
      assert(typeof dashboardData.highTouchActiveCases === "number" && dashboardData.highTouchActiveCases >= 1, "Expected high-touch active cases in support dashboard");
      assert(typeof dashboardData.aged24hActiveCases === "number", "Expected 24h aging bucket in support dashboard");
      assert(typeof dashboardData.aged72hActiveCases === "number", "Expected 72h aging bucket in support dashboard");
      assert(typeof dashboardData.aged168hActiveCases === "number", "Expected 168h aging bucket in support dashboard");

      const currentOwnerWorkload = dashboardData.ownerWorkloads.find((item) => item.userId === userId);
    assert(currentOwnerWorkload && currentOwnerWorkload.assignedActiveCases >= 1, "Expected current user workload in support dashboard");
    assert(
      Array.isArray(currentOwnerWorkload.queuesCovered) && currentOwnerWorkload.queuesCovered.includes("TIER_2"),
      `Expected current user to cover TIER_2, got ${JSON.stringify(currentOwnerWorkload?.queuesCovered)}`
    );

    await requestJson(`${backendUrl}/api/v1/cases/${createdCase.id}`, {
      method: "DELETE",
      headers: authHeaders,
    });

    return `Dashboard showed ${tierTwoSummary.activeCases} TIER_2 cases and ${currentOwnerWorkload.assignedActiveCases} active cases for the current owner`;
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

  await runCheck("Customer data governance", async () => {
    const uniqueSuffix = Date.now();

    const { response: companyResponse, data: companyData } = await requestJson(`${backendUrl}/api/v1/companies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Governance Company ${uniqueSuffix}`,
        email: `governance-company-${uniqueSuffix}@example.com`,
        country: "Zimbabwe",
        territory: "Zimbabwe",
        privacyStatus: "ACTIVE",
        enrichmentStatus: "NEEDS_REVIEW",
      }),
    });
    assert(companyResponse.status === 201, `Expected 201 Created, got ${companyResponse.status}`);
    createdCompanyIds.push(companyData.id);

    const duplicateEmail = `governance-duplicate-${uniqueSuffix}@example.com`;
    const { response: targetContactResponse, data: targetContactData } = await requestJson(`${backendUrl}/api/v1/contacts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Primary",
        lastName: "Duplicate",
        email: duplicateEmail,
        phone: "+263710000001",
        title: "Operations Lead",
        companyId: companyData.id,
        marketingConsent: true,
        consentSource: "trade-show",
        enrichmentStatus: "ENRICHED",
      }),
    });
    assert(targetContactResponse.status === 201, `Expected 201 Created, got ${targetContactResponse.status}`);
    createdContactIds.push(targetContactData.id);

    const { response: sourceContactResponse, data: sourceContactData } = await requestJson(`${backendUrl}/api/v1/contacts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Secondary",
        lastName: "Duplicate",
        email: duplicateEmail,
        mobile: "+263710000002",
        department: "Support",
        companyId: companyData.id,
        marketingConsent: false,
        privacyStatus: "SUPPRESSED",
        enrichmentStatus: "NEEDS_REVIEW",
      }),
    });
    assert(sourceContactResponse.status === 201, `Expected 201 Created, got ${sourceContactResponse.status}`);
    createdContactIds.push(sourceContactData.id);

    const { response: caseResponse, data: caseData } = await requestJson(`${backendUrl}/api/v1/cases`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: `Governance Merge Case ${uniqueSuffix}`,
        status: "OPEN",
        priority: "HIGH",
        source: "EMAIL",
        customerTier: "STANDARD",
        caseType: "TECHNICAL",
        supportQueue: "TIER_1",
        companyId: companyData.id,
        contactId: sourceContactData.id,
        customerImpact: "Duplicate contact merge validation",
        description: "Smoke test case for data governance merge flow.",
      }),
    });
    assert(caseResponse.status === 201, `Expected 201 Created, got ${caseResponse.status}`);

    const { response: summaryResponse, data: summaryData } = await requestJson(`${backendUrl}/api/v1/data-governance/summary`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(summaryResponse.ok, `Expected 200 OK, got ${summaryResponse.status}`);
    assert(summaryData && summaryData.duplicateCandidateCount >= 1, "Expected at least one duplicate candidate");
    assert(summaryData.recordsWithoutConsent >= 1, "Expected at least one record without consent");

    const { response: duplicatesResponse, data: duplicatesData } = await requestJson(`${backendUrl}/api/v1/data-governance/duplicates`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(duplicatesResponse.ok, `Expected 200 OK, got ${duplicatesResponse.status}`);
    const duplicateGroup = Array.isArray(duplicatesData)
      ? duplicatesData.find((candidate) => candidate.recordType === "CONTACT" && candidate.duplicateKey === duplicateEmail)
      : null;
    assert(duplicateGroup, "Expected duplicate contact group for governance test email");
    assert(Array.isArray(duplicateGroup.records) && duplicateGroup.records.length >= 2, "Expected duplicate group to contain both contacts");

    const { response: mergeResponse, data: mergeData } = await requestJson(
      `${backendUrl}/api/v1/data-governance/contacts/${targetContactData.id}/merge/${sourceContactData.id}`,
      {
        method: "POST",
        headers: authHeaders,
      }
    );
    assert(mergeResponse.ok, `Expected 200 OK, got ${mergeResponse.status}`);
    assert(mergeData && mergeData.movedCases >= 1, `Expected movedCases >= 1, got ${JSON.stringify(mergeData)}`);

    const { response: mergedCaseResponse, data: mergedCaseData } = await requestJson(`${backendUrl}/api/v1/cases/${caseData.id}`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(mergedCaseResponse.ok, `Expected 200 OK, got ${mergedCaseResponse.status}`);
    assert(mergedCaseData.contactId === targetContactData.id, "Expected support case contact to follow the merged target contact");

    const { response: archivedSourceResponse } = await requestJson(`${backendUrl}/api/v1/contacts/${sourceContactData.id}`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(archivedSourceResponse.status === 404, `Expected archived duplicate contact to be hidden, got ${archivedSourceResponse.status}`);

    return `Detected duplicate contacts for ${duplicateEmail} and rewired support case ${caseData.caseNumber || caseData.id} during merge`;
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

    await runCheck("Campaign nurture workflow settings", async () => {
      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/campaign-nurture`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for campaign nurture workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "CAMPAIGN_NURTURE", "Expected campaign nurture workflow");
      originalCampaignNurtureWorkflow = structuredClone(workflowData);

      const updatedWorkflow = {
        ...workflowData,
        campaignScoreBoost: 18,
        campaignFollowUpDays: 1,
        campaignTaskPriority: "HIGH",
        requireActiveCampaign: true,
      };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/campaign-nurture`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
      });
      assert(updateResponse.ok, `Expected 200 OK for campaign nurture workflow update, got ${updateResponse.status}`);
      assert(updatedData && updatedData.campaignScoreBoost === 18, "Expected updated campaign score boost");

      const uniqueSuffix = Date.now();
      const { response: journeyResponse, data: journeyData } = await requestJson(`${backendUrl}/api/v1/campaigns/journeys`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: `Workflow Journey ${uniqueSuffix}`,
          description: "Workflow step driven journey",
          journeyStage: "CONSIDERATION",
          autoEnrollNewLeads: true,
          defaultCadenceDays: 2,
          defaultTouchCount: 6,
          defaultCallToAction: "Schedule a strategy session",
          successMetric: "Intro calls booked",
          isActive: true,
          notes: "Smoke workflow journey",
        }),
      });
      assert(journeyResponse.status === 201, `Expected 201 Created for workflow journey, got ${journeyResponse.status}`);
      createdCampaignWorkflowJourneyId = journeyData.id;

      const { response: journeyStepResponse, data: journeyStepData } = await requestJson(`${backendUrl}/api/v1/campaigns/journeys/${createdCampaignWorkflowJourneyId}/steps`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: "Intro touch",
          sequenceOrder: 1,
          waitDays: 3,
          channel: "EMAIL",
          taskPriority: "MEDIUM",
          objective: "Book the intro call",
          taskTitleTemplate: "{firstName} intro outreach",
          taskDescriptionTemplate: "Use email outreach to ask {leadName} to {callToAction}.",
          callToAction: "book the intro call",
          isActive: true,
        }),
      });
      assert(journeyStepResponse.status === 201, `Expected 201 Created for workflow journey step, got ${journeyStepResponse.status}`);
      assert(journeyStepData?.journeyId === createdCampaignWorkflowJourneyId, "Expected workflow journey step to link to created journey");

      const { response: secondJourneyStepResponse } = await requestJson(`${backendUrl}/api/v1/campaigns/journeys/${createdCampaignWorkflowJourneyId}/steps`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: "Demo invite",
          sequenceOrder: 2,
          waitDays: 5,
          channel: "EMAIL",
          taskPriority: "HIGH",
          objective: "Secure the demo booking",
          taskTitleTemplate: "{firstName} demo invitation",
          taskDescriptionTemplate: "Invite {leadName} to schedule the demo and {callToAction}.",
          callToAction: "confirm the demo slot",
          isActive: true,
        }),
      });
      assert(secondJourneyStepResponse.status === 201, `Expected 201 Created for second workflow journey step, got ${secondJourneyStepResponse.status}`);

      const { response: campaignResponse, data: campaignData } = await requestJson(`${backendUrl}/api/v1/campaigns`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: `Workflow Campaign ${uniqueSuffix}`,
          type: "EMAIL",
          status: "ACTIVE",
          channel: "EMAIL",
          targetAudience: "Revenue leaders",
          segmentType: "PERSONA",
          segmentName: "Revenue Leaders",
          primaryPersona: "VP Revenue",
          territoryFocus: "Zimbabwe",
          journeyId: createdCampaignWorkflowJourneyId,
          budget: 5000,
          expectedRevenue: 15000,
          startDate: "2026-04-01",
          endDate: "2026-04-30",
          description: "Workflow nurture smoke campaign",
        }),
      });
      assert(campaignResponse.status === 201, `Expected 201 Created for nurture campaign, got ${campaignResponse.status}`);
      createdCampaignWorkflowCampaignId = campaignData.id;

      const { response: leadResponse, data: leadData } = await requestJson(`${backendUrl}/api/v1/leads`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          firstName: "Campaign",
          lastName: `Workflow${uniqueSuffix}`,
          email: `campaign.workflow.${uniqueSuffix}@example.com`,
          phone: "+263771555555",
          company: "Campaign CRM",
          title: "Revenue Manager",
          source: "WEBSITE",
          estimatedValue: 8000,
          campaignId: createdCampaignWorkflowCampaignId,
          notes: "Smoke campaign nurture lead",
        }),
      });
      assert(leadResponse.status === 201, `Expected 201 Created for campaign workflow lead, got ${leadResponse.status}`);
      assert(leadData && leadData.campaignId === createdCampaignWorkflowCampaignId, "Expected lead to keep campaign attribution");
      assert(leadData.campaignName === campaignData.name, "Expected lead response campaign name");
      createdCampaignWorkflowLeadId = leadData.id;
      assert(typeof leadData.score === "number" && leadData.score >= 18, `Expected campaign score boost to apply, got ${leadData.score}`);

      const { response: workflowTaskResponse, data: workflowTaskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=lead&relatedEntityId=${createdCampaignWorkflowLeadId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(workflowTaskResponse.ok, `Expected 200 OK for campaign nurture task lookup, got ${workflowTaskResponse.status}`);
      assert(workflowTaskData && Array.isArray(workflowTaskData.content), "Expected campaign nurture task response");
      const workflowTask = workflowTaskData.content.find((task) => task.relatedEntityId === createdCampaignWorkflowLeadId);
      assert(workflowTask, "Expected campaign nurture follow-up task");
      createdCampaignWorkflowTaskId = workflowTask.id;
      assert(workflowTask.title === "Campaign intro outreach", `Expected step-driven workflow task title, got ${workflowTask.title}`);

      const expectedDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      assert(typeof workflowTask.dueDate === "string" && workflowTask.dueDate.startsWith(expectedDueDate), `Expected campaign nurture due date ${expectedDueDate}, got ${workflowTask.dueDate}`);
      assert(workflowTask.priority === "MEDIUM", `Expected campaign nurture priority MEDIUM, got ${workflowTask.priority}`);
      assert(workflowTask.description.includes("Journey step: Intro touch."), `Expected journey step context in task description, got ${workflowTask.description}`);
      assert(workflowTask.description.includes("book the intro call"), `Expected journey step CTA in task description, got ${workflowTask.description}`);

      const { response: completeTaskResponse } = await requestJson(`${backendUrl}/api/v1/tasks/${createdCampaignWorkflowTaskId}/complete`, {
        method: "PATCH",
        headers: authHeaders,
      });
      assert(completeTaskResponse.ok, `Expected 200 OK for first nurture task completion, got ${completeTaskResponse.status}`);

      const { response: postCompleteTaskResponse, data: postCompleteTaskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=lead&relatedEntityId=${createdCampaignWorkflowLeadId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(postCompleteTaskResponse.ok, `Expected 200 OK for second nurture task lookup, got ${postCompleteTaskResponse.status}`);
      const nextWorkflowTask = postCompleteTaskData.content.find((task) => task.id !== createdCampaignWorkflowTaskId && task.relatedEntityId === createdCampaignWorkflowLeadId);
      assert(nextWorkflowTask, "Expected second nurture journey task after completing first step");
      createdCampaignWorkflowNextTaskId = nextWorkflowTask.id;
      assert(nextWorkflowTask.title === "Campaign demo invitation", `Expected second journey task title, got ${nextWorkflowTask.title}`);
      const expectedNextDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      assert(typeof nextWorkflowTask.dueDate === "string" && nextWorkflowTask.dueDate.startsWith(expectedNextDueDate), `Expected second nurture due date ${expectedNextDueDate}, got ${nextWorkflowTask.dueDate}`);
      assert(nextWorkflowTask.priority === "HIGH", `Expected second nurture priority HIGH, got ${nextWorkflowTask.priority}`);
      assert(nextWorkflowTask.description.includes("Journey step: Demo invite."), `Expected second journey step context in task description, got ${nextWorkflowTask.description}`);
      assert(nextWorkflowTask.description.includes("confirm the demo slot"), `Expected second journey CTA in task description, got ${nextWorkflowTask.description}`);

      const { response: statsResponse, data: statsData } = await requestJson(`${backendUrl}/api/v1/campaigns/statistics`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(statsResponse.ok, `Expected 200 OK for campaign stats, got ${statsResponse.status}`);
      assert(typeof statsData.totalAttributedLeads === "number" && statsData.totalAttributedLeads > 0, "Expected attributed leads in campaign stats");

      const { response: insightsResponse, data: insightsData } = await requestJson(`${backendUrl}/api/v1/campaigns/${createdCampaignWorkflowCampaignId}/insights`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(insightsResponse.ok, `Expected 200 OK for campaign insights, got ${insightsResponse.status}`);
      assert(insightsData.segmentName === "Revenue Leaders", `Expected campaign segment name, got ${insightsData.segmentName}`);
      assert(insightsData.journeyStepCount === 2, `Expected journey step count in campaign insights, got ${insightsData?.journeyStepCount}`);
      assert(insightsData.firstJourneyStepName === "Intro touch", `Expected first journey step in campaign insights, got ${insightsData?.firstJourneyStepName}`);
      assert(insightsData.attributedLeadCount >= 1, `Expected attributed lead count, got ${insightsData.attributedLeadCount}`);
      assert(typeof insightsData.leadsByStatus === "object" && insightsData.leadsByStatus.NEW >= 1, "Expected campaign insights status mix");
      assert(Array.isArray(insightsData.recommendedActions) && insightsData.recommendedActions.length > 0, "Expected campaign insights recommendations");

      return `Updated campaign nurture workflow and verified multi-step journey follow-up due on ${expectedDueDate}/${expectedNextDueDate}`;
    });

    await runCheck("Case assignment workflow settings", async () => {
      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/case-assignment`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for case assignment workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "CASE_ASSIGNMENT", "Expected case assignment workflow");
      originalCaseAssignmentWorkflow = structuredClone(workflowData);

        const updatedWorkflow = {
          ...workflowData,
          autoAssignUnassignedCases: true,
          autoReassignEscalatedCases: true,
          preferAccountOwner: true,
          preferSeniorCoverageForHighTouch: true,
          preferFrontlineForTierOne: true,
          preferSpecialistCoverage: true,
          createAssignmentTasks: true,
          defaultAssignmentTaskDueDays: 2,
          urgentAssignmentTaskDueDays: 1,
          defaultAssignmentTaskPriority: "LOW",
          urgentAssignmentTaskPriority: "HIGH",
          frontlineQueueCapacity: 6,
          specialistQueueCapacity: 3,
        };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/case-assignment`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
        });
        assert(updateResponse.ok, `Expected 200 OK for case assignment workflow update, got ${updateResponse.status}`);
        assert(updatedData && updatedData.urgentAssignmentTaskDueDays === 1, "Expected updated urgent assignment due days");
        assert(updatedData.frontlineQueueCapacity === 6, "Expected updated frontline queue capacity");
        assert(updatedData.specialistQueueCapacity === 3, "Expected updated specialist queue capacity");

        const uniqueSuffix = Date.now();
      const { response: caseResponse, data: caseData } = await requestJson(`${backendUrl}/api/v1/cases`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: `Workflow Assignment Case ${uniqueSuffix}`,
          status: "OPEN",
          priority: "URGENT",
          customerTier: "STANDARD",
          source: "PORTAL",
          customerImpact: "Smoke case assignment workflow coverage",
          description: "Smoke support case assignment workflow coverage",
        }),
      });
      assert(caseResponse.status === 201, `Expected 201 Created for case assignment workflow case, got ${caseResponse.status}`);
      createdCaseAssignmentWorkflowCaseId = caseData.id;
      assert(!caseData.ownerId, `Expected workflow case to start unassigned, got ${caseData.ownerId}`);

      const { response: automationResponse, data: automationData } = await requestJson(`${backendUrl}/api/v1/cases/automation/assign`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      assert(automationResponse.ok, `Expected 200 OK for case assignment automation, got ${automationResponse.status}`);
      assert(typeof automationData?.assignedCases === "number", "Expected assignedCases in case assignment automation result");
      assert(automationData.updatedCaseIds.includes(createdCaseAssignmentWorkflowCaseId), "Expected workflow case to be assigned by automation");

      const { response: taskLookupResponse, data: taskLookupData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=case_assignment&relatedEntityId=${createdCaseAssignmentWorkflowCaseId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(taskLookupResponse.ok, `Expected 200 OK for case assignment task lookup, got ${taskLookupResponse.status}`);
      assert(taskLookupData && Array.isArray(taskLookupData.content), "Expected task response for case assignment workflow");
      const assignmentTask = taskLookupData.content.find((task) => task.relatedEntityId === createdCaseAssignmentWorkflowCaseId);
      assert(assignmentTask, "Expected workflow-driven case assignment task");
      createdCaseAssignmentWorkflowTaskId = assignmentTask.id;

      const expectedDueDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      assert(typeof assignmentTask.dueDate === "string" && assignmentTask.dueDate.startsWith(expectedDueDate), `Expected case assignment due date ${expectedDueDate}, got ${assignmentTask.dueDate}`);
      assert(assignmentTask.priority === "HIGH", `Expected urgent case assignment priority HIGH, got ${assignmentTask.priority}`);
      assert(typeof assignmentTask.description === "string" && assignmentTask.description.includes("Queue reason: UNASSIGNED"), "Expected workflow assignment task description to keep queue reason");

      return `Updated case assignment workflow and verified urgent assignment due on ${expectedDueDate}`;
    });

    await runCheck("Case SLA workflow settings", async () => {
      const { response: workflowResponse, data: workflowData } = await requestJson(`${backendUrl}/api/v1/workflows/case-sla`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(workflowResponse.ok, `Expected 200 OK for case SLA workflow fetch, got ${workflowResponse.status}`);
      assert(workflowData && workflowData.ruleType === "CASE_SLA", "Expected case SLA workflow");
      originalCaseSlaWorkflow = structuredClone(workflowData);

        const updatedWorkflow = {
          ...workflowData,
          mediumResponseHours: 6,
          mediumResolutionHours: 36,
          premiumResponseMultiplierPercent: 50,
          strategicResponseMultiplierPercent: 25,
          premiumResolutionMultiplierPercent: 50,
          strategicResolutionMultiplierPercent: 25,
          responseBreachTaskDueDays: 1,
          resolutionBreachTaskDueDays: 2,
          responseBreachTaskPriority: "MEDIUM",
          resolutionBreachTaskPriority: "HIGH",
          autoEscalateBreachedCases: true,
          escalateOnResponseBreach: true,
          escalateOnResolutionBreach: true,
          escalationTaskDueDays: 1,
          escalationTaskPriority: "HIGH",
        };

      const { response: updateResponse, data: updatedData } = await requestJson(`${backendUrl}/api/v1/workflows/case-sla`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedWorkflow),
      });
      assert(updateResponse.ok, `Expected 200 OK for case SLA workflow update, got ${updateResponse.status}`);
      assert(updatedData && updatedData.mediumResponseHours === 6, "Expected updated medium response SLA");
      assert(updatedData && updatedData.mediumResolutionHours === 36, "Expected updated medium resolution SLA");
      assert(updatedData && updatedData.premiumResponseMultiplierPercent === 50, "Expected updated premium response multiplier");
      assert(updatedData && updatedData.strategicResolutionMultiplierPercent === 25, "Expected updated strategic resolution multiplier");

      const uniqueSuffix = Date.now();
      const { response: caseResponse, data: caseData } = await requestJson(`${backendUrl}/api/v1/cases`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: `Workflow SLA Case ${uniqueSuffix}`,
          status: "OPEN",
          priority: "MEDIUM",
          customerTier: "PREMIUM",
          source: "EMAIL",
          ownerId: userId,
          customerImpact: "Smoke SLA breach coverage",
          description: "Smoke support SLA automation coverage",
        }),
      });
      assert(caseResponse.status === 201, `Expected 201 Created for SLA workflow case, got ${caseResponse.status}`);
      createdCaseWorkflowCaseId = caseData.id;
      assert(caseData.customerTier === "PREMIUM", `Expected PREMIUM case tier, got ${caseData.customerTier}`);
      const createdAt = new Date(caseData.createdAt);
      const responseDueAt = new Date(caseData.responseDueAt);
      const resolutionDueAt = new Date(caseData.resolutionDueAt);
      const responseHours = Math.round((responseDueAt.getTime() - createdAt.getTime()) / (60 * 60 * 1000));
      const resolutionHours = Math.round((resolutionDueAt.getTime() - createdAt.getTime()) / (60 * 60 * 1000));
      assert(responseHours >= 2 && responseHours <= 4, `Expected premium response target around 3 hours, got ${responseHours}`);
      assert(resolutionHours >= 17 && resolutionHours <= 19, `Expected premium resolution target around 18 hours, got ${resolutionHours}`);

      const breachResponse = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const breachResolution = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { response: breachUpdateResponse, data: breachedCaseData } = await requestJson(`${backendUrl}/api/v1/cases/${createdCaseWorkflowCaseId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          title: `Workflow SLA Case ${uniqueSuffix}`,
          status: "OPEN",
          priority: "MEDIUM",
          customerTier: "PREMIUM",
          source: "EMAIL",
          ownerId: userId,
          responseDueAt: breachResponse,
          resolutionDueAt: breachResolution,
          customerImpact: "Smoke SLA breach coverage",
          description: "Smoke support SLA automation coverage",
        }),
      });
      assert(breachUpdateResponse.ok, `Expected 200 OK for SLA breach update, got ${breachUpdateResponse.status}`);
      assert(breachedCaseData.responseSlaStatus === "BREACHED", `Expected breached response SLA status, got ${breachedCaseData.responseSlaStatus}`);
      assert(breachedCaseData.resolutionSlaStatus === "BREACHED", `Expected breached resolution SLA status, got ${breachedCaseData.resolutionSlaStatus}`);

      const { response: automationResponse, data: automationData } = await requestJson(`${backendUrl}/api/v1/cases/automation/sla-breach`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });
        assert(automationResponse.ok, `Expected 200 OK for case SLA automation, got ${automationResponse.status}`);
        assert(typeof automationData?.responseTasksCreated === "number", "Expected responseTasksCreated in SLA automation result");
        assert(typeof automationData?.resolutionTasksCreated === "number", "Expected resolutionTasksCreated in SLA automation result");
        assert(typeof automationData?.escalationTasksCreated === "number", "Expected escalationTasksCreated in SLA automation result");
        assert(typeof automationData?.escalatedCases === "number", "Expected escalatedCases in SLA automation result");

      const { response: responseTaskLookup, data: responseTaskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=case_response_sla&relatedEntityId=${createdCaseWorkflowCaseId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(responseTaskLookup.ok, `Expected 200 OK for response SLA task lookup, got ${responseTaskLookup.status}`);
      const responseTask = responseTaskData.content.find((task) => task.relatedEntityId === createdCaseWorkflowCaseId);
      assert(responseTask, "Expected response SLA breach task");
      createdCaseResponseTaskId = responseTask.id;
      const expectedResponseDueDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      assert(responseTask.priority === "MEDIUM", `Expected response breach priority MEDIUM, got ${responseTask.priority}`);
      assert(typeof responseTask.dueDate === "string" && responseTask.dueDate.startsWith(expectedResponseDueDate), `Expected response breach due date ${expectedResponseDueDate}, got ${responseTask.dueDate}`);

      const { response: resolutionTaskLookup, data: resolutionTaskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=case_resolution_sla&relatedEntityId=${createdCaseWorkflowCaseId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(resolutionTaskLookup.ok, `Expected 200 OK for resolution SLA task lookup, got ${resolutionTaskLookup.status}`);
      const resolutionTask = resolutionTaskData.content.find((task) => task.relatedEntityId === createdCaseWorkflowCaseId);
      assert(resolutionTask, "Expected resolution SLA breach task");
      createdCaseResolutionTaskId = resolutionTask.id;
      const expectedResolutionDueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        assert(resolutionTask.priority === "HIGH", `Expected resolution breach priority HIGH, got ${resolutionTask.priority}`);
        assert(typeof resolutionTask.dueDate === "string" && resolutionTask.dueDate.startsWith(expectedResolutionDueDate), `Expected resolution breach due date ${expectedResolutionDueDate}, got ${resolutionTask.dueDate}`);

        const { response: escalationTaskLookup, data: escalationTaskData } = await requestJson(
          `${backendUrl}/api/v1/tasks?size=20&relatedEntityType=case_sla_escalation&relatedEntityId=${createdCaseWorkflowCaseId}`,
          {
            method: "GET",
            headers: authHeaders,
          }
        );
        assert(escalationTaskLookup.ok, `Expected 200 OK for case escalation task lookup, got ${escalationTaskLookup.status}`);
        const escalationTask = escalationTaskData.content.find((task) => task.relatedEntityId === createdCaseWorkflowCaseId);
        assert(escalationTask, "Expected case escalation task");
        createdCaseEscalationTaskId = escalationTask.id;
        const expectedEscalationDueDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        assert(escalationTask.priority === "HIGH", `Expected escalation priority HIGH, got ${escalationTask.priority}`);
        assert(typeof escalationTask.dueDate === "string" && escalationTask.dueDate.startsWith(expectedEscalationDueDate), `Expected escalation due date ${expectedEscalationDueDate}, got ${escalationTask.dueDate}`);

        const { response: escalatedCaseLookup, data: escalatedCaseData } = await requestJson(`${backendUrl}/api/v1/cases/${createdCaseWorkflowCaseId}`, {
          method: "GET",
          headers: authHeaders,
        });
        assert(escalatedCaseLookup.ok, `Expected 200 OK for escalated case lookup, got ${escalatedCaseLookup.status}`);
        assert(escalatedCaseData.status === "ESCALATED", `Expected escalated case status, got ${escalatedCaseData.status}`);

        return `Updated case SLA workflow and verified breach tasks due on ${expectedResponseDueDate}/${expectedResolutionDueDate} plus escalation on ${expectedEscalationDueDate}`;
      });

    await runCheck("Generic automation engine execution", async () => {
      assert(insightsCompanyId, "Expected account insights company for generic automation test");
      const uniqueSuffix = Date.now();
      const createRule = async (payload) => {
        const { response, data } = await requestJson(`${backendUrl}/api/v1/automation-rules`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        assert(response.status === 201, `Expected 201 Created for automation rule ${payload.name}, got ${response.status}`);
        assert(data && typeof data.id === "string" && data.id.length > 0, `Expected automation rule id for ${payload.name}`);
        createdAutomationRuleIds.push(data.id);
        return data;
      };

      const leadRule = await createRule({
        name: `Lead enrichment guard ${uniqueSuffix}`,
        description: "Generic automation lead rule smoke coverage",
        module: "MARKETING",
        eventType: "LEAD_CREATED",
        executionMode: "REAL_TIME",
        conditionsJson: JSON.stringify({
          all: [
            { field: "source", operator: "IN", value: ["WEBSITE", "EVENT"] },
            { field: "score", operator: "GTE", value: 60 },
          ],
        }),
        actionsJson: JSON.stringify({
          actions: [
            { type: "TAG", value: "marketing-qualified" },
            { type: "CREATE_TASK", priority: "MEDIUM", dueDays: 1 },
          ],
        }),
        priorityOrder: 5,
        isActive: true,
      });

      const dealRule = await createRule({
        name: `Deal risk escalation ${uniqueSuffix}`,
        description: "Generic automation deal rule smoke coverage",
        module: "SALES",
        eventType: "DEAL_CREATED",
        executionMode: "REAL_TIME",
        conditionsJson: JSON.stringify({
          all: [
            { field: "stage", operator: "EQ", value: "NEGOTIATION" },
            { field: "value", operator: "GTE", value: 20000 },
          ],
        }),
        actionsJson: JSON.stringify({
          actions: [
            { type: "UPDATE_FIELD", field: "riskLevel", value: "HIGH" },
            { type: "CREATE_TASK", priority: "HIGH", dueDays: 2 },
          ],
        }),
        priorityOrder: 10,
        isActive: true,
      });

      const caseRule = await createRule({
        name: `Case breach recovery ${uniqueSuffix}`,
        description: "Generic automation case breach smoke coverage",
        module: "SUPPORT",
        eventType: "CASE_BREACHED",
        executionMode: "REAL_TIME",
        conditionsJson: JSON.stringify({
          all: [
            { field: "priority", operator: "IN", value: ["HIGH", "URGENT"] },
            { field: "status", operator: "EQ", value: "ESCALATED" },
          ],
        }),
        actionsJson: JSON.stringify({
          actions: [
            { type: "UPDATE_FIELD", field: "customerImpact", value: "Automation breach review" },
            { type: "CREATE_TASK", priority: "HIGH", dueDays: 0 },
          ],
        }),
        priorityOrder: 15,
        isActive: true,
      });

      const { response: listResponse, data: listData } = await requestJson(`${backendUrl}/api/v1/automation-rules`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(listResponse.ok, `Expected 200 OK for automation rule list, got ${listResponse.status}`);
      assert(Array.isArray(listData), "Expected automation rule list");
      for (const ruleId of createdAutomationRuleIds) {
        assert(listData.some((item) => item.id === ruleId), `Expected created automation rule ${ruleId} in list`);
      }

      const verifyEventLookup = async (eventType, ruleId) => {
        const { response, data } = await requestJson(`${backendUrl}/api/v1/automation-rules/event/${eventType}?activeOnly=true`, {
          method: "GET",
          headers: authHeaders,
        });
        assert(response.ok, `Expected 200 OK for ${eventType} automation rule event lookup, got ${response.status}`);
        assert(Array.isArray(data), `Expected automation rule event response for ${eventType}`);
        assert(data.some((item) => item.id === ruleId), `Expected created rule in ${eventType} event lookup`);
      };

      await verifyEventLookup("LEAD_CREATED", leadRule.id);
      await verifyEventLookup("DEAL_CREATED", dealRule.id);
      await verifyEventLookup("CASE_BREACHED", caseRule.id);

      const { response: leadResponse, data: automationLead } = await requestJson(`${backendUrl}/api/v1/leads`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          firstName: "Generic",
          lastName: `Automation ${uniqueSuffix}`,
          email: `generic-automation-${uniqueSuffix}@example.com`,
          phone: "+263771111111",
          company: "Generic Automation Co",
          title: "Marketing Lead",
          source: "WEBSITE",
          status: "NEW",
          estimatedValue: 9000,
          ownerId: userId,
        }),
      });
      assert(leadResponse.status === 201, `Expected 201 Created for automation test lead, got ${leadResponse.status}`);
      createdAutomationLeadId = automationLead.id;
      assert(Array.isArray(automationLead.tags) && automationLead.tags.includes("marketing-qualified"), "Expected generic automation tag to be applied");

      const { response: taskResponse, data: taskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=50&relatedEntityType=lead&relatedEntityId=${createdAutomationLeadId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(taskResponse.ok, `Expected 200 OK for automation task lookup, got ${taskResponse.status}`);
      assert(Array.isArray(taskData?.content), "Expected paginated task response for automation rule");
      const automationTask = taskData.content.find((task) => task.relatedEntityId === createdAutomationLeadId && task.title.includes("Automation follow-up"));
      assert(automationTask, "Expected a generic automation task for the created lead");
      createdAutomationTaskIds.push(automationTask.id);

      const { response: dealResponse, data: automationDeal } = await requestJson(`${backendUrl}/api/v1/deals`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: `Generic Automation Deal ${uniqueSuffix}`,
          companyId: insightsCompanyId,
          contactId: insightsPrimaryContactId || null,
          value: 27500,
          stage: "NEGOTIATION",
          probability: 60,
          expectedCloseDate: "2026-04-15",
          dealType: "NEW_BUSINESS",
          leadSource: "WEBSITE",
          ownerId: userId,
        }),
      });
      assert(dealResponse.status === 201, `Expected 201 Created for automation test deal, got ${dealResponse.status}`);
      createdAutomationGenericDealId = automationDeal.id;
      assert(automationDeal.riskLevel === "HIGH", `Expected generic automation to set deal risk HIGH, got ${automationDeal.riskLevel}`);

      const { response: dealTaskResponse, data: dealTaskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=50&relatedEntityType=deal&relatedEntityId=${createdAutomationGenericDealId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(dealTaskResponse.ok, `Expected 200 OK for generic automation deal task lookup, got ${dealTaskResponse.status}`);
      assert(Array.isArray(dealTaskData?.content), "Expected paginated task response for generic automation deal rule");
      const dealAutomationTask = dealTaskData.content.find((task) => task.relatedEntityId === createdAutomationGenericDealId && task.title.includes("Automation follow-up"));
      assert(dealAutomationTask, "Expected a generic automation task for the created deal");
      createdAutomationTaskIds.push(dealAutomationTask.id);

      const pastResponseDueAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const pastResolutionDueAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { response: caseResponse, data: automationCase } = await requestJson(`${backendUrl}/api/v1/cases`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: `Generic Automation Case ${uniqueSuffix}`,
          status: "OPEN",
          priority: "HIGH",
          source: "EMAIL",
          customerTier: "PREMIUM",
          ownerId: userId,
          responseDueAt: pastResponseDueAt,
          resolutionDueAt: pastResolutionDueAt,
          customerImpact: "Awaiting automation review",
          description: "Generic automation case breach smoke coverage",
        }),
      });
      assert(caseResponse.status === 201, `Expected 201 Created for automation test case, got ${caseResponse.status}`);
      createdAutomationCaseId = automationCase.id;

      const { response: caseAutomationResponse, data: caseAutomationData } = await requestJson(`${backendUrl}/api/v1/cases/automation/sla-breach`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      assert(caseAutomationResponse.ok, `Expected 200 OK for case SLA breach automation, got ${caseAutomationResponse.status}`);
      assert(typeof caseAutomationData?.reviewedCases === "number", "Expected support case SLA automation result");

      const { response: caseLookupResponse, data: updatedCase } = await requestJson(`${backendUrl}/api/v1/cases/${createdAutomationCaseId}`, {
        method: "GET",
        headers: authHeaders,
      });
      assert(caseLookupResponse.ok, `Expected 200 OK for generic automation case lookup, got ${caseLookupResponse.status}`);
      assert(updatedCase.customerImpact === "Automation breach review", `Expected generic automation to update customer impact, got ${updatedCase.customerImpact}`);

      const { response: caseTaskResponse, data: caseTaskData } = await requestJson(
        `${backendUrl}/api/v1/tasks?size=50&relatedEntityType=case&relatedEntityId=${createdAutomationCaseId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(caseTaskResponse.ok, `Expected 200 OK for generic automation case task lookup, got ${caseTaskResponse.status}`);
      assert(Array.isArray(caseTaskData?.content), "Expected paginated task response for generic automation case rule");
      const caseAutomationTask = caseTaskData.content.find((task) => task.relatedEntityId === createdAutomationCaseId && task.title.includes("Automation follow-up"));
      assert(caseAutomationTask, "Expected a generic automation task for the breached case");
      createdAutomationTaskIds.push(caseAutomationTask.id);

      for (const ruleId of createdAutomationRuleIds.splice(0).reverse()) {
        const { response: deleteResponse } = await requestJson(`${backendUrl}/api/v1/automation-rules/${ruleId}`, {
          method: "DELETE",
          headers: authHeaders,
        });
        assert(deleteResponse.status === 204, `Expected 204 No Content for automation rule delete, got ${deleteResponse.status}`);
      }

      return `Created and executed generic automation rules across lead, deal, and case events`;
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
      let currentUser = null;
      for (let page = 0; page < 10 && !currentUser; page += 1) {
        const { response: usersResponse, data: usersData } = await requestJson(`${backendUrl}/api/v1/users?page=${page}&size=100`, {
          method: "GET",
          headers: authHeaders,
        });
        assert(usersResponse.ok, `Expected 200 OK for users list page ${page}, got ${usersResponse.status}`);
        assert(usersData && Array.isArray(usersData.content), "Expected paginated users response");
        currentUser = usersData.content.find((member) => member.id === userId) || null;
        if (!usersData.content.length || usersData.last === true) {
          break;
        }
      }
      assert(currentUser, "Expected current user to appear in paginated user list");

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
      record("Campaign nurture workflow settings", "skip", "Authenticated user is not a tenant admin");
      record("Case assignment workflow settings", "skip", "Authenticated user is not a tenant admin");
      record("Case SLA workflow settings", "skip", "Authenticated user is not a tenant admin");
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

  await runCheck("Contract lifecycle from quote", async () => {
    const uniqueSuffix = Date.now();
    let product = null;

    const { response: productsResponse, data: productsData } = await requestJson(`${backendUrl}/api/v1/products?size=5`, {
      method: "GET",
      headers: authHeaders,
    });
    assert(productsResponse.ok, `Expected 200 OK for products list, got ${productsResponse.status}`);
    assert(productsData && Array.isArray(productsData.content), "Expected paginated products response");
    product = productsData.content[0] || null;

    if (!product) {
      assert(userRole === "ADMIN", "Creating a smoke product requires an admin user when the catalog is empty");
      const { response: createProductResponse, data: createdProduct } = await requestJson(`${backendUrl}/api/v1/products`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: `Contract Product ${uniqueSuffix}`,
          sku: `CONTRACT-${uniqueSuffix}`,
          description: "Smoke test CPQ product",
          category: "SERVICES",
          unitPrice: 1500,
          cost: 600,
          stockQuantity: 25,
          lowStockThreshold: 5,
          status: "ACTIVE",
          trackInventory: false,
          unit: "seat",
          taxRate: 15,
        }),
      });
      assert(createProductResponse.status === 201, `Expected 201 Created for product, got ${createProductResponse.status}`);
      assert(createdProduct && typeof createdProduct.id === "string", "Expected created product id");
      createdProductIds.push(createdProduct.id);
      product = createdProduct;
    }

    const { response: companyResponse, data: companyData } = await requestJson(`${backendUrl}/api/v1/companies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Contract Account ${uniqueSuffix}`,
        email: `contract.account.${uniqueSuffix}@example.com`,
        industry: "TECHNOLOGY",
        status: "ACTIVE",
        territory: routingTerritory || "Harare",
        ownerId: userId,
      }),
    });
    assert(companyResponse.status === 201, `Expected 201 Created for contract company, got ${companyResponse.status}`);
    assert(companyData && typeof companyData.id === "string", "Expected contract company id");
    createdCompanyIds.push(companyData.id);

    const { response: contactResponse, data: contactData } = await requestJson(`${backendUrl}/api/v1/contacts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "Contract",
        lastName: `Signer${uniqueSuffix}`,
        email: `contract.signer.${uniqueSuffix}@example.com`,
        title: "Procurement Lead",
        status: "ACTIVE",
        companyId: companyData.id,
      }),
    });
    assert(contactResponse.status === 201, `Expected 201 Created for contract contact, got ${contactResponse.status}`);
    assert(contactData && typeof contactData.id === "string", "Expected contract contact id");
    createdContactIds.push(contactData.id);

    const { response: quoteResponse, data: quoteData } = await requestJson(`${backendUrl}/api/v1/quotes`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        quoteNumber: `Q-${uniqueSuffix}`,
        companyId: companyData.id,
        contactId: contactData.id,
        issueDate: "2026-04-07",
        validUntil: "2026-04-30",
        status: "DRAFT",
        terms: "Net 30",
        discountAmount: 0,
        ownerId: userId,
        lineItems: [
          {
            productId: product.id,
            quantity: 3,
            unitPrice: product.unitPrice || 1500,
            discountPercent: 0,
            description: "Contract bundle",
          },
        ],
      }),
    });
    assert(quoteResponse.status === 201, `Expected 201 Created for quote, got ${quoteResponse.status}`);
    assert(quoteData && typeof quoteData.id === "string", "Expected quote id");
    createdQuoteId = quoteData.id;

    const { response: acceptedQuoteResponse, data: acceptedQuoteData } = await requestJson(
      `${backendUrl}/api/v1/quotes/${createdQuoteId}/status?status=ACCEPTED`,
      {
        method: "PATCH",
        headers: authHeaders,
      }
    );
    assert(acceptedQuoteResponse.ok, `Expected 200 OK for quote acceptance, got ${acceptedQuoteResponse.status}`);
    assert(acceptedQuoteData?.status === "ACCEPTED", `Expected ACCEPTED quote status, got ${acceptedQuoteData?.status}`);

    const { response: contractResponse, data: contractData } = await requestJson(
      `${backendUrl}/api/v1/contracts/from-quote/${createdQuoteId}`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          contractNumber: `C-${uniqueSuffix}`,
          title: `Contract ${uniqueSuffix}`,
          startDate: "2026-04-08",
          endDate: "2027-04-08",
          autoRenew: true,
          renewalNoticeDays: 45,
          ownerId: userId,
          notes: "Converted from accepted quote during smoke test",
        }),
      }
    );
    assert(contractResponse.status === 201, `Expected 201 Created for contract conversion, got ${contractResponse.status}`);
    assert(contractData && typeof contractData.id === "string", "Expected contract id");
    assert(contractData.quoteId === createdQuoteId, `Expected contract to reference quote ${createdQuoteId}, got ${contractData.quoteId}`);
    assert(contractData.status === "DRAFT", `Expected draft contract, got ${contractData.status}`);
    assert(Number(contractData.contractValue) > 0, "Expected converted contract value");
    createdContractId = contractData.id;

    const { response: activateResponse, data: activateData } = await requestJson(
      `${backendUrl}/api/v1/contracts/${createdContractId}/activate`,
      {
        method: "PATCH",
        headers: authHeaders,
      }
    );
    assert(activateResponse.ok, `Expected 200 OK for contract activation, got ${activateResponse.status}`);
    assert(activateData?.status === "ACTIVE", `Expected ACTIVE contract status, got ${activateData?.status}`);

    const { response: renewalResponse, data: renewalData } = await requestJson(
      `${backendUrl}/api/v1/contracts/${createdContractId}/renewal-due`,
      {
        method: "PATCH",
        headers: authHeaders,
      }
    );
      assert(renewalResponse.ok, `Expected 200 OK for contract renewal status, got ${renewalResponse.status}`);
      assert(renewalData?.status === "RENEWAL_DUE", `Expected RENEWAL_DUE contract status, got ${renewalData?.status}`);

      const { response: renewalInvoiceResponse, data: renewalInvoiceContractData } = await requestJson(
        `${backendUrl}/api/v1/contracts/${createdContractId}/generate-renewal-invoice`,
        {
          method: "PATCH",
          headers: authHeaders,
        }
      );
      assert(
        renewalInvoiceResponse.ok,
        `Expected 200 OK for renewal invoice generation, got ${renewalInvoiceResponse.status}`
      );
      assert(
        typeof renewalInvoiceContractData?.renewalInvoiceId === "string" && renewalInvoiceContractData.renewalInvoiceId.length > 0,
        "Expected renewal invoice id on contract"
      );
      createdInvoiceIds.push(renewalInvoiceContractData.renewalInvoiceId);

      const { response: renewalInvoiceLookupResponse, data: renewalInvoiceData } = await requestJson(
        `${backendUrl}/api/v1/invoices/${renewalInvoiceContractData.renewalInvoiceId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(
        renewalInvoiceLookupResponse.ok,
        `Expected 200 OK for renewal invoice lookup, got ${renewalInvoiceLookupResponse.status}`
      );
      assert(renewalInvoiceData?.status === "SENT", `Expected SENT renewal invoice, got ${renewalInvoiceData?.status}`);
      assert(Number(renewalInvoiceData?.total) > 0, "Expected renewal invoice total");

      const { response: renewedContractResponse, data: renewedContractData } = await requestJson(
        `${backendUrl}/api/v1/contracts/${createdContractId}/renew`,
        {
          method: "POST",
          headers: authHeaders,
        }
      );
      assert(renewedContractResponse.status === 201, `Expected 201 Created for contract renewal, got ${renewedContractResponse.status}`);
      assert(renewedContractData?.status === "ACTIVE", `Expected renewed contract to be ACTIVE, got ${renewedContractData?.status}`);
      assert(renewedContractData?.renewedFromContractId === createdContractId, "Expected renewedFromContractId to reference original contract");
      createdRenewedContractId = renewedContractData.id;

      const { response: originalContractResponse, data: originalContractData } = await requestJson(
        `${backendUrl}/api/v1/contracts/${createdContractId}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );
      assert(originalContractResponse.ok, `Expected 200 OK for original contract lookup, got ${originalContractResponse.status}`);
      assert(originalContractData?.status === "EXPIRED", `Expected original contract to be EXPIRED after renewal, got ${originalContractData?.status}`);
      assert(originalContractData?.renewedToContractId === createdRenewedContractId, "Expected renewedToContractId on original contract");
  
      const terminationReason = "Customer merged the agreement into a master contract";
      const { response: terminateResponse, data: terminateData } = await requestJson(
        `${backendUrl}/api/v1/contracts/${createdRenewedContractId}/terminate?reason=${encodeURIComponent(terminationReason)}`,
        {
          method: "PATCH",
          headers: authHeaders,
        }
      );
      assert(terminateResponse.ok, `Expected 200 OK for contract termination, got ${terminateResponse.status}`);
      assert(terminateData?.status === "TERMINATED", `Expected TERMINATED contract status, got ${terminateData?.status}`);
      assert(terminateData?.terminationReason === terminationReason, "Expected termination reason to be stored");

      return `Converted quote ${createdQuoteId} into contract ${createdContractId}, generated renewal invoice ${renewalInvoiceContractData.renewalInvoiceId}, renewed into ${createdRenewedContractId}, and completed the lifecycle`;
    });

  await runCheck("CPQ pricing guardrails", async () => {
    const uniqueSuffix = Date.now();

    const { response: productResponse, data: productData } = await requestJson(`${backendUrl}/api/v1/products`, {
      method: "POST",
      headers: authHeaders,
        body: JSON.stringify({
          name: `CPQ Product ${uniqueSuffix}`,
          sku: `CPQ-${uniqueSuffix}`,
          description: "Smoke test CPQ rules",
          category: "SERVICES",
          unitPrice: 2000,
          minimumPrice: 1500,
          allowDiscounting: true,
          maxDiscountPercent: 15,
          configurable: true,
          bundleOnly: true,
          minimumQuantity: 5,
          maximumQuantity: 20,
          bundleSize: 5,
          cost: 900,
          stockQuantity: 10,
          lowStockThreshold: 2,
          status: "ACTIVE",
          trackInventory: false,
        unit: "package",
        taxRate: 15,
      }),
    });
    assert(productResponse.status === 201, `Expected 201 Created for CPQ product, got ${productResponse.status}`);
    assert(productData && typeof productData.id === "string", "Expected CPQ product id");
    createdProductIds.push(productData.id);

    const { response: companyResponse, data: companyData } = await requestJson(`${backendUrl}/api/v1/companies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `CPQ Account ${uniqueSuffix}`,
        email: `cpq.account.${uniqueSuffix}@example.com`,
        industry: "TECHNOLOGY",
        status: "ACTIVE",
        territory: routingTerritory || "Harare",
        ownerId: userId,
      }),
    });
    assert(companyResponse.status === 201, `Expected 201 Created for CPQ company, got ${companyResponse.status}`);
    assert(companyData && typeof companyData.id === "string", "Expected CPQ company id");
    createdCompanyIds.push(companyData.id);

    const { response: contactResponse, data: contactData } = await requestJson(`${backendUrl}/api/v1/contacts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: "CPQ",
        lastName: `Buyer${uniqueSuffix}`,
        email: `cpq.buyer.${uniqueSuffix}@example.com`,
        title: "Finance Director",
        status: "ACTIVE",
        companyId: companyData.id,
      }),
    });
    assert(contactResponse.status === 201, `Expected 201 Created for CPQ contact, got ${contactResponse.status}`);
    assert(contactData && typeof contactData.id === "string", "Expected CPQ contact id");
    createdContactIds.push(contactData.id);

    const { response: blockedQuoteResponse } = await requestJson(`${backendUrl}/api/v1/quotes`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        quoteNumber: `CPQ-BLOCK-${uniqueSuffix}`,
        companyId: companyData.id,
        contactId: contactData.id,
        issueDate: "2026-04-07",
        validUntil: "2026-04-30",
        status: "DRAFT",
        terms: "Net 30",
        discountAmount: 0,
        ownerId: userId,
        lineItems: [
          {
            productId: productData.id,
            quantity: 1,
            unitPrice: 1700,
            discountPercent: 20,
            description: "Configured package with too much discount",
          },
        ],
      }),
      });
      assert(blockedQuoteResponse.status === 400, `Expected 400 for blocked discount rule, got ${blockedQuoteResponse.status}`);

      const { response: blockedBundleResponse } = await requestJson(`${backendUrl}/api/v1/quotes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          quoteNumber: `CPQ-BUNDLE-${uniqueSuffix}`,
          companyId: companyData.id,
          contactId: contactData.id,
          issueDate: "2026-04-07",
          validUntil: "2026-04-30",
          status: "DRAFT",
          terms: "Net 30",
          discountAmount: 0,
          ownerId: userId,
          lineItems: [
            {
              productId: productData.id,
              quantity: 3,
              unitPrice: 2000,
              discountPercent: 0,
              description: "Configured package with invalid bundle quantity",
            },
          ],
        }),
      });
      assert(blockedBundleResponse.status === 400, `Expected 400 for blocked bundle quantity rule, got ${blockedBundleResponse.status}`);

      const { response: quoteResponse, data: quoteData } = await requestJson(`${backendUrl}/api/v1/quotes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
        quoteNumber: `CPQ-${uniqueSuffix}`,
        companyId: companyData.id,
        contactId: contactData.id,
        issueDate: "2026-04-07",
        validUntil: "2026-04-30",
        status: "DRAFT",
        terms: "Net 30",
          discountAmount: 0,
          ownerId: userId,
          lineItems: [
            {
              productId: productData.id,
              quantity: 10,
              unitPrice: 1800,
              discountPercent: 10,
              description: "Configured package with approved discount band",
            },
          ],
      }),
    });
    assert(quoteResponse.status === 201, `Expected 201 Created for CPQ quote, got ${quoteResponse.status}`);
    assert(quoteData && typeof quoteData.id === "string", "Expected CPQ quote id");
    assert(quoteData.pricingApprovalRequired === true, "Expected pricing approval flag on custom-priced quote");
    assert(typeof quoteData.pricingApprovalReason === "string" && quoteData.pricingApprovalReason.length > 0, "Expected pricing approval reason");
    createdCpqQuoteId = quoteData.id;

    const { response: blockedAcceptResponse } = await requestJson(
      `${backendUrl}/api/v1/quotes/${createdCpqQuoteId}/status?status=ACCEPTED`,
      {
        method: "PATCH",
        headers: authHeaders,
      }
    );
    assert(blockedAcceptResponse.status === 400, `Expected 400 before pricing approval, got ${blockedAcceptResponse.status}`);

    const { response: approveResponse, data: approveData } = await requestJson(
      `${backendUrl}/api/v1/quotes/${createdCpqQuoteId}/approve-pricing`,
      {
        method: "PATCH",
        headers: authHeaders,
      }
    );
    assert(approveResponse.ok, `Expected 200 OK for pricing approval, got ${approveResponse.status}`);
    assert(typeof approveData?.pricingApprovedAt === "string" && approveData.pricingApprovedAt.length > 0, "Expected pricingApprovedAt after approval");
    assert(approveData?.pricingApprovedBy === userId, `Expected pricingApprovedBy ${userId}, got ${approveData?.pricingApprovedBy}`);

    const { response: acceptedQuoteResponse, data: acceptedQuoteData } = await requestJson(
      `${backendUrl}/api/v1/quotes/${createdCpqQuoteId}/status?status=ACCEPTED`,
      {
        method: "PATCH",
        headers: authHeaders,
      }
    );
      assert(acceptedQuoteResponse.ok, `Expected 200 OK after pricing approval, got ${acceptedQuoteResponse.status}`);
      assert(acceptedQuoteData?.status === "ACCEPTED", `Expected ACCEPTED quote after approval, got ${acceptedQuoteData?.status}`);

      return `Blocked excessive discount and invalid bundle quantity, required pricing approval for quote ${createdCpqQuoteId}, then approved and accepted it`;
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

  if (originalCampaignNurtureWorkflow && userRole === "ADMIN") {
    const restoreCampaignWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/campaign-nurture`, {
        method: "PUT",
        signal: restoreCampaignWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalCampaignNurtureWorkflow),
      });
    } finally {
      restoreCampaignWorkflow.dispose();
    }
  }

  if (originalCaseAssignmentWorkflow && userRole === "ADMIN") {
    const restoreCaseAssignmentWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/case-assignment`, {
        method: "PUT",
        signal: restoreCaseAssignmentWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalCaseAssignmentWorkflow),
      });
    } finally {
      restoreCaseAssignmentWorkflow.dispose();
    }
  }

  if (originalCaseSlaWorkflow && userRole === "ADMIN") {
    const restoreCaseSlaWorkflow = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/workflows/case-sla`, {
        method: "PUT",
        signal: restoreCaseSlaWorkflow.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(originalCaseSlaWorkflow),
      });
    } finally {
      restoreCaseSlaWorkflow.dispose();
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

  if (createdCampaignWorkflowTaskId && userRole === "ADMIN") {
    const cleanupCampaignWorkflowTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdCampaignWorkflowTaskId}`, {
        method: "DELETE",
        signal: cleanupCampaignWorkflowTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCampaignWorkflowTask.dispose();
    }
  }

  if (createdCampaignWorkflowNextTaskId && userRole === "ADMIN") {
    const cleanupCampaignWorkflowNextTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdCampaignWorkflowNextTaskId}`, {
        method: "DELETE",
        signal: cleanupCampaignWorkflowNextTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCampaignWorkflowNextTask.dispose();
    }
  }

  if (createdCaseResponseTaskId && userRole === "ADMIN") {
    const cleanupCaseResponseTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdCaseResponseTaskId}`, {
        method: "DELETE",
        signal: cleanupCaseResponseTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCaseResponseTask.dispose();
    }
  }

  if (createdCaseResolutionTaskId && userRole === "ADMIN") {
    const cleanupCaseResolutionTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdCaseResolutionTaskId}`, {
        method: "DELETE",
        signal: cleanupCaseResolutionTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCaseResolutionTask.dispose();
    }
  }

  if (createdCaseEscalationTaskId && userRole === "ADMIN") {
    const cleanupCaseEscalationTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdCaseEscalationTaskId}`, {
        method: "DELETE",
        signal: cleanupCaseEscalationTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCaseEscalationTask.dispose();
    }
  }

  if (createdCaseAssignmentWorkflowTaskId && userRole === "ADMIN") {
    const cleanupCaseAssignmentWorkflowTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdCaseAssignmentWorkflowTaskId}`, {
        method: "DELETE",
        signal: cleanupCaseAssignmentWorkflowTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCaseAssignmentWorkflowTask.dispose();
    }
  }

  if (createdCaseAssignmentWorkflowCaseId && userRole === "ADMIN") {
    const cleanupCaseAssignmentWorkflowCase = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/cases/${createdCaseAssignmentWorkflowCaseId}`, {
        method: "DELETE",
        signal: cleanupCaseAssignmentWorkflowCase.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCaseAssignmentWorkflowCase.dispose();
    }
  }

  if (createdAssignmentTaskId && userRole === "ADMIN") {
    const cleanupAssignmentTask = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/tasks/${createdAssignmentTaskId}`, {
        method: "DELETE",
        signal: cleanupAssignmentTask.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupAssignmentTask.dispose();
    }
  }

  if (createdAssignmentCaseId && userRole === "ADMIN") {
    const cleanupAssignmentCase = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/cases/${createdAssignmentCaseId}`, {
        method: "DELETE",
        signal: cleanupAssignmentCase.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupAssignmentCase.dispose();
    }
  }

  if (createdCaseWorkflowCaseId && userRole === "ADMIN") {
    const cleanupCaseWorkflowCase = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/cases/${createdCaseWorkflowCaseId}`, {
        method: "DELETE",
        signal: cleanupCaseWorkflowCase.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCaseWorkflowCase.dispose();
    }
  }

  if (createdCampaignWorkflowLeadId && userRole === "ADMIN") {
    const cleanupCampaignWorkflowLead = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/leads/${createdCampaignWorkflowLeadId}`, {
        method: "DELETE",
        signal: cleanupCampaignWorkflowLead.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCampaignWorkflowLead.dispose();
    }
  }

  if (createdCampaignSegmentLeadId && userRole === "ADMIN") {
    const cleanupCampaignSegmentLead = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/leads/${createdCampaignSegmentLeadId}`, {
        method: "DELETE",
        signal: cleanupCampaignSegmentLead.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCampaignSegmentLead.dispose();
    }
  }

  if (createdCampaignWorkflowCampaignId && userRole === "ADMIN") {
    const cleanupCampaignWorkflowCampaign = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/campaigns/${createdCampaignWorkflowCampaignId}`, {
        method: "DELETE",
        signal: cleanupCampaignWorkflowCampaign.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCampaignWorkflowCampaign.dispose();
    }
  }

  if (createdCampaignWorkflowJourneyId && userRole === "ADMIN") {
    const cleanupCampaignWorkflowJourney = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/campaigns/journeys/${createdCampaignWorkflowJourneyId}`, {
        method: "DELETE",
        signal: cleanupCampaignWorkflowJourney.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCampaignWorkflowJourney.dispose();
    }
  }

  if (createdSegmentJourneyCampaignId && userRole === "ADMIN") {
    const cleanupSegmentJourneyCampaign = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/campaigns/${createdSegmentJourneyCampaignId}`, {
        method: "DELETE",
        signal: cleanupSegmentJourneyCampaign.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupSegmentJourneyCampaign.dispose();
    }
  }

  if (createdNurtureJourneyId && userRole === "ADMIN") {
    const cleanupNurtureJourney = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/campaigns/journeys/${createdNurtureJourneyId}`, {
        method: "DELETE",
        signal: cleanupNurtureJourney.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupNurtureJourney.dispose();
    }
  }

  if (createdCampaignSegmentId && userRole === "ADMIN") {
    const cleanupCampaignSegment = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/campaigns/segments/${createdCampaignSegmentId}`, {
        method: "DELETE",
        signal: cleanupCampaignSegment.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCampaignSegment.dispose();
    }
  }

  if (userRole === "ADMIN") {
    for (const ruleId of createdAutomationRuleIds.reverse()) {
      const cleanupAutomationRule = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/automation-rules/${ruleId}`, {
          method: "DELETE",
          signal: cleanupAutomationRule.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupAutomationRule.dispose();
      }
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

  if (createdAutomationCaseId && userRole === "ADMIN") {
    const cleanupAutomationCase = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/cases/${createdAutomationCaseId}`, {
        method: "DELETE",
        signal: cleanupAutomationCase.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupAutomationCase.dispose();
    }
  }

  if (createdAutomationGenericDealId && userRole === "ADMIN") {
    const cleanupAutomationGenericDeal = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/deals/${createdAutomationGenericDealId}`, {
        method: "DELETE",
        signal: cleanupAutomationGenericDeal.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupAutomationGenericDeal.dispose();
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

  for (const createdInvoiceId of createdInvoiceIds) {
    if (!createdInvoiceId || userRole !== "ADMIN") {
      continue;
    }
    const cleanupInvoice = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/invoices/${createdInvoiceId}`, {
        method: "DELETE",
        signal: cleanupInvoice.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupInvoice.dispose();
    }
  }

  if (createdRenewedContractId && userRole === "ADMIN") {
    const cleanupRenewedContract = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/contracts/${createdRenewedContractId}`, {
        method: "DELETE",
        signal: cleanupRenewedContract.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupRenewedContract.dispose();
    }
  }

  if (createdContractId && userRole === "ADMIN") {
    const cleanupContract = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/contracts/${createdContractId}`, {
        method: "DELETE",
        signal: cleanupContract.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupContract.dispose();
    }
  }

  if (createdCpqQuoteId && userRole === "ADMIN") {
    const cleanupCpqQuote = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/quotes/${createdCpqQuoteId}`, {
        method: "DELETE",
        signal: cleanupCpqQuote.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupCpqQuote.dispose();
    }
  }

  if (createdQuoteId && userRole === "ADMIN") {
    const cleanupQuote = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/quotes/${createdQuoteId}`, {
        method: "DELETE",
        signal: cleanupQuote.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupQuote.dispose();
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

  if (createdAutomationLeadId && userRole === "ADMIN") {
    const cleanupAutomationLead = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/leads/${createdAutomationLeadId}`, {
        method: "DELETE",
        signal: cleanupAutomationLead.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupAutomationLead.dispose();
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

  if (scopedLeadId && userRole === "ADMIN") {
    const cleanupScopedLead = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/leads/${scopedLeadId}`, {
        method: "DELETE",
        signal: cleanupScopedLead.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupScopedLead.dispose();
    }
  }

  for (const scopedUserId of [scopedOutsiderRepId, scopedTerritoryRepId, scopedOwnerRepId, scopedManagerId].filter(Boolean)) {
    const cleanupScopedUser = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/users/${scopedUserId}/status`, {
        method: "PATCH",
        signal: cleanupScopedUser.signal,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      });
    } finally {
      cleanupScopedUser.dispose();
    }
  }

  for (const scopedTerritoryId of [scopedOutsideTerritoryId, scopedTeamTerritoryId].filter(Boolean)) {
    const cleanupScopedTerritory = createTimeoutSignal(timeoutMs);
    try {
      await fetch(`${backendUrl}/api/v1/territories/${scopedTerritoryId}`, {
        method: "DELETE",
        signal: cleanupScopedTerritory.signal,
        headers: authHeaders,
      });
    } finally {
      cleanupScopedTerritory.dispose();
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

    for (const productId of createdProductIds.reverse()) {
      const cleanupProduct = createTimeoutSignal(timeoutMs);
      try {
        await fetch(`${backendUrl}/api/v1/products/${productId}`, {
          method: "DELETE",
          signal: cleanupProduct.signal,
          headers: authHeaders,
        });
      } finally {
        cleanupProduct.dispose();
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
