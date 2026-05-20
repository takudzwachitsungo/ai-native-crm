package com.crm.security;

import com.crm.exception.BadRequestException;
import org.springframework.stereotype.Service;

@Service
public class PasswordPolicyService {

    public static final String REQUIREMENTS =
            "Use at least 12 characters with uppercase, lowercase, number, and symbol.";

    public void validate(String password) {
        if (password == null || password.isBlank()) {
            throw new BadRequestException("Password is required");
        }
        if (password.length() < 12) {
            throw new BadRequestException("Password must be at least 12 characters long");
        }
        if (!password.chars().anyMatch(Character::isUpperCase)) {
            throw new BadRequestException("Password must include at least one uppercase letter");
        }
        if (!password.chars().anyMatch(Character::isLowerCase)) {
            throw new BadRequestException("Password must include at least one lowercase letter");
        }
        if (!password.chars().anyMatch(Character::isDigit)) {
            throw new BadRequestException("Password must include at least one number");
        }
        if (password.chars().noneMatch(ch -> !Character.isLetterOrDigit(ch))) {
            throw new BadRequestException("Password must include at least one symbol");
        }
    }
}
