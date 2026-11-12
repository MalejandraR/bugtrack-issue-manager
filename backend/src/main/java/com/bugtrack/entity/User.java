package com.bugtrack.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.CreationTimestamp;

/**
 * An application user (Fase 7). Registration is closed: rows are created only by
 * the startup seed ({@code AdminUserSeeder}), never by a public endpoint.
 *
 * <p>Column names are snake_case to match {@code database/schema.sql}, which is the
 * single source of truth for the schema. {@code passwordHash} is a BCrypt hash —
 * the plain password never reaches the database.</p>
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** Stored as given; lookups use findByEmailIgnoreCase (unique index on lower(email)). */
    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected User() {
        // Required by JPA.
    }

    public User(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
