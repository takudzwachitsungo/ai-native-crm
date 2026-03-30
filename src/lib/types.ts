// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
  workspaceSlug?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  workspaceSlug?: string;
  tier?: TenantTier;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
  userId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantTier: TenantTier;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export type TenantTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  tier: TenantTier;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantTier: TenantTier;
  tenant: TenantSummary;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'USER';

export interface TenantUser {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  territory?: string;
  quarterlyQuota?: number;
  annualQuota?: number;
  avatar?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TenantDatabaseSettingsUpdateRequest {
  dedicatedDatabaseEnabled?: boolean;
  databaseUrl?: string;
  databaseUsername?: string;
  databasePassword?: string;
  databaseDriverClassName?: string;
}

export interface TenantDatabaseSettings {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantTier: TenantTier;
  dedicatedDatabaseEnabled: boolean;
  databaseUrl?: string;
  databaseUsername?: string;
  databaseDriverClassName?: string;
  passwordConfigured: boolean;
  databaseConfigured: boolean;
  databaseReady: boolean;
  routingMode: "SHARED" | "DEDICATED";
  lastValidatedAt?: string | null;
  lastValidationSucceeded?: boolean | null;
  lastValidationMessage?: string | null;
}

export interface WorkspaceTerritory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  assignedUserCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadIntakeWorkflowSettings {
  id?: string;
  ruleType: 'LEAD_INTAKE';
  name: string;
  description?: string;
  isActive: boolean;
  autoAssignmentEnabled: boolean;
  preferTerritoryMatch: boolean;
  fallbackToLoadBalance: boolean;
  autoFollowUpEnabled: boolean;
  defaultFollowUpDays: number;
  referralFollowUpDays: number;
  fastTrackFollowUpDays: number;
  fastTrackScoreThreshold: number;
  fastTrackValueThreshold: number;
  defaultTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  fastTrackTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  updatedAt?: string;
}

export interface DealRescueWorkflowSettings {
  id?: string;
  ruleType: 'DEAL_RESCUE';
  name: string;
  description?: string;
  isActive: boolean;
  reviewStalledDeals: boolean;
  reviewHighRiskDeals: boolean;
  reviewOverdueNextSteps: boolean;
  reviewTerritoryMismatch: boolean;
  stalledDealDays: number;
  rescueTaskDueDays: number;
  rescueTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotaRiskWorkflowSettings {
  id?: string;
  ruleType: 'QUOTA_RISK';
  name: string;
  description?: string;
  isActive: boolean;
  includeWatchReps: boolean;
  includeAtRiskReps: boolean;
  watchTaskDueDays: number;
  atRiskTaskDueDays: number;
  watchTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  atRiskTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  updatedAt?: string;
}

export interface DealApprovalWorkflowSettings {
  id?: string;
  ruleType: 'DEAL_APPROVAL';
  name: string;
  description?: string;
  isActive: boolean;
  requireApprovalForHighRisk: boolean;
  valueApprovalThreshold: number;
  approvalTaskDueDays: number;
  approvalTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernanceOpsWorkflowSettings {
  id?: string;
  ruleType: 'GOVERNANCE_OPS';
  name: string;
  description?: string;
  isActive: boolean;
  digestCadenceDays: number;
  digestTaskDueDays: number;
  digestTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  elevateDigestForSlaBreaches: boolean;
  watchReviewDays: number;
  highReviewDays: number;
  criticalReviewDays: number;
  overdueReviewTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  overdueEscalationTaskDueDays: number;
  overdueEscalationTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  updatedAt?: string;
}

export interface TerritoryEscalationWorkflowSettings {
  id?: string;
  ruleType: 'TERRITORY_ESCALATION';
  name: string;
  description?: string;
  isActive: boolean;
  includeWatchEscalations: boolean;
  criticalHighSeverityThreshold: number;
  criticalRepeatedMismatchThreshold: number;
  criticalDealExceptionThreshold: number;
  criticalPipelineExposureThreshold: number;
  highTotalExceptionThreshold: number;
  highHighSeverityThreshold: number;
  highRepeatedMismatchThreshold: number;
  highPipelineExposureThreshold: number;
  watchEscalationSlaDays: number;
  highEscalationSlaDays: number;
  criticalEscalationSlaDays: number;
  watchEscalationTaskDueDays: number;
  highEscalationTaskDueDays: number;
  criticalEscalationTaskDueDays: number;
  watchEscalationTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  highEscalationTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  criticalEscalationTaskPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  updatedAt?: string;
}

export type AutomationTriggerSource = 'MANUAL' | 'SCHEDULED';
export type AutomationRunStatus = 'SUCCESS' | 'SKIPPED' | 'FAILED';

export interface AutomationRun {
  id: string;
  automationKey: string;
  automationName: string;
  triggerSource: AutomationTriggerSource;
  runStatus: AutomationRunStatus;
  reviewedCount?: number;
  actionCount?: number;
  alreadyCoveredCount?: number;
  summary?: string;
  createdAt?: string;
}

export type RevenuePacingStatus = 'NO_QUOTA' | 'ON_TRACK' | 'WATCH' | 'AT_RISK';

export interface RevenueOpsRep {
  userId: string;
  name: string;
  role: string;
  territory: string;
  quarterlyQuota?: number;
  annualQuota?: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  closedWonValue: number;
  quarterlyAttainmentPercent: number;
  projectedAttainmentPercent: number;
  expectedClosedValue: number;
  quotaGap: number;
  requiredPipelineValue: number;
  pipelineCoverageRatio: number;
  pacingStatus: RevenuePacingStatus;
  governedTerritory: boolean;
}

export interface TerritorySummary {
  territory: string;
  governed: boolean;
  repCount: number;
  quarterlyQuota: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  closedWonValue: number;
  attainmentPercent: number;
  projectedAttainmentPercent: number;
  requiredPipelineValue: number;
  pipelineCoverageRatio: number;
  pacingStatus: RevenuePacingStatus;
  onTrackRepCount: number;
  watchRepCount: number;
  atRiskRepCount: number;
}

export interface RevenueOpsSummary {
  activeRepCount: number;
  territoriesCovered: number;
  territoryCatalogCount: number;
  governedTerritoryCount: number;
  outOfCatalogTerritoryCount: number;
  repsWithoutTerritory: number;
  onTrackRepCount: number;
  watchRepCount: number;
  atRiskRepCount: number;
  totalQuarterlyQuota: number;
  totalAnnualQuota: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  closedWonValue: number;
  attainmentPercent: number;
  projectedAttainmentPercent: number;
  quarterProgressPercent: number;
  expectedClosedValueToDate: number;
  requiredPipelineValue: number;
  pipelineCoverageRatio: number;
  teamProgress: RevenueOpsRep[];
  territorySummaries: TerritorySummary[];
}

export interface QuotaRiskAlertItem {
  userId: string;
  name: string;
  role: string;
  territory?: string;
  quarterlyQuota?: number;
  annualQuota?: number;
  closedWonValue: number;
  weightedPipelineValue: number;
  expectedClosedValue: number;
  quotaGap: number;
  requiredPipelineValue: number;
  projectedAttainmentPercent: number;
  pipelineCoverageRatio: number;
  pacingStatus: RevenuePacingStatus;
  governedTerritory: boolean;
  openTaskExists: boolean;
}

export interface QuotaRiskAlertSummary {
  totalAlerts: number;
  atRiskCount: number;
  watchCount: number;
  alerts: QuotaRiskAlertItem[];
}

export interface QuotaRiskAutomationResult {
  reviewedReps: number;
  tasksCreated: number;
  alreadyCoveredReps: number;
  createdTaskIds: string[];
}

export interface TerritoryExceptionItem {
  entityType: 'LEAD' | 'COMPANY' | 'DEAL';
  entityId: string;
  title: string;
  territory?: string;
  ownerName?: string;
  ownerTerritory?: string;
  suggestedOwnerId?: string;
  suggestedOwnerName?: string;
  suggestedOwnerTerritory?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  impactValue?: number;
  stage?: string;
  dueDate?: string;
  ageDays?: number;
  openTaskExists: boolean;
}

export interface TerritoryExceptionSummary {
  totalExceptions: number;
  leadExceptions: number;
  companyExceptions: number;
  dealExceptions: number;
  highSeverityCount: number;
  exceptions: TerritoryExceptionItem[];
}

export interface TerritoryExceptionAutomationResult {
  reviewedExceptions: number;
  tasksCreated: number;
  alreadyCoveredItems: number;
  createdTaskIds: string[];
}

export interface TerritoryEscalationItem {
  territory?: string;
  suggestedOwnerId?: string;
  suggestedOwnerName?: string;
  suggestedOwnerTerritory?: string;
  totalExceptions: number;
  leadExceptions: number;
  companyExceptions: number;
  dealExceptions: number;
  highSeverityCount: number;
  repeatedMismatchCount: number;
  pipelineExposure?: number;
  escalationLevel: 'WATCH' | 'HIGH' | 'CRITICAL';
  oldestMismatchAgeDays?: number;
  slaBreached?: boolean;
  openAlertExists: boolean;
  openTaskId?: string;
  openTaskStatus?: string;
}

export interface TerritoryEscalationSummary {
  totalEscalations: number;
  criticalCount: number;
  highCount: number;
  watchCount: number;
  totalPipelineExposure?: number;
  escalations: TerritoryEscalationItem[];
}

export interface TerritoryEscalationAutomationResult {
  reviewedEscalations: number;
  tasksCreated: number;
  alreadyCoveredEscalations: number;
  createdTaskIds: string[];
}

export interface TerritoryAutoRemediationResult {
  reviewedExceptions: number;
  leadsReassigned: number;
  companiesReassigned: number;
  dealsReassigned: number;
  resolvedReviewTasks: number;
  skippedExceptions: number;
  updatedLeadIds: string[];
  updatedCompanyIds: string[];
  updatedDealIds: string[];
}

export interface GovernanceInboxItem {
  itemType: 'TERRITORY_ESCALATION' | 'QUOTA_RISK';
  title: string;
  severity: string;
  territory?: string;
  ownerName?: string;
  ageDays?: number;
  slaBreached?: boolean;
  openTaskExists?: boolean;
  openTaskId?: string;
  openTaskStatus?: string;
  summary?: string;
}

export interface GovernanceDigestHistoryItem {
  taskId: string;
  title: string;
  status?: string;
  priority?: string;
  assignedToName?: string;
  dueDate?: string;
  createdAt?: string;
}

export interface GovernanceInboxSummary {
  totalItems: number;
  territoryEscalationItems: number;
  quotaRiskItems: number;
  slaBreachedItems: number;
  openActionItems: number;
  openDigestCount: number;
  openReviewTaskCount: number;
  overdueReviewTaskCount: number;
  watchReviewCount: number;
  highReviewCount: number;
  criticalReviewCount: number;
  oldestOverdueReviewDays?: number | null;
  digestDue: boolean;
  reviewSlaStatus?: string | null;
  daysSinceLastDigest?: number | null;
  lastDigestCreatedAt?: string | null;
  lastDigestStatus?: string | null;
  recentDigests: GovernanceDigestHistoryItem[];
  items: GovernanceInboxItem[];
}

export interface GovernanceDigestAutomationResult {
  reviewedItems: number;
  digestsCreated: number;
  alreadyCoveredDigests: number;
  createdTaskIds: string[];
}

export interface GovernanceAutomationResult {
  reviewedItems: number;
  digestsCreated: number;
  overdueTasksEscalated: number;
  escalationTasksCreated: number;
  alreadyCoveredEscalations: number;
  createdTaskIds: string[];
}

export interface GovernanceTaskAcknowledgementResult {
  taskId: string;
  relatedEntityType: string;
  acknowledged: boolean;
  previousStatus?: string;
  newStatus?: string;
}

// Entity Types
export interface Lead {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  territory?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED' | 'LOST';
  source?: string;
  score?: number;
  estimatedValue?: number;
  notes?: string;
  assignedTo?: string;
  tags?: string[];
  lastContact?: string;
  lastContactDate?: string;
  ownerId?: string;
  ownerName?: string;
  ownerTerritory?: string;
  territoryMismatch?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Deal {
  id?: string;
  name: string;
  value: number;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  companyId?: string;
  companyName?: string;
  territory?: string;
  contactId?: string;
  contactName?: string;
  dealType?: 'NEW_BUSINESS' | 'EXISTING_BUSINESS' | 'RENEWAL' | 'UPSELL';
  leadSource?: 'WEBSITE' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'COLD_CALL' | 'EVENT' | 'OTHER';
  description?: string;
  notes?: string;
  competitorName?: string;
  nextStep?: string;
  nextStepDueDate?: string;
  buyingCommitteeSummary?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  winReason?: string;
  lossReason?: string;
  closeNotes?: string;
  approvalRequired?: boolean;
  approvalStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalRequestedAt?: string;
  approvalRequestedByName?: string;
  approvedAt?: string;
  approvedByName?: string;
  rejectedAt?: string;
  rejectedByName?: string;
  approvalNotes?: string;
  ownerId?: string;
  ownerName?: string;
  ownerTerritory?: string;
  territoryMismatch?: boolean;
  weightedValue?: number;
  stageChangedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealAttentionItem {
  dealId: string;
  dealName: string;
  companyName?: string;
  territory?: string;
  ownerName?: string;
  ownerTerritory?: string;
  stage: Deal['stage'];
  riskLevel?: Deal['riskLevel'];
  nextStep?: string;
  nextStepDueDate?: string;
  stageChangedAt?: string;
  daysInStage?: number;
  daysUntilNextStepDue?: number;
  stalled: boolean;
  overdueNextStep: boolean;
  hasOpenTask: boolean;
  rescueTaskOpen: boolean;
  territoryMismatch: boolean;
  needsAttention: boolean;
}

export interface DealAttentionSummary {
  activeDealCount: number;
  highRiskDealCount: number;
  stalledDealCount: number;
  overdueNextStepCount: number;
  dealsNeedingAttention: number;
  deals: DealAttentionItem[];
}

export interface DealAutomationResult {
  reviewedDeals: number;
  rescueTasksCreated: number;
  alreadyCoveredDeals: number;
  createdTaskIds: string[];
}

export interface DealTerritoryQueueItem {
  dealId: string;
  dealName: string;
  companyId?: string;
  companyName?: string;
  territory?: string;
  stage: Deal['stage'];
  riskLevel?: Deal['riskLevel'];
  value: number;
  currentOwnerName?: string;
  currentOwnerTerritory?: string;
  suggestedOwnerId?: string;
  suggestedOwnerName?: string;
  suggestedOwnerTerritory?: string;
  nextStep?: string;
  nextStepDueDate?: string;
  stalled: boolean;
  overdueNextStep: boolean;
  priorityRank?: number;
}

export interface DealTerritoryQueueSummary {
  mismatchCount: number;
  highPriorityCount: number;
  deals: DealTerritoryQueueItem[];
}

export interface DealTerritoryReassignmentResult {
  reviewedDeals: number;
  reassignedDeals: number;
  skippedDeals: number;
  updatedDealIds: string[];
}

export interface CompanyTerritoryQueueItem {
  companyId: string;
  companyName: string;
  territory?: string;
  currentOwnerName?: string;
  currentOwnerTerritory?: string;
  suggestedOwnerId?: string;
  suggestedOwnerName?: string;
  suggestedOwnerTerritory?: string;
  activeDealCount: number;
  territoryMismatchDealCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  childCompanyCount: number;
  pipelineValue: number;
  priorityRank?: number;
}

export interface CompanyTerritoryQueueSummary {
  mismatchCount: number;
  highPriorityCount: number;
  companies: CompanyTerritoryQueueItem[];
}

export interface CompanyTerritoryReassignmentResult {
  reviewedCompanies: number;
  reassignedCompanies: number;
  alignedDeals: number;
  skippedCompanies: number;
  updatedCompanyIds: string[];
  updatedDealIds: string[];
}

export interface DealApprovalActionRequest {
  notes?: string;
}

export interface Company {
  id?: string;
  name: string;
  email?: string;
  industry?: string;
  website?: string;
  phone?: string;
  revenue?: number;
  employeeCount?: number;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  territory?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
  ownerId?: string;
  ownerName?: string;
  ownerTerritory?: string;
  territoryMismatch?: boolean;
  parentCompanyId?: string;
  parentCompanyName?: string;
  contactCount?: number;
  dealCount?: number;
  childCompanyCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyOpportunityInsight {
  dealId: string;
  dealName: string;
  stage: string;
  value: number;
  probability?: number;
  weightedValue?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  ownerName?: string;
  nextStep?: string;
  nextStepDueDate?: string;
  stalled: boolean;
  overdueNextStep: boolean;
}

export interface CompanyInsights {
  companyId: string;
  companyName: string;
  parentCompanyName?: string;
  territory?: string;
  ownerTerritory?: string;
  territoryMismatch: boolean;
  territoryMismatchDeals: number;
  childCompanyCount: number;
  totalContacts: number;
  primaryStakeholders: number;
  decisionMakers: number;
  highInfluenceContacts: number;
  activeDeals: number;
  highRiskDeals: number;
  stalledDeals: number;
  overdueNextSteps: number;
  openTasks: number;
  overdueTasks: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  stakeholderCoveragePercent: number;
  healthScore: number;
  healthStatus: 'HEALTHY' | 'WATCH' | 'AT_RISK';
  missingStakeholderRoles: string[];
  recommendedActions: string[];
  opportunities: CompanyOpportunityInsight[];
}

export type StakeholderRole =
  | 'EXECUTIVE_SPONSOR'
  | 'DECISION_MAKER'
  | 'CHAMPION'
  | 'INFLUENCER'
  | 'PROCUREMENT'
  | 'FINANCE'
  | 'TECHNICAL_EVALUATOR'
  | 'END_USER';

export type InfluenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type PreferredContactMethod = 'EMAIL' | 'PHONE' | 'MOBILE' | 'LINKEDIN';

export interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  companyId?: string;
  companyName?: string;
  company?: Company;
  isPrimary?: boolean;
  stakeholderRole?: StakeholderRole;
  influenceLevel?: InfluenceLevel;
  preferredContactMethod?: PreferredContactMethod;
  reportsToId?: string;
  reportsToName?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  linkedin?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  lastContact?: string;
  lastContactDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id?: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  assignedTo?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  id?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventType: 'MEETING' | 'CALL' | 'DEMO' | 'FOLLOW_UP' | 'INTERNAL' | 'PRESENTATION' | 'TRAINING' | 'CONFERENCE' | 'OTHER';
  location?: string;
  meetingLink?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id?: string;
  name: string;
  sku?: string;
  description?: string;
  category?: 'SOFTWARE' | 'SERVICES' | 'TRAINING' | 'SUPPORT' | 'HARDWARE' | 'SUBSCRIPTIONS' | 'OTHER';
  unitPrice: number;
  cost?: number;
  currency?: string;
  stockQuantity?: number;
  unit?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DRAFT';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  id?: string;
  quoteNumber: string;
  companyId: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  issueDate: string;
  validUntil?: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  subtotal?: number;
  discount?: number;
  discountAmount?: number;
  tax?: number;
  taxRate?: number;
  total?: number;
  paymentTerms?: string;
  terms?: string;
  notes?: string;
  lineItems?: QuoteLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteLineItem {
  id?: string;
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  total?: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  companyId: string;
  contactId?: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal?: number;
  tax?: number;
  total?: number;
  amountPaid?: number;
  paymentDate?: string;
  paymentTerms?: string;
  notes?: string;
  lineItems?: InvoiceLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceLineItem {
  id?: string;
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total?: number;
}

export interface Document {
  id?: string;
  name: string;
  description?: string;
  category: 'ALL' | 'PROPOSALS' | 'CONTRACTS' | 'REPORTS' | 'TEMPLATES' | 'MARKETING' | 'PRESENTATIONS' | 'ASSETS';
  filePath: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
  uploadedById?: string;
  uploadedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Email Types
export interface Email {
  id?: string;
  tenantId?: string;
  subject: string;
  body: string;
  fromEmail: string;
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  folder?: EmailFolder;
  isDraft?: boolean;
  isSent?: boolean;
  isRead?: boolean;
  sentAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EmailFolder = 'INBOX' | 'SENT' | 'DRAFTS' | 'TEMPLATES';

export interface EmailFilterDTO {
  search?: string;
  folder?: EmailFolder;
  isDraft?: boolean;
  isSent?: boolean;
  isRead?: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
}
