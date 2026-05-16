# IEDI Export Format v0.1

## Overview

`iedi export` produces a JWS (JSON Web Signature) compact-serialized bundle containing
all IEDI records. The bundle is signed with an Ed25519 key pair.

## JWS Compact Serialization

```
BASE64URL(UTF8(header)) . BASE64URL(UTF8(payload)) . BASE64URL(signature)
```

### Header

```json
{
  "alg": "EdDSA",
  "kid": "<actor_id>"
}
```

- `alg`: EdDSA (Ed25519 variant) — no separate hash step
- `kid`: actor identifier for key resolution (`did:amcp` format)

### Payload

```json
{
  "format": "iedi-export-v0.1",
  "exported_at": "2026-05-16T10:00:00.000Z",
  "actor_id": "did:amcp:citrus-a1b2c3d4e5f6",
  "record_count": 42,
  "records": [...]
}
```

- `format`: fixed version string for format detection
- `exported_at`: ISO 8601 timestamp of export
- `actor_id`: exporting actor's identifier
- `record_count`: number of records in the bundle
- `records`: array of full IediRecord objects (schema_version 0.3)

## Key Management

- Ed25519 key pair is auto-generated on first IediStore instantiation
- Stored in `config.json` alongside `actor_id` as JWK (OKP / Ed25519)
- Key reuse across exports: same key signs all bundles for an actor
- Ephemeral key generated for `:memory:` DB paths (no persistence)

## Security Model (Phase 1)

- **Tamper detection only**: signature verifies the export bundle hasn't been
  modified since signing. Does NOT establish origin authenticity.
- **Origin authentication**: deferred to Phase 2+ (requires DID resolution or
  out-of-band key fingerprint verification).
- **Hash-chain integrity**: each record's `record_hash` can be independently
  verified via `computeHash()`. Chain links (requester/provider prev_hash)
  can be verified via `iedi doctor`.

## Verification

To verify a JWS export bundle:

1. Split on `.` to get header, payload, and signature segments
2. Base64url-decode the header and verify `alg` is `"EdDSA"`
3. Reconstruct signing input: `header . payload` (as original base64url strings)
4. Verify the Ed25519 signature using the public key (`x` from JWK)
5. Parse the payload JSON and verify `format` is `"iedi-export-v0.1"`
6. For tamper detection: recompute `computeHash()` on each record and compare
   to stored `record_hash`

## Example (Node.js verification sketch)

```typescript
import { createVerify } from 'crypto';

const [headerB64, payloadB64, sigB64] = jws.split('.');
const signingInput = `${headerB64}.${payloadB64}`;
const publicKey = { key: jwkPublic, format: 'jwk' };
const sig = Buffer.from(sigB64, 'base64url');

const ok = createVerify(null)
  .update(Buffer.from(signingInput, 'utf-8'))
  .verify(publicKey, sig);
```
