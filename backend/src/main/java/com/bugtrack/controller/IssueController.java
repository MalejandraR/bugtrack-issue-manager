package com.bugtrack.controller;

import java.net.URI;
import java.util.List;

import com.bugtrack.dto.IssueRequest;
import com.bugtrack.dto.IssueResponse;
import com.bugtrack.dto.StatusUpdateRequest;
import com.bugtrack.entity.Priority;
import com.bugtrack.entity.Severity;
import com.bugtrack.entity.Status;
import com.bugtrack.service.IssueService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * REST endpoints for issues.
 *
 * <p>All responses go through DTOs; the entity is never exposed directly.</p>
 */
@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueService issueService;

    public IssueController(IssueService issueService) {
        this.issueService = issueService;
    }

    /** Lists issues, optionally filtered by status, priority and/or severity (AND). */
    @GetMapping
    public List<IssueResponse> list(
            @RequestParam(name = "status", required = false) Status status,
            @RequestParam(name = "priority", required = false) Priority priority,
            @RequestParam(name = "severity", required = false) Severity severity) {
        return issueService.list(status, priority, severity).stream()
                .map(IssueResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public IssueResponse getById(@PathVariable Long id) {
        return IssueResponse.from(issueService.getById(id));
    }

    @PostMapping
    public ResponseEntity<IssueResponse> create(@Valid @RequestBody IssueRequest request) {
        IssueResponse created = IssueResponse.from(issueService.create(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public IssueResponse update(@PathVariable Long id, @Valid @RequestBody IssueRequest request) {
        return IssueResponse.from(issueService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public IssueResponse changeStatus(@PathVariable Long id,
                                      @Valid @RequestBody StatusUpdateRequest request) {
        return IssueResponse.from(issueService.changeStatus(id, request.getStatus()));
    }

    /** Deletes an issue → 204 No Content, or 404 when the id does not exist. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        issueService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
