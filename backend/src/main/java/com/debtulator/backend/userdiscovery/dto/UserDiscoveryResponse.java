package com.debtulator.backend.userdiscovery.dto;
import java.util.UUID;
public record UserDiscoveryResponse(UUID id, String name, String detail) {}
