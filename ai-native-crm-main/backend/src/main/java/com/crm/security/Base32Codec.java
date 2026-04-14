package com.crm.security;

import java.io.ByteArrayOutputStream;

public final class Base32Codec {

    private static final char[] ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();

    private Base32Codec() {
    }

    public static String encode(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }

        StringBuilder output = new StringBuilder((bytes.length * 8 + 4) / 5);
        int buffer = bytes[0] & 0xFF;
        int next = 1;
        int bitsLeft = 8;

        while (bitsLeft > 0 || next < bytes.length) {
            if (bitsLeft < 5) {
                if (next < bytes.length) {
                    buffer <<= 8;
                    buffer |= bytes[next++] & 0xFF;
                    bitsLeft += 8;
                } else {
                    int pad = 5 - bitsLeft;
                    buffer <<= pad;
                    bitsLeft += pad;
                }
            }

            int index = (buffer >> (bitsLeft - 5)) & 0x1F;
            bitsLeft -= 5;
            output.append(ALPHABET[index]);
        }

        return output.toString();
    }

    public static byte[] decode(String value) {
        if (value == null || value.isBlank()) {
            return new byte[0];
        }

        String normalized = value.trim().replace("=", "").replace(" ", "").toUpperCase();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        int buffer = 0;
        int bitsLeft = 0;

        for (char character : normalized.toCharArray()) {
            int index = indexOf(character);
            if (index < 0) {
                throw new IllegalArgumentException("Invalid base32 character");
            }

            buffer <<= 5;
            buffer |= index;
            bitsLeft += 5;

            if (bitsLeft >= 8) {
                output.write((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }

        return output.toByteArray();
    }

    private static int indexOf(char value) {
        for (int index = 0; index < ALPHABET.length; index++) {
            if (ALPHABET[index] == value) {
                return index;
            }
        }
        return -1;
    }
}
