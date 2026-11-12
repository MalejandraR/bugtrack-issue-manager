package com.bugtrack.dto;

/** GET /api/auth/me response: the email of the authenticated user. */
public class MeResponse {

    private final String email;

    public MeResponse(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
