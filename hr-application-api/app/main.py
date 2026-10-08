
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from app.config.settings import settings
from app.database.init.init_generate_uuid_v7 import run as init_generate_uuid_v7
from app.database.init.init_user import run as init_user
from app.database.session import Base, engine
from app.routers.auth import router as auth_router
from app.routers.company_router import router as company_router
from app.routers.user_router import router as user_router
from app.routers.position_router import router as position_router
from app.routers.employee_router import router as employee_router
from app.routers.history_router import router as history_router
from app.routers.file_router import router as file_router
from app.routers.dashboard_router import router as dashboard_router
from app.routers.company_user_router import router as company_user_router
from app.routers.import_router import router as import_router
from app.routers.email_router import router as email_router
from app.routers.notification_router import router as notification_router
from app.routers.system_parameter_router import router as system_parameter_router
from app.routers.subscription_router import router as subscription_router
from app.models.system_parameter import SystemParameter
from app.database.init.init_system_parameter import run as init_system_parameter
from app.routers.pricing_plan_router import router as pricing_plan_router
from app.routers.plan_type_router import router as plan_type_router
from app.routers.billing_router import router as billing_router
from app.utils.security_monitor import (
    REQUEST_FREQUENCY_WINDOW_SECONDS,
    tracker,
    get_security_request_metadata,
    observe_request,
    store_rate_limit_event,
)
from app.database.init.init_pricing_plans import run as init_pricing_plans
from app.database.init.init_plan_types import run as init_plan_types

def create_tables():
    Base.metadata.create_all(bind=engine)


# Run once on startup
create_tables()

init_generate_uuid_v7()
init_user()
init_system_parameter()
init_plan_types()
init_pricing_plans()

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title=settings.APP_NAME)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

API_REQUEST_LIMIT = 120


@app.middleware("http")
async def security_monitoring_middleware(request: Request, call_next):
    source_ip, location = get_security_request_metadata(request)
    monitored_request = source_ip is not None and not request.url.path.startswith("/uploads/")

    if monitored_request:
        request_count = tracker.record(
            source_ip,
            "api_request",
            REQUEST_FREQUENCY_WINDOW_SECONDS,
        )
        if request_count >= API_REQUEST_LIMIT:
            if tracker.alert_for_count(
                source_ip,
                "api_rate_limit",
                request_count,
                API_REQUEST_LIMIT,
            ) is not None:
                store_rate_limit_event(
                    request,
                    source_ip,
                    location,
                    f"API request rate exceeded {API_REQUEST_LIMIT} requests per minute",
                    getattr(request.state, "user_id", None),
                )
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Try again shortly."},
                headers={"Retry-After": str(REQUEST_FREQUENCY_WINDOW_SECONDS)},
            )
        else:
            response = await call_next(request)
            observe_request(request, response.status_code, getattr(request.state, "user_id", None))
    else:
        response = await call_next(request)

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=()")
    if request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(company_router)
app.include_router(user_router)
app.include_router(position_router)
app.include_router(employee_router)
app.include_router(history_router)
app.include_router(file_router)
app.include_router(dashboard_router)
app.include_router(company_user_router)
app.include_router(import_router)
app.include_router(email_router)
app.include_router(notification_router)
app.include_router(system_parameter_router)
app.include_router(subscription_router)
app.include_router(pricing_plan_router)
app.include_router(plan_type_router)
app.include_router(billing_router)