package com.stego.backend.repository;

import com.stego.backend.entity.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    Optional<VerificationCode> findTopByEmailAndTypeOrderByCreatedAtDesc(String email, String type);
    // derived deletes load and remove rows, which needs a transaction; without one every
    // login after the first failed once an old code existed for the user
    @Transactional
    void deleteByEmailAndType(String email, String type);
    long countByEmailAndCreatedAtAfter(String email, LocalDateTime since);
}
