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
public class CustomerDuplicateCandidateDTO {

    private String recordType;
    private String matchType;
    private String duplicateKey;
    private Long recordCount;
    private String recommendedAction;
    private List<CustomerDuplicateRecordDTO> records;
}
