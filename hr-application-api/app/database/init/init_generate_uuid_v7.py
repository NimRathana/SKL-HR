from sqlalchemy import text
from app.database.session import engine


SQL = """
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION generate_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    unix_ts_ms BIGINT;
    random_bytes BYTEA;
    uuid_bytes BYTEA;
BEGIN
    unix_ts_ms := FLOOR(
        EXTRACT(EPOCH FROM clock_timestamp()) * 1000
    );

    random_bytes := gen_random_bytes(10);

    uuid_bytes :=
        decode(
            lpad(to_hex(unix_ts_ms), 12, '0'),
            'hex'
        ) || random_bytes;

    -- UUID version 7
    uuid_bytes :=
        set_byte(
            uuid_bytes,
            6,
            (get_byte(uuid_bytes, 6) & 15) | 112
        );

    -- UUID variant
    uuid_bytes :=
        set_byte(
            uuid_bytes,
            8,
            (get_byte(uuid_bytes, 8) & 63) | 128
        );

    RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;
"""


def run():
    with engine.begin() as connection:
        connection.execute(text(SQL))