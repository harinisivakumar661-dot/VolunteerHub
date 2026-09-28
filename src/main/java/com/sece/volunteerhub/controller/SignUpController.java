package com.sece.volunteerhub.controller;

import com.sece.volunteerhub.entity.Event;
import com.sece.volunteerhub.entity.SignUp;
import com.sece.volunteerhub.entity.Volunteer;
import com.sece.volunteerhub.repository.SignUpRepository;
import com.sece.volunteerhub.repository.EventRepository;
import com.sece.volunteerhub.repository.VolunteerRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/signups")
public class SignUpController {

    private final SignUpRepository signUpRepository;
    private final EventRepository eventRepository;
    private final VolunteerRepository volunteerRepository;

    public SignUpController(
            SignUpRepository signUpRepository,
            EventRepository eventRepository,
            VolunteerRepository volunteerRepository) {

        this.signUpRepository = signUpRepository;
        this.eventRepository = eventRepository;
        this.volunteerRepository = volunteerRepository;
    }

    @GetMapping
    public List<SignUp> getAllSignUps() {
        return signUpRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SignUp> getSignUpById(
            @PathVariable Integer id) {

        return signUpRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createSignUp(
            @RequestParam Integer eventId,
            @RequestParam Integer volunteerId) {

        Event event = eventRepository.findById(eventId)
                .orElse(null);

        if (event == null) {
            return ResponseEntity.badRequest()
                    .body("Event not found");
        }

        Volunteer volunteer = volunteerRepository.findById(volunteerId)
                .orElse(null);

        if (volunteer == null) {
            return ResponseEntity.badRequest()
                    .body("Volunteer not found");
        }

        long currentSignups =
                signUpRepository.countByEventEventIdAndStatus(
                        eventId,
                        "REGISTERED"
                );

        if (currentSignups >= event.getVolunteerCapacity()) {
            return ResponseEntity.badRequest()
                    .body("Event capacity is full. Signup rejected.");
        }

        SignUp signUp = new SignUp();

        signUp.setEvent(event);
        signUp.setVolunteer(volunteer);
        signUp.setSignupDate(LocalDate.now());
        signUp.setStatus("REGISTERED");

        return ResponseEntity.ok(
                signUpRepository.save(signUp)
        );
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelSignUp(
            @PathVariable Integer id) {

        return signUpRepository.findById(id)
                .map(signUp -> {
                    signUp.setStatus("CANCELLED");

                    return ResponseEntity.ok(
                            signUpRepository.save(signUp)
                    );
                })
                .orElse(
                        ResponseEntity.notFound().build()
                );
    }
}