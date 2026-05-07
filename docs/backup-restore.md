# Backup And Restore

Backups are JSON exports with schema version, export timestamp, privacy flags, and local data.

Backup options:

- Include attachment metadata
- Include private notes/comments
- Local export backup
- Account backup opt-in setting for authenticated users

Restore is preview-first. The restore preview validates schema, counts records, warns about version/privacy issues, and offers merge, replace local, or duplicate/private restore modes.

Restored records default to private/local copies. Synced/shared records are not overwritten blindly.
