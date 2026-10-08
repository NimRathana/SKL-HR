"""Insert a Cambodian demo dataset without changing existing application data.

Generated login accounts use the shared demo password printed after a successful
seed. All email addresses use the reserved example.test domain.
"""

from __future__ import annotations

import argparse
import calendar
import random
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from passlib.context import CryptContext
from sqlalchemy import MetaData, Table, create_engine, func, select


EMPLOYEE_COUNT = 2_000
TENANT_COUNT = 10
COMPANIES_PER_TENANT = 3
USERS_PER_TENANT = 5
SEED_EMAIL_PREFIX = "demo.kh."
DEMO_PASSWORD = "CambodiaDemo2026!"

FIRST_NAMES = [
    ("សុខា", "Sokha"),
    ("ដារ៉ា", "Dara"),
    ("វិសាល", "Visal"),
    ("សុភា", "Sophea"),
    ("វណ្ណា", "Vanna"),
    ("ចន្ទា", "Chantha"),
    ("មាលា", "Maly"),
    ("ស្រីពៅ", "Sreypov"),
    ("ប៊ុនថា", "Buntha"),
    ("រតនា", "Rathana"),
    ("សុវណ្ណ", "Sovann"),
    ("កញ្ញា", "Kanha"),
    ("ម៉ាលី", "Maly"),
    ("ពិសី", "Pisei"),
    ("ជ័យ", "Chey"),
    ("វិច្ឆិកា", "Vicheka"),
    ("នារី", "Nary"),
    ("សុជាតា", "Socheata"),
    ("បូរ៉ា", "Bora"),
    ("មុន្នី", "Monny"),
    ("គន្ធា", "Kunthea"),
    ("សុផាត", "Sophal"),
    ("និមល", "Nimol"),
    ("ឆាយ", "Chhay"),
    ("បញ្ញា", "Panhya"),
    ("លីណា", "Lina"),
    ("ពៅ", "Pov"),
    ("មករា", "Makara"),
    ("សុវណ្ណារ៉ា", "Sovannara"),
    ("វុទ្ធី", "Vuthy"),
]

LAST_NAMES = [
    ("សុខ", "Sok"),
    ("ចាន់", "Chan"),
    ("គឹម", "Kim"),
    ("ឡុង", "Long"),
    ("ហេង", "Heng"),
    ("លី", "Ly"),
    ("សែន", "Sen"),
    ("ម៉ៅ", "Mao"),
    ("អ៊ុក", "Ouk"),
    ("កែវ", "Keo"),
    ("ហ៊ុយ", "Huy"),
    ("ថា", "Tha"),
    ("ពេជ្រ", "Pich"),
    ("ឈុន", "Chun"),
    ("ណារ៉ា", "Nara"),
    ("ប៉ែន", "Pen"),
    ("សំ", "Sam"),
    ("ឌី", "Dy"),
    ("ធា", "Thea"),
    ("វ៉ាន់", "Van"),
    ("រស់", "Ros"),
    ("ប៊ុន", "Bun"),
    ("កុសល", "Kosal"),
    ("ស្រ៊ុន", "Srun"),
    ("មាស", "Meas"),
]

PROVINCES = [
    ("Phnom Penh", "ភ្នំពេញ", ["Chamkar Mon", "Toul Kork", "Boeung Keng Kang", "Sen Sok"]),
    ("Siem Reap", "សៀមរាប", ["Svay Dangkum", "Sla Kram", "Chreav"]),
    ("Battambang", "បាត់ដំបង", ["Svay Por", "Rottanak", "Ou Mal"]),
    ("Kampong Cham", "កំពង់ចាម", ["Veal Vong", "Kampong Cham", "Banteay Prey"]),
    ("Preah Sihanouk", "ព្រះសីហនុ", ["Sangkat 2", "Sangkat 3", "Koh Rong"]),
    ("Kampot", "កំពត", ["Kampot", "Andoung Khmer", "Banteay Meas"]),
    ("Kandal", "កណ្តាល", ["Ta Khmau", "Kien Svay", "Angk Snuol"]),
    ("Takeo", "តាកែវ", ["Daun Keo", "Roka Khnor", "Angkor Borei"]),
    ("Banteay Meanchey", "បន្ទាយមានជ័យ", ["Poipet", "Ou Chrov", "Serei Saophoan"]),
    ("Kampong Thom", "កំពង់ធំ", ["Stueng Saen", "Santuk", "Baray"]),
    ("Kampong Speu", "កំពង់ស្ពឺ", ["Chbar Mon", "Samraong Tong", "Kong Pisei"]),
    ("Pursat", "ពោធិ៍សាត់", ["Pursat", "Krakor", "Bakan"]),
]

COMPANY_NAMES = [
    ("Mekong", "មេគង្គ"),
    ("Angkor", "អង្គរ"),
    ("Tonle Sap", "ទន្លេសាប"),
    ("Lotus", "ឈូក"),
    ("Sovann", "សុវណ្ណ"),
    ("Kampuchea", "កម្ពុជា"),
    ("Samaki", "សាមគ្គី"),
    ("Bayon", "បាយ័ន"),
    ("Khmer Horizon", "ខ្មែរហូរីហ្សុន"),
    ("Golden Palm", "ត្នោតមាស"),
    ("Riverstone", "រីវើស្តូន"),
    ("Sangkat", "សង្កាត់"),
]

SECTORS = [
    ("Hospitality", "ទេសចរណ៍ និងបដិសណ្ឋារកិច្ច"),
    ("Retail", "ពាណិជ្ជកម្ម"),
    ("Logistics", "ដឹកជញ្ជូន"),
    ("Education", "អប់រំ"),
    ("Manufacturing", "ផលិតកម្ម"),
    ("Technology", "បច្ចេកវិទ្យា"),
    ("Healthcare", "សុខាភិបាល"),
    ("Agriculture", "កសិកម្ម"),
    ("Finance", "ហិរញ្ញវត្ថុ"),
    ("Construction", "សំណង់"),
]

POSITION_TITLES = [
    ("General Manager", "អ្នកគ្រប់គ្រងទូទៅ"),
    ("Human Resources Manager", "អ្នកគ្រប់គ្រងធនធានមនុស្ស"),
    ("Accountant", "គណនេយ្យករ"),
    ("Sales Executive", "បុគ្គលិកផ្នែកលក់"),
    ("Office Administrator", "អ្នកគ្រប់គ្រងការិយាល័យ"),
    ("Operations Supervisor", "អ្នកត្រួតពិនិត្យប្រតិបត្តិការ"),
    ("Customer Service Officer", "មន្ត្រីសេវាអតិថិជន"),
    ("IT Support Officer", "មន្ត្រីគាំទ្របច្ចេកវិទ្យា"),
    ("Marketing Officer", "មន្ត្រីទីផ្សារ"),
    ("Human Resources Officer", "មន្ត្រីធនធានមនុស្ស"),
    ("Warehouse Assistant", "ជំនួយការឃ្លាំង"),
    ("Intern", "អ្នកហាត់ការ"),
]

MOBILE_PREFIXES = ["10", "12", "15", "16", "17", "69", "70", "77", "78", "81", "86", "88", "92", "95", "96", "97", "98"]
EMPLOYMENT_TYPES = ["full_time", "full_time", "full_time", "part_time", "contract", "intern"]
DEVICE_TYPES = ["Desktop", "Mobile", "Tablet"]
BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"]
DEVICE_NAMES = ["Windows PC", "MacBook", "Samsung Galaxy", "iPhone", "Xiaomi Redmi"]


def new_id() -> uuid.UUID:
    return uuid.uuid4()


def random_date(rng: random.Random, start: date, end: date) -> date:
    return start + timedelta(days=rng.randint(0, max(0, (end - start).days)))


def timestamp_on(day: date, hour: int = 9) -> datetime:
    return datetime.combine(day, time(hour=hour), tzinfo=timezone.utc)


def recent_timestamp(rng: random.Random, now: datetime, max_days: int) -> datetime:
    return now - timedelta(
        days=rng.randint(0, max_days),
        seconds=rng.randint(0, 86_399),
    )


def cambodian_phone(rng: random.Random) -> str:
    return f"+855 {rng.choice(MOBILE_PREFIXES)} {rng.randint(100000, 999999)}"


def address(rng: random.Random) -> tuple[str, str]:
    province, khmer_province, districts = rng.choice(PROVINCES)
    district = rng.choice(districts)
    house = rng.randint(1, 999)
    street = rng.randint(1, 350)
    english = f"House {house}, Street {street}, {district}, {province}, Cambodia"
    khmer = f"ផ្ទះលេខ {house}, ផ្លូវ {street}, {district}, {khmer_province}, កម្ពុជា"
    return english, khmer


def bilingual_name(rng: random.Random) -> tuple[str, str]:
    khmer_first, english_first = rng.choice(FIRST_NAMES)
    khmer_last, english_last = rng.choice(LAST_NAMES)
    return f"{khmer_first} ({english_first})", f"{khmer_last} ({english_last})"


def shifted_month(day: date, months: int) -> date:
    month_index = day.year * 12 + day.month - 1 + months
    year, month_zero = divmod(month_index, 12)
    month = month_zero + 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))


def build_seed(connection, rng: random.Random, now: datetime) -> dict[str, list[dict]]:
    metadata = MetaData()

    def table(name: str) -> Table:
        return Table(name, metadata, schema="public", autoload_with=connection)

    plan_types_table = table("plan_types")
    pricing_plans_table = table("pricing_plans")

    plan_codes = list(connection.execute(select(plan_types_table.c.code)).scalars())
    if not {"free", "basic", "medium"}.issubset(set(plan_codes)):
        raise RuntimeError("Expected free, basic, and medium plan types in public.plan_types.")

    existing_plans = list(connection.execute(select(pricing_plans_table)).mappings())
    plan_lookup = {
        (plan["plan_type"], plan["billing_interval"]): plan
        for plan in existing_plans
    }
    if not all((code, interval) in plan_lookup for code in ("free", "basic", "medium") for interval in ("monthly", "yearly")):
        raise RuntimeError("Expected monthly and yearly pricing plans for free, basic, and medium.")

    password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    demo_password_hash = password_context.hash(DEMO_PASSWORD)
    registration_code_hash = password_context.hash("482731")

    rows: dict[str, list[dict]] = {
        "tenants": [],
        "users": [],
        "companies": [],
        "positions": [],
        "company_user": [],
        "employees": [],
        "employment_histories": [],
        "salary_histories": [],
        "subscriptions": [],
        "invoices": [],
        "notifications": [],
        "login_history": [],
        "files": [],
        "registrations": [],
        "email_bulk_operations": [],
        "email_logs": [],
    }

    tenant_records = []
    user_records = []
    company_records = []
    company_positions: dict[uuid.UUID, list[dict]] = {}
    owner_by_tenant: dict[uuid.UUID, dict] = {}
    hr_by_tenant: dict[uuid.UUID, list[dict]] = {}

    for tenant_index in range(1, TENANT_COUNT + 1):
        tenant_id = new_id()
        plan_code = rng.choice(["free", "basic", "basic", "medium"])
        tenant_name = f"DEMO KH - {SECTORS[(tenant_index - 1) % len(SECTORS)][0]} Group {tenant_index:02d}"
        tenant_created = timestamp_on(random_date(rng, date(2020, 1, 1), now.date()))
        tenant = {
            "id": tenant_id,
            "name": tenant_name,
            "plan": plan_code,
            "created_at": tenant_created,
            "updated_at": max(tenant_created, recent_timestamp(rng, now, 365)),
        }
        tenant_records.append(tenant)
        rows["tenants"].append(tenant)

        tenant_users = []
        for user_index in range(USERS_PER_TENANT):
            user_id = new_id()
            role = "owner" if user_index == 0 else "hr"
            first, last = bilingual_name(rng)
            email_role = "owner" if user_index == 0 else f"hr{user_index:02d}"
            user_email = f"{SEED_EMAIL_PREFIX}{email_role}.t{tenant_index:02d}@example.test"
            english_address, khmer_address = address(rng)
            user_created = recent_timestamp(rng, now, 900)
            user = {
                "id": user_id,
                "tenant_id": tenant_id,
                "name": f"{first} {last}",
                "email": user_email,
                "phone": cambodian_phone(rng),
                "date_of_birth": random_date(rng, date(1970, 1, 1), date(2000, 12, 31)),
                "address": f"{english_address} / {khmer_address}",
                "password_hash": demo_password_hash,
                "role": role,
                "status": "active",
                "deleted_at": None,
                "user_preferences": {"language": rng.choice(["en", "km"]), "demo_seeded": True},
                "created_at": user_created,
                "updated_at": max(user_created, recent_timestamp(rng, now, 90)),
            }
            tenant_users.append(user)
            user_records.append(user)
            rows["users"].append(user)

        owner_by_tenant[tenant_id] = tenant_users[0]
        hr_by_tenant[tenant_id] = tenant_users[1:]

        for company_index in range(1, COMPANIES_PER_TENANT + 1):
            company_id = new_id()
            province, khmer_province, _ = PROVINCES[(tenant_index + company_index - 2) % len(PROVINCES)]
            sector_en, sector_km = SECTORS[(tenant_index - 1) % len(SECTORS)]
            brand_en, brand_km = COMPANY_NAMES[(tenant_index + company_index - 2) % len(COMPANY_NAMES)]
            company = {
                "id": company_id,
                "tenant_id": tenant_id,
                "parent_id": company_records[-(company_index - 1)]["id"] if company_index > 1 else None,
                "name": f"{brand_en} {sector_en} {tenant_index:02d}-{company_index:02d} / {brand_km} {sector_km}",
                "code": f"KH{tenant_index:02d}C{company_index:02d}",
                "description": f"{sector_en} organization operating in Cambodia / {sector_km}",
                "address": f"{province}, Cambodia / {khmer_province}, កម្ពុជា",
                "phone": cambodian_phone(rng),
                "email": f"contact.t{tenant_index:02d}c{company_index:02d}@example.test",
                "website": f"https://kh-demo-{tenant_index:02d}-{company_index:02d}.example.test",
                "status": "active",
                "created_at": tenant_created,
                "updated_at": tenant["updated_at"],
            }
            company_records.append(company)
            rows["companies"].append(company)

            positions = []
            for position_index, (title_en, title_km) in enumerate(POSITION_TITLES, start=1):
                position = {
                    "id": new_id(),
                    "company_id": company_id,
                    "code": f"KH{tenant_index:02d}C{company_index:02d}P{position_index:02d}",
                    "title": f"{title_en} / {title_km}",
                    "description": f"{title_en} position serving a Cambodian {sector_en.lower()} organization.",
                    "status": "active",
                    "created_at": tenant_created,
                    "updated_at": tenant["updated_at"],
                }
                positions.append(position)
                rows["positions"].append(position)
            company_positions[company_id] = positions

            assigned_users = [tenant_users[0], tenant_users[company_index]]
            if company_index == 1:
                assigned_users.append(tenant_users[4])
            for assigned_user in assigned_users:
                rows["company_user"].append(
                    {
                        "id": new_id(),
                        "tenant_id": tenant_id,
                        "user_id": assigned_user["id"],
                        "company_id": company_id,
                    }
                )

    for employee_index in range(1, EMPLOYEE_COUNT + 1):
        company = company_records[(employee_index - 1) % len(company_records)]
        tenant_id = company["tenant_id"]
        tenant_number = next(
            index for index, tenant in enumerate(tenant_records, start=1) if tenant["id"] == tenant_id
        )
        positions = company_positions[company["id"]]
        position_index = rng.choices(
            population=list(range(len(positions))),
            weights=[1, 3, 8, 15, 12, 10, 12, 7, 10, 8, 8, 6],
            k=1,
        )[0]
        position = positions[position_index]
        employment_status = rng.choices(
            ["active", "on_leave", "suspended", "terminated"],
            weights=[90, 5, 1, 4],
            k=1,
        )[0]
        if employment_status == "terminated":
            hire_date = random_date(rng, date(2016, 1, 1), date(2024, 12, 31))
        else:
            hire_date = random_date(rng, date(2016, 1, 1), now.date() - timedelta(days=30))
        first_name, last_name = bilingual_name(rng)
        gender = rng.choices(["female", "male", "other"], weights=[49, 49, 2], k=1)[0]
        birth_year = rng.randint(max(1960, hire_date.year - 55), hire_date.year - 18)
        birth_date = random_date(
            rng,
            date(birth_year, 1, 1),
            date(birth_year, 12, 31),
        )
        english_address, khmer_address = address(rng)
        employee_id = new_id()
        employee_email = f"employee{employee_index:04d}.t{tenant_number:02d}@example.test"
        employment_type = rng.choice(EMPLOYMENT_TYPES)
        termination_date = None
        history_status = "active"
        if employment_status == "terminated":
            termination_date = hire_date + timedelta(days=rng.randint(120, 1_500))
            termination_date = min(termination_date, now.date() - timedelta(days=1))
            history_status = "terminated"

        employee_created = timestamp_on(hire_date)
        employee = {
            "id": employee_id,
            "tenant_id": tenant_id,
            "company_id": company["id"],
            "first_name": first_name,
            "last_name": last_name,
            "gender": gender,
            "date_of_birth": birth_date,
            "phone": cambodian_phone(rng),
            "email": employee_email,
            "address": f"{english_address} / {khmer_address}",
            "hire_date": hire_date,
            "employment_status": employment_status,
            "position_id": position["id"],
            "created_at": employee_created,
            "updated_at": max(employee_created, recent_timestamp(rng, now, 120)),
        }
        rows["employees"].append(employee)

        approver = rng.choice(hr_by_tenant[tenant_id])
        rows["employment_histories"].append(
            {
                "id": new_id(),
                "tenant_id": tenant_id,
                "employee_id": employee_id,
                "company_id": company["id"],
                "position_id": position["id"],
                "employment_type": employment_type,
                "start_date": hire_date,
                "end_date": termination_date,
                "status": history_status,
                "reason": "Synthetic Cambodian demo employment record",
                "created_at": employee_created,
            }
        )

        if (hire_date.year <= now.year - 2) and rng.random() < 0.22:
            prior_start = max(
                hire_date - timedelta(days=rng.randint(250, 1_100)),
                birth_date + timedelta(days=18 * 365 + 5),
            )
            prior_end = hire_date - timedelta(days=1)
            prior_position = rng.choice(positions)
            rows["employment_histories"].append(
                {
                    "id": new_id(),
                    "tenant_id": tenant_id,
                    "employee_id": employee_id,
                    "company_id": company["id"],
                    "position_id": prior_position["id"],
                    "employment_type": rng.choice(EMPLOYMENT_TYPES),
                    "start_date": prior_start,
                    "end_date": prior_end,
                    "status": "completed",
                    "reason": "Previous role before promotion or transfer",
                    "created_at": timestamp_on(prior_start),
                }
            )

        monthly_amount = Decimal(str(rng.randint(180, 3_200)))
        currency = "KHR" if rng.random() < 0.18 else "USD"
        if currency == "KHR":
            monthly_amount *= Decimal("4100")
        salary_type = "hourly" if employment_type == "part_time" and rng.random() < 0.5 else "monthly"
        current_salary = monthly_amount
        if employment_type == "intern":
            current_salary = Decimal(str(rng.randint(100, 250)))
            currency = "USD"
        elif employment_type == "part_time":
            current_salary = (monthly_amount / Decimal("160")).quantize(Decimal("0.01"))
        previous_effective = None
        if hire_date <= now.date() - timedelta(days=730) and rng.random() < 0.30:
            previous_effective = hire_date + timedelta(days=rng.randint(365, 700))
            if termination_date is None or previous_effective <= termination_date:
                previous_amount = (current_salary * Decimal(str(rng.uniform(0.78, 0.93)))).quantize(Decimal("0.01"))
                rows["salary_histories"].append(
                    {
                        "id": new_id(),
                        "tenant_id": tenant_id,
                        "employee_id": employee_id,
                        "salary_amount": previous_amount,
                        "currency": currency,
                        "salary_type": salary_type,
                        "effective_date": hire_date,
                        "end_date": previous_effective - timedelta(days=1),
                        "reason": "Previous salary before annual review",
                        "approved_by": approver["id"],
                        "created_at": employee_created,
                    }
                )
            else:
                previous_effective = None

        rows["salary_histories"].append(
            {
                "id": new_id(),
                "tenant_id": tenant_id,
                "employee_id": employee_id,
                "salary_amount": current_salary,
                "currency": currency,
                "salary_type": salary_type,
                "effective_date": previous_effective or hire_date,
                "end_date": termination_date,
                "reason": "Current demo salary",
                "approved_by": approver["id"],
                "created_at": employee_created,
            }
        )

    for tenant_index, tenant in enumerate(tenant_records, start=1):
        tenant_id = tenant["id"]
        owner = owner_by_tenant[tenant_id]
        plan_type = tenant["plan"]
        billing_interval = rng.choice(["monthly", "yearly"])
        pricing_plan = plan_lookup[(plan_type, billing_interval)]
        subscription_id = new_id()
        subscription_status = rng.choices(
            ["active", "pending", "cancelled"],
            weights=[82, 10, 8],
            k=1,
        )[0]
        period_start = shifted_month(now.date(), -1 if billing_interval == "monthly" else -11)
        period_end = shifted_month(period_start, 1 if billing_interval == "monthly" else 12)
        subscription_created = timestamp_on(shifted_month(now.date(), -rng.randint(2, 18)))
        cancelled_at = (
            recent_timestamp(rng, now, 180)
            if subscription_status == "cancelled"
            else None
        )
        rows["subscriptions"].append(
            {
                "id": subscription_id,
                "tenant_id": tenant_id,
                "user_id": owner["id"],
                "pricing_plan_id": pricing_plan["id"],
                "idempotency_key": f"demo-kh-sub-{tenant_index:02d}",
                "plan_id": plan_type,
                "billing_cycle": billing_interval,
                "tenant_name": tenant["name"],
                "tenant_email": owner["email"],
                "tenant_phone": owner["phone"],
                "billing_address": owner["address"],
                "password_hash": None,
                "status": subscription_status,
                "stripe_session_id": None,
                "stripe_subscription_id": None,
                "payment_status": "paid" if subscription_status in ("active", "cancelled") else "unpaid",
                "current_period_start": timestamp_on(period_start),
                "current_period_end": timestamp_on(period_end),
                "cancelled_at": cancelled_at,
                "cancel_at_period_end": subscription_status == "cancelled",
                "created_at": subscription_created,
                "updated_at": max(subscription_created, recent_timestamp(rng, now, 30)),
            }
        )

        price = Decimal(str(pricing_plan["price"]))
        for invoice_index in range(1, 3):
            period_invoice_start = shifted_month(now.date(), -invoice_index)
            period_invoice_end = shifted_month(period_invoice_start, 1)
            invoice_status = (
                "paid"
                if invoice_index == 2 or subscription_status == "cancelled"
                else rng.choice(["pending", "paid", "failed"])
            )
            amount_paid = price if invoice_status == "paid" else Decimal("0.00")
            rows["invoices"].append(
                {
                    "id": new_id(),
                    "invoice_number": f"DEMO-KH-{tenant_index:02d}-{invoice_index:02d}",
                    "subscription_id": subscription_id,
                    "tenant_id": tenant_id,
                    "user_id": owner["id"],
                    "plan_name": pricing_plan["name"],
                    "amount_due": price,
                    "amount_paid": amount_paid,
                    "currency": pricing_plan["currency"],
                    "status": invoice_status,
                    "billing_period_start": timestamp_on(period_invoice_start),
                    "billing_period_end": timestamp_on(period_invoice_end),
                    "external_reference": f"DEMO-PAY-{tenant_index:02d}-{invoice_index:02d}" if invoice_status == "paid" else None,
                    "created_at": timestamp_on(period_invoice_end),
                    "updated_at": timestamp_on(period_invoice_end),
                }
            )

        for notification_index in range(1, 5):
            user = rng.choice([item for item in user_records if item["tenant_id"] == tenant_id])
            notification_time = recent_timestamp(rng, now, 120)
            is_read = rng.random() < 0.58
            rows["notifications"].append(
                {
                    "id": new_id(),
                    "user_id": user["id"],
                    "title": rng.choice(
                        [
                            "សូមស្វាគមន៍មកកាន់ប្រព័ន្ធ / Welcome to HR",
                            "ការរំលឹកប្រាក់ខែ / Payroll reminder",
                            "បច្ចុប្បន្នភាពក្រុមហ៊ុន / Company update",
                            "សំណើឈប់សម្រាក / Leave request update",
                        ]
                    ),
                    "body": "Synthetic Cambodian demo notification. No email or external message was sent.",
                    "is_read": is_read,
                    "created_at": notification_time,
                    "read_at": min(
                        now,
                        notification_time + timedelta(hours=rng.randint(1, 48)),
                    )
                    if is_read
                    else None,
                }
            )

        for user in [item for item in user_records if item["tenant_id"] == tenant_id]:
            for _ in range(6):
                login_time = recent_timestamp(rng, now, 180)
                ip_octet = rng.randint(1, 254)
                province, _, _ = rng.choice(PROVINCES)
                rows["login_history"].append(
                    {
                        "id": new_id(),
                        "user_id": user["id"],
                        "ip_address": f"192.0.2.{ip_octet}",
                        "device_type": rng.choice(DEVICE_TYPES),
                        "browser": rng.choice(BROWSERS),
                        "device": rng.choice(DEVICE_NAMES),
                        "location": f"{province}, Cambodia",
                        "created_at": login_time,
                    }
                )

            rows["files"].append(
                {
                    "id": new_id(),
                    "user_id": user["id"],
                    "file_name": f"synthetic-document-metadata-{user['id'].hex[:8]}.pdf",
                    "file_path": None,
                    "file_type": "application/pdf",
                    "file_category": "demo-document-metadata-only",
                    "created_at": recent_timestamp(rng, now, 365),
                    "updated_at": now,
                }
            )

        operation_id = new_id()
        log_count = 20
        operation_time = recent_timestamp(rng, now - timedelta(minutes=25), 90)
        rows["email_bulk_operations"].append(
            {
                "id": operation_id,
                "created_by": owner["id"],
                "total": log_count,
                "created_at": operation_time,
                "updated_at": operation_time,
            }
        )
        tenant_users = [item for item in user_records if item["tenant_id"] == tenant_id]
        for log_index in range(log_count):
            recipient = rng.choice(tenant_users)
            sent = rng.random() < 0.92
            log_time = operation_time + timedelta(minutes=log_index)
            province, _, _ = rng.choice(PROVINCES)
            rows["email_logs"].append(
                {
                    "id": new_id(),
                    "operation_id": operation_id,
                    "user_id": recipient["id"],
                    "recipient_email": recipient["email"],
                    "ip_address": f"192.0.2.{rng.randint(1, 254)}",
                    "device_type": rng.choice(DEVICE_TYPES),
                    "location": f"{province}, Cambodia",
                    "subject": rng.choice(
                        [
                            "Welcome to your HR workspace",
                            "Payroll calendar update",
                            "Staff policy announcement",
                            "សេចក្តីជូនដំណឹងសម្រាប់បុគ្គលិក",
                        ]
                    ),
                    "body": "Synthetic demo email log only. This message was not sent.",
                    "status": "sent" if sent else "failed",
                    "retry_count": 0 if sent else 1,
                    "error_message": None if sent else "Synthetic delivery failure; no message was sent.",
                    "created_at": log_time,
                    "sent_at": log_time if sent else None,
                    "updated_at": log_time,
                }
            )

        khmer_first, roman_first = FIRST_NAMES[(tenant_index - 1) % len(FIRST_NAMES)]
        khmer_last, roman_last = LAST_NAMES[(tenant_index - 1) % len(LAST_NAMES)]
        registration_id = new_id()
        registration_time = recent_timestamp(rng, now, 3)
        rows["registrations"].append(
            {
                "id": registration_id,
                "name": f"{khmer_first} ({roman_first}) {khmer_last} ({roman_last})",
                "email": f"{SEED_EMAIL_PREFIX}registration.t{tenant_index:02d}@example.test",
                "password_hash": demo_password_hash,
                "plan": plan_type,
                "verification_code_hash": registration_code_hash,
                "expires_at": now + timedelta(days=3),
                "verified_at": None,
                "created_at": registration_time,
                "updated_at": registration_time,
            }
        )

    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="validate and roll back instead of inserting the generated records",
    )
    args = parser.parse_args()

    import os

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set; run this script in the configured API environment.")

    rng = random.Random(20261006)
    now = datetime.now(timezone.utc).replace(microsecond=0)
    engine = create_engine(database_url, pool_pre_ping=True)
    inserted_counts = {}

    try:
        with engine.connect() as connection:
            transaction = connection.begin()
            try:
                users = Table("users", MetaData(), schema="public", autoload_with=connection)
                registrations = Table("registrations", MetaData(), schema="public", autoload_with=connection)
                marker = f"{SEED_EMAIL_PREFIX}%@example.test"
                previous_seed = connection.execute(
                    select(func.count())
                    .select_from(users)
                    .where(users.c.email.like(marker))
                ).scalar_one()
                previous_registrations = connection.execute(
                    select(func.count())
                    .select_from(registrations)
                    .where(registrations.c.email.like(marker))
                ).scalar_one()
                if previous_seed or previous_registrations:
                    raise RuntimeError(
                        "Cambodian demo seed records already exist; no records were inserted."
                    )

                table_counts = {}
                for name in (
                    "tenants",
                    "users",
                    "companies",
                    "company_user",
                    "positions",
                    "employees",
                    "employment_histories",
                    "salary_histories",
                    "subscriptions",
                    "invoices",
                    "notifications",
                    "login_history",
                    "files",
                    "registrations",
                    "email_bulk_operations",
                    "email_logs",
                    "plan_types",
                    "pricing_plans",
                    "system_parameters",
                ):
                    current_table = Table(name, MetaData(), schema="public", autoload_with=connection)
                    table_counts[name] = connection.execute(
                        select(func.count()).select_from(current_table)
                    ).scalar_one()

                rows = build_seed(connection, rng, now)
                metadata = MetaData()
                insertion_order = (
                    "tenants",
                    "users",
                    "companies",
                    "positions",
                    "company_user",
                    "employees",
                    "employment_histories",
                    "salary_histories",
                    "subscriptions",
                    "invoices",
                    "notifications",
                    "login_history",
                    "files",
                    "registrations",
                    "email_bulk_operations",
                    "email_logs",
                )
                for name in insertion_order:
                    seed_table = Table(name, metadata, schema="public", autoload_with=connection)
                    connection.execute(seed_table.insert(), rows[name])
                    inserted_counts[name] = len(rows[name])

                if args.dry_run:
                    transaction.rollback()
                else:
                    transaction.commit()
                print("Existing row counts:")
                for name, count in table_counts.items():
                    print(f"  {name}: {count}")
                action = "Validated and rolled back" if args.dry_run else "Inserted"
                print(f"{action} synthetic Cambodian demo rows:")
                for name, count in inserted_counts.items():
                    print(f"  {name}: {count}")
                if not args.dry_run:
                    print(f"Demo login password for generated users: {DEMO_PASSWORD}")
                    print("Generated email addresses use the reserved example.test domain.")
                    print("Email log rows are synthetic only; no messages were sent.")
            except Exception:
                if transaction.is_active:
                    transaction.rollback()
                raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
