package com.stego.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.time.ZoneId;
import java.util.TimeZone;

@SpringBootApplication
public class StegoApplication {

    static final String DEFAULT_TIMEZONE = "Asia/Kolkata";

    public static void main(String[] args) {
        // Opening hours, peak hours and order timestamps are all local wall-clock times. Hosts such as Render run
        // on UTC, where 10:00-22:00 opening hours were checked against UTC and stored times were shown 5.5 hours
        // off in the browser, so the app pins one time zone (override with APP_TIMEZONE).
        TimeZone.setDefault(TimeZone.getTimeZone(resolveZone(System.getenv("APP_TIMEZONE"))));
        SpringApplication.run(StegoApplication.class, args);
    }

    static ZoneId resolveZone(String configured) {
        return ZoneId.of(configured == null || configured.isBlank() ? DEFAULT_TIMEZONE : configured.trim());
    }
}
