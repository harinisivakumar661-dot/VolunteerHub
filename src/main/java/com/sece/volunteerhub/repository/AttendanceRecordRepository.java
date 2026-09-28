package com.sece.volunteerhub.repository;

import com.sece.volunteerhub.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Integer> {

    boolean existsBySignUpSignupId(Integer signupId);
}
