FROM rust:1.93-bookworm AS builder
WORKDIR /app
COPY apps/api/Cargo.toml apps/api/Cargo.lock ./
COPY apps/api/src ./src
COPY apps/api/migrations ./migrations
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 app
COPY --from=builder /app/target/release/daily-sales-log-api /usr/local/bin/daily-sales-log-api
USER 10001:10001
ENV HOST=0.0.0.0 PORT=10000 BUSINESS_TIMEZONE=Africa/Lagos
EXPOSE 10000
ENTRYPOINT ["/usr/local/bin/daily-sales-log-api"]
