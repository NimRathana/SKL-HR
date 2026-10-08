from uuid6 import uuid7

from app.utils.run_sql_script import run_sql_script


ADMIN_USER_ID = str(uuid7())


SQL_SCRIPT = f"""
DO $$
BEGIN

    -- Check if global admin alaredy exists
    IF EXISTS (
        SELECT 1
        FROM users
        WHERE email = 'report@skl-solutions.com'
        AND tenant_id IS NULL
    ) THEN

        RAISE NOTICE 'Admin already exists. Skipping insert.';

    ELSE

        INSERT INTO users (
            id,
            tenant_id,
            name,
            email,
            password_hash,
            role,
            status
        )
        VALUES (
            '{ADMIN_USER_ID}',
            NULL,
            'Admin',
            'report@skl-solutions.com',
            '$2b$12$kg3nNT1bXKTTUlIgN0FQC.J7sNjiPJOePraNjXxnqWoFrhNxmNSVC',
            'admin',
            'active'
        );

        RAISE NOTICE 'Admin created successfully.';

    END IF;

END
$$;
"""


def run():
    run_sql_script(
        SQL_SCRIPT,
        success_message="Admin user seed script executed successfully.",
    )