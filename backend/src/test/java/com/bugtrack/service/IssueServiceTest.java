package com.bugtrack.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.bugtrack.dto.IssueRequest;
import com.bugtrack.entity.Issue;
import com.bugtrack.entity.Priority;
import com.bugtrack.entity.Severity;
import com.bugtrack.entity.Status;
import com.bugtrack.exception.ResourceNotFoundException;
import com.bugtrack.repository.IssueRepository;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import jakarta.validation.ConstraintViolation;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

/**
 * Pure unit tests for {@link IssueService}: no Spring context, no database.
 *
 * <p>Bean Validation is exercised through a standalone
 * {@link LocalValidatorFactoryBean}, because the rules live as annotations on the DTOs.
 * The {@link Specification} built by {@link IssueService#list} is exercised by invoking
 * {@code toPredicate} against mocked JPA criteria objects, so the filter logic is
 * verified without booting a persistence layer.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("IssueService unit tests")
class IssueServiceTest {

    /** Shared Bean Validation instance: the rules live on the DTOs, not in the service. */
    private static jakarta.validation.Validator dtoValidator;

    @Mock
    private IssueRepository issueRepository;

    @InjectMocks
    private IssueService issueService;

    @BeforeAll
    static void initValidator() throws Exception {
        LocalValidatorFactoryBean factory = new LocalValidatorFactoryBean();
        factory.afterPropertiesSet();
        dtoValidator = factory;
    }

    // ------------------------------------------------------------------ helpers

    private static IssueRequest request(String title, String description,
                                        Severity severity, Priority priority) {
        IssueRequest request = new IssueRequest();
        request.setTitle(title);
        request.setDescription(description);
        request.setSeverity(severity);
        request.setPriority(priority);
        return request;
    }

    private static IssueRequest validRequest() {
        return request("  Login button does nothing  ", "Click has no effect",
                Severity.HIGH, Priority.URGENT);
    }

    private static Issue persistedIssue(Status status) {
        Issue issue = new Issue("Existing issue", "Some description", Severity.MEDIUM, Priority.LOW);
        issue.setStatus(status);
        return issue;
    }

    private static ArgumentCaptor<Object> objectCaptor() {
        return ArgumentCaptor.forClass(Object.class);
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<Specification<Issue>> specificationCaptor() {
        return ArgumentCaptor.forClass(Specification.class);
    }

    /** Root mock whose {@code get(String)} answers with a Path, as Hibernate would. */
    @SuppressWarnings("unchecked")
    private static Root<Issue> stubbedRoot() {
        Root<Issue> root = mock(Root.class);
        Path<Object> path = mock(Path.class);
        when(root.get(anyString())).thenReturn(path);
        return root;
    }

    /** Root mock with no stubbing — used for the unfiltered path. */
    @SuppressWarnings("unchecked")
    private static Root<Issue> plainRoot() {
        return mock(Root.class);
    }

    private static CriteriaBuilder criteriaBuilder() {
        return mock(CriteriaBuilder.class);
    }

    @SuppressWarnings("unchecked")
    private static CriteriaQuery<Issue> criteriaQuery() {
        return mock(CriteriaQuery.class);
    }

    private Specification<Issue> capturedSpecification() {
        ArgumentCaptor<Specification<Issue>> captor = specificationCaptor();
        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        verify(issueRepository).findAll(captor.capture(), sortCaptor.capture());
        assertNotNull(captor.getValue());
        assertEquals(Sort.by(Sort.Direction.DESC, "id"), sortCaptor.getValue());
        return captor.getValue();
    }

    // ------------------------------------------------------------------- create

    @Test
    @DisplayName("create maps the DTO, trims the title and forces status OPEN")
    void create_mapsDtoForcesOpenStatusAndDelegatesSave() {
        when(issueRepository.save(any(Issue.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Issue created = issueService.create(validRequest());

        ArgumentCaptor<Issue> captor = ArgumentCaptor.forClass(Issue.class);
        verify(issueRepository, times(1)).save(captor.capture());

        Issue saved = captor.getValue();
        assertSame(saved, created, "service must return whatever the repository saved");
        assertEquals("Login button does nothing", saved.getTitle(), "title must be trimmed");
        assertEquals("Click has no effect", saved.getDescription());
        assertEquals(Severity.HIGH, saved.getSeverity());
        assertEquals(Priority.URGENT, saved.getPriority());
        assertEquals(Status.OPEN, created.getStatus(), "every new issue starts OPEN");
    }

    @Test
    @DisplayName("a valid DTO produces zero Bean Validation violations")
    void validDto_hasNoValidationViolations() {
        Set<ConstraintViolation<IssueRequest>> violations = dtoValidator.validate(validRequest());

        assertTrue(violations.isEmpty(), () -> "unexpected violations: " + violations);
    }

    @Test
    @DisplayName("blank title violates @NotBlank on the DTO")
    void blankTitle_isRejectedByValidation() {
        IssueRequest request = request("   ", "Description", Severity.LOW, Priority.LOW);

        Set<ConstraintViolation<IssueRequest>> violations = dtoValidator.validate(request);

        assertEquals(1, violations.size(), () -> "unexpected violations: " + violations);
        ConstraintViolation<IssueRequest> violation = violations.iterator().next();
        assertEquals("title", violation.getPropertyPath().toString());
        assertEquals("title must not be blank", violation.getMessage());
    }

    @Test
    @DisplayName("title of 201 characters violates @Size(max = 200)")
    void titleOver200Chars_isRejectedByValidation() {
        IssueRequest request = request("x".repeat(201), "Description", Severity.LOW, Priority.LOW);

        Set<ConstraintViolation<IssueRequest>> violations = dtoValidator.validate(request);

        assertEquals(1, violations.size(), () -> "unexpected violations: " + violations);
        ConstraintViolation<IssueRequest> violation = violations.iterator().next();
        assertEquals("title", violation.getPropertyPath().toString());
        assertEquals("title must be at most 200 characters", violation.getMessage());
    }

    @Test
    @DisplayName("missing severity and priority are rejected with per-field messages")
    void missingSeverityAndPriority_areRejectedByValidation() {
        IssueRequest request = request("Valid title", "Valid description", null, null);

        Set<ConstraintViolation<IssueRequest>> violations = dtoValidator.validate(request);

        assertEquals(2, violations.size(), () -> "unexpected violations: " + violations);
        assertTrue(violations.stream().anyMatch(v ->
                v.getPropertyPath().toString().equals("severity")
                        && v.getMessage().equals("severity must not be null")));
        assertTrue(violations.stream().anyMatch(v ->
                v.getPropertyPath().toString().equals("priority")
                        && v.getMessage().equals("priority must not be null")));
    }

    // ------------------------------------------------------------------ getById

    @Test
    @DisplayName("getById returns the issue when it exists")
    void getById_found_returnsIssue() {
        Issue existing = persistedIssue(Status.OPEN);
        when(issueRepository.findById(1L)).thenReturn(Optional.of(existing));

        Issue result = issueService.getById(1L);

        assertSame(existing, result);
        verify(issueRepository).findById(1L);
    }

    @Test
    @DisplayName("getById throws ResourceNotFoundException when the id does not exist")
    void getById_missing_throwsNotFound() {
        when(issueRepository.findById(404L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception =
                assertThrows(ResourceNotFoundException.class, () -> issueService.getById(404L));

        assertEquals("Issue 404 not found", exception.getMessage());
    }

    // ------------------------------------------------------------------- update

    @Test
    @DisplayName("update applies every field and leaves the status untouched")
    void update_found_appliesFieldsAndKeepsStatus() {
        Issue existing = persistedIssue(Status.CLOSED);
        when(issueRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(issueRepository.save(any(Issue.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Issue updated = issueService.update(7L,
                request("Renamed", "New description", Severity.CRITICAL, Priority.HIGH));

        verify(issueRepository).save(same(existing));
        assertEquals("Renamed", updated.getTitle());
        assertEquals("New description", updated.getDescription());
        assertEquals(Severity.CRITICAL, updated.getSeverity());
        assertEquals(Priority.HIGH, updated.getPriority());
        assertEquals(Status.CLOSED, updated.getStatus(), "update must never change the status");
    }

    @Test
    @DisplayName("update of a missing id throws ResourceNotFoundException and saves nothing")
    void update_missing_throwsNotFound() {
        when(issueRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> issueService.update(404L, validRequest()));

        verify(issueRepository, never()).save(any(Issue.class));
    }

    // -------------------------------------------------------------- changeStatus

    @Test
    @DisplayName("changeStatus persists the new status")
    void changeStatus_found_changesStatus() {
        Issue existing = persistedIssue(Status.OPEN);
        when(issueRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(issueRepository.save(any(Issue.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Issue updated = issueService.changeStatus(3L, Status.IN_PROGRESS);

        verify(issueRepository).save(same(existing));
        assertEquals(Status.IN_PROGRESS, updated.getStatus());
    }

    @Test
    @DisplayName("changeStatus of a missing id throws ResourceNotFoundException")
    void changeStatus_missing_throwsNotFound() {
        when(issueRepository.findById(404L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> issueService.changeStatus(404L, Status.CLOSED));

        assertEquals("Issue 404 not found", exception.getMessage());
        verify(issueRepository, never()).save(any(Issue.class));
    }

    // -------------------------------------------------------------------- delete

    @Test
    @DisplayName("delete removes an existing issue")
    void delete_found_removesIssue() {
        Issue existing = persistedIssue(Status.OPEN);
        when(issueRepository.findById(5L)).thenReturn(Optional.of(existing));

        issueService.delete(5L);

        verify(issueRepository).delete(same(existing));
        verify(issueRepository, never()).deleteById(any(Long.class));
    }

    @Test
    @DisplayName("delete of a missing id throws ResourceNotFoundException and deletes nothing")
    void delete_missing_throwsNotFound() {
        when(issueRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> issueService.delete(404L));

        verify(issueRepository, never()).delete(any(Issue.class));
        verify(issueRepository, never()).deleteById(any(Long.class));
    }

    // ---------------------------------------------------------------------- list

    @Test
    @DisplayName("list without filters builds a plain conjunction and sorts by id DESC")
    void list_withoutFilters_buildsConjunctionAndSortsByIdDesc() {
        List<Issue> expected = List.of(persistedIssue(Status.OPEN), persistedIssue(Status.CLOSED));
        when(issueRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(expected);

        List<Issue> result = issueService.list(null, null, null);

        assertSame(expected, result);
        Specification<Issue> spec = capturedSpecification();

        Root<Issue> root = plainRoot();
        CriteriaBuilder cb = criteriaBuilder();
        spec.toPredicate(root, criteriaQuery(), cb);

        verify(cb).conjunction();
        verify(root, never()).get(anyString());
        verify(cb, never()).equal(any(Expression.class), any(Object.class));
    }

    @Test
    @DisplayName("list with only a status filter compares root.status against that value")
    void list_withStatusFilter_buildsEqualPredicateOnStatus() {
        when(issueRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(persistedIssue(Status.OPEN)));

        issueService.list(Status.OPEN, null, null);

        Specification<Issue> spec = capturedSpecification();
        Root<Issue> root = stubbedRoot();
        CriteriaBuilder cb = criteriaBuilder();
        spec.toPredicate(root, criteriaQuery(), cb);

        verify(root).get("status");
        verify(root, never()).get("priority");
        verify(root, never()).get("severity");

        ArgumentCaptor<Object> values = objectCaptor();
        verify(cb, times(1)).equal(any(Expression.class), values.capture());
        assertEquals(Status.OPEN, values.getValue());
    }

    @Test
    @DisplayName("list with status + priority + severity combines three equal predicates")
    void list_withAllFilters_combinesThreeEqualPredicates() {
        when(issueRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        issueService.list(Status.OPEN, Priority.URGENT, Severity.CRITICAL);

        Specification<Issue> spec = capturedSpecification();
        Root<Issue> root = stubbedRoot();
        CriteriaBuilder cb = criteriaBuilder();
        spec.toPredicate(root, criteriaQuery(), cb);

        verify(root).get("status");
        verify(root).get("priority");
        verify(root).get("severity");
        verify(root, never()).get("createdAt");

        ArgumentCaptor<Object> values = objectCaptor();
        verify(cb, times(3)).equal(any(Expression.class), values.capture());
        assertTrue(values.getAllValues().contains(Status.OPEN));
        assertTrue(values.getAllValues().contains(Priority.URGENT));
        assertTrue(values.getAllValues().contains(Severity.CRITICAL));
    }

    @Test
    @DisplayName("a status-only filter never touches priority or severity")
    void list_withStatusFilterOnly_ignoresOtherCriteria() {
        when(issueRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        issueService.list(Status.CLOSED, null, null);

        Specification<Issue> spec = capturedSpecification();
        Root<Issue> root = stubbedRoot();
        CriteriaBuilder cb = criteriaBuilder();
        spec.toPredicate(root, criteriaQuery(), cb);

        verify(root).get("status");
        verify(root, never()).get("priority");
        verify(root, never()).get("severity");

        ArgumentCaptor<Object> values = objectCaptor();
        verify(cb, times(1)).equal(any(Expression.class), values.capture());
        assertEquals(Status.CLOSED, values.getValue());
    }
}
