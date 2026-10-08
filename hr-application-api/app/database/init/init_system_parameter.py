
from app.utils.run_sql_script import run_sql_script


SQL_SCRIPT = """
    INSERT INTO system_parameters (
        id,
        code,
        name,
        value,
        type,
        category
    )
    VALUES (
        generate_uuid_v7(),
        'PASSWORD_SET_LIST_SPECIAL_CHARACTERS',
        'TS_GS_SET_LIST_SPECIAL_CHARACTERS',
        '',
        'Text',
        'Security'
    )
    ON CONFLICT (code) DO NOTHING;


    INSERT INTO system_parameters (
        id,
        code,
        name,
        value,
        type,
        category
    )
    VALUES (
        generate_uuid_v7(),
        'MINIMUM_NUMBER_OF_CHARACTERS_IN_PASSWORD',
        'TS_GS_MINIMUM_NUMBER_OF_CHARACTERS_IN_PASSWORD',
        '',
        'Number',
        'Security'
    )
    ON CONFLICT (code) DO NOTHING;


    INSERT INTO system_parameters (
        id,
        code,
        name,
        value,
        type,
        category
    )
    VALUES (
        generate_uuid_v7(),
        'MAXIMUM_NUMBER_OF_CHARACTERS_IN_PASSWORD',
        'TS_GS_MAXIMUM_NUMBER_OF_CHARACTERS_IN_PASSWORD',
        '',
        'Number',
        'Security'
    )
    ON CONFLICT (code) DO NOTHING;


    INSERT INTO system_parameters (
        id,
        code,
        name,
        value,
        type,
        category
    )
    VALUES (
        generate_uuid_v7(),
        'AT_LEAST_ONE_NUMBER_REQUIRED_IN_PASSWORD',
        'TS_GS_AT_LEAST_ONE_NUMBER_REQUIRED_IN_PASSWORD',
        'False',
        'Boolean',
        'Security'
    )
    ON CONFLICT (code) DO NOTHING;


    INSERT INTO system_parameters (
        id,
        code,
        name,
        value,
        type,
        category
    )
    VALUES (
        generate_uuid_v7(),
        'AT_LEAST_ONE_LOWERCASE_CHARACTER_REQUIRED_IN_PASSWORD',
        'TS_GS_AT_LEAST_ONE_LOWERCASE_CHARACTER_REQUIRED_IN_PASSWORD',
        'False',
        'Boolean',
        'Security'
    )
    ON CONFLICT (code) DO NOTHING;


    INSERT INTO system_parameters (
        id,
        code,
        name,
        value,
        type,
        category
    )
    VALUES (
        generate_uuid_v7(),
        'AT_LEAST_ONE_UPPERCASE_CHARACTER_REQUIRED_IN_PASSWORD',
        'TS_GS_AT_LEAST_ONE_UPPERCASE_CHARACTER_REQUIRED_IN_PASSWORD',
        'False',
        'Boolean',
        'Security'
    )
    ON CONFLICT (code) DO NOTHING;


    INSERT INTO system_parameters (
        id,
        code,
        name,
        value,
        type,
        category
    )
    VALUES (
        generate_uuid_v7(),
        'PASSWORD_MAX_LOGIN_TRY',
        'TS_GS_PASSWORD_MAX_LOGIN_TRY',
        '',
        'Number',
        'Security'
    )
    ON CONFLICT (code) DO NOTHING;
"""


def run():
    run_sql_script(
        SQL_SCRIPT,
        success_message="Global settings initialized successfully.",
    )