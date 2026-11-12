package com.bugtrack.config;

import java.io.IOException;

import com.bugtrack.exception.ApiError;
import com.bugtrack.security.AuthUserDetailsService;
import com.bugtrack.security.JwtAuthenticationFilter;
import com.bugtrack.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security for Fase 7: stateless JWT, CSRF off, reads public / writes protected.
 *
 * <p>Matcher order matters — the first match wins:</p>
 * <ol>
 *   <li>OPTIONS preflight (answered by the CORS filter before authorization),</li>
 *   <li>public: health, login, GET issues (list + detail),</li>
 *   <li>everything else under {@code /api/**} (writes today, any future endpoint
 *       tomorrow) requires a valid token,</li>
 *   <li>static/non-API traffic is open (the SPA ships from Vercel).</li>
 * </ol>
 *
 * <p>401/403 bodies reuse {@link ApiError}, the exact shape {@code GlobalExceptionHandler}
 * returns for 400/404/405/415/500.</p>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper;

    public SecurityConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtService jwtService,
                                                   AuthUserDetailsService userDetailsService) throws Exception {
        JwtAuthenticationFilter jwtFilter = new JwtAuthenticationFilter(jwtService, userDetailsService);

        http
                // Stateless bearer tokens: no cookies, therefore no CSRF surface.
                .csrf(AbstractHttpConfigurer::disable)
                // Resolved from the CorsConfigurationSource bean in WebConfig; Spring Security's
                // CorsFilter answers preflight OPTIONS before authentication runs.
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/health", "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/issues", "/api/issues/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(this::writeUnauthorized)
                        .accessDeniedHandler(this::writeAccessDenied))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // ------------------------------------------------------------- 401 / 403 JSON

    private void writeUnauthorized(HttpServletRequest request,
                                   HttpServletResponse response,
                                   AuthenticationException exception) throws IOException {
        String message = request.getAttribute(JwtAuthenticationFilter.FAILURE_ATTRIBUTE) != null
                ? (String) request.getAttribute(JwtAuthenticationFilter.FAILURE_ATTRIBUTE)
                : "Authentication required";
        writeError(response, HttpStatus.UNAUTHORIZED, message);
    }

    private void writeAccessDenied(HttpServletRequest request,
                                   HttpServletResponse response,
                                   AccessDeniedException exception) throws IOException {
        writeError(response, HttpStatus.FORBIDDEN, "Access denied");
    }

    private void writeError(HttpServletResponse response, HttpStatus status, String message)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiError.of(status.value(), message));
    }
}
