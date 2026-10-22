package com.bugtrack.service;

import java.util.List;

import com.bugtrack.dto.IssueRequest;
import com.bugtrack.entity.Issue;
import com.bugtrack.entity.Priority;
import com.bugtrack.entity.Severity;
import com.bugtrack.entity.Status;
import com.bugtrack.exception.ResourceNotFoundException;
import com.bugtrack.repository.IssueRepository;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for issues: layer between {@link com.bugtrack.controller.IssueController}
 * and {@link IssueRepository}.
 */
@Service
public class IssueService {

    private final IssueRepository issueRepository;

    public IssueService(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    /** Creates an issue; its status is always forced to OPEN. */
    @Transactional
    public Issue create(IssueRequest request) {
        Issue issue = new Issue(
                request.getTitle().trim(),
                request.getDescription(),
                request.getSeverity(),
                request.getPriority());
        return issueRepository.save(issue);
    }

    @Transactional(readOnly = true)
    public Issue getById(Long id) {
        return issueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Issue " + id + " not found"));
    }

    /**
     * Lists issues with optional filters. All provided filters are combined with AND.
     */
    @Transactional(readOnly = true)
    public List<Issue> list(Status status, Priority priority, Severity severity) {
        Specification<Issue> spec = (root, query, cb) -> cb.conjunction();
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (priority != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("priority"), priority));
        }
        if (severity != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("severity"), severity));
        }
        return issueRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "id"));
    }

    /** Updates title/description/severity/priority only; status is untouched. */
    @Transactional
    public Issue update(Long id, IssueRequest request) {
        Issue issue = getById(id);
        issue.setTitle(request.getTitle().trim());
        issue.setDescription(request.getDescription());
        issue.setSeverity(request.getSeverity());
        issue.setPriority(request.getPriority());
        return issueRepository.save(issue);
    }

    @Transactional
    public Issue changeStatus(Long id, Status status) {
        Issue issue = getById(id);
        issue.setStatus(status);
        return issueRepository.save(issue);
    }

    /**
     * Deletes an issue. Throws {@link ResourceNotFoundException} when the id does
     * not exist, so the controller surfaces 404 instead of a silent success.
     */
    @Transactional
    public void delete(Long id) {
        Issue issue = getById(id);
        issueRepository.delete(issue);
    }
}
