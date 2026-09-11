package com.debtulator.backend.currencies;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "currencies", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Currency {

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String symbol;

    @Column(name = "decimal_places", nullable = false)
    private short decimalPlaces;
}

