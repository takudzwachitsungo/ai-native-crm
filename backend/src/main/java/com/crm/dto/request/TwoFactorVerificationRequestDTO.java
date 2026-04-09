package com.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TwoFactorVerificationRequestDTO {

    @NotBlank
    @Pattern(regexp = "^\\d{6}$", message = "Authentication code must be a 6-digit number")
    private String code;
}
