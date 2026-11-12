package com.bugtrack.controller;

import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import com.bugtrack.entity.Issue;
import com.bugtrack.entity.Priority;
import com.bugtrack.entity.Severity;
import com.bugtrack.entity.User;
import com.bugtrack.repository.IssueRepository;
import com.bugtrack.repository.UserRepository;
import com.bugtrack.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Integration tests for Fase 7: login, bearer tokens, public reads vs. protected
 * writes, /api/auth/me and the CORS preflight. Full Spring context + MockMvc against
 * a real PostgreSQL database ({@code bugtrack_test}, profile {@code test}).
 *
 * <p>The test profile has no AUTH_ADMIN_* env vars, so the startup seed does nothing
 * — this class seeds its own user (closed registration, no public register endpoint).</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Auth API integration tests (real PostgreSQL)")
class AuthApiIntegrationTest {

    private static final String LOGIN = "/api/auth/login";
    private static final String ME = "/api/auth/me";
    private static final String ISSUES = "/api/issues";
    private static final String EMAIL = "it-admin@bugtrack.local";
    private static final String PASSWORD = "It-Admin-2026!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void seedUserAndCleanIssues() {
        issueRepository.deleteAll();
        if (userRepository.findByEmailIgnoreCase(EMAIL).isEmpty()) {
            userRepository.save(new User(EMAIL, passwordEncoder.encode(PASSWORD)));
        }
    }

    @AfterEach
    void cleanIssues() {
        issueRepository.deleteAll();
    }

    // ------------------------------------------------------------------ helpers

    private static String issueJson(String title) {
        return """
                {"title":"%s","description":"Description of %s","severity":"HIGH","priority":"URGENT"}
                """.formatted(title, title);
    }

    private static String loginJson(String email, String password) {
        return """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
    }

    private JsonNode readTree(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    /** Logs in through the API and returns the bearer token (asserts 200). */
    private String loginViaApi() throws Exception {
        MvcResult result = mockMvc.perform(post(LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(EMAIL, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        return readTree(result).get("token").asText();
    }

    /** Creates an issue through the repository (no API call, no token needed). */
    private Issue persistIssue(String title) {
        return issueRepository.save(new Issue(title, "Description of " + title,
                Severity.MEDIUM, Priority.MEDIUM));
    }

    // -------------------------------------------------------------------- login

    @Test
    @DisplayName("POST /api/auth/login with valid credentials returns 200 with a Bearer token")
    void loginSuccess_returns200WithBearerToken() throws Exception {
        MvcResult result = mockMvc.perform(post(LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(EMAIL, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresInHours").value(24))
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andReturn();

        String token = readTree(result).get("token").asText();
        assertTrue(jwtService.validate(token), "the issued token must verify");
        assertEquals(EMAIL, jwtService.parseSubject(token), "the subject must be the account email");
    }

    @Test
    @DisplayName("POST /api/auth/login with a wrong password returns 401 with a generic message")
    void loginWrongPassword_returns401GenericMessage() throws Exception {
        mockMvc.perform(post(LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(EMAIL, "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    @DisplayName("Unknown email answers the exact same 401 as a wrong password (no user enumeration)")
    void loginUnknownEmail_returnsIdentical401() throws Exception {
        MvcResult unknown = mockMvc.perform(post(LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("nobody@bugtrack.local", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andReturn();

        MvcResult wrongPassword = mockMvc.perform(post(LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(EMAIL, "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andReturn();

        // Same status, same message, same shape: the only difference may be the timestamp,
        // so nothing in the body tells the caller whether the account exists.
        JsonNode unknownBody = readTree(unknown);
        JsonNode wrongBody = readTree(wrongPassword);
        assertEquals(unknownBody.get("status").asInt(), wrongBody.get("status").asInt());
        assertEquals(unknownBody.get("message").asText(), wrongBody.get("message").asText());
        assertTrue(unknownBody.hasNonNull("timestamp") && wrongBody.hasNonNull("timestamp"),
                "both bodies must keep the standard ApiError shape");
        assertTrue(!unknownBody.has("fieldErrors") && !wrongBody.has("fieldErrors"),
                "a 401 must not carry fieldErrors");
    }

    @Test
    @DisplayName("POST /api/auth/login with a blank password returns 400 with fieldErrors")
    void loginBlankPassword_returns400Validation() throws Exception {
        mockMvc.perform(post(LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(EMAIL, "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.password").value("password must not be blank"));
    }

    // ---------------------------------------------------- public reads (no token)

    @Test
    @DisplayName("GET /api/issues returns 200 without a token (reads are public)")
    void getIssuesWithoutToken_returns200() throws Exception {
        persistIssue("Visible to anyone");

        mockMvc.perform(get(ISSUES))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Visible to anyone"));
    }

    @Test
    @DisplayName("GET /api/issues/{id} returns 200 without a token (reads are public)")
    void getIssueDetailWithoutToken_returns200() throws Exception {
        Issue issue = persistIssue("Public detail");

        mockMvc.perform(get(ISSUES + "/" + issue.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(issue.getId()));
    }

    @Test
    @DisplayName("GET /api/health returns 200 without a token")
    void healthWithoutToken_returns200() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    // ---------------------------------------------------- protected writes (401)

    @Test
    @DisplayName("POST without a token returns 401 with the standard ApiError body")
    void postWithoutToken_returns401ApiError() throws Exception {
        mockMvc.perform(post(ISSUES)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson("No token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication required"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());

        assertTrue(issueRepository.count() == 0, "nothing may be persisted without a token");
    }

    @Test
    @DisplayName("DELETE without a token returns 401 and the row survives")
    void deleteWithoutToken_returns401() throws Exception {
        Issue issue = persistIssue("Protected delete");

        mockMvc.perform(delete(ISSUES + "/" + issue.getId()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        assertTrue(issueRepository.count() == 1, "the row must survive an unauthenticated DELETE");
    }

    @Test
    @DisplayName("An expired token returns 401 'Invalid or expired token'")
    void expiredToken_returns401() throws Exception {
        String expired = jwtService.generateToken(EMAIL, Duration.ofSeconds(-5));

        mockMvc.perform(post(ISSUES)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expired)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson("Expired token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));

        assertTrue(issueRepository.count() == 0, "an expired token must not write");
    }

    @Test
    @DisplayName("A tampered token returns 401")
    void tamperedToken_returns401() throws Exception {
        String token = loginViaApi();
        String[] parts = token.split("\\.");
        // Flip the first payload character — never a base64 pad position, so the
        // decoded bytes always change and the signature no longer matches.
        parts[1] = (parts[1].charAt(0) == 'x' ? 'y' : 'x') + parts[1].substring(1);
        String tampered = String.join(".", parts);

        mockMvc.perform(post(ISSUES)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson("Tampered token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    // ------------------------------------------------------ protected writes (201/200)

    @Test
    @DisplayName("POST with a token returns 201 and persists the issue")
    void postWithToken_returns201() throws Exception {
        String token = loginViaApi();

        MvcResult result = mockMvc.perform(post(ISSUES)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson("With a token")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("With a token"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andReturn();

        long id = readTree(result).get("id").asLong();
        assertTrue(id > 0, "the issue must be persisted");
    }

    @Test
    @DisplayName("PUT with a token updates the issue (200)")
    void putWithToken_returns200() throws Exception {
        String token = loginViaApi();
        Issue issue = persistIssue("Before PUT");

        mockMvc.perform(put(ISSUES + "/" + issue.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"After PUT","description":"Edited with a token","severity":"LOW","priority":"LOW"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("After PUT"));
    }

    @Test
    @DisplayName("PATCH status with a token updates the issue (200)")
    void patchWithToken_returns200() throws Exception {
        String token = loginViaApi();
        Issue issue = persistIssue("Before PATCH");

        mockMvc.perform(patch(ISSUES + "/" + issue.getId() + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @DisplayName("DELETE with a token removes the issue (204)")
    void deleteWithToken_returns204() throws Exception {
        String token = loginViaApi();
        Issue issue = persistIssue("Doomed");

        mockMvc.perform(delete(ISSUES + "/" + issue.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        assertTrue(issueRepository.count() == 0, "the row must be gone");
    }

    // ------------------------------------------------------------------- /me

    @Test
    @DisplayName("GET /api/auth/me with a token returns the account email (200)")
    void meWithToken_returns200WithEmail() throws Exception {
        String token = loginViaApi();

        mockMvc.perform(get(ME).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL));
    }

    @Test
    @DisplayName("GET /api/auth/me without a token returns 401")
    void meWithoutToken_returns401() throws Exception {
        mockMvc.perform(get(ME))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    // --------------------------------------------------------------------- CORS

    @Test
    @DisplayName("OPTIONS preflight for a protected write is answered 200 before authentication")
    void corsPreflight_returns200WithoutToken() throws Exception {
        mockMvc.perform(options(ISSUES)
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN,
                        "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS,
                        containsStringIgnoringCase("POST")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        containsStringIgnoringCase("authorization")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        not(emptyOrNullString())));
    }
}
