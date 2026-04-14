package com.crm.dto.request;

import com.crm.entity.enums.CampaignChannel;
import com.crm.entity.enums.CampaignStatus;
import com.crm.entity.enums.CampaignType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignFilterDTO {

    private String search;
    private CampaignStatus status;
    private CampaignType type;
    private CampaignChannel channel;
    private LocalDate startDateFrom;
    private LocalDate startDateTo;
}
