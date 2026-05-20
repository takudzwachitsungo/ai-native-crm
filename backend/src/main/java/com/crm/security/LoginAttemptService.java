package com.crm.security;

import com.crm.exception.UnauthorizedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private final Map<String, AttemptState> attempts = new ConcurrentHashMap<>();
    private final int maxAttempts;
    private final Duration lockDuration;

    public LoginAttemptService(
            @Value("${security.login-lockout.max-attempts:5}") int maxAttempts,
            @Value("${security.login-lockout.lock-minutes:15}") long lockMinutes
    ) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.lockDuration = Duration.ofMinutes(Math.max(1, lockMinutes));
    }

    public void assertAllowed(String email, String ipAddress) {
        AttemptState state = attempts.get(key(email, ipAddress));
        if (state == null || state.lockedUntil == null) {
            return;
        }
        if (state.lockedUntil.isAfter(LocalDateTime.now())) {
            throw new UnauthorizedException("Too many failed login attempts. Please try again later.", "LOGIN_LOCKED");
        }
        attempts.remove(key(email, ipAddress));
    }

    public void recordFailure(String email, String ipAddress) {
        String key = key(email, ipAddress);
        attempts.compute(key, (ignored, current) -> {
            AttemptState next = current == null ? new AttemptState() : current;
            next.failedAttempts += 1;
            next.lastFailedAt = LocalDateTime.now();
            if (next.failedAttempts >= maxAttempts) {
                next.lockedUntil = next.lastFailedAt.plus(lockDuration);
            }
            return next;
        });
    }

    public void recordSuccess(String email, String ipAddress) {
        attempts.remove(key(email, ipAddress));
    }

    private String key(String email, String ipAddress) {
        String normalizedEmail = email == null ? "unknown" : email.trim().toLowerCase(Locale.ROOT);
        String normalizedIp = ipAddress == null || ipAddress.isBlank() ? "unknown" : ipAddress.trim();
        return normalizedEmail + "|" + normalizedIp;
    }

    private static final class AttemptState {
        private int failedAttempts;
        private LocalDateTime lastFailedAt;
        private LocalDateTime lockedUntil;
    }
}
