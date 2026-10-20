package com.bugtrack.repository;

import com.bugtrack.entity.Issue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Persistence access to the {@code issues} table.
 *
 * <p>{@link JpaSpecificationExecutor} enables combined (AND) filters on
 * status/priority/severity built with JPA Specifications.</p>
 */
public interface IssueRepository extends JpaRepository<Issue, Long>, JpaSpecificationExecutor<Issue> {
}
