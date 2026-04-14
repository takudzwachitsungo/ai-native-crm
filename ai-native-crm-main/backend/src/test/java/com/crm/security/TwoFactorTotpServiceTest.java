package com.crm.security;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TwoFactorTotpServiceTest {

    private final TwoFactorTotpService service = new TwoFactorTotpService("Cicosy CRM QA");

    @Test
    void generatedSecretProducesVerifiableCode() throws Exception {
        String secret = service.generateSecret();
        long currentWindow = Instant.now().getEpochSecond() / 30L;
        Method generateCode = TwoFactorTotpService.class.getDeclaredMethod("generateCode", String.class, long.class);
        generateCode.setAccessible(true);

        String code = (String) generateCode.invoke(service, secret, currentWindow);

        assertTrue(service.verifyCode(secret, code));
        assertFalse(service.verifyCode(secret, "000000"));
    }

    @Test
    void otpAuthUriIncludesIssuerAndSecret() {
        String secret = service.generateSecret();
        String uri = service.buildOtpAuthUri("qa@example.com", secret);

        assertTrue(uri.startsWith("otpauth://totp/"));
        assertTrue(uri.contains("secret="));
        assertTrue(uri.contains("issuer=Cicosy+CRM+QA"));
    }
}
