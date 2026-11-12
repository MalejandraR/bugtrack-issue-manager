package com.bugtrack.exception;

/**
 * Raised by the login endpoint when email and password do not match any account.
 *
 * <p>The message is always the same for "unknown email" and "wrong password" —
 * generic on purpose, so the response cannot be used to enumerate users.</p>
 */
public class InvalidCredentialsException extends RuntimeException {

    public static final String MESSAGE = "Invalid email or password";

    public InvalidCredentialsException() {
        super(MESSAGE);
    }
}
