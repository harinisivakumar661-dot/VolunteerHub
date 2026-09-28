package com.sece.volunteerhub.controller;

import com.sece.volunteerhub.entity.Volunteer;
import com.sece.volunteerhub.repository.VolunteerRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/volunteers")
public class VolunteerController {

    private final VolunteerRepository volunteerRepository;

    public VolunteerController(VolunteerRepository volunteerRepository) {
        this.volunteerRepository = volunteerRepository;
    }

    @GetMapping
    public List<Volunteer> getAllVolunteers() {
        return volunteerRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Volunteer> getVolunteerById(
            @PathVariable Integer id) {

        return volunteerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Volunteer> createVolunteer(
            @Valid @RequestBody Volunteer volunteer) {

        return ResponseEntity.ok(
                volunteerRepository.save(volunteer)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<Volunteer> updateVolunteer(
            @PathVariable Integer id,
            @Valid @RequestBody Volunteer volunteer) {

        return volunteerRepository.findById(id)
                .map(existingVolunteer -> {

                    existingVolunteer.setName(
                            volunteer.getName()
                    );

                    existingVolunteer.setEmail(
                            volunteer.getEmail()
                    );

                    existingVolunteer.setPhone(
                            volunteer.getPhone()
                    );

                    return ResponseEntity.ok(
                            volunteerRepository.save(existingVolunteer)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVolunteer(
            @PathVariable Integer id) {

        if (!volunteerRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        volunteerRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}