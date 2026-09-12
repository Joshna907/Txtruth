# Privacy and Security

- TxTruth never requests seed phrases or private keys.
- Signing remains inside the caller-provided wallet callback.
- Raw signed transaction bytes are never stored by the core package.
- Reports are local values; no telemetry or upload exists.
- Shareable reports redact signatures by default.
- Error details and configured explorer URLs have query parameters, bearer tokens, and API-key-like values removed.
- Applications should avoid placing secrets in custom error messages.

TxTruth reports are diagnostic evidence, not security audits or guarantees of financial safety.
