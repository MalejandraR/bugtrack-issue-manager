package com.bugtrack.dto;

/**
 * Successful login response: the bearer token plus everything the client needs to
 * store the session ({@code expiresAt = now + expiresInHours}).
 */
public class LoginResponse {

    private final String token;
    private final String tokenType;
    private final long expiresInHours;
    private final String email;

    public LoginResponse(String token, String tokenType, long expiresInHours, String email) {
        this.token = token;
        this.tokenType = tokenType;
        this.expiresInHours = expiresInHours;
        this.email = email;
    }

    public String getToken() {
        return token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public long getExpiresInHours() {
        return expiresInHours;
    }

    public String getEmail() {
        return email;
    }
}
