package com.bugtrack.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Unit tests for the password hashing of Fase 7 (BCrypt, salted per hash). */
@DisplayName("BCrypt password encoder (unit)")
class PasswordEncoderTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    @Test
    @DisplayName("the encoded hash verifies against its plain password")
    void hashVerifiesAgainstOriginalPassword() {
        String hash = encoder.encode("Bugtrack-2026!");

        assertTrue(encoder.matches("Bugtrack-2026!", hash), "the original password must match");
    }

    @Test
    @DisplayName("a different password never verifies against the hash")
    void wrongPasswordDoesNotMatch() {
        String hash = encoder.encode("Bugtrack-2026!");

        assertFalse(encoder.matches("otra-password", hash), "a wrong password must not match");
        assertFalse(encoder.matches("", hash), "an empty password must not match");
    }

    @Test
    @DisplayName("the same password hashes differently every time (per-hash salt)")
    void samePasswordProducesDifferentHashes() {
        String first = encoder.encode("Bugtrack-2026!");
        String second = encoder.encode("Bugtrack-2026!");

        assertNotEquals(first, second, "two hashes of the same password must differ (salt)");
        assertTrue(encoder.matches("Bugtrack-2026!", first));
        assertTrue(encoder.matches("Bugtrack-2026!", second));
    }

    @Test
    @DisplayName("the stored value is a 60-char BCrypt hash ($2a/$2b), never the plain password")
    void hashFormatIsBcrypt() {
        String plain = "Bugtrack-2026!";
        String hash = encoder.encode(plain);

        assertTrue(hash.startsWith("$2"), "BCrypt hashes start with $2");
        assertTrue(hash.length() >= 50 && hash.length() <= 80, "BCrypt hash length: " + hash.length());
        assertFalse(hash.contains(plain), "the plain password must never appear in the hash");
    }
}
