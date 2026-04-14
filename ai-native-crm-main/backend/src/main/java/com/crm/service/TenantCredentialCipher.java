package com.crm.service;

public interface TenantCredentialCipher {

    String encrypt(String plaintext);

    String decrypt(String ciphertextOrPlaintext);
}
