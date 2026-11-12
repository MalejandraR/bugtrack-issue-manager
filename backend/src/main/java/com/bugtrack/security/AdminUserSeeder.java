package com.bugtrack.security;

import java.util.Locale;

import com.bugtrack.entity.User;
import com.bugtrack.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Closed-registration seed: on startup, if the {@code users} table is empty, creates
 * the admin account from {@code AUTH_ADMIN_EMAIL} / {@code AUTH_ADMIN_PASSWORD}.
 *
 * <p>Missing values only log a WARN — the app never crashes on them, so read-only
 * local runs and the test profile (which seeds its own users) keep working. Existing
 * users are never overwritten: changing the admin password means updating the
 * database, not the env vars.</p>
 */
@Component
public class AdminUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminUserSeeder(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           @Value("${auth.admin.email:}") String adminEmail,
                           @Value("${auth.admin.password:}") String adminPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.warn("AUTH_ADMIN_EMAIL/AUTH_ADMIN_PASSWORD are not set and the users table is empty: "
                    + "no admin user seeded, every write will answer 401 until they are configured.");
            return;
        }
        String email = adminEmail.trim().toLowerCase(Locale.ROOT);
        userRepository.save(new User(email, passwordEncoder.encode(adminPassword)));
        log.info("Seeded admin user '{}'", email);
    }
}
