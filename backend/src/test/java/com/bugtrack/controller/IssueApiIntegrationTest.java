package com.bugtrack.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.bugtrack.entity.Issue;
import com.bugtrack.entity.Priority;
import com.bugtrack.entity.Severity;
import com.bugtrack.entity.Status;
import com.bugtrack.repository.IssueRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Integration tests for the issue API: full Spring context + MockMvc against a real
 * PostgreSQL database ({@code bugtrack_test}, profile {@code test}).
 *
 * <p>The suite is order-independent: every test wipes the {@code issues} table both
 * before and after running, so any execution order (and any re-run) starts from a
 * known state.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Issue API integration tests (real PostgreSQL)")
class IssueApiIntegrationTest {

    private static final String ISSUES = "/api/issues";
    private static final long MISSING_ID = 999_999L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private IssueRepository issueRepository;

    @BeforeEach
    void cleanBefore() {
        issueRepository.deleteAll();
    }

    @AfterEach
    void cleanAfter() {
        issueRepository.deleteAll();
    }

    // ------------------------------------------------------------------ helpers

    private static String issueJson(String title, String description,
                                    String severity, String priority) {
        return """
                {"title":"%s","description":"%s","severity":"%s","priority":"%s"}
                """.formatted(title, description, severity, priority);
    }

    private static String validJson() {
        return issueJson("Login button does nothing", "Click has no effect", "HIGH", "URGENT");
    }

    /** Creates an issue through the API and returns its id (asserts 201). */
    private long createViaApi(String title, Severity severity, Priority priority) throws Exception {
        MvcResult result = mockMvc.perform(post(ISSUES)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson(title, "Description of " + title,
                                severity.name(), priority.name())))
                .andExpect(status().isCreated())
                .andReturn();
        return readTree(result).get("id").asLong();
    }

    /** Persists an issue straight through the repository (bypasses the API). */
    private Issue persist(String title, Status status, Severity severity, Priority priority) {
        Issue issue = new Issue(title, "Description of " + title, severity, priority);
        issue.setStatus(status);
        return issueRepository.save(issue);
    }

    private JsonNode readTree(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private String bodyOf(MvcResult result) throws Exception {
        return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    // --------------------------------------------------------------------- POST

    @Test
    @DisplayName("POST a valid issue returns 201, Location and an OPEN issue body")
    void postValid_returns201WithLocationAndOpenBody() throws Exception {
        MvcResult result = mockMvc.perform(post(ISSUES)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.title").value("Login button does nothing"))
                .andExpect(jsonPath("$.severity").value("HIGH"))
                .andExpect(jsonPath("$.priority").value("URGENT"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty())
                .andReturn();

        JsonNode body = readTree(result);
        long id = body.get("id").asLong();
        assertTrue(id > 0, "id must be generated by the database");
        assertNotNull(body.get("createdAt").asText());

        String location = result.getResponse().getHeader("Location");
        assertNotNull(location, "201 must carry a Location header");
        assertTrue(location.endsWith(ISSUES + "/" + id), "Location must point at the new resource: " + location);
    }

    @Test
    @DisplayName("POST with a blank title returns 400 with fieldErrors.title")
    void postBlankTitle_returns400WithFieldError() throws Exception {
        mockMvc.perform(post(ISSUES)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson("   ", "Valid description", "LOW", "LOW")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.title").value("title must not be blank"));

        assertTrue(issueRepository.count() == 0, "no row may be persisted on validation failure");
    }

    @Test
    @DisplayName("POST with an unknown severity enum returns 400 'Malformed request body'")
    void postInvalidSeverityEnum_returns400MalformedBody() throws Exception {
        mockMvc.perform(post(ISSUES)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson("Bad enum", "Valid description", "BOGUS", "LOW")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    @DisplayName("POST with a 201-character title returns 400 (max 200)")
    void postTooLongTitle_returns400() throws Exception {
        mockMvc.perform(post(ISSUES)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson("x".repeat(201), "Valid description", "LOW", "LOW")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.title")
                        .value("title must be at most 200 characters"));
    }

    // --------------------------------------------------------------------- GET

    @Test
    @DisplayName("GET the list returns 200 with a JSON array")
    void list_returns200WithArray() throws Exception {
        mockMvc.perform(get(ISSUES))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        persist("First", Status.OPEN, Severity.LOW, Priority.LOW);
        persist("Second", Status.OPEN, Severity.HIGH, Priority.HIGH);

        mockMvc.perform(get(ISSUES))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").isNumber());
    }

    @Test
    @DisplayName("GET ?status=OPEN returns only OPEN issues")
    void listFiltersByStatus() throws Exception {
        persist("Open one", Status.OPEN, Severity.LOW, Priority.LOW);
        persist("Closed one", Status.CLOSED, Severity.LOW, Priority.LOW);
        persist("Another open", Status.OPEN, Severity.CRITICAL, Priority.URGENT);

        mockMvc.perform(get(ISSUES).param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.status != 'OPEN')]").doesNotExist());

        mockMvc.perform(get(ISSUES).param("status", "CLOSED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Closed one"));
    }

    @Test
    @DisplayName("GET with status + priority + severity combines the three filters with AND")
    void listCombinesStatusPriorityAndSeverityFilters() throws Exception {
        persist("Match", Status.OPEN, Severity.CRITICAL, Priority.URGENT);
        persist("Wrong priority", Status.OPEN, Severity.CRITICAL, Priority.LOW);
        persist("Wrong severity", Status.OPEN, Severity.LOW, Priority.URGENT);
        persist("Wrong status", Status.CLOSED, Severity.CRITICAL, Priority.URGENT);

        mockMvc.perform(get(ISSUES)
                        .param("status", "OPEN")
                        .param("priority", "URGENT")
                        .param("severity", "CRITICAL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Match"));
    }

    @Test
    @DisplayName("GET with an invalid enum query parameter returns 400")
    void listWithInvalidEnumFilter_returns400() throws Exception {
        mockMvc.perform(get(ISSUES).param("status", "BOGUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Invalid value for parameter 'status'"));
    }

    @Test
    @DisplayName("GET by id returns 200 with the issue body")
    void getById_returns200() throws Exception {
        long id = createViaApi("Detail me", Severity.MEDIUM, Priority.MEDIUM);

        mockMvc.perform(get(ISSUES + "/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.title").value("Detail me"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @DisplayName("GET of a missing id returns 404 with a clean body (no stack trace)")
    void getByIdMissing_returns404WithCleanBody() throws Exception {
        MvcResult result = mockMvc.perform(get(ISSUES + "/" + MISSING_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andReturn();

        String body = bodyOf(result);
        assertTrue(body.contains("Issue " + MISSING_ID + " not found"), "body: " + body);
        assertFalse(body.contains("Exception"), "body must not leak exception names: " + body);
        assertFalse(body.contains("stackTrace"), "body must not contain a stack trace: " + body);
        assertFalse(body.contains("at com.bugtrack"), "body must not contain stack frames: " + body);
        assertFalse(body.contains("trace"), "body must not contain a trace field: " + body);
    }

    // --------------------------------------------------------------------- PUT

    @Test
    @DisplayName("PUT updates the fields, preserves the status and refreshes updatedAt")
    void putValid_returns200KeepsStatusAndTouchesUpdatedAt() throws Exception {
        long id = createViaApi("Original title", Severity.LOW, Priority.LOW);
        mockMvc.perform(patch(ISSUES + "/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk());

        MvcResult before = mockMvc.perform(get(ISSUES + "/" + id))
                .andExpect(status().isOk())
                .andReturn();
        String createdAtBefore = readTree(before).get("createdAt").asText();
        String updatedAtBefore = readTree(before).get("updatedAt").asText();

        MvcResult result = mockMvc.perform(put(ISSUES + "/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueJson("Renamed title", "New description", "CRITICAL", "HIGH")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Renamed title"))
                .andExpect(jsonPath("$.description").value("New description"))
                .andExpect(jsonPath("$.severity").value("CRITICAL"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.createdAt").value(createdAtBefore))
                .andReturn();

        String updatedAtAfter = readTree(result).get("updatedAt").asText();
        assertNotEquals(updatedAtBefore, updatedAtAfter,
                "updatedAt must move forward on update");
    }

    @Test
    @DisplayName("PUT of a missing id returns 404")
    void putMissing_returns404() throws Exception {
        mockMvc.perform(put(ISSUES + "/" + MISSING_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    // -------------------------------------------------------------------- PATCH

    @Test
    @DisplayName("PATCH status returns 200 with the new status")
    void patchStatus_returns200WithNewStatus() throws Exception {
        long id = createViaApi("Patch me", Severity.HIGH, Priority.HIGH);

        mockMvc.perform(patch(ISSUES + "/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    @Test
    @DisplayName("PATCH status on a missing id returns 404")
    void patchStatusMissing_returns404() throws Exception {
        mockMvc.perform(patch(ISSUES + "/" + MISSING_ID + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("PATCH status with a null status returns 400 with fieldErrors.status")
    void patchNullStatus_returns400() throws Exception {
        long id = createViaApi("Null status", Severity.LOW, Priority.LOW);

        mockMvc.perform(patch(ISSUES + "/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.status").value("status must not be null"));
    }

    // ------------------------------------------------------------------- DELETE

    @Test
    @DisplayName("DELETE returns 204 and a subsequent GET returns 404")
    void deleteThenGet_returns204Then404() throws Exception {
        long id = createViaApi("Delete me", Severity.MEDIUM, Priority.MEDIUM);

        mockMvc.perform(delete(ISSUES + "/" + id))
                .andExpect(status().isNoContent())
                .andExpect(jsonPath("$").doesNotExist());

        mockMvc.perform(get(ISSUES + "/" + id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        assertTrue(issueRepository.count() == 0, "the row must be gone from the database");
    }

    @Test
    @DisplayName("DELETE of a missing id returns 404")
    void deleteMissing_returns404() throws Exception {
        mockMvc.perform(delete(ISSUES + "/" + MISSING_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    // --------------------------------------------------------------- persistence

    @Test
    @DisplayName("An issue saved through the repository is readable through GET (real DB round trip)")
    void repositorySaveIsVisibleThroughTheApi() throws Exception {
        Issue saved = persist("Repository round trip", Status.CLOSED, Severity.LOW, Priority.LOW);

        mockMvc.perform(get(ISSUES + "/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(saved.getId()))
                .andExpect(jsonPath("$.title").value("Repository round trip"))
                .andExpect(jsonPath("$.status").value("CLOSED"));

        List<Issue> rows = issueRepository.findAll();
        assertTrue(rows.stream().anyMatch(i -> i.getTitle().equals("Repository round trip")),
                "the row must physically exist in PostgreSQL");
    }

    // ------------------------------------------------------------------- health

    @Test
    @DisplayName("GET /api/health returns 200 with status UP")
    void health_returns200Up() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    // ------------------------------------------------------- HTTP verb / media

    @Test
    @DisplayName("DELETE on the collection route returns 405, not 500")
    void deleteCollection_returns405() throws Exception {
        mockMvc.perform(delete(ISSUES))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
    }

    @Test
    @DisplayName("POST with a non-JSON Content-Type returns 415")
    void postWrongContentType_returns415() throws Exception {
        mockMvc.perform(post(ISSUES)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("title=whatever"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415));
    }
}
