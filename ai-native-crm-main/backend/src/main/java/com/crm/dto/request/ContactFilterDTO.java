package com.crm.dto.request;

import com.crm.entity.enums.ContactStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactFilterDTO {
    
    private String search;
    private ContactStatus status;
    private UUID companyId;
    private String city;
    private String state;
    private String country;
    private LocalDate lastContactDateFrom;
    private LocalDate lastContactDateTo;
}
