package com.crm.dto.request;

import com.crm.entity.enums.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRoleUpdateRequestDTO {

    @NotNull(message = "Role is required")
    private UserRole role;
}
