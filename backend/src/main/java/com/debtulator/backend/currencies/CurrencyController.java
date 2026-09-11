package com.debtulator.backend.currencies;

import com.debtulator.backend.currencies.dto.CurrencyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/currencies")
@RequiredArgsConstructor
public class CurrencyController {

    private final CurrencyService currencyService;
    private final CurrencyMapper currencyMapper;

    @GetMapping
    public ResponseEntity<List<CurrencyResponse>> getCurrencies() {
        List<CurrencyResponse> currencies = currencyService
                .getEnabledCurrencies()
                .stream()
                .map(currencyMapper::toResponse)
                .toList();

        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noCache())
                .body(currencies);
    }
}
