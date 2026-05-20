package com.crm.security;

import com.crm.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PasswordPolicyServiceTest {

    private final PasswordPolicyService passwordPolicyService = new PasswordPolicyService();

    @Test
    void rejectsWeakPasswords() {
        assertThrows(BadRequestException.class, () -> passwordPolicyService.validate("short"));
        assertThrows(BadRequestException.class, () -> passwordPolicyService.validate("alllowercase123!"));
        assertThrows(BadRequestException.class, () -> passwordPolicyService.validate("ALLUPPERCASE123!"));
        assertThrows(BadRequestException.class, () -> passwordPolicyService.validate("NoNumbers!!!!"));
        assertThrows(BadRequestException.class, () -> passwordPolicyService.validate("NoSymbols1234"));
    }

    @Test
    void acceptsStrongPasswords() {
        assertDoesNotThrow(() -> passwordPolicyService.validate("StrongPass123!"));
    }
}
