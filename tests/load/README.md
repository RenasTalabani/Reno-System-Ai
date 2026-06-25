# Reno Load & Stress Tests

Tests are written for [k6](https://k6.io) — an open-source load testing tool.

## Prerequisites

Install k6: https://k6.io/docs/getting-started/installation/

## Running Tests

```bash
# Authentication load test (50 concurrent users, ~3 minutes)
k6 run tests/load/auth-load.js

# Full API stress test (200 concurrent users, ~5 minutes)
k6 run tests/load/api-stress.js

# Against a different environment
k6 run -e BASE_URL=https://api.reno-system.com tests/load/auth-load.js
```

## Thresholds

| Test | Metric | Threshold |
|------|--------|-----------|
| Auth Load | p95 response | < 500ms |
| Auth Load | Error rate | < 1% |
| API Stress | p95 response | < 2000ms |
| API Stress | Error rate | < 5% |

## Results

Results are saved to `tests/load/results/` after each run.
