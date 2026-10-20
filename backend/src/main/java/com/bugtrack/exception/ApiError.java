package com.bugtrack.exception;

import java.time.Instant;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Error body returned by {@link GlobalExceptionHandler}.
 *
 * <p>{@code fieldErrors} is omitted when empty. Never contains stack traces or
 * internal details.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {

    private final Instant timestamp;
    private final int status;
    private final String message;
    private final Map<String, String> fieldErrors;

    public ApiError(Instant timestamp, int status, String message, Map<String, String> fieldErrors) {
        this.timestamp = timestamp;
        this.status = status;
        this.message = message;
        this.fieldErrors = fieldErrors;
    }

    public static ApiError of(int status, String message) {
        return new ApiError(Instant.now(), status, message, null);
    }

    public static ApiError withFieldErrors(int status, String message, Map<String, String> fieldErrors) {
        return new ApiError(Instant.now(), status, message, fieldErrors);
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public int getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}
