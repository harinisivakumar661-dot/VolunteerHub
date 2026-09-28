package com.sece.volunteerhub.controller;

import com.sece.volunteerhub.entity.Event;
import com.sece.volunteerhub.repository.EventRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventRepository eventRepository;

    public EventController(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable Integer id) {
        return eventRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Event> createEvent(
            @Valid @RequestBody Event event) {

        return ResponseEntity.ok(eventRepository.save(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(
            @PathVariable Integer id,
            @Valid @RequestBody Event event) {

        return eventRepository.findById(id)
                .map(existingEvent -> {
                    existingEvent.setEventName(event.getEventName());
                    existingEvent.setLocation(event.getLocation());
                    existingEvent.setEventDate(event.getEventDate());
                    existingEvent.setVolunteerCapacity(
                            event.getVolunteerCapacity()
                    );

                    return ResponseEntity.ok(
                            eventRepository.save(existingEvent)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Integer id) {

        if (!eventRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        eventRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}