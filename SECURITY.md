# Security

Image Pass is intentionally API-free and deterministic.

The MCP backend:
- does not call OpenAI or another model;
- does not require an OpenAI API key;
- does not need to receive image bytes;
- receives only the textual task, locks, review findings, route, and edit strategy supplied by the host;
- exposes a read-only idempotent protocol tool.

Remote Node deployment supports:
- optional bearer authentication;
- Host validation;
- Origin validation;
- request body limits;
- simple per-client rate limiting;
- a separate health endpoint.

Do not put secrets, private image URLs, or unnecessary personal information into reference labels or context fields.
