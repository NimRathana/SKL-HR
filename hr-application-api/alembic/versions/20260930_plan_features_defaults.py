"""Add plan limits/features and seed initial plans.

Revision ID: 20260930_plan_features_defaults
Revises: 20260930_billing_subscriptions
"""

from alembic import op
import sqlalchemy as sa


revision = "20260930_plan_features_defaults"
down_revision = "20260930_billing_subscriptions"
branch_labels = None
depends_on = None


DEFAULT_PLANS = (
    ("00000000-0000-4000-8000-000000000001", "free", "Free Monthly", "A simple start for small teams.", "0.00", "monthly", 10, 1, 1, '{"employee_management":true,"employment_history":true,"salary_history":false}'),
    ("00000000-0000-4000-8000-000000000002", "free", "Free Yearly", "A simple start for small teams.", "0.00", "yearly", 10, 1, 1, '{"employee_management":true,"employment_history":true,"salary_history":false}'),
    ("00000000-0000-4000-8000-000000000003", "basic", "Basic Monthly", "For small teams.", "9.99", "monthly", 50, 3, 5, '{"employee_management":true,"employment_history":true,"salary_history":true}'),
    ("00000000-0000-4000-8000-000000000004", "basic", "Basic Yearly", "For small teams.", "95.90", "yearly", 50, 3, 5, '{"employee_management":true,"employment_history":true,"salary_history":true}'),
    ("00000000-0000-4000-8000-000000000005", "medium", "Medium Monthly", "Advanced tools for growing HR teams.", "19.99", "monthly", 200, 10, 20, '{"employee_management":true,"employment_history":true,"salary_history":true,"performance_management":true,"advanced_reports":true}'),
    ("00000000-0000-4000-8000-000000000006", "medium", "Medium Yearly", "Advanced tools for growing HR teams.", "191.90", "yearly", 200, 10, 20, '{"employee_management":true,"employment_history":true,"salary_history":true,"performance_management":true,"advanced_reports":true}'),
)


def upgrade() -> None:
    op.add_column("pricing_plans", sa.Column("max_employees", sa.Integer(), nullable=True))
    op.add_column("pricing_plans", sa.Column("max_companies", sa.Integer(), nullable=True))
    op.add_column("pricing_plans", sa.Column("max_hr_users", sa.Integer(), nullable=True))
    op.add_column(
        "pricing_plans",
        sa.Column("features", sa.JSON(), server_default=sa.text("'{}'"), nullable=False),
    )
    op.create_check_constraint(
        "ck_pricing_plans_max_employees",
        "pricing_plans",
        "max_employees IS NULL OR max_employees >= 0",
    )
    op.create_check_constraint(
        "ck_pricing_plans_max_companies",
        "pricing_plans",
        "max_companies IS NULL OR max_companies >= 0",
    )
    op.create_check_constraint(
        "ck_pricing_plans_max_hr_users",
        "pricing_plans",
        "max_hr_users IS NULL OR max_hr_users >= 0",
    )

    op.execute(
        "UPDATE pricing_plans SET max_employees = 10, max_companies = 1, max_hr_users = 1, "
        "features = json_build_object('employee_management', true, 'employment_history', true, 'salary_history', false) "
        "WHERE plan_type = 'free' AND (max_employees IS NULL OR features::text = '{}')"
    )
    op.execute(
        "UPDATE pricing_plans SET max_employees = 50, max_companies = 3, max_hr_users = 5, "
        "features = json_build_object('employee_management', true, 'employment_history', true, 'salary_history', true) "
        "WHERE plan_type = 'basic' AND (max_employees IS NULL OR features::text = '{}')"
    )
    op.execute(
        "UPDATE pricing_plans SET max_employees = 200, max_companies = 10, max_hr_users = 20, "
        "features = json_build_object('employee_management', true, 'employment_history', true, 'salary_history', true, "
        "'performance_management', true, 'advanced_reports', true) "
        "WHERE plan_type = 'medium' AND (max_employees IS NULL OR features::text = '{}')"
    )

    for plan_id, plan_type, name, description, price, interval, employees, companies, hr_users, features in DEFAULT_PLANS:
        op.execute(
            sa.text(
                """
                INSERT INTO pricing_plans (
                    id, plan_type, name, description, price, currency, billing_interval,
                    max_employees, max_companies, max_hr_users, features, is_active, created_at, updated_at
                )
                SELECT :id, :plan_type, :name, :description, :price, 'USD', :interval,
                       :employees, :companies, :hr_users, CAST(:features AS json), true, now(), now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM pricing_plans
                    WHERE plan_type = :plan_type AND billing_interval = :interval
                )
                ON CONFLICT (name) DO NOTHING
                """
            ).bindparams(
                id=plan_id,
                plan_type=plan_type,
                name=name,
                description=description,
                price=price,
                interval=interval,
                employees=employees,
                companies=companies,
                hr_users=hr_users,
                features=features,
            )
        )


def downgrade() -> None:
    op.drop_constraint("ck_pricing_plans_max_hr_users", "pricing_plans", type_="check")
    op.drop_constraint("ck_pricing_plans_max_companies", "pricing_plans", type_="check")
    op.drop_constraint("ck_pricing_plans_max_employees", "pricing_plans", type_="check")
    op.drop_column("pricing_plans", "features")
    op.drop_column("pricing_plans", "max_hr_users")
    op.drop_column("pricing_plans", "max_companies")
    op.drop_column("pricing_plans", "max_employees")
