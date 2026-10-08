from fastapi import Request


def get_request_metadata(request: Request) -> tuple[str | None, str, str | None]:
    forwarded_for = request.headers.get('x-forwarded-for')
    ip_address = forwarded_for.split(',')[0].strip() if forwarded_for else request.client.host if request.client else None
    device_type = _get_device_type(request.headers.get('user-agent', ''))
    location = _get_location(request)
    return ip_address, device_type, location


def _get_location(request: Request) -> str | None:
    country = request.headers.get('cf-ipcountry') or request.headers.get('x-country')
    city = request.headers.get('x-city') or request.headers.get('x-vercel-ip-city')
    parts = [part.strip() for part in (city, country) if part and part.strip()]
    return ', '.join(parts) or None


def _get_device_type(user_agent: str) -> str:
    user_agent_lower = user_agent.lower()

    if 'iphone' in user_agent_lower:
        return 'iPhone'
    if 'ipad' in user_agent_lower:
        return 'iPad'
    if 'android' in user_agent_lower:
        return 'Android'
    if 'edg/' in user_agent_lower or 'edge/' in user_agent_lower:
        return 'Edge'
    if 'chrome/' in user_agent_lower or 'crios/' in user_agent_lower:
        return 'Chrome'
    if 'firefox/' in user_agent_lower or 'fxios/' in user_agent_lower:
        return 'Firefox'
    if 'safari/' in user_agent_lower:
        return 'Safari'
    if 'opera/' in user_agent_lower or 'opr/' in user_agent_lower:
        return 'Opera'

    return 'Other'


def get_browser_and_device(user_agent: str) -> tuple[str, str]:
    user_agent_lower = user_agent.lower()

    if 'edg/' in user_agent_lower or 'edge/' in user_agent_lower:
        browser = 'Edge'
    elif 'opr/' in user_agent_lower or 'opera' in user_agent_lower:
        browser = 'Opera'
    elif 'firefox/' in user_agent_lower or 'fxios/' in user_agent_lower:
        browser = 'Firefox'
    elif 'chrome/' in user_agent_lower or 'crios/' in user_agent_lower:
        browser = 'Chrome'
    elif 'safari/' in user_agent_lower:
        browser = 'Safari'
    else:
        browser = 'Other'

    if 'iphone' in user_agent_lower:
        device = 'iPhone'
    elif 'ipad' in user_agent_lower:
        device = 'iPad'
    elif 'android' in user_agent_lower:
        device = 'Android'
    elif 'windows' in user_agent_lower:
        device = 'Windows'
    elif 'macintosh' in user_agent_lower or 'mac os' in user_agent_lower:
        device = 'macOS'
    elif 'linux' in user_agent_lower:
        device = 'Linux'
    else:
        device = 'Other'

    return browser, device