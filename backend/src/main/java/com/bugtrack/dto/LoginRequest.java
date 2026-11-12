package com.bugtrack.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload for POST /api/auth/login.
 *
 * <p>No format rule on {@code email}: the 401 for unknown vs. wrong credentials is
 * intentionally identical, so validation must not leak which accounts exist.</p>
 */
public class LoginRequest {

    @NotBlank(message = "email must not be blank")
    private String email;

    @NotBlank(message = "password must not be blank")
    private String password;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
