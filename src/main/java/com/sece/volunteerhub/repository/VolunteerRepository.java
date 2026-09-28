package com.sece.volunteerhub.repository;

import com.sece.volunteerhub.entity.Volunteer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VolunteerRepository extends JpaRepository<Volunteer, Integer> {
}
