package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GovernanceInboxSummaryDTO {

    private Long totalItems;
    private Long territoryEscalationItems;
    private Long quotaRiskItems;
    private Long slaBreachedItems;
    private Long openActionItems;
    private Long openDigestCount;
    private Long openReviewTaskCount;
    private Long overdueReviewTaskCount;
    private Long watchReviewCount;
    private Long highReviewCount;
    private Long criticalReviewCount;
    private Long oldestOverdueReviewDays;
    private Boolean digestDue;
    private String reviewSlaStatus;
    private Long daysSinceLastDigest;
    private java.time.LocalDateTime lastDigestCreatedAt;
    private String lastDigestStatus;
    private List<GovernanceDigestHistoryItemDTO> recentDigests;
    private List<GovernanceInboxItemDTO> items;
}
