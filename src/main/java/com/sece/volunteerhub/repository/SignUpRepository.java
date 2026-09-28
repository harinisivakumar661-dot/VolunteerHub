package com.sece.volunteerhub.repository;

import com.sece.volunteerhub.entity.SignUp;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SignUpRepository extends JpaRepository<SignUp, Integer> {

    long countByEventEventIdAndStatus(Integer eventId, String status);
}
