"""FastAPI providers handing routers their use cases (overridden in tests)."""

from fastapi import Request

from app.application.get_guide_detail import GetGuideDetail


def get_guide_detail_use_case(request: Request) -> GetGuideDetail:
    return request.app.state.use_cases.get_guide_detail
