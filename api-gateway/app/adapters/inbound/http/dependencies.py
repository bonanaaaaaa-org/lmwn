"""FastAPI providers handing routers their use cases (overridden in tests)."""

from fastapi import Request

from app.application.get_guide_detail import GetGuideDetail
from app.application.list_guides import ListGuides
from app.application.ports.photo_source import PhotoSource


def get_guide_detail_use_case(request: Request) -> GetGuideDetail:
    return request.app.state.use_cases.get_guide_detail


def get_list_guides_use_case(request: Request) -> ListGuides:
    return request.app.state.use_cases.list_guides


def get_photo_source(request: Request) -> PhotoSource:
    return request.app.state.photo_source
