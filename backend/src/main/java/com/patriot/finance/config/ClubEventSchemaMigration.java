package com.patriot.finance.config;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class ClubEventSchemaMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try (Connection connection = jdbcTemplate.getDataSource().getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            if (!tableExists(metaData, "club_events")) {
                return;
            }

            String databaseName = metaData.getDatabaseProductName().toLowerCase();
            if (databaseName.contains("postgresql")) {
                migratePostgres();
            }
        }
    }

    private void migratePostgres() {
        jdbcTemplate.execute("alter table club_events add column if not exists start_date date");
        jdbcTemplate.execute("alter table club_events add column if not exists end_date date");
        jdbcTemplate.execute("alter table club_events add column if not exists start_time time");
        jdbcTemplate.execute("alter table club_events add column if not exists end_time time");
        jdbcTemplate.execute("alter table club_events add column if not exists recurrence_type varchar(32)");
        jdbcTemplate.execute("alter table club_events add column if not exists recurrence_until date");
        jdbcTemplate.execute("alter table club_events add column if not exists start_at timestamp");
        jdbcTemplate.execute("alter table club_events add column if not exists end_at timestamp");

        jdbcTemplate.update("""
            update club_events
            set start_date = coalesce(start_date, event_date, cast(start_at as date), current_date)
            where start_date is null
            """);
        jdbcTemplate.update("""
            update club_events
            set end_date = coalesce(end_date, cast(end_at as date), start_date, event_date, current_date)
            where end_date is null
            """);
        jdbcTemplate.update("""
            update club_events
            set start_time = cast(start_at as time)
            where start_time is null and start_at is not null
            """);
        jdbcTemplate.update("""
            update club_events
            set end_time = cast(end_at as time)
            where end_time is null and end_at is not null
            """);
        jdbcTemplate.update("""
            update club_events
            set recurrence_type = 'NONE'
            where recurrence_type is null
            """);
    }

    private boolean tableExists(DatabaseMetaData metaData, String tableName) throws SQLException {
        try (ResultSet resultSet = metaData.getTables(null, null, tableName, new String[] {"TABLE"})) {
            if (resultSet.next()) {
                return true;
            }
        }
        try (ResultSet resultSet = metaData.getTables(null, null, tableName.toUpperCase(), new String[] {"TABLE"})) {
            return resultSet.next();
        }
    }
}
