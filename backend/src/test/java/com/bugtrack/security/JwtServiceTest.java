package com.bugtrack.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link JwtService}: round trip, expiry, tampering and the
 * secret-configuration guards. No Spring context — the service is constructed
 * directly with an explicit secret.
 */
@DisplayName("JwtService (unit)")
class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-0123456789abcdef0123456789abcdef";
    private static final String EMAIL = "admin@bugtrack.local";

    private final JwtService service = new JwtService(SECRET, 24);

    @Test
    @DisplayName("generate → parse round trip returns the original subject and a valid token")
    void generateThenParseRoundTrip() {
        String token = service.generateToken(EMAIL);

        assertFalse(token.isBlank(), "a token must be issued");
        assertTrue(service.validate(token), "the freshly issued token must validate");
        assertFalse(service.isExpired(token), "a fresh token must not be expired");
        assertEquals(EMAIL, service.parseSubject(token), "the subject must round trip");
        assertEquals(24, service.getExpiryHours(), "expiry must echo the configured hours");
    }

    @Test
    @DisplayName("two tokens for the same subject differ (random JWT id / issuedAt)")
    void tokensAreNotIdentical() {
        assertNotEquals(service.generateToken(EMAIL), service.generateToken(EMAIL),
                "tokens must not be deterministic — a replay would be trivially guessable");
    }

    @Test
    @DisplayName("an expired token is rejected: isExpired=true, validate=false, parse throws")
    void expiredTokenIsRejected() {
        String expired = service.generateToken(EMAIL, Duration.ofSeconds(-5));

        assertTrue(service.isExpired(expired), "an expired token must be reported as expired");
        assertFalse(service.validate(expired), "an expired token must not validate");
        assertThrows(JwtException.class, () -> service.parseSubject(expired),
                "parsing an expired token must throw");
    }

    @Test
    @DisplayName("a token signed with another secret fails signature verification")
    void tokenSignedWithAnotherSecretIsRejected() {
        JwtService other = new JwtService("another-secret-9876543210fedcba9876543210fedcba", 24);
        String foreignToken = other.generateToken(EMAIL);

        assertFalse(service.validate(foreignToken), "a foreign signature must not validate");
        assertThrows(JwtException.class, () -> service.parseSubject(foreignToken),
                "parsing a foreign token must throw");
    }

    @Test
    @DisplayName("a tampered payload (bit flipped by hand) is rejected")
    void tamperedTokenIsRejected() {
        String token = service.generateToken(EMAIL);
        String[] parts = token.split("\\.");
        // First character of the payload is never a base64 pad position, so this
        // always changes the decoded bytes → the signature no longer matches.
        char first = parts[1].charAt(0);
        parts[1] = (first == 'x' ? 'y' : 'x') + parts[1].substring(1);
        String tampered = String.join(".", parts);

        assertFalse(service.validate(tampered), "a tampered token must not validate");
        assertThrows(JwtException.class, () -> service.parseSubject(tampered),
                "parsing a tampered token must throw");
        assertFalse(service.isExpired(tampered), "garbage is not 'expired' — it is invalid");
    }

    @Test
    @DisplayName("a malformed token (not three base64url segments) is rejected")
    void malformedTokenIsRejected() {
        assertFalse(service.validate("not-a-jwt"));
        assertFalse(service.isExpired("not-a-jwt"));
        assertThrows(JwtException.class, () -> service.parseSubject("not-a-jwt"));
        assertThrows(JwtException.class, () -> service.parseSubject(""));
    }

    @Test
    @DisplayName("a secret shorter than 32 bytes fails fast (HS256 minimum key size)")
    void shortSecretFailsFast() {
        assertThrows(IllegalStateException.class, () -> new JwtService("tooshort", 24),
                "a weak secret must not boot silently");
    }

    @Test
    @DisplayName("a missing secret falls back to an ephemeral key that still signs and verifies")
    void missingSecretFallsBackToEphemeralKey() {
        JwtService ephemeral = new JwtService("", 24);

        String token = ephemeral.generateToken(EMAIL);
        assertTrue(ephemeral.validate(token), "the ephemeral key must sign and verify within the process");
        // A second instance has a different random key → the first token must fail.
        JwtService otherEphemeral = new JwtService(null, 24);
        assertFalse(otherEphemeral.validate(token), "ephemeral secrets must not be shared across restarts");
    }
}
