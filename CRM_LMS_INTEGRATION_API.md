# CRM ↔ LMS Integration API

Documentation for the automated user-creation webhook used by the external CRM to provision student accounts in the Learning Management System (LMS).

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Production (Railway) | `https://<your-railway-app-domain>` |
| Local development | `http://localhost:3001` |

Both of the following endpoints are equivalent:

| Method | Path |
|--------|------|
| `POST` | `/api/v1/users/webhook-create` |
| `POST` | `/api/webhooks/create-user` |

Use either path; the request body and auth headers are identical.

---

## Authentication

The LMS expects a shared secret configured on the server as:

```bash
CRM_WEBHOOK_SECRET=your-long-random-secret
```

(Also accepted: `WEBHOOK_API_KEY` as an alias.)

Send the secret in **one** of these headers:

| Header | Example |
|--------|---------|
| `X-API-Key` | `X-API-Key: your-long-random-secret` |
| `X-Webhook-Secret` | `X-Webhook-Secret: your-long-random-secret` |
| `Authorization` | `Authorization: Bearer your-long-random-secret` |

If the secret is missing or wrong, the API returns **401**.  
If the server has not set `CRM_WEBHOOK_SECRET`, the API returns **503**.

---

## Request

### Headers

```http
Content-Type: application/json
X-API-Key: <CRM_WEBHOOK_SECRET>
```

### JSON body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fullName` | string | **Yes** | Student full name (stored as `full_name`) |
| `username` | string | **Yes** | Unique login username |
| `password` | string | **Yes** | Plain-text password (hashed with bcrypt before save) |
| `courseType` | string | **Yes** | Course / group assignment (stored as `course_group_id`) |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `idNumber` | string | No | National / ID number |

### Example payload

```json
{
  "fullName": "ישראל ישראלי",
  "email": "israel@example.com",
  "phone": "0501234567",
  "idNumber": "123456789",
  "username": "israel.israeli",
  "password": "TempPass123!",
  "courseType": "first_aid"
}
```

---

## `courseType` values

`courseType` is stored in the LMS as `users.course_group_id` and appears in the instructor student table as **מזהה קורס**.

### Recommended values

| Value | Meaning |
|-------|---------|
| `first_aid` | First aid / emergency course track |
| `medical` | Medical / clinical track |
| `general` | Generic / uncategorized group |
| `course_44` | Legacy first-aid handbook track (if still used internally) |

Any non-empty string is accepted (e.g. CRM campaign codes like `GROUP-A`, `2026-SPRING`).  
The response field `knownCourseType` is `true` only when the value matches one of the recommended values above (case-insensitive).

---

## Success response

**HTTP 201 Created**

```json
{
  "success": true,
  "userId": "42",
  "message": "User created successfully",
  "username": "israel.israeli",
  "courseType": "first_aid",
  "knownCourseType": true
}
```

The created user:

- Has `role = student`
- Can log in with the provided `username` / `password`
- Is assigned to the given `courseType` (`course_group_id`)

---

## Error responses

| HTTP | When | Example body |
|------|------|----------------|
| **400** | Missing required fields | `{ "success": false, "error": "Missing required fields", "missing": ["username", "password"] }` |
| **401** | Invalid / missing API key | `{ "success": false, "error": "Unauthorized - invalid or missing API key" }` |
| **409** | Username already exists | `{ "success": false, "error": "User already exists", "username": "israel.israeli" }` |
| **500** | Unexpected server / DB error | `{ "success": false, "error": "Failed to create user" }` |
| **503** | Secret not configured on LMS | `{ "success": false, "error": "Webhook is not configured on the server (missing CRM_WEBHOOK_SECRET)" }` |

---

## cURL example

```bash
curl -X POST "https://<your-railway-app-domain>/api/v1/users/webhook-create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-long-random-secret" \
  -d '{
    "fullName": "ישראל ישראלי",
    "email": "israel@example.com",
    "phone": "0501234567",
    "idNumber": "123456789",
    "username": "israel.israeli",
    "password": "TempPass123!",
    "courseType": "first_aid"
  }'
```

---

## Railway / deployment checklist

1. Set environment variable **`CRM_WEBHOOK_SECRET`** in Railway (and keep it private).
2. Redeploy so `ALTER TABLE` adds optional columns: `email`, `phone`, `id_number` (run automatically on server start).
3. Give the CRM team this document plus the production base URL and the shared secret.
4. Prefer HTTPS only; never send the API key over plain HTTP in production.

---

## Notes for LMS operators

- This webhook **creates** users only; it does not update existing accounts (duplicate username → **409**).
- Password is hashed with **bcrypt** (same as manual / Excel user creation).
- Users not present in a later Excel sync are **not** deleted; this endpoint is independent of Excel sync.
