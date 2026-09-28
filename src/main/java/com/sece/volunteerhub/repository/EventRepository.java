package com.sece.volunteerhub.repository;

import com.sece.volunteerhub.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, Integer> {
}
