-- Promote a user to SUPERADMIN
-- Usage: psql -U finnan -d finnan_dev -f scripts/promote-admin.sql
-- Or via docker: docker exec finnan_postgres psql -U finnan -d finnan_dev -f /scripts/promote-admin.sql

UPDATE users SET role = 'SUPERADMIN' WHERE email = 'luis@finnan.com';

-- Verify:
SELECT id, name, email, role FROM users WHERE role = 'SUPERADMIN';
