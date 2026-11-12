package com.bugtrack.controller;

import java.util.UUID;

import com.bugtrack.dto.LoginRequest;
import com.bugtrack.dto.LoginResponse;
import com.bugtrack.dto.MeResponse;
import com.bugtrack.entity.User;
import com.bugtrack.exception.InvalidCredentialsException;
import com.bugtrack.repository.UserRepository;
import com.bugtrack.security.JwtService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication endpoints (Fase 7). There is deliberately no register endpoint:
 * accounts come from the startup seed (closed registration).
 *
 * <p>Wrong credentials answer 401 through {@link InvalidCredentialsException} with a
 * single generic message for both failure modes.</p>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String TOKEN_TYPE = "Bearer";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Compared against when the email does not exist, so an unknown account costs
     * the same time as a wrong password (timing-based user enumeration).
     */
    private final String timingEqualizerHash;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.timingEqualizerHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    /** POST /api/auth/login → bearer token for a valid email + password pair. */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        String email = request.getEmail().trim();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user == null) {
            // Burn a hash comparison anyway: equal work for unknown vs. known email.
            passwordEncoder.matches(request.getPassword(), timingEqualizerHash);
            throw new InvalidCredentialsException();
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        String token = jwtService.generateToken(user.getEmail());
        return new LoginResponse(token, TOKEN_TYPE, jwtService.getExpiryHours(), user.getEmail());
    }

    /** GET /api/auth/me → the email behind the current token (requires auth). */
    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(new MeResponse(email));
    }
}
