package com.bugtrack.entity;

/**
 * Issue lifecycle status. Stored as TEXT in the database, guarded by a CHECK
 * constraint in database/schema.sql. Every new issue starts as OPEN.
 */
public enum Status {
    OPEN,
    IN_PROGRESS,
    CLOSED
}
