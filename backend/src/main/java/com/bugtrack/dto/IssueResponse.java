package com.bugtrack.dto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import com.bugtrack.entity.Issue;
import com.bugtrack.entity.Priority;
import com.bugtrack.entity.Severity;
import com.bugtrack.entity.Status;

/**
 * Response payload for an issue. Timestamps are rendered as ISO-8601 strings in UTC.
 *
 * <p>The entity is never exposed directly; this DTO is the public contract.</p>
 */
public class IssueResponse {

    private final Long id;
    private final String title;
    private final String description;
    private final Severity severity;
    private final Priority priority;
    private final Status status;
    private final String createdAt;
    private final String updatedAt;

    public IssueResponse(Long id, String title, String description, Severity severity,
                         Priority priority, Status status, String createdAt, String updatedAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.severity = severity;
        this.priority = priority;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static IssueResponse from(Issue issue) {
        return new IssueResponse(
                issue.getId(),
                issue.getTitle(),
                issue.getDescription(),
                issue.getSeverity(),
                issue.getPriority(),
                issue.getStatus(),
                toUtcIso(issue.getCreatedAt()),
                toUtcIso(issue.getUpdatedAt()));
    }

    private static String toUtcIso(OffsetDateTime dateTime) {
        if (dateTime == null) {
            return null;
        }
        return dateTime.withOffsetSameInstant(ZoneOffset.UTC)
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Severity getSeverity() {
        return severity;
    }

    public Priority getPriority() {
        return priority;
    }

    public Status getStatus() {
        return status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }
}
