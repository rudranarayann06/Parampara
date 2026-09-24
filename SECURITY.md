# PARAMPARA Security Notes

- Never place Firebase Admin credentials or Google service-account credentials in frontend files.
- Use a strong `SECRET_KEY` in Render.
- Keep PostgreSQL private where the platform allows it.
- Treat original audio as private object storage by default.
- Public audio is exposed only after verification and public-access consent.
- Validate file type and size server-side; the frontend checks are convenience only.
- Use rate limiting at the edge/API gateway for production traffic.
- Use database migrations instead of relying on `create_all()` once the schema is established.
- Audit reviewer actions and AI-derived artifact creation.
