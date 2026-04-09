package com.crm.dto.request;

import com.crm.entity.enums.SupportCasePriority;
import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.SupportCaseSource;
import com.crm.entity.enums.SupportCaseStatus;
import com.crm.entity.enums.SupportCaseType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportCaseFilterDTO {

    private String search;
    private SupportCaseStatus status;
    private SupportCasePriority priority;
    private SupportCaseSource source;
    private SupportCaseType caseType;
    private SupportCaseQueue supportQueue;
}
