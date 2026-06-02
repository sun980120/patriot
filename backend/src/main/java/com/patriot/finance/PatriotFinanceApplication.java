package com.patriot.finance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class PatriotFinanceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PatriotFinanceApplication.class, args);
    }
}
