package com.debtulator.backend.exceptions;

public class InvalidSyncRequestException extends RuntimeException {

    public InvalidSyncRequestException(String message) {
        super(message);
    }
}
