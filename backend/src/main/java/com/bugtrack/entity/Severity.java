package com.bugtrack.entity;

/**
 * Issue severity. Stored as TEXT in the database, guarded by a CHECK constraint
 * in database/schema.sql.
 */
public enum Severity {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}
