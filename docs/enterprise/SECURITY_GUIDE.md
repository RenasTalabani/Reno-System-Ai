# Reno System — Security Guide v1.0.0

---

## Security Architecture

Reno System implements defense-in-depth across multiple layers:

```
Internet → Load Balancer (TLS) → Nginx → API (Auth) → Services → DB (Encrypted at rest)
```

---

## Authentication & Authorization

### JWT Authentication
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry, rotated on use
- Algorithm: HS256 with 64-byte secret
- Stored: httpOnly cookies (web), secure storage (mobile)

### Two-Factor Authentication (2FA)
- TOTP-based (Google Authenticator compatible)
- Backup codes generated at enrollment
- Required for SUPER_ADMIN role

### Role-Based Access Control
- Granular permissions per module and action
- Permission inheritance through role hierarchy
- Tenant-scoped: roles cannot cross tenant boundaries

---

## Data Security

### Tenant Isolation
- Every database table includes `tenant_id` foreign key
- All queries MUST include `WHERE tenant_id = ?`
- No cross-tenant data access is possible through the API
- Verified: Prisma client enforces tenantId on every query

### Encryption
- Database passwords: bcrypt (12 rounds)
- API keys: SHA-256 hashed, prefix stored for identification
- Webhook secrets: SHA-256 hashed, shown once
- Sensitive data at rest: AES-256 via ENCRYPTION_KEY environment variable
- TLS 1.2+ enforced on all external connections

### Secret Management
- No secrets in version control
- `.env.production` is gitignored
- Kubernetes secrets via `kubectl create secret`
- Rotation procedure: update env var → rolling restart

---

## API Security

### Rate Limiting
- Default: 100 requests/minute per IP
- Auth endpoints: 10 requests/minute
- Configurable via environment variables

### Input Validation
- All inputs validated via JSON schema
- SQL injection: prevented by Prisma parameterized queries
- XSS: prevented by React's JSX escaping + CSP headers
- CSRF: prevented by SameSite cookie attribute

### Headers
```
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Audit Logging

All security-relevant events are logged to `sys_audit_logs`:
- Authentication: login, logout, failed attempts, 2FA
- Authorization: permission denials
- Data: create, update, delete on all sensitive records
- AI: all AI actions, approvals, rejections
- Admin: tenant creation, user role changes

Audit logs are immutable (no DELETE endpoint).

---

## Webhook Security

All webhooks use HMAC-SHA256 signing:
```
X-Reno-Signature: sha256=<hex>
X-Reno-Timestamp: <unix-timestamp>
```

Verify in your receiver:
```typescript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex')
const expected = `sha256=${signature}`
// Compare with X-Reno-Signature header
```

---

## Security Checklist for Production

- [ ] JWT_SECRET is at least 64 random bytes
- [ ] ENCRYPTION_KEY is at least 32 random bytes
- [ ] Database password is strong (20+ characters, mixed)
- [ ] TLS certificate is valid and auto-renewing
- [ ] 2FA enabled for all admin accounts
- [ ] API is not exposed directly (behind nginx/LB)
- [ ] Database port 5432 is not publicly accessible
- [ ] Redis port 6379 is not publicly accessible
- [ ] Audit logs are being monitored
- [ ] Backup encryption is enabled
- [ ] Security headers are present (verify with securityheaders.com)

---

## Incident Response

### Suspected Breach
1. Immediately rotate JWT_SECRET and ENCRYPTION_KEY
2. Invalidate all active sessions
3. Review audit logs for unauthorized access
4. Notify affected tenants per your legal obligations
5. Rotate all API keys and webhook secrets

### Compromised Admin Account
1. Disable the account via SUPER_ADMIN
2. Revoke all sessions for that user
3. Review audit log for actions taken
4. Reset 2FA enrollment

---

## Penetration Testing

Before production, perform:
- OWASP Top 10 assessment
- API fuzzing
- Authentication bypass testing
- SQL injection scanning
- XSS testing
- Session management review
