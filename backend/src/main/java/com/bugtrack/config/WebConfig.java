package com.bugtrack.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS for the Vite dev server and the production frontend.
 * Origins come from CORS_ALLOWED_ORIGINS (comma-separated); the defaults
 * keep local development working without any extra configuration.
 *
 * <p>Exposed as a {@link CorsConfigurationSource} bean (instead of a
 * WebMvcConfigurer) so Spring Security picks it up via
 * {@code .cors(Customizer.withDefaults())}: its CorsFilter then answers the
 * preflight OPTIONS request before authentication runs, which is exactly what
 * the public GET / authenticated POST split needs.</p>
 *
 * <p>Headers are listed explicitly instead of "*" so browsers never have to
 * interpret a wildcard for the {@code Authorization} header.</p>
 */
@Configuration
public class WebConfig {

    @Value("${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOriginsCsv;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        for (String origin : allowedOriginsCsv.split(",")) {
            String trimmed = origin.trim();
            if (!trimmed.isEmpty()) {
                configuration.addAllowedOrigin(trimmed);
            }
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
