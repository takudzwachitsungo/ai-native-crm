package com.crm.service;

import com.crm.dto.response.CustomerDataGovernanceSummaryDTO;
import com.crm.dto.response.CustomerDuplicateCandidateDTO;
import com.crm.dto.response.CustomerRecordMergeResultDTO;

import java.util.List;
import java.util.UUID;

public interface CustomerDataGovernanceService {

    CustomerDataGovernanceSummaryDTO getSummary();

    List<CustomerDuplicateCandidateDTO> getDuplicateCandidates();

    CustomerRecordMergeResultDTO mergeContacts(UUID targetContactId, UUID sourceContactId);
}
