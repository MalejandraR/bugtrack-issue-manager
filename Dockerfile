# Multi-stage build: compile with Maven, run with a slim JRE.
# Build context is the REPO ROOT (dockerContext: .) so database/ is available.
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY backend/pom.xml backend/pom.xml
# Warm the dependency cache so source-only changes rebuild fast.
RUN mvn -B -q -f backend/pom.xml dependency:go-offline
COPY backend/src backend/src
COPY database database
RUN mvn -B -q -f backend/pom.xml -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app
# schema.sql is copied in and referenced via env var; ddl-auto is "validate",
# and sql.init applies it idempotently (CREATE TABLE IF NOT EXISTS).
COPY --from=build /build/database/schema.sql /app/database/schema.sql
ENV BUGTRACK_SCHEMA_LOCATION=file:/app/database/schema.sql
COPY --from=build /build/backend/target/*.jar /app/app.jar
# Render injects $PORT (default 10000); application.yml honors it.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
