package com.debtulator.backend.currencies;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CurrencyRepository extends JpaRepository<Currency, String> {

    List<Currency> findAllByEnabledTrueOrderByDisplayOrderAscCodeAsc();
}
