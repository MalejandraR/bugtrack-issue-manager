package com.bugtrack.entity;

/**
 * Issue priority. Stored as TEXT in the database, guarded by a CHECK constraint
 * in database/schema.sql.
 */
public enum Priority {
    LOW,
    MEDIUM,
    HIGH,
    URGENT
}
