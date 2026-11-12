package com.bugtrack.security;

import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Issues and verifies the stateless JWTs used by the API (Fase 7).
 *
 * <p>Algorithm HS256, secret from {@code AUTH_JWT_SECRET} (≥ 32 bytes), expiry from
 * {@code AUTH_JWT_EXPIRY_HOURS} (default 24). With no secret configured the service
 * falls back to a random in-memory secret and logs a WARN: reads keep working and
 * nothing crashes, but tokens do not survive a restart — production must set the env
 * var (Render does it via {@code generateValue}).</p>
 */
@Service
public class JwtService {

    /** HS256 requires a key of at least 256 bits; jjwt refuses shorter secrets. */
    private static final int MIN_SECRET_BYTES = 32;

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey key;
    private final long expiryHours;

    public JwtService(@Value("${auth.jwt.secret:}") String secret,
                      @Value("${auth.jwt.expiry-hours:24}") long expiryHours) {
        if (expiryHours <= 0) {
            log.warn("auth.jwt.expiry-hours must be positive (got {}); falling back to 24h", expiryHours);
            expiryHours = 24;
        }
        this.expiryHours = expiryHours;

        if (secret == null || secret.isBlank()) {
            log.warn("AUTH_JWT_SECRET is not set — using a random ephemeral secret for this process. "
                    + "Tokens will stop being valid on restart; set AUTH_JWT_SECRET in the environment.");
            this.key = Keys.hmacShaKeyFor(randomSecret());
        } else {
            byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
            if (secretBytes.length < MIN_SECRET_BYTES) {
                throw new IllegalStateException(
                        "AUTH_JWT_SECRET must be at least 32 characters (HS256); got " + secretBytes.length);
            }
            this.key = new SecretKeySpec(secretBytes, "HmacSHA256");
        }
    }

    private static byte[] randomSecret() {
        byte[] secret = new byte[48];
        new SecureRandom().nextBytes(secret);
        return secret;
    }

    /** Issues a token for the given subject (email) with the configured expiry. */
    public String generateToken(String subject) {
        return generateToken(subject, Duration.ofHours(expiryHours));
    }

    /** Issues a token with an explicit TTL — used by tests to build expired tokens. */
    public String generateToken(String subject, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(subject)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Verifies signature and expiry, then returns the subject (email).
     *
     * @throws JwtException if the token is malformed, tampered with or expired
     */
    public String parseSubject(String token) {
        Claims claims = parseClaims(token);
        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new JwtException("Token has no subject");
        }
        return subject;
    }

    /** True only when the token is well-formed and its signature is valid but expired. */
    public boolean isExpired(String token) {
        try {
            return parseClaims(token).getExpiration().toInstant().isBefore(Instant.now());
        } catch (io.jsonwebtoken.ExpiredJwtException expired) {
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** True when the signature verifies and the token is not expired. */
    public boolean validate(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** Configured token lifetime, echoed by the login response. */
    public long getExpiryHours() {
        return expiryHours;
    }

    private Claims parseClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new JwtException("Token is empty");
        }
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token.trim())
                .getPayload();
    }
}
