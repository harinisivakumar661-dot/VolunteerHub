package com.sece.volunteerhub.controller;

import com.sece.volunteerhub.entity.AttendanceRecord;
import com.sece.volunteerhub.entity.SignUp;
import com.sece.volunteerhub.repository.AttendanceRecordRepository;
import com.sece.volunteerhub.repository.SignUpRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final SignUpRepository signUpRepository;

    public AttendanceController(
            AttendanceRecordRepository attendanceRecordRepository,
            SignUpRepository signUpRepository) {

        this.attendanceRecordRepository = attendanceRecordRepository;
        this.signUpRepository = signUpRepository;
    }

    @GetMapping
    public List<AttendanceRecord> getAllAttendance() {
        return attendanceRecordRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AttendanceRecord> getAttendanceById(
            @PathVariable Integer id) {

        return attendanceRecordRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> markAttendance(
            @RequestParam Integer signupId,
            @RequestParam Boolean attended,
            @RequestParam(required = false) Double hoursContributed) {

        SignUp signUp = signUpRepository.findById(signupId)
                .orElse(null);

        if (signUp == null) {
            return ResponseEntity.badRequest()
                    .body("Signup not found");
        }

        if (attendanceRecordRepository
                .existsBySignUpSignupId(signupId)) {

            return ResponseEntity.badRequest()
                    .body("Attendance already recorded for this signup");
        }

        if (attended == null) {
            return ResponseEntity.badRequest()
                    .body("Attendance status is required");
        }

        if (!attended) {

            if (hoursContributed != null && hoursContributed > 0) {
                return ResponseEntity.badRequest()
                        .body("Hours cannot be recorded for absent volunteers");
            }

            hoursContributed = 0.0;
        }

        if (attended) {

            if (hoursContributed == null || hoursContributed <= 0) {
                return ResponseEntity.badRequest()
                        .body("Hours contributed must be greater than 0 for attended volunteers");
            }
        }

        AttendanceRecord attendance = new AttendanceRecord();

        attendance.setSignUp(signUp);
        attendance.setAttended(attended);
        attendance.setHoursContributed(hoursContributed);

        return ResponseEntity.ok(
                attendanceRecordRepository.save(attendance)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAttendance(
            @PathVariable Integer id,
            @RequestParam Boolean attended,
            @RequestParam(required = false) Double hoursContributed) {

        return attendanceRecordRepository.findById(id)
                .map(existingAttendance -> {

                    if (!attended) {

                        existingAttendance.setAttended(false);
                        existingAttendance.setHoursContributed(0.0);

                    } else {

                        if (hoursContributed == null ||
                                hoursContributed <= 0) {

                            throw new IllegalArgumentException(
                                    "Hours contributed must be greater than 0 for attended volunteers"
                            );
                        }

                        existingAttendance.setAttended(true);
                        existingAttendance.setHoursContributed(
                                hoursContributed
                        );
                    }

                    return ResponseEntity.ok(
                            attendanceRecordRepository.save(
                                    existingAttendance
                            )
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttendance(
            @PathVariable Integer id) {

        if (!attendanceRecordRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        attendanceRecordRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}