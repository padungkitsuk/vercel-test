# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /src/target/app.jar app.jar
# Generic Docker (Render, Railway, Fly, Cloud Run...). Hosts usually override PORT.
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-XX:TieredStopAtLevel=1", "-jar", "app.jar"]
