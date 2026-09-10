package com.debtulator.backend.sync.dto;

import java.util.List;

public record BootstrapStartResponse(
        String cursor,
        List<String> entityTypes
) {
}
