"""Hexagonal boundary: the domain and application layers stay framework-free.

domain   -> standard library only
application -> standard library + app.domain + app.application
Adapters, composition and main may import anything.
"""

import ast
import sys
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[1] / "app"


def _imported_modules(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(), filename=str(path))
    modules: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            modules.add(node.module)
    return modules


def _is_stdlib(module: str) -> bool:
    return module.split(".")[0] in sys.stdlib_module_names


def _violations(layer: str, allowed_app_prefixes: tuple[str, ...]) -> list[str]:
    found: list[str] = []
    for path in sorted((APP / layer).rglob("*.py")):
        for module in _imported_modules(path):
            if _is_stdlib(module):
                continue
            if module == "app" or not module.startswith(allowed_app_prefixes):
                found.append(f"{path.relative_to(APP.parent)} imports {module}")
    return found


@pytest.mark.parametrize(
    ("layer", "allowed"),
    [
        ("domain", ("app.domain",)),
        ("application", ("app.domain", "app.application")),
    ],
)
def test_inner_layers_import_only_stdlib_and_inner_layers(
    layer: str, allowed: tuple[str, ...]
) -> None:
    assert _violations(layer, allowed) == []


def test_boundary_check_detects_a_framework_import(tmp_path: Path) -> None:
    offender = tmp_path / "offender.py"
    offender.write_text("import fastapi\nfrom app.adapters.inbound import http\n")

    modules = _imported_modules(offender)

    assert {"fastapi", "app.adapters.inbound"} <= modules
    assert not any(_is_stdlib(m) for m in modules)
