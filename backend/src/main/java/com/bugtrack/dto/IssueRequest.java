package com.bugtrack.dto;

import com.bugtrack.entity.Priority;
import com.bugtrack.entity.Severity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Payload for creating and updating an issue.
 *
 * <p>{@code status} is intentionally absent: every issue starts as OPEN and its
 * lifecycle is changed only through the dedicated status endpoint.</p>
 */
public class IssueRequest {

    @NotBlank(message = "title must not be blank")
    @Size(max = 200, message = "title must be at most 200 characters")
    private String title;

    @NotBlank(message = "description must not be blank")
    @Size(max = 5000, message = "description must be at most 5000 characters")
    private String description;

    @NotNull(message = "severity must not be null")
    private Severity severity;

    @NotNull(message = "priority must not be null")
    private Priority priority;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Severity getSeverity() {
        return severity;
    }

    public void setSeverity(Severity severity) {
        this.severity = severity;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }
}
