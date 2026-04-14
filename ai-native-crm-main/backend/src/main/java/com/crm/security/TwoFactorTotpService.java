package com.crm.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;

@Service
public class TwoFactorTotpService {

    private final SecureRandom secureRandom = new SecureRandom();
    private final String issuer;

    public TwoFactorTotpService(@Value("${security.two-factor.issuer:Cicosy CRM}") String issuer) {
        this.issuer = issuer;
    }

    public String generateSecret() {
        byte[] bytes = new byte[20];
        secureRandom.nextBytes(bytes);
        return Base32Codec.encode(bytes);
    }

    public boolean verifyCode(String secret, String code) {
        if (secret == null || secret.isBlank() || code == null || !code.matches("\\d{6}")) {
            return false;
        }

        long currentWindow = Instant.now().getEpochSecond() / 30L;
        for (long windowOffset = -1; windowOffset <= 1; windowOffset++) {
            if (generateCode(secret, currentWindow + windowOffset).equals(code)) {
                return true;
            }
        }
        return false;
    }

    public String buildOtpAuthUri(String email, String secret) {
        String label = urlEncode(issuer + ":" + email);
        return "otpauth://totp/" + label
                + "?secret=" + urlEncode(secret)
                + "&issuer=" + urlEncode(issuer)
                + "&digits=6&period=30";
    }

    public String getIssuer() {
        return issuer;
    }

    private String generateCode(String secret, long counter) {
        try {
            byte[] key = Base32Codec.decode(secret);
            byte[] data = ByteBuffer.allocate(8).putLong(counter).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            int otp = binary % 1_000_000;
            return String.format("%06d", otp);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Unable to generate 2FA code", ex);
        }
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
