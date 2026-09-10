package com.debtulator.backend.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "sync_metadata", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SyncMetadata {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id;

    @Column(name = "retained_from_sequence", nullable = false)
    private long retainedFromSequence;
}
