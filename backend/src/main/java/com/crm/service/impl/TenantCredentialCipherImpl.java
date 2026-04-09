package com.crm.service.impl;

import com.crm.exception.BadRequestException;
import com.crm.service.SecretValueResolver;
import com.crm.service.TenantCredentialCipher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

@Service
public class TenantCredentialCipherImpl implements TenantCredentialCipher {

    private static final String PREFIX = "enc:v1:";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int IV_LENGTH_BYTES = 12;

    private final SecretKeySpec secretKeySpec;
    private final SecureRandom secureRandom = new SecureRandom();

    public TenantCredentialCipherImpl(
            @Value("${tenancy.security.database-credentials-key}") String rawKeyMaterial,
            SecretValueResolver secretValueResolver
    ) {
        this.secretKeySpec = new SecretKeySpec(deriveKey(secretValueResolver.resolve(rawKeyMaterial)), "AES");
    }

    @Override
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return plaintext;
        }

        if (plaintext.startsWith(PREFIX)) {
            return plaintext;
        }

        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);

            return PREFIX + Base64.getEncoder().encodeToString(payload);
        } catch (GeneralSecurityException ex) {
            throw new BadRequestException("Could not encrypt tenant database credential");
        }
    }

    @Override
    public String decrypt(String ciphertextOrPlaintext) {
        if (ciphertextOrPlaintext == null || ciphertextOrPlaintext.isBlank()) {
            return ciphertextOrPlaintext;
        }

        if (!ciphertextOrPlaintext.startsWith(PREFIX)) {
            return ciphertextOrPlaintext;
        }

        try {
            byte[] payload = Base64.getDecoder().decode(ciphertextOrPlaintext.substring(PREFIX.length()));
            byte[] iv = Arrays.copyOfRange(payload, 0, IV_LENGTH_BYTES);
            byte[] encrypted = Arrays.copyOfRange(payload, IV_LENGTH_BYTES, payload.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new BadRequestException("Could not decrypt tenant database credential");
        }
    }

    private byte[] deriveKey(String rawKeyMaterial) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(rawKeyMaterial.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Could not derive tenant credential encryption key", ex);
        }
    }
}
