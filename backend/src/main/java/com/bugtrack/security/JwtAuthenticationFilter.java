package com.bugtrack.security;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Turns {@code Authorization: Bearer <jwt>} into a Spring Security authentication.
 *
 * <p>Invalid or expired tokens never fail the request on their own: the context is
 * simply left empty, so a public GET still succeeds while a protected write is
 * rejected by the authorization rules with a 401 (the reason is stashed as a request
 * attribute for the entry point to report). The filter is instantiated inside
 * {@code SecurityConfig} — it must run in the security chain, not as a servlet filter.</p>
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** Request attribute set when a Bearer token was present but rejected. */
    public static final String FAILURE_ATTRIBUTE = "bugtrack.security.authFailure";

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final AuthUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, AuthUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String header = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (header != null && header.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
                authenticate(request, header.substring(BEARER_PREFIX.length()).trim());
            }
            filterChain.doFilter(request, response);
        } finally {
            // The context is thread-local and MockMvc/servlet containers reuse threads.
            SecurityContextHolder.clearContext();
        }
    }

    private void authenticate(HttpServletRequest request, String token) {
        try {
            String email = jwtService.parseSubject(token);
            UserDetails user = userDetailsService.loadUserByUsername(email);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception ex) {
            // Signature/expiry failure or unknown subject: unauthenticated, reason reported on 401.
            request.setAttribute(FAILURE_ATTRIBUTE, "Invalid or expired token");
        }
    }
}
