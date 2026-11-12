package com.bugtrack.repository;

import java.util.Optional;

import com.bugtrack.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence access to the {@code users} table.
 *
 * <p>Lookups are case-insensitive on purpose: the seed stores the email as given,
 * logins must not depend on how the user typed the address (the database enforces
 * uniqueness on {@code lower(email)}).</p>
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);
}
