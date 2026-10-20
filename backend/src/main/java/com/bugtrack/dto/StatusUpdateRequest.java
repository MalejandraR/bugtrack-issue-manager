package com.bugtrack.dto;

import com.bugtrack.entity.Status;

import jakarta.validation.constraints.NotNull;

/**
 * Payload for changing the status of an existing issue (PATCH /api/issues/{id}/status).
 */
public class StatusUpdateRequest {

    @NotNull(message = "status must not be null")
    private Status status;

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }
}
