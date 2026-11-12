package com.bugtrack.security;

import com.bugtrack.entity.User;
import com.bugtrack.repository.UserRepository;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Loads users for the JWT filter: the token subject (email) is resolved to a
 * {@link UserDetails} so a deleted account stops working immediately instead of
 * living on inside an already-issued token.
 *
 * <p>There is a single implicit role: every authenticated user may write.</p>
 */
@Service
public class AuthUserDetailsService implements UserDetailsService {

    public static final String ROLE_USER = "ROLE_USER";

    private final UserRepository userRepository;

    public AuthUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(ROLE_USER)
                .build();
    }
}
