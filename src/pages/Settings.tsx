import { useEffect, useState } from "react";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { dashboardApi, tenantAdminApi, territoriesApi, usersApi, workflowRulesApi } from "../lib/api";
import type {
  AutomationRun,
  CampaignNurtureWorkflowSettings,
  CaseAssignmentWorkflowSettings,
  CaseSlaWorkflowSettings,
  DealApprovalWorkflowSettings,
  DealRescueWorkflowSettings,
  GovernanceOpsWorkflowSettings,
  LeadIntakeWorkflowSettings,
  QuotaRiskWorkflowSettings,
  TerritoryEscalationWorkflowSettings,
  TenantDatabaseSettings,
  TenantDatabaseSettingsUpdateRequest,
  TenantUser,
  UserRole,
  WorkspaceTerritory,
} from "../lib/types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import { roleLabels, tenantTierLabels } from "../lib/authz";

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Icons;
}

const settingSections: SettingSection[] = [
  { id: "profile", title: "Profile", description: "Manage your personal information", icon: "User" },
  { id: "workspace", title: "Workspace", description: "Tenant identity and database routing", icon: "FolderLock" },
  { id: "team", title: "Team", description: "Manage team members and roles", icon: "Users" },
  { id: "automation", title: "Automation", description: "Configure workflow rules and follow-up timing", icon: "Zap" },
  { id: "notifications", title: "Notifications", description: "Configure email and push notifications", icon: "Bell" },
  { id: "integrations", title: "Integrations", description: "Connect with third-party services", icon: "Zap" },
  { id: "billing", title: "Billing", description: "Manage subscription and payments", icon: "CreditCard" },
  { id: "security", title: "Security", description: "Password and security settings", icon: "Lock" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const previewSectionMessage =
    "This section is currently a product preview and is not connected to backend workflows yet.";
  const [activeSection, setActiveSection] = useState("profile");
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TenantUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [territories, setTerritories] = useState<WorkspaceTerritory[]>([]);
  const [territoriesLoading, setTerritoriesLoading] = useState(false);
  const [territorySubmitting, setTerritorySubmitting] = useState(false);
  const [leadWorkflow, setLeadWorkflow] = useState<LeadIntakeWorkflowSettings | null>(null);
  const [leadWorkflowDraft, setLeadWorkflowDraft] = useState<LeadIntakeWorkflowSettings | null>(null);
  const [leadWorkflowLoading, setLeadWorkflowLoading] = useState(false);
  const [leadWorkflowSaving, setLeadWorkflowSaving] = useState(false);
  const [campaignNurtureWorkflow, setCampaignNurtureWorkflow] = useState<CampaignNurtureWorkflowSettings | null>(null);
  const [campaignNurtureWorkflowDraft, setCampaignNurtureWorkflowDraft] = useState<CampaignNurtureWorkflowSettings | null>(null);
  const [campaignNurtureWorkflowLoading, setCampaignNurtureWorkflowLoading] = useState(false);
  const [campaignNurtureWorkflowSaving, setCampaignNurtureWorkflowSaving] = useState(false);
  const [caseAssignmentWorkflow, setCaseAssignmentWorkflow] = useState<CaseAssignmentWorkflowSettings | null>(null);
  const [caseAssignmentWorkflowDraft, setCaseAssignmentWorkflowDraft] = useState<CaseAssignmentWorkflowSettings | null>(null);
  const [caseAssignmentWorkflowLoading, setCaseAssignmentWorkflowLoading] = useState(false);
  const [caseAssignmentWorkflowSaving, setCaseAssignmentWorkflowSaving] = useState(false);
  const [caseSlaWorkflow, setCaseSlaWorkflow] = useState<CaseSlaWorkflowSettings | null>(null);
  const [caseSlaWorkflowDraft, setCaseSlaWorkflowDraft] = useState<CaseSlaWorkflowSettings | null>(null);
  const [caseSlaWorkflowLoading, setCaseSlaWorkflowLoading] = useState(false);
  const [caseSlaWorkflowSaving, setCaseSlaWorkflowSaving] = useState(false);
  const [dealRescueWorkflow, setDealRescueWorkflow] = useState<DealRescueWorkflowSettings | null>(null);
  const [dealRescueWorkflowDraft, setDealRescueWorkflowDraft] = useState<DealRescueWorkflowSettings | null>(null);
  const [dealRescueWorkflowLoading, setDealRescueWorkflowLoading] = useState(false);
  const [dealRescueWorkflowSaving, setDealRescueWorkflowSaving] = useState(false);
  const [quotaRiskWorkflow, setQuotaRiskWorkflow] = useState<QuotaRiskWorkflowSettings | null>(null);
  const [quotaRiskWorkflowDraft, setQuotaRiskWorkflowDraft] = useState<QuotaRiskWorkflowSettings | null>(null);
  const [quotaRiskWorkflowLoading, setQuotaRiskWorkflowLoading] = useState(false);
  const [quotaRiskWorkflowSaving, setQuotaRiskWorkflowSaving] = useState(false);
  const [dealApprovalWorkflow, setDealApprovalWorkflow] = useState<DealApprovalWorkflowSettings | null>(null);
  const [dealApprovalWorkflowDraft, setDealApprovalWorkflowDraft] = useState<DealApprovalWorkflowSettings | null>(null);
  const [dealApprovalWorkflowLoading, setDealApprovalWorkflowLoading] = useState(false);
  const [dealApprovalWorkflowSaving, setDealApprovalWorkflowSaving] = useState(false);
  const [governanceOpsWorkflow, setGovernanceOpsWorkflow] = useState<GovernanceOpsWorkflowSettings | null>(null);
  const [governanceOpsWorkflowDraft, setGovernanceOpsWorkflowDraft] = useState<GovernanceOpsWorkflowSettings | null>(null);
  const [governanceOpsWorkflowLoading, setGovernanceOpsWorkflowLoading] = useState(false);
  const [governanceOpsWorkflowSaving, setGovernanceOpsWorkflowSaving] = useState(false);
  const [territoryEscalationWorkflow, setTerritoryEscalationWorkflow] = useState<TerritoryEscalationWorkflowSettings | null>(null);
  const [territoryEscalationWorkflowDraft, setTerritoryEscalationWorkflowDraft] = useState<TerritoryEscalationWorkflowSettings | null>(null);
  const [territoryEscalationWorkflowLoading, setTerritoryEscalationWorkflowLoading] = useState(false);
  const [territoryEscalationWorkflowSaving, setTerritoryEscalationWorkflowSaving] = useState(false);
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>([]);
  const [automationRunsLoading, setAutomationRunsLoading] = useState(false);
  const [roleUpdates, setRoleUpdates] = useState<Record<string, UserRole>>({});
  const [revenueOpsDrafts, setRevenueOpsDrafts] = useState<Record<string, { territory: string; quarterlyQuota: string; annualQuota: string }>>({});
  const [workspaceDatabase, setWorkspaceDatabase] = useState<TenantDatabaseSettings | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceValidating, setWorkspaceValidating] = useState(false);
  const [workspaceMigrating, setWorkspaceMigrating] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState<TenantDatabaseSettingsUpdateRequest>({
    dedicatedDatabaseEnabled: false,
    databaseUrl: "",
    databaseUsername: "",
    databasePassword: "",
    databaseDriverClassName: "org.postgresql.Driver",
  });
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "USER" as UserRole,
    territory: "",
    quarterlyQuota: "",
    annualQuota: "",
  });
  const [newTerritory, setNewTerritory] = useState({
    name: "",
    description: "",
  });

  const isAdmin = user?.role === "ADMIN";

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  const formatRunTime = (value?: string) => {
    if (!value) return "No timestamp";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const roleLabel = (role: UserRole) => {
    return roleLabels[role] ?? "User";
  };

  const activeTerritories = territories.filter((territory) => territory.isActive);

  const buildTerritoryOptions = (currentTerritory?: string) => {
    const options = activeTerritories.map((territory) => territory.name);
    if (currentTerritory && !options.includes(currentTerritory)) {
      return [currentTerritory, ...options];
    }
    return options;
  };

  const isGovernedTerritory = (territory?: string) => {
    if (!territory) return false;
    return territories.some((item) => item.name === territory && item.isActive);
  };

  const syncWorkspaceForm = (settings: TenantDatabaseSettings) => {
    setWorkspaceForm({
      dedicatedDatabaseEnabled: settings.dedicatedDatabaseEnabled,
      databaseUrl: settings.databaseUrl || "",
      databaseUsername: settings.databaseUsername || "",
      databasePassword: "",
      databaseDriverClassName: settings.databaseDriverClassName || "org.postgresql.Driver",
    });
  };

  const loadWorkspaceDatabaseSettings = async () => {
    if (!isAdmin) return;
    setWorkspaceLoading(true);
    try {
      const response = await tenantAdminApi.getDatabaseSettings();
      setWorkspaceDatabase(response);
      syncWorkspaceForm(response);
    } catch (error) {
      console.error("Failed to load workspace database settings:", error);
      showToast("Failed to load workspace database settings", "error");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    if (!isAdmin) return;
    setTeamLoading(true);
    try {
      const response = await usersApi.getAll({ page: 0, size: 100, sort: "createdAt,desc" });
      setTeamMembers(response.content ?? []);
      setRoleUpdates(
        (response.content ?? []).reduce<Record<string, UserRole>>((acc, member) => {
          acc[member.id] = member.role;
          return acc;
        }, {})
      );
      setRevenueOpsDrafts(
        (response.content ?? []).reduce<Record<string, { territory: string; quarterlyQuota: string; annualQuota: string }>>((acc, member) => {
          acc[member.id] = {
            territory: member.territory || "",
            quarterlyQuota: member.quarterlyQuota != null ? String(member.quarterlyQuota) : "",
            annualQuota: member.annualQuota != null ? String(member.annualQuota) : "",
          };
          return acc;
        }, {})
      );
    } catch (error) {
      console.error("Failed to load users:", error);
      showToast("Failed to load team members", "error");
    } finally {
      setTeamLoading(false);
    }
  };

  const loadTerritories = async () => {
    if (!isAdmin) return;
    setTerritoriesLoading(true);
    try {
      const response = await territoriesApi.getAll();
      setTerritories(response);
    } catch (error) {
      console.error("Failed to load territories:", error);
      showToast("Failed to load workspace territories", "error");
    } finally {
      setTerritoriesLoading(false);
    }
  };

  const loadLeadWorkflow = async () => {
    if (!isAdmin) return;
    setLeadWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getLeadIntake();
      setLeadWorkflow(response);
      setLeadWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load lead workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setLeadWorkflowLoading(false);
    }
  };

  const loadCampaignNurtureWorkflow = async () => {
    if (!isAdmin) return;
    setCampaignNurtureWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getCampaignNurture();
      setCampaignNurtureWorkflow(response);
      setCampaignNurtureWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load campaign nurture workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setCampaignNurtureWorkflowLoading(false);
    }
  };

  const loadCaseAssignmentWorkflow = async () => {
    if (!isAdmin) return;
    setCaseAssignmentWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getCaseAssignment();
      setCaseAssignmentWorkflow(response);
      setCaseAssignmentWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load case assignment workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setCaseAssignmentWorkflowLoading(false);
    }
  };

  const loadDealRescueWorkflow = async () => {
    if (!isAdmin) return;
    setDealRescueWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getDealRescue();
      setDealRescueWorkflow(response);
      setDealRescueWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load deal rescue workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setDealRescueWorkflowLoading(false);
    }
  };

  const loadCaseSlaWorkflow = async () => {
    if (!isAdmin) return;
    setCaseSlaWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getCaseSla();
      setCaseSlaWorkflow(response);
      setCaseSlaWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load case SLA workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setCaseSlaWorkflowLoading(false);
    }
  };

  const loadQuotaRiskWorkflow = async () => {
    if (!isAdmin) return;
    setQuotaRiskWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getQuotaRisk();
      setQuotaRiskWorkflow(response);
      setQuotaRiskWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load quota risk workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setQuotaRiskWorkflowLoading(false);
    }
  };

  const loadDealApprovalWorkflow = async () => {
    if (!isAdmin) return;
    setDealApprovalWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getDealApproval();
      setDealApprovalWorkflow(response);
      setDealApprovalWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load deal approval workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setDealApprovalWorkflowLoading(false);
    }
  };

  const loadGovernanceOpsWorkflow = async () => {
    if (!isAdmin) return;
    setGovernanceOpsWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getGovernanceOps();
      setGovernanceOpsWorkflow(response);
      setGovernanceOpsWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load governance ops workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setGovernanceOpsWorkflowLoading(false);
    }
  };

  const loadTerritoryEscalationWorkflow = async () => {
    if (!isAdmin) return;
    setTerritoryEscalationWorkflowLoading(true);
    try {
      const response = await workflowRulesApi.getTerritoryEscalation();
      setTerritoryEscalationWorkflow(response);
      setTerritoryEscalationWorkflowDraft(response);
    } catch (error) {
      console.error("Failed to load territory escalation workflow:", error);
      showToast("Failed to load workflow settings", "error");
    } finally {
      setTerritoryEscalationWorkflowLoading(false);
    }
  };

  const loadAutomationRuns = async () => {
    if (!isAdmin) return;
    setAutomationRunsLoading(true);
    try {
      const response = await dashboardApi.getAutomationRuns(8);
      setAutomationRuns(response);
    } catch (error) {
      console.error("Failed to load automation run history:", error);
      showToast("Failed to load automation history", "error");
    } finally {
      setAutomationRunsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "team") {
      void loadTeamMembers();
      void loadTerritories();
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (activeSection === "automation" && isAdmin) {
      void loadLeadWorkflow();
      void loadCampaignNurtureWorkflow();
      void loadCaseAssignmentWorkflow();
      void loadCaseSlaWorkflow();
      void loadDealRescueWorkflow();
      void loadQuotaRiskWorkflow();
      void loadDealApprovalWorkflow();
      void loadGovernanceOpsWorkflow();
      void loadTerritoryEscalationWorkflow();
      void loadAutomationRuns();
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (activeSection === "workspace" && isAdmin) {
      void loadWorkspaceDatabaseSettings();
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    const rawPreferences = localStorage.getItem("crm-settings-preferences");
    if (!rawPreferences) return;

    try {
      const parsed = JSON.parse(rawPreferences) as {
        darkMode?: boolean;
        emailNotifications?: boolean;
        pushNotifications?: boolean;
      };
      setDarkMode(parsed.darkMode ?? false);
      setEmailNotifications(parsed.emailNotifications ?? true);
      setPushNotifications(parsed.pushNotifications ?? true);
    } catch (error) {
      console.warn("Could not parse saved settings preferences", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "crm-settings-preferences",
      JSON.stringify({
        darkMode,
        emailNotifications,
        pushNotifications,
      })
    );
  }, [darkMode, emailNotifications, pushNotifications]);

  const handleCreateMember = async () => {
    if (!newMember.firstName || !newMember.lastName || !newMember.email || !newMember.password) {
      showToast("Please fill all required fields", "warning");
      return;
    }

    setTeamSubmitting(true);
    try {
      await usersApi.create({
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        email: newMember.email,
        password: newMember.password,
        role: newMember.role,
        isActive: true,
        territory: newMember.territory.trim() || undefined,
        quarterlyQuota: newMember.quarterlyQuota.trim() ? Number(newMember.quarterlyQuota) : undefined,
        annualQuota: newMember.annualQuota.trim() ? Number(newMember.annualQuota) : undefined,
      });
      showToast("Team member created", "success");
      setNewMember({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "USER",
        territory: "",
        quarterlyQuota: "",
        annualQuota: "",
      });
      await loadTeamMembers();
    } catch (error) {
      console.error("Failed to create user:", error);
      showToast("Could not create user", "error");
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleUpdateRole = async (member: TenantUser) => {
    const nextRole = roleUpdates[member.id];
    if (!nextRole || nextRole === member.role) return;

    try {
      const updated = await usersApi.updateRole(member.id, nextRole);
      setTeamMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
      showToast(`Role updated to ${roleLabel(updated.role)}`, "success");
    } catch (error) {
      console.error("Failed to update role:", error);
      showToast("Failed to update role", "error");
      setRoleUpdates((prev) => ({ ...prev, [member.id]: member.role }));
    }
  };

  const handleCreateTerritory = async () => {
    if (!newTerritory.name.trim()) {
      showToast("Territory name is required", "warning");
      return;
    }

    setTerritorySubmitting(true);
    try {
      const created = await territoriesApi.create({
        name: newTerritory.name.trim(),
        description: newTerritory.description.trim() || undefined,
        isActive: true,
      });
      setTerritories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTerritory({ name: "", description: "" });
      showToast(`Territory ${created.name} created`, "success");
    } catch (error) {
      console.error("Failed to create territory:", error);
      showToast("Failed to create territory", "error");
    } finally {
      setTerritorySubmitting(false);
    }
  };

  const handleToggleTerritoryStatus = async (territory: WorkspaceTerritory) => {
    try {
      const updated = await territoriesApi.update(territory.id, {
        name: territory.name,
        description: territory.description,
        isActive: !territory.isActive,
      });
      setTerritories((prev) =>
        prev
          .map((item) => (item.id === territory.id ? updated : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast(
        updated.isActive ? `${updated.name} activated` : `${updated.name} paused`,
        "success"
      );
    } catch (error) {
      console.error("Failed to update territory:", error);
      showToast("Failed to update territory", "error");
    }
  };

  const handleUpdateRevenueOps = async (member: TenantUser) => {
    const draft = revenueOpsDrafts[member.id] ?? {
      territory: member.territory || "",
      quarterlyQuota: member.quarterlyQuota != null ? String(member.quarterlyQuota) : "",
      annualQuota: member.annualQuota != null ? String(member.annualQuota) : "",
    };

    try {
      const updated = await usersApi.updateRevenueOps(member.id, {
        territory: draft.territory.trim() || undefined,
        quarterlyQuota: draft.quarterlyQuota.trim() ? Number(draft.quarterlyQuota) : null,
        annualQuota: draft.annualQuota.trim() ? Number(draft.annualQuota) : null,
      });
      setTeamMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
      setRevenueOpsDrafts((prev) => ({
        ...prev,
        [member.id]: {
          territory: updated.territory || "",
          quarterlyQuota: updated.quarterlyQuota != null ? String(updated.quarterlyQuota) : "",
          annualQuota: updated.annualQuota != null ? String(updated.annualQuota) : "",
        },
      }));
      showToast(`Revenue ops updated for ${member.firstName}`, "success");
    } catch (error) {
      console.error("Failed to update revenue ops:", error);
      showToast("Failed to update revenue ops", "error");
    }
  };

  const handleSaveLeadWorkflow = async () => {
    if (!isAdmin || !leadWorkflowDraft) return;

    setLeadWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateLeadIntake(leadWorkflowDraft);
      setLeadWorkflow(response);
      setLeadWorkflowDraft(response);
      showToast("Lead workflow updated", "success");
    } catch (error) {
      console.error("Failed to update lead workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setLeadWorkflowSaving(false);
    }
  };

  const handleSaveCampaignNurtureWorkflow = async () => {
    if (!isAdmin || !campaignNurtureWorkflowDraft) return;

    setCampaignNurtureWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateCampaignNurture(campaignNurtureWorkflowDraft);
      setCampaignNurtureWorkflow(response);
      setCampaignNurtureWorkflowDraft(response);
      showToast("Campaign nurture workflow updated", "success");
    } catch (error) {
      console.error("Failed to update campaign nurture workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setCampaignNurtureWorkflowSaving(false);
    }
  };

  const handleSaveCaseAssignmentWorkflow = async () => {
    if (!isAdmin || !caseAssignmentWorkflowDraft) return;

    setCaseAssignmentWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateCaseAssignment(caseAssignmentWorkflowDraft);
      setCaseAssignmentWorkflow(response);
      setCaseAssignmentWorkflowDraft(response);
      showToast("Case assignment workflow updated", "success");
    } catch (error) {
      console.error("Failed to update case assignment workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setCaseAssignmentWorkflowSaving(false);
    }
  };

  const handleSaveDealRescueWorkflow = async () => {
    if (!isAdmin || !dealRescueWorkflowDraft) return;

    setDealRescueWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateDealRescue(dealRescueWorkflowDraft);
      setDealRescueWorkflow(response);
      setDealRescueWorkflowDraft(response);
      showToast("Deal rescue workflow updated", "success");
    } catch (error) {
      console.error("Failed to update deal rescue workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setDealRescueWorkflowSaving(false);
    }
  };

  const handleSaveCaseSlaWorkflow = async () => {
    if (!isAdmin || !caseSlaWorkflowDraft) return;

    setCaseSlaWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateCaseSla(caseSlaWorkflowDraft);
      setCaseSlaWorkflow(response);
      setCaseSlaWorkflowDraft(response);
      showToast("Case SLA workflow updated", "success");
    } catch (error) {
      console.error("Failed to update case SLA workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setCaseSlaWorkflowSaving(false);
    }
  };

  const handleSaveQuotaRiskWorkflow = async () => {
    if (!isAdmin || !quotaRiskWorkflowDraft) return;

    setQuotaRiskWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateQuotaRisk(quotaRiskWorkflowDraft);
      setQuotaRiskWorkflow(response);
      setQuotaRiskWorkflowDraft(response);
      showToast("Quota risk workflow updated", "success");
    } catch (error) {
      console.error("Failed to update quota risk workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setQuotaRiskWorkflowSaving(false);
    }
  };

  const handleSaveDealApprovalWorkflow = async () => {
    if (!isAdmin || !dealApprovalWorkflowDraft) return;

    setDealApprovalWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateDealApproval(dealApprovalWorkflowDraft);
      setDealApprovalWorkflow(response);
      setDealApprovalWorkflowDraft(response);
      showToast("Deal approval workflow updated", "success");
    } catch (error) {
      console.error("Failed to update deal approval workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setDealApprovalWorkflowSaving(false);
    }
  };

  const handleSaveGovernanceOpsWorkflow = async () => {
    if (!isAdmin || !governanceOpsWorkflowDraft) return;

    setGovernanceOpsWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateGovernanceOps(governanceOpsWorkflowDraft);
      setGovernanceOpsWorkflow(response);
      setGovernanceOpsWorkflowDraft(response);
      showToast("Governance ops workflow updated", "success");
    } catch (error) {
      console.error("Failed to update governance ops workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setGovernanceOpsWorkflowSaving(false);
    }
  };

  const handleSaveTerritoryEscalationWorkflow = async () => {
    if (!isAdmin || !territoryEscalationWorkflowDraft) return;

    setTerritoryEscalationWorkflowSaving(true);
    try {
      const response = await workflowRulesApi.updateTerritoryEscalation(territoryEscalationWorkflowDraft);
      setTerritoryEscalationWorkflow(response);
      setTerritoryEscalationWorkflowDraft(response);
      showToast("Territory escalation workflow updated", "success");
    } catch (error) {
      console.error("Failed to update territory escalation workflow:", error);
      showToast("Failed to update workflow settings", "error");
    } finally {
      setTerritoryEscalationWorkflowSaving(false);
    }
  };

  const handleToggleStatus = async (member: TenantUser) => {
    try {
      const updated = await usersApi.updateStatus(member.id, !member.isActive);
      setTeamMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
      showToast(
        updated.isActive ? "User activated" : "User deactivated",
        "success"
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      showToast("Failed to update status", "error");
    }
  };

  const handleSaveWorkspaceDatabaseSettings = async () => {
    if (!isAdmin) return;

    setWorkspaceSaving(true);
    try {
      const response = await tenantAdminApi.updateDatabaseSettings({
        dedicatedDatabaseEnabled: workspaceForm.dedicatedDatabaseEnabled,
        databaseUrl: workspaceForm.databaseUrl,
        databaseUsername: workspaceForm.databaseUsername,
        databasePassword: workspaceForm.databasePassword,
        databaseDriverClassName: workspaceForm.databaseDriverClassName,
      });
      setWorkspaceDatabase(response);
      syncWorkspaceForm(response);
      showToast("Workspace database settings saved", "success");
    } catch (error) {
      console.error("Failed to save workspace database settings:", error);
      showToast("Failed to save workspace database settings", "error");
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const handleValidateWorkspaceDatabaseSettings = async () => {
    if (!isAdmin) return;

    setWorkspaceValidating(true);
    try {
      const response = await tenantAdminApi.validateDatabaseSettings();
      setWorkspaceDatabase(response);
      syncWorkspaceForm(response);
      showToast(
        response.lastValidationSucceeded
          ? "Dedicated database connection validated"
          : response.lastValidationMessage || "Dedicated database validation failed",
        response.lastValidationSucceeded ? "success" : "warning"
      );
    } catch (error) {
      console.error("Failed to validate workspace database settings:", error);
      showToast("Failed to validate workspace database settings", "error");
    } finally {
      setWorkspaceValidating(false);
    }
  };

  const handleMigrateWorkspaceToDedicatedDatabase = async () => {
    if (!isAdmin) return;

    setWorkspaceMigrating(true);
    try {
      const response = await tenantAdminApi.migrateToDedicatedDatabase();
      setWorkspaceDatabase(response);
      syncWorkspaceForm(response);
      showToast("Workspace migrated to a dedicated database", "success");
    } catch (error) {
      console.error("Failed to migrate workspace to dedicated database:", error);
      showToast("Failed to migrate workspace to a dedicated database", "error");
    } finally {
      setWorkspaceMigrating(false);
    }
  };

  const renderWorkspaceSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace Name</p>
        <p className="mt-2 text-sm font-semibold">{user?.tenantName || "Workspace"}</p>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace Slug</p>
        <p className="mt-2 text-sm font-semibold">{user?.tenantSlug || "Not available"}</p>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace Tier</p>
        <p className="mt-2 text-sm font-semibold">
          {user?.tenantTier ? tenantTierLabels[user.tenantTier] : "Free"}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tenant ID</p>
        <p className="mt-2 text-xs break-all text-muted-foreground">{user?.tenantId || "Not available"}</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold">
                  {getInitials(user?.firstName || "", user?.lastName || "") || "U"}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">First Name</label>
                      <input
                        type="text"
                        defaultValue={user?.firstName || ""}
                        disabled
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Last Name</label>
                      <input
                        type="text"
                        defaultValue={user?.lastName || ""}
                        disabled
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      defaultValue={user?.email || ""}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <input
                      type="text"
                      defaultValue={user?.role ? roleLabel(user.role as UserRole) : ""}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold mb-4">Workspace</h3>
              {renderWorkspaceSummaryCards()}
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold mb-4">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">Use dark theme across the application</p>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      darkMode ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                      darkMode ? "translate-x-6" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Timezone</p>
                    <p className="text-sm text-muted-foreground">Set your local timezone</p>
                  </div>
                  <select className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>Pacific Time (PT)</option>
                    <option>Mountain Time (MT)</option>
                    <option>Central Time (CT)</option>
                    <option>Eastern Time (ET)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => showToast("Profile editing is not wired yet. User details are currently read-only.", "info")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        );

      case "workspace":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Workspace Identity</h3>
              {renderWorkspaceSummaryCards()}
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Each workspace can stay on the shared CRM database or prepare a dedicated database
              connection. Dedicated routing only activates after an admin saves the settings and a
              successful validation is recorded.
            </div>

            {!isAdmin ? (
              <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
                Only tenant admins can manage workspace database routing.
              </div>
            ) : workspaceLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading workspace database settings...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Routing Mode</p>
                    <p className="mt-2 text-sm font-semibold">
                      {workspaceDatabase?.routingMode === "DEDICATED" ? "Dedicated Database" : "Shared Database"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Config Saved</p>
                    <p className="mt-2 text-sm font-semibold">
                      {workspaceDatabase?.databaseConfigured ? "Yes" : "Incomplete"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Password Stored</p>
                    <p className="mt-2 text-sm font-semibold">
                      {workspaceDatabase?.passwordConfigured ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last Validation</p>
                    <p className="mt-2 text-sm font-semibold">
                      {workspaceDatabase?.lastValidationSucceeded === true
                        ? "Passed"
                        : workspaceDatabase?.lastValidationSucceeded === false
                          ? "Not ready"
                          : "Not run"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Dedicated Database Routing</p>
                      <p className="text-sm text-muted-foreground">
                        Keep this off until the dedicated workspace database has been validated.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setWorkspaceForm((prev) => ({
                          ...prev,
                          dedicatedDatabaseEnabled: !prev.dedicatedDatabaseEnabled,
                        }))
                      }
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        workspaceForm.dedicatedDatabaseEnabled ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                          workspaceForm.dedicatedDatabaseEnabled ? "translate-x-6" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Database URL</label>
                      <input
                        type="text"
                        value={workspaceForm.databaseUrl || ""}
                        onChange={(e) =>
                          setWorkspaceForm((prev) => ({ ...prev, databaseUrl: e.target.value }))
                        }
                        placeholder="jdbc:postgresql://db-host:5432/workspace_db"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Database Username</label>
                      <input
                        type="text"
                        value={workspaceForm.databaseUsername || ""}
                        onChange={(e) =>
                          setWorkspaceForm((prev) => ({ ...prev, databaseUsername: e.target.value }))
                        }
                        placeholder="workspace_user"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Database Password</label>
                      <input
                        type="password"
                        value={workspaceForm.databasePassword || ""}
                        onChange={(e) =>
                          setWorkspaceForm((prev) => ({ ...prev, databasePassword: e.target.value }))
                        }
                        placeholder={workspaceDatabase?.passwordConfigured ? "Stored password will be kept if left blank" : "Enter database password"}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Driver Class</label>
                      <input
                        type="text"
                        value={workspaceForm.databaseDriverClassName || ""}
                        onChange={(e) =>
                          setWorkspaceForm((prev) => ({ ...prev, databaseDriverClassName: e.target.value }))
                        }
                        placeholder="org.postgresql.Driver"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Current status</p>
                    <p className="mt-1">
                      {workspaceDatabase?.lastValidationMessage ||
                        "Save the connection details, then run validation before expecting dedicated routing."}
                    </p>
                    {workspaceDatabase?.lastValidatedAt ? (
                      <p className="mt-2 text-xs">
                        Last checked: {new Date(workspaceDatabase.lastValidatedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  {workspaceDatabase?.routingMode === "SHARED" ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                      <p className="font-medium">Migrate Existing Workspace</p>
                      <p className="mt-1">
                        This workspace is still running on the shared CRM database. You can provision a dedicated
                        database and copy the current workspace data into it without deleting the shared source data.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-3">
                    {workspaceDatabase?.routingMode === "SHARED" ? (
                      <button
                        onClick={handleMigrateWorkspaceToDedicatedDatabase}
                        disabled={workspaceMigrating}
                        className="px-4 py-2 border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 disabled:opacity-60 transition-colors dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40"
                      >
                        {workspaceMigrating ? "Migrating..." : "Migrate Workspace"}
                      </button>
                    ) : null}
                    <button
                      onClick={() => workspaceDatabase && syncWorkspaceForm(workspaceDatabase)}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveWorkspaceDatabaseSettings}
                      disabled={workspaceSaving}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {workspaceSaving ? "Saving..." : "Save Settings"}
                    </button>
                    <button
                      onClick={handleValidateWorkspaceDatabaseSettings}
                      disabled={workspaceValidating || !workspaceDatabase?.databaseConfigured || !workspaceForm.dedicatedDatabaseEnabled}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-60 transition-colors"
                    >
                      {workspaceValidating ? "Validating..." : "Validate Connection"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "team":
        if (!isAdmin) {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Team Members</h3>
              <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
                Only tenant admins can manage team members and roles.
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Team Members</h3>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium">Territory Catalog</h4>
                  <p className="text-sm text-muted-foreground">
                    Revenue owners now assign against governed workspace territories instead of free-text labels.
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{activeTerritories.length} active</p>
                  <p>{territories.length} total</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1.6fr,auto] gap-3">
                <input
                  type="text"
                  value={newTerritory.name}
                  onChange={(e) => setNewTerritory((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Territory name"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="text"
                  value={newTerritory.description}
                  onChange={(e) => setNewTerritory((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description or region note"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={handleCreateTerritory}
                  disabled={territorySubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {territorySubmitting ? "Saving..." : "Add Territory"}
                </button>
              </div>

              {territoriesLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Loading territory catalog...</div>
              ) : territories.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No governed territories yet. Add one before assigning reps to a sales region.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {territories.map((territory) => (
                    <div key={territory.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{territory.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {territory.description || "No description yet"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full border",
                            territory.isActive
                              ? "bg-green-500/10 text-green-700 border-green-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {territory.isActive ? "Active" : "Paused"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{territory.assignedUserCount} assigned user{territory.assignedUserCount === 1 ? "" : "s"}</span>
                        <button
                          onClick={() => handleToggleTerritoryStatus(territory)}
                          className="text-primary hover:underline"
                        >
                          {territory.isActive ? "Pause territory" : "Reactivate territory"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <h4 className="font-medium">Create Team Member</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newMember.firstName}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="text"
                  value={newMember.lastName}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Temporary password"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={newMember.territory}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, territory: e.target.value }))}
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Unassigned territory</option>
                  {activeTerritories.map((territory) => (
                    <option key={territory.id} value={territory.name}>
                      {territory.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newMember.quarterlyQuota}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, quarterlyQuota: e.target.value }))}
                  placeholder="Quarterly quota"
                  min="0"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="number"
                  value={newMember.annualQuota}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, annualQuota: e.target.value }))}
                  placeholder="Annual quota"
                  min="0"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="USER">User</option>
                  <option value="SALES_REP">Sales Rep</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreateMember}
                  disabled={teamSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  <Icons.Plus size={18} />
                  <span>{teamSubmitting ? "Creating..." : "Create Member"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {teamLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading team members...</div>
              ) : teamMembers.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No team members found.</div>
              ) : (
                teamMembers.map((member) => (
                  <div key={member.id} className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                          {getInitials(member.firstName, member.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={roleUpdates[member.id] ?? member.role}
                          onChange={(e) => setRoleUpdates((prev) => ({ ...prev, [member.id]: e.target.value as UserRole }))}
                          className="px-2 py-1 border border-border rounded bg-background text-sm"
                        >
                          <option value="USER">User</option>
                          <option value="SALES_REP">Sales Rep</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          onClick={() => handleUpdateRole(member)}
                          className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        >
                          Save Role
                        </button>
                        <button
                          onClick={() => handleToggleStatus(member)}
                          disabled={member.id === user?.id && member.isActive}
                          className={cn(
                            "px-2 py-1 text-xs rounded transition-colors",
                            member.isActive
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200",
                            member.id === user?.id && member.isActive && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {member.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <select
                        value={revenueOpsDrafts[member.id]?.territory ?? ""}
                        onChange={(e) =>
                          setRevenueOpsDrafts((prev) => ({
                            ...prev,
                            [member.id]: {
                              territory: e.target.value,
                              quarterlyQuota: prev[member.id]?.quarterlyQuota ?? "",
                              annualQuota: prev[member.id]?.annualQuota ?? "",
                            },
                          }))
                        }
                        className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Unassigned territory</option>
                        {buildTerritoryOptions(revenueOpsDrafts[member.id]?.territory ?? member.territory).map((territoryName) => (
                          <option key={`${member.id}-${territoryName}`} value={territoryName}>
                            {territoryName}
                            {isGovernedTerritory(territoryName) ? "" : " (legacy)"}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={revenueOpsDrafts[member.id]?.quarterlyQuota ?? ""}
                        onChange={(e) =>
                          setRevenueOpsDrafts((prev) => ({
                            ...prev,
                            [member.id]: {
                              territory: prev[member.id]?.territory ?? "",
                              quarterlyQuota: e.target.value,
                              annualQuota: prev[member.id]?.annualQuota ?? "",
                            },
                          }))
                        }
                        placeholder="Quarterly quota"
                        min="0"
                        className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        type="number"
                        value={revenueOpsDrafts[member.id]?.annualQuota ?? ""}
                        onChange={(e) =>
                          setRevenueOpsDrafts((prev) => ({
                            ...prev,
                            [member.id]: {
                              territory: prev[member.id]?.territory ?? "",
                              quarterlyQuota: prev[member.id]?.quarterlyQuota ?? "",
                              annualQuota: e.target.value,
                            },
                          }))
                        }
                        placeholder="Annual quota"
                        min="0"
                        className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        onClick={() => handleUpdateRevenueOps(member)}
                        className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Save Revenue Ops
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>
                        Territory: {member.territory || "Unassigned"}
                        {member.territory && !isGovernedTerritory(member.territory) ? " (legacy)" : ""}
                      </span>
                      <span>Quarterly quota: {member.quarterlyQuota != null ? `$${Number(member.quarterlyQuota).toLocaleString()}` : "Not set"}</span>
                      <span>Annual quota: {member.annualQuota != null ? `$${Number(member.annualQuota).toLocaleString()}` : "Not set"}</span>
                    </div>
                    {member.territory && !isGovernedTerritory(member.territory) ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        This user is on a legacy territory label. Select an active catalog territory to bring them back under workspace governance.
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case "automation":
        if (!isAdmin) {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Workflow Automation</h3>
              <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
                Only tenant admins can manage workflow rules for this workspace.
              </div>
            </div>
          );
        }

          if (
            leadWorkflowLoading
            || campaignNurtureWorkflowLoading
            || caseAssignmentWorkflowLoading
            || caseSlaWorkflowLoading
            || dealRescueWorkflowLoading
            || quotaRiskWorkflowLoading
            || dealApprovalWorkflowLoading
            || governanceOpsWorkflowLoading
            || territoryEscalationWorkflowLoading
            || !leadWorkflowDraft
            || !campaignNurtureWorkflowDraft
            || !caseAssignmentWorkflowDraft
            || !caseSlaWorkflowDraft
            || !dealRescueWorkflowDraft
            || !quotaRiskWorkflowDraft
          || !dealApprovalWorkflowDraft
          || !governanceOpsWorkflowDraft
          || !territoryEscalationWorkflowDraft
        ) {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Workflow Automation</h3>
              <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
                Loading workflow settings...
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Workflow Automation</h3>
                <p className="text-sm text-muted-foreground">
                  Configure tenant-managed workflows instead of relying on hardcoded automation behavior.
                </p>
              </div>
              <span className={cn(
                "px-3 py-1 text-xs rounded-full border",
                leadWorkflowDraft.isActive
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              )}>
                {leadWorkflowDraft.isActive ? "Active" : "Paused"}
              </span>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold">Recent Automation Runs</h4>
                  <p className="text-sm text-muted-foreground">
                    A live tenant-scoped execution log for rescue, governance, quota, and territory automations.
                  </p>
                </div>
                <button
                  onClick={() => void loadAutomationRuns()}
                  className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Refresh History
                </button>
              </div>

              {automationRunsLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Loading automation history...</div>
              ) : automationRuns.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No automation runs recorded yet for this workspace.
                </div>
              ) : (
                <div className="space-y-3">
                  {automationRuns.map((run) => (
                    <div key={run.id} className="rounded-lg border border-border bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{run.automationName}</p>
                            <span
                              className={cn(
                                "text-[10px] px-2 py-1 rounded-full border",
                                run.runStatus === "SUCCESS"
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : run.runStatus === "SKIPPED"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-red-200 bg-red-50 text-red-700"
                              )}
                            >
                              {run.runStatus}
                            </span>
                            <span className="text-[10px] px-2 py-1 rounded-full border border-border text-muted-foreground">
                              {run.triggerSource}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {run.summary || "No summary recorded"}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{formatRunTime(run.createdAt)}</p>
                          <p>{run.automationKey}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>Reviewed: {run.reviewedCount ?? 0}</span>
                        <span>Actions: {run.actionCount ?? 0}</span>
                        <span>Already covered: {run.alreadyCoveredCount ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={leadWorkflowDraft.name}
                    onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setLeadWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      leadWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        leadWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={leadWorkflowDraft.description || ""}
                    onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Auto Assignment</p>
                      <p className="text-sm text-muted-foreground">Assign new leads automatically when no owner is supplied.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={leadWorkflowDraft.autoAssignmentEnabled}
                      onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, autoAssignmentEnabled: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={leadWorkflowDraft.preferTerritoryMatch}
                      onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, preferTerritoryMatch: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Prefer reps in the same governed territory first
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={leadWorkflowDraft.fallbackToLoadBalance}
                      onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, fallbackToLoadBalance: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Fall back to least-loaded assignment when no territory match exists
                  </label>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Auto Follow-up</p>
                      <p className="text-sm text-muted-foreground">Create nurture tasks automatically when new leads arrive.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={leadWorkflowDraft.autoFollowUpEnabled}
                      onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, autoFollowUpEnabled: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Default Days</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={leadWorkflowDraft.defaultFollowUpDays}
                        onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, defaultFollowUpDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Referral Days</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={leadWorkflowDraft.referralFollowUpDays}
                        onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, referralFollowUpDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Fast-track Days</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={leadWorkflowDraft.fastTrackFollowUpDays}
                        onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, fastTrackFollowUpDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div>
                  <h4 className="font-medium">Fast-track Thresholds</h4>
                  <p className="text-sm text-muted-foreground">
                    High-intent leads can be treated differently without changing the rest of the workspace workflow.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Score Threshold</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={leadWorkflowDraft.fastTrackScoreThreshold}
                      onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, fastTrackScoreThreshold: Number(e.target.value) } : prev)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Value Threshold</label>
                    <input
                      type="number"
                      min={0}
                      value={leadWorkflowDraft.fastTrackValueThreshold}
                      onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, fastTrackValueThreshold: Number(e.target.value) } : prev)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Priority</label>
                    <select
                      value={leadWorkflowDraft.defaultTaskPriority}
                      onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, defaultTaskPriority: e.target.value as LeadIntakeWorkflowSettings["defaultTaskPriority"] } : prev)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fast-track Priority</label>
                    <select
                      value={leadWorkflowDraft.fastTrackTaskPriority}
                      onChange={(e) => setLeadWorkflowDraft((prev) => prev ? { ...prev, fastTrackTaskPriority: e.target.value as LeadIntakeWorkflowSettings["fastTrackTaskPriority"] } : prev)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setLeadWorkflowDraft(leadWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveLeadWorkflow}
                  disabled={leadWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {leadWorkflowSaving ? "Saving..." : "Save Lead Workflow"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold">Campaign Nurture Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Accelerate campaign-attributed leads with a score boost, tighter follow-up SLA, and campaign-specific priority routing.
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full border",
                  campaignNurtureWorkflowDraft.isActive
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}>
                  {campaignNurtureWorkflowDraft.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={campaignNurtureWorkflowDraft.name}
                    onChange={(e) => setCampaignNurtureWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setCampaignNurtureWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      campaignNurtureWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        campaignNurtureWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={campaignNurtureWorkflowDraft.description || ""}
                    onChange={(e) => setCampaignNurtureWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div>
                    <p className="font-medium">Attribution Guardrails</p>
                    <p className="text-sm text-muted-foreground">Choose whether only live campaigns should trigger nurture acceleration.</p>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={campaignNurtureWorkflowDraft.requireActiveCampaign}
                      onChange={(e) => setCampaignNurtureWorkflowDraft((prev) => prev ? { ...prev, requireActiveCampaign: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Only accelerate leads tied to active campaigns
                  </label>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Nurture Acceleration</p>
                    <p className="text-sm text-muted-foreground">Boost score and speed for attributed leads when campaigns are performing.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Score Boost</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={campaignNurtureWorkflowDraft.campaignScoreBoost}
                        onChange={(e) => setCampaignNurtureWorkflowDraft((prev) => prev ? { ...prev, campaignScoreBoost: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Follow-up Days</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={campaignNurtureWorkflowDraft.campaignFollowUpDays}
                        onChange={(e) => setCampaignNurtureWorkflowDraft((prev) => prev ? { ...prev, campaignFollowUpDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Task Priority</label>
                      <select
                        value={campaignNurtureWorkflowDraft.campaignTaskPriority}
                        onChange={(e) => setCampaignNurtureWorkflowDraft((prev) => prev ? { ...prev, campaignTaskPriority: e.target.value as CampaignNurtureWorkflowSettings["campaignTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Campaign nurture now sits beside lead intake on the same tenant-managed workflow foundation, so marketing-attributed follow-up can be tuned without editing backend service logic.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCampaignNurtureWorkflowDraft(campaignNurtureWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveCampaignNurtureWorkflow}
                  disabled={campaignNurtureWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {campaignNurtureWorkflowSaving ? "Saving..." : "Save Campaign Nurture Workflow"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold">Case SLA Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Control default support-case targets, breach follow-up tasks, and when breached cases escalate automatically.
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full border",
                  caseSlaWorkflowDraft.isActive
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}>
                  {caseSlaWorkflowDraft.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={caseSlaWorkflowDraft.name}
                    onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      caseSlaWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        caseSlaWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={caseSlaWorkflowDraft.description || ""}
                    onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Default SLA Targets</p>
                    <p className="text-sm text-muted-foreground">Define workspace-level response and resolution targets by case priority.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Urgent Response</label>
                      <input type="number" min={1} max={72} value={caseSlaWorkflowDraft.urgentResponseHours} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, urgentResponseHours: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Urgent Resolution</label>
                      <input type="number" min={1} max={168} value={caseSlaWorkflowDraft.urgentResolutionHours} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, urgentResolutionHours: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Medium Response</label>
                      <input type="number" min={1} max={168} value={caseSlaWorkflowDraft.mediumResponseHours} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, mediumResponseHours: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Medium Resolution</label>
                      <input type="number" min={1} max={336} value={caseSlaWorkflowDraft.mediumResolutionHours} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, mediumResolutionHours: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={caseSlaWorkflowDraft.autoResponseTargetsEnabled} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, autoResponseTargetsEnabled: e.target.checked } : prev)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      Auto-apply response targets when a case is created
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={caseSlaWorkflowDraft.autoResolutionTargetsEnabled} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, autoResolutionTargetsEnabled: e.target.checked } : prev)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      Auto-apply resolution targets when a case is created
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Breach Automation</p>
                    <p className="text-sm text-muted-foreground">Route follow-up work and escalations automatically once a case breaches its SLA.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={caseSlaWorkflowDraft.createBreachTasks} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, createBreachTasks: e.target.checked } : prev)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      Create breach follow-up tasks
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={caseSlaWorkflowDraft.autoEscalateBreachedCases} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, autoEscalateBreachedCases: e.target.checked } : prev)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      Automatically move breached cases to escalated status
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={caseSlaWorkflowDraft.escalateOnResponseBreach} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, escalateOnResponseBreach: e.target.checked } : prev)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      Escalate when response SLA is breached
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={caseSlaWorkflowDraft.escalateOnResolutionBreach} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, escalateOnResolutionBreach: e.target.checked } : prev)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      Escalate when resolution SLA is breached
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Response Task Due</label>
                      <input type="number" min={0} max={30} value={caseSlaWorkflowDraft.responseBreachTaskDueDays} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, responseBreachTaskDueDays: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Resolution Task Due</label>
                      <input type="number" min={0} max={30} value={caseSlaWorkflowDraft.resolutionBreachTaskDueDays} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, resolutionBreachTaskDueDays: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Escalation Task Due</label>
                      <input type="number" min={0} max={30} value={caseSlaWorkflowDraft.escalationTaskDueDays} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, escalationTaskDueDays: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Escalation Priority</label>
                      <select value={caseSlaWorkflowDraft.escalationTaskPriority} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, escalationTaskPriority: e.target.value as CaseSlaWorkflowSettings["escalationTaskPriority"] } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div>
                  <p className="font-medium">Customer Tier Accelerators</p>
                  <p className="text-sm text-muted-foreground">
                    Shorten default SLA targets for premium and strategic customers without changing the base priority ladder.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Premium Response %</label>
                    <input type="number" min={25} max={100} value={caseSlaWorkflowDraft.premiumResponseMultiplierPercent} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, premiumResponseMultiplierPercent: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Strategic Response %</label>
                    <input type="number" min={25} max={100} value={caseSlaWorkflowDraft.strategicResponseMultiplierPercent} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, strategicResponseMultiplierPercent: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Premium Resolution %</label>
                    <input type="number" min={25} max={100} value={caseSlaWorkflowDraft.premiumResolutionMultiplierPercent} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, premiumResolutionMultiplierPercent: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Strategic Resolution %</label>
                    <input type="number" min={25} max={100} value={caseSlaWorkflowDraft.strategicResolutionMultiplierPercent} onChange={(e) => setCaseSlaWorkflowDraft((prev) => prev ? { ...prev, strategicResolutionMultiplierPercent: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                  `100%` keeps the standard SLA. Lower percentages make the target faster. Strategic targets should stay equal to or faster than premium targets.
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCaseSlaWorkflowDraft(caseSlaWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveCaseSlaWorkflow}
                  disabled={caseSlaWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {caseSlaWorkflowSaving ? "Saving..." : "Save Case SLA Workflow"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold">Case Assignment Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Control how unassigned and escalated support cases get routed, whether account owners are preferred, and how quickly assignment tasks are due.
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full border",
                  caseAssignmentWorkflowDraft.isActive
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}>
                  {caseAssignmentWorkflowDraft.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={caseAssignmentWorkflowDraft.name}
                    onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      caseAssignmentWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        caseAssignmentWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={caseAssignmentWorkflowDraft.description || ""}
                    onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div>
                    <p className="font-medium">Queue Triggers</p>
                    <p className="text-sm text-muted-foreground">Choose which support cases should be included when assignment automation runs.</p>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={caseAssignmentWorkflowDraft.autoAssignUnassignedCases}
                      onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, autoAssignUnassignedCases: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Assign new cases that do not have an owner
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={caseAssignmentWorkflowDraft.autoReassignEscalatedCases}
                      onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, autoReassignEscalatedCases: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Re-route escalated cases for fresh ownership review
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={caseAssignmentWorkflowDraft.preferAccountOwner}
                      onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, preferAccountOwner: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Prefer the linked account owner before falling back to load balancing
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={caseAssignmentWorkflowDraft.createAssignmentTasks}
                      onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, createAssignmentTasks: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Create assignment tasks for routed cases
                  </label>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Assignment Task SLA</p>
                    <p className="text-sm text-muted-foreground">Set separate due dates and priorities for urgent support work versus the standard queue.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Default Due Days</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={caseAssignmentWorkflowDraft.defaultAssignmentTaskDueDays}
                        onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, defaultAssignmentTaskDueDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Urgent Due Days</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={caseAssignmentWorkflowDraft.urgentAssignmentTaskDueDays}
                        onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, urgentAssignmentTaskDueDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Default Priority</label>
                      <select
                        value={caseAssignmentWorkflowDraft.defaultAssignmentTaskPriority}
                        onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, defaultAssignmentTaskPriority: e.target.value as CaseAssignmentWorkflowSettings["defaultAssignmentTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Urgent Priority</label>
                      <select
                        value={caseAssignmentWorkflowDraft.urgentAssignmentTaskPriority}
                        onChange={(e) => setCaseAssignmentWorkflowDraft((prev) => prev ? { ...prev, urgentAssignmentTaskPriority: e.target.value as CaseAssignmentWorkflowSettings["urgentAssignmentTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCaseAssignmentWorkflowDraft(caseAssignmentWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveCaseAssignmentWorkflow}
                  disabled={caseAssignmentWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {caseAssignmentWorkflowSaving ? "Saving..." : "Save Case Assignment Workflow"}
                </button>
              </div>
            </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
               Lead intake, campaign nurture, case assignment, case SLA, and deal rescue now share the same tenant-managed workflow foundation, so new automation lanes can keep reusing the same policy surface instead of becoming hardcoded service logic.
              </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold">Deal Rescue Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Control when stalled or risky deals generate rescue tasks and how quickly those tasks are due.
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full border",
                  dealRescueWorkflowDraft.isActive
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}>
                  {dealRescueWorkflowDraft.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={dealRescueWorkflowDraft.name}
                    onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      dealRescueWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        dealRescueWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={dealRescueWorkflowDraft.description || ""}
                    onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div>
                    <p className="font-medium">Attention Triggers</p>
                    <p className="text-sm text-muted-foreground">Choose which signals should create rescue coverage.</p>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={dealRescueWorkflowDraft.reviewStalledDeals}
                      onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, reviewStalledDeals: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Review deals that stay in one stage too long
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={dealRescueWorkflowDraft.reviewHighRiskDeals}
                      onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, reviewHighRiskDeals: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Review deals already marked high risk
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={dealRescueWorkflowDraft.reviewOverdueNextSteps}
                      onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, reviewOverdueNextSteps: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Review deals whose next step is overdue
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={dealRescueWorkflowDraft.reviewTerritoryMismatch}
                      onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, reviewTerritoryMismatch: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Review deals whose owner territory does not match
                  </label>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Rescue Timing</p>
                    <p className="text-sm text-muted-foreground">Control how quickly rescue work is due once a deal is flagged.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Stalled After</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={dealRescueWorkflowDraft.stalledDealDays}
                        onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, stalledDealDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Task Due In</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={dealRescueWorkflowDraft.rescueTaskDueDays}
                        onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, rescueTaskDueDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Task Priority</label>
                      <select
                        value={dealRescueWorkflowDraft.rescueTaskPriority}
                        onChange={(e) => setDealRescueWorkflowDraft((prev) => prev ? { ...prev, rescueTaskPriority: e.target.value as DealRescueWorkflowSettings["rescueTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDealRescueWorkflowDraft(dealRescueWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveDealRescueWorkflow}
                  disabled={dealRescueWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {dealRescueWorkflowSaving ? "Saving..." : "Save Deal Workflow"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold">Quota Risk Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Decide which pacing bands create manager review tasks and how quickly watch versus at-risk follow-up is due.
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full border",
                  quotaRiskWorkflowDraft.isActive
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}>
                  {quotaRiskWorkflowDraft.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={quotaRiskWorkflowDraft.name}
                    onChange={(e) => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      quotaRiskWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        quotaRiskWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={quotaRiskWorkflowDraft.description || ""}
                    onChange={(e) => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div>
                    <p className="font-medium">Included Pacing Bands</p>
                    <p className="text-sm text-muted-foreground">Choose which reps should generate quota-risk review coverage.</p>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={quotaRiskWorkflowDraft.includeWatchReps}
                      onChange={(e) => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, includeWatchReps: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Include watch-band reps
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={quotaRiskWorkflowDraft.includeAtRiskReps}
                      onChange={(e) => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, includeAtRiskReps: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Include at-risk reps
                  </label>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Task Timing And Priority</p>
                    <p className="text-sm text-muted-foreground">At-risk reviews can be tighter and louder than watch-band reviews.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Watch Due In</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={quotaRiskWorkflowDraft.watchTaskDueDays}
                        onChange={(e) => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, watchTaskDueDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">At-risk Due In</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={quotaRiskWorkflowDraft.atRiskTaskDueDays}
                        onChange={(e) => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, atRiskTaskDueDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Watch Priority</label>
                      <select
                        value={quotaRiskWorkflowDraft.watchTaskPriority}
                        onChange={(e) => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, watchTaskPriority: e.target.value as QuotaRiskWorkflowSettings["watchTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">At-risk Priority</label>
                      <select
                        value={quotaRiskWorkflowDraft.atRiskTaskPriority}
                        onChange={(e) => setQuotaRiskWorkflowDraft((prev) => prev ? { ...prev, atRiskTaskPriority: e.target.value as QuotaRiskWorkflowSettings["atRiskTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Quota-risk escalation now shares the same tenant-managed workflow foundation as lead intake and deal rescue, so operations teams can tune review coverage without changing code.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setQuotaRiskWorkflowDraft(quotaRiskWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveQuotaRiskWorkflow}
                  disabled={quotaRiskWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {quotaRiskWorkflowSaving ? "Saving..." : "Save Quota Workflow"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold">Deal Approval Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Control which deals require formal approval and how urgent approval tasks should be for this workspace.
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full border",
                  dealApprovalWorkflowDraft.isActive
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}>
                  {dealApprovalWorkflowDraft.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={dealApprovalWorkflowDraft.name}
                    onChange={(e) => setDealApprovalWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setDealApprovalWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      dealApprovalWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        dealApprovalWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={dealApprovalWorkflowDraft.description || ""}
                    onChange={(e) => setDealApprovalWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div>
                    <p className="font-medium">Approval Triggers</p>
                    <p className="text-sm text-muted-foreground">Use deal value, risk, or both to decide when governance should block a close-won path.</p>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={dealApprovalWorkflowDraft.requireApprovalForHighRisk}
                      onChange={(e) => setDealApprovalWorkflowDraft((prev) => prev ? { ...prev, requireApprovalForHighRisk: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Require approval for high-risk deals even below the value threshold
                  </label>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Value Threshold</label>
                    <input
                      type="number"
                      min={1}
                      value={dealApprovalWorkflowDraft.valueApprovalThreshold}
                      onChange={(e) => setDealApprovalWorkflowDraft((prev) => prev ? { ...prev, valueApprovalThreshold: Number(e.target.value) } : prev)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Approval Task SLA</p>
                    <p className="text-sm text-muted-foreground">Set how quickly approval tasks are due once a rep requests sign-off.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Due In</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={dealApprovalWorkflowDraft.approvalTaskDueDays}
                        onChange={(e) => setDealApprovalWorkflowDraft((prev) => prev ? { ...prev, approvalTaskDueDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Priority</label>
                      <select
                        value={dealApprovalWorkflowDraft.approvalTaskPriority}
                        onChange={(e) => setDealApprovalWorkflowDraft((prev) => prev ? { ...prev, approvalTaskPriority: e.target.value as DealApprovalWorkflowSettings["approvalTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Deal approval now lives on the same reusable workflow foundation as lead intake, deal rescue, and quota-risk escalation, so governance can evolve without baking more policy directly into service code.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDealApprovalWorkflowDraft(dealApprovalWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveDealApprovalWorkflow}
                  disabled={dealApprovalWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {dealApprovalWorkflowSaving ? "Saving..." : "Save Approval Workflow"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold">Governance Ops Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Control digest cadence, overdue review severity bands, and escalation SLAs for the manager governance inbox.
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full border",
                  governanceOpsWorkflowDraft.isActive
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}>
                  {governanceOpsWorkflowDraft.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={governanceOpsWorkflowDraft.name}
                    onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      governanceOpsWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        governanceOpsWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={governanceOpsWorkflowDraft.description || ""}
                    onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Digest Cadence</p>
                    <p className="text-sm text-muted-foreground">Decide how often governance digests become due and how quickly managers should action them.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Cadence Days</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={governanceOpsWorkflowDraft.digestCadenceDays}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, digestCadenceDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Due In</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={governanceOpsWorkflowDraft.digestTaskDueDays}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, digestTaskDueDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Priority</label>
                      <select
                        value={governanceOpsWorkflowDraft.digestTaskPriority}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, digestTaskPriority: e.target.value as GovernanceOpsWorkflowSettings["digestTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-3 text-sm md:col-span-2">
                      <input
                        type="checkbox"
                        checked={governanceOpsWorkflowDraft.elevateDigestForSlaBreaches}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, elevateDigestForSlaBreaches: e.target.checked } : prev)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      Elevate digest priority to high when SLA breaches or critical reviews appear
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Review SLA Bands</p>
                    <p className="text-sm text-muted-foreground">Define when overdue reviews shift from watch to high to critical inside governance reporting.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Watch Days</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={governanceOpsWorkflowDraft.watchReviewDays}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, watchReviewDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">High Days</label>
                      <input
                        type="number"
                        min={2}
                        max={30}
                        value={governanceOpsWorkflowDraft.highReviewDays}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, highReviewDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Critical Days</label>
                      <input
                        type="number"
                        min={3}
                        max={30}
                        value={governanceOpsWorkflowDraft.criticalReviewDays}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, criticalReviewDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Overdue Review Escalation</p>
                    <p className="text-sm text-muted-foreground">Choose how overdue review tasks get reprioritized and when the manager escalation task is due.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Review Priority</label>
                      <select
                        value={governanceOpsWorkflowDraft.overdueReviewTaskPriority}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, overdueReviewTaskPriority: e.target.value as GovernanceOpsWorkflowSettings["overdueReviewTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Escalation Due In</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={governanceOpsWorkflowDraft.overdueEscalationTaskDueDays}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, overdueEscalationTaskDueDays: Number(e.target.value) } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Escalation Priority</label>
                      <select
                        value={governanceOpsWorkflowDraft.overdueEscalationTaskPriority}
                        onChange={(e) => setGovernanceOpsWorkflowDraft((prev) => prev ? { ...prev, overdueEscalationTaskPriority: e.target.value as GovernanceOpsWorkflowSettings["overdueEscalationTaskPriority"] } : prev)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Governance ops now uses the same reusable workflow rule foundation as lead intake, deal rescue, quota risk, and deal approval, so digest cadence and overdue review policy can evolve without another hardcoded dashboard branch.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setGovernanceOpsWorkflowDraft(governanceOpsWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveGovernanceOpsWorkflow}
                  disabled={governanceOpsWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {governanceOpsWorkflowSaving ? "Saving..." : "Save Governance Workflow"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold">Territory Escalation Workflow</h4>
                  <p className="text-sm text-muted-foreground">
                    Control when cross-record territory drift becomes watch, high, or critical and how quickly the manager alert is due.
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full border",
                  territoryEscalationWorkflowDraft.isActive
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}>
                  {territoryEscalationWorkflowDraft.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={territoryEscalationWorkflowDraft.name}
                    onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Workflow Status</label>
                  <button
                    onClick={() => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative mt-2",
                      territoryEscalationWorkflowDraft.isActive ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                        territoryEscalationWorkflowDraft.isActive ? "translate-x-6" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={territoryEscalationWorkflowDraft.description || ""}
                    onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Escalation Thresholds</p>
                    <p className="text-sm text-muted-foreground">Define what pushes territory drift into high or critical escalation bands.</p>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={territoryEscalationWorkflowDraft.includeWatchEscalations}
                      onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, includeWatchEscalations: e.target.checked } : prev)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Include watch-level escalations in manager automation
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">High Total Exceptions</label>
                      <input type="number" min={1} max={20} value={territoryEscalationWorkflowDraft.highTotalExceptionThreshold} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, highTotalExceptionThreshold: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">High Exposure</label>
                      <input type="number" min={1} value={territoryEscalationWorkflowDraft.highPipelineExposureThreshold} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, highPipelineExposureThreshold: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Critical High Severity</label>
                      <input type="number" min={1} max={20} value={territoryEscalationWorkflowDraft.criticalHighSeverityThreshold} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, criticalHighSeverityThreshold: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Critical Exposure</label>
                      <input type="number" min={1} value={territoryEscalationWorkflowDraft.criticalPipelineExposureThreshold} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, criticalPipelineExposureThreshold: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Critical Repeats</label>
                      <input type="number" min={1} max={20} value={territoryEscalationWorkflowDraft.criticalRepeatedMismatchThreshold} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, criticalRepeatedMismatchThreshold: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Critical Deal Count</label>
                      <input type="number" min={1} max={20} value={territoryEscalationWorkflowDraft.criticalDealExceptionThreshold} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, criticalDealExceptionThreshold: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Escalation SLA</p>
                    <p className="text-sm text-muted-foreground">Set when watch, high, and critical drift should count as SLA-breached.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Watch Days</label>
                      <input type="number" min={1} max={30} value={territoryEscalationWorkflowDraft.watchEscalationSlaDays} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, watchEscalationSlaDays: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">High Days</label>
                      <input type="number" min={1} max={30} value={territoryEscalationWorkflowDraft.highEscalationSlaDays} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, highEscalationSlaDays: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Critical Days</label>
                      <input type="number" min={1} max={30} value={territoryEscalationWorkflowDraft.criticalEscalationSlaDays} onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, criticalEscalationSlaDays: Number(e.target.value) } : prev)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                  <div>
                    <p className="font-medium">Task Routing SLA</p>
                    <p className="text-sm text-muted-foreground">Choose how urgently watch, high, and critical territory alerts should be assigned.</p>
                  </div>
                  {[
                    ["Watch", "watchEscalationTaskDueDays", "watchEscalationTaskPriority"],
                    ["High", "highEscalationTaskDueDays", "highEscalationTaskPriority"],
                    ["Critical", "criticalEscalationTaskDueDays", "criticalEscalationTaskPriority"],
                  ].map(([label, dueKey, priorityKey]) => (
                    <div key={label} className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{label} Due In</label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={territoryEscalationWorkflowDraft[dueKey as keyof TerritoryEscalationWorkflowSettings] as number}
                          onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, [dueKey]: Number(e.target.value) } : prev)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{label} Priority</label>
                        <select
                          value={territoryEscalationWorkflowDraft[priorityKey as keyof TerritoryEscalationWorkflowSettings] as string}
                          onChange={(e) => setTerritoryEscalationWorkflowDraft((prev) => prev ? { ...prev, [priorityKey]: e.target.value } : prev)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Territory escalation now shares the same workflow foundation as lead intake, quota risk, deal rescue, deal approval, and governance ops, so manager alert severity and SLA policy no longer live in a hardcoded dashboard branch.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setTerritoryEscalationWorkflowDraft(territoryEscalationWorkflow)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveTerritoryEscalationWorkflow}
                  disabled={territoryEscalationWorkflowSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {territoryEscalationWorkflowSaving ? "Saving..." : "Save Territory Escalation Workflow"}
                </button>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Notification Preferences</h3>
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              These notification preferences are currently stored only in this browser and are not
              synced to your account yet.
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    emailNotifications ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                    emailNotifications ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                </div>
                <button
                  onClick={() => setPushNotifications(!pushNotifications)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    pushNotifications ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                    pushNotifications ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-3">Notify me about:</h4>
                <div className="space-y-2">
                  {["New leads assigned", "Deal stage changes", "Task reminders", "Team mentions", "Weekly reports"].map((item) => (
                    <label key={item} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Connected Apps</h3>
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {previewSectionMessage}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "Slack", description: "Team communication", connected: true },
                { name: "Google Calendar", description: "Calendar sync", connected: true },
                { name: "Salesforce", description: "CRM import", connected: false },
                { name: "HubSpot", description: "Marketing automation", connected: false },
                { name: "Zapier", description: "Workflow automation", connected: true },
                { name: "Mailchimp", description: "Email campaigns", connected: false },
              ].map((app) => (
                <div key={app.name} className="p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-sm text-muted-foreground">{app.description}</p>
                    </div>
                    <button className={cn(
                      "px-3 py-1.5 text-sm rounded-lg transition-colors",
                      app.connected
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                    onClick={() =>
                      showToast(
                        `${app.name} integration is still in preview and not wired yet.`,
                        "info"
                      )
                    }>
                      {app.connected ? "Connected" : "Connect"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "billing":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Subscription</h3>
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {previewSectionMessage}
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary">Professional Plan</p>
                  <p className="text-sm text-muted-foreground">$49 per user/month, 5 users</p>
                </div>
                <button
                  onClick={() => showToast("Billing upgrades are not wired yet.", "info")}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Upgrade
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Billing History</h4>
              <div className="space-y-2">
                {[
                  { date: "Dec 1, 2024", amount: "$245.00", status: "Paid" },
                  { date: "Nov 1, 2024", amount: "$245.00", status: "Paid" },
                  { date: "Oct 1, 2024", amount: "$245.00", status: "Paid" },
                ].map((invoice, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{invoice.date}</span>
                    <span className="text-sm font-medium">{invoice.amount}</span>
                    <span className="text-sm text-green-600">{invoice.status}</span>
                    <button
                      onClick={() => showToast("Billing document downloads are not wired yet.", "info")}
                      className="text-sm text-primary hover:underline"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Security Settings</h3>
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {previewSectionMessage}
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Change Password</p>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                  <button
                    onClick={() => showToast("Password management is not wired yet.", "info")}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <button
                    onClick={() => showToast("Two-factor authentication is not wired yet.", "info")}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Enable
                  </button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">2 devices currently logged in</p>
                  </div>
                  <button
                    onClick={() => showToast("Session management is not wired yet.", "info")}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Sign Out All
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-card border border-border rounded-lg p-2">
              <nav className="space-y-1">
                {settingSections.map((section) => {
                  const Icon = Icons[section.icon];
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 rounded text-left transition-colors",
                        activeSection === section.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <Icon size={20} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{section.title}</p>
                        <p className={cn(
                          "text-xs mt-0.5",
                          activeSection === section.id ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {section.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-card border border-border rounded-lg p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
