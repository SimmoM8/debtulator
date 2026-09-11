package com.debtulator.backend.currencies;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import org.joda.money.CurrencyUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class CurrencyServiceIntegrationTest {

    @Autowired
    private CurrencyService currencyService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update(
                "update public.currencies set enabled = true"
        );
    }

    @Test
    void returnsEnabledCurrenciesInConfiguredDisplayOrder() {
        List<Currency> currencies = currencyService.getEnabledCurrencies();

        assertThat(currencies)
                .extracting(Currency::getCode)
                .containsExactly(
                        "AUD",
                        "EUR",
                        "GBP",
                        "SEK",
                        "USD"
                );
    }

    @Test
    void normalizesCurrencyCodes() {
        Currency currency = currencyService.requireEnabled(" sek ");

        assertThat(currency.getCode()).isEqualTo("SEK");
    }

    @Test
    void rejectsDisabledCurrencyForNewOperations() {
        jdbcTemplate.update(
                "update public.currencies set enabled = false where code = 'USD'"
        );

        assertThatThrownBy(() ->
                currencyService.requireEnabled("USD")
        )
                .isInstanceOfSatisfying(
                        CurrencyServiceException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        CurrencyServiceException.Reason.DISABLED
                                )
                );

        Currency historicalCurrency = currencyService.require("USD");
        assertThat(historicalCurrency.getCode()).isEqualTo("USD");
        assertThat(historicalCurrency.isEnabled()).isFalse();
    }

    @Test
    void configuredCurrenciesAreRecognizedByJodaMoney() {
        for (Currency currency : currencyService.getEnabledCurrencies()) {
            assertThat(CurrencyUnit.of(currency.getCode()).getCode())
                    .isEqualTo(currency.getCode());
        }
    }

    @Test
    void rejectsUnknownCurrency() {
        assertThatThrownBy(() ->
                currencyService.requireEnabled("ZZZ")
        )
                .isInstanceOfSatisfying(
                        CurrencyServiceException.class,
                        exception -> assertThat(exception.getReason())
                                .isEqualTo(
                                        CurrencyServiceException.Reason.NOT_FOUND
                                )
                );
    }
}
