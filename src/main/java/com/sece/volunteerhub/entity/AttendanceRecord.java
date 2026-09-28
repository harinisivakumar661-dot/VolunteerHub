package com.sece.volunteerhub.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.validation.constraints.Min;

@Entity
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer attendanceId;

    @OneToOne
    @JoinColumn(name = "signup_id", nullable = false, unique = true)
    private SignUp signUp;

    private Boolean attended;

    @Min(value = 0, message = "Hours cannot be negative")
    private Double hoursContributed;

    public AttendanceRecord() {
    }

    public AttendanceRecord(Integer attendanceId, SignUp signUp,
                            Boolean attended, Double hoursContributed) {
        this.attendanceId = attendanceId;
        this.signUp = signUp;
        this.attended = attended;
        this.hoursContributed = hoursContributed;
    }

    public Integer getAttendanceId() {
        return attendanceId;
    }

    public void setAttendanceId(Integer attendanceId) {
        this.attendanceId = attendanceId;
    }

    public SignUp getSignUp() {
        return signUp;
    }

    public void setSignUp(SignUp signUp) {
        this.signUp = signUp;
    }

    public Boolean getAttended() {
        return attended;
    }

    public void setAttended(Boolean attended) {
        this.attended = attended;
    }

    public Double getHoursContributed() {
        return hoursContributed;
    }

    public void setHoursContributed(Double hoursContributed) {
        this.hoursContributed = hoursContributed;
    }
}