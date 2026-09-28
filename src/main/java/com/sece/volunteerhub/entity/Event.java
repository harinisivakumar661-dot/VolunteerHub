package com.sece.volunteerhub.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

@Entity
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer eventId;

    @NotBlank(message = "Event name is required")
    private String eventName;

    @NotBlank(message = "Location is required")
    private String location;

    private LocalDate eventDate;

    @Min(value = 1, message = "Volunteer capacity must be at least 1")
    private Integer volunteerCapacity;

    public Event() {
    }

    public Event(Integer eventId, String eventName, String location,
                 LocalDate eventDate, Integer volunteerCapacity) {
        this.eventId = eventId;
        this.eventName = eventName;
        this.location = location;
        this.eventDate = eventDate;
        this.volunteerCapacity = volunteerCapacity;
    }

    public Integer getEventId() {
        return eventId;
    }

    public void setEventId(Integer eventId) {
        this.eventId = eventId;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public Integer getVolunteerCapacity() {
        return volunteerCapacity;
    }

    public void setVolunteerCapacity(Integer volunteerCapacity) {
        this.volunteerCapacity = volunteerCapacity;
    }
}