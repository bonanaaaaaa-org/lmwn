import dataclasses

import pytest

from app.domain.guide import Guide
from app.domain.guide_search import GuideQuery
from tests.builders import a_guide


def guide(
    *,
    title: str = "Guide",
    short_description: str = "",
    tags: tuple[str, ...] = (),
) -> Guide:
    return dataclasses.replace(
        a_guide("guide-1", []),
        title=title,
        short_description=short_description,
        tags=tags,
    )


@pytest.mark.parametrize("text", ["", "   ", "\t\n "])
def test_empty_or_whitespace_text_matches_every_guide(text: str) -> None:
    assert GuideQuery.create(text=text).matches(guide(title="anything"))


@pytest.mark.parametrize(
    "field",
    [
        {"title": "10 คาเฟ่ลับ One Bangkok!"},
        {"short_description": "รวมคาเฟ่ลับที่ One Bangkok"},
        {"tags": ("คาเฟ่ลับ",)},
    ],
)
def test_thai_text_matches_inside_words_of_title_short_description_or_a_tag(
    field: dict[str, str | tuple[str, ...]],
) -> None:
    assert GuideQuery.create(text="คาเฟ่").matches(guide(**field))  # pyrefly: ignore[bad-argument-type]


def test_text_found_in_no_searched_field_does_not_match() -> None:
    # The description and Guide Items are not searched.
    query = GuideQuery.create(text="matcha")

    assert not query.matches(
        guide(title="Hidden café", short_description="coffee", tags=("cafe",))
    )


def test_text_is_trimmed_and_matched_ignoring_case() -> None:
    assert GuideQuery.create(text="  HIDDEN CAFÉ ").matches(
        guide(title="a hidden café")
    )


def test_text_and_fields_are_compared_after_nfc_normalisation() -> None:
    # "ปุ่ม" with sara u (U+0E38) and mai ek (U+0E48) typed in either order.
    canonical = "\u0e1b\u0e38\u0e48\u0e21"
    reordered = "\u0e1b\u0e48\u0e38\u0e21"
    decomposed_cafe = "cafe\u0301"

    assert GuideQuery.create(text=reordered).matches(guide(title=f"กด{canonical}"))
    assert GuideQuery.create(text=canonical).matches(guide(title=f"กด{reordered}"))
    assert GuideQuery.create(text="café").matches(guide(title=decomposed_cafe))


@pytest.mark.parametrize("text", [".*", "caf.", "(", "[a-z]+", "\\d"])
def test_text_is_a_plain_substring_never_a_pattern(text: str) -> None:
    assert not GuideQuery.create(text=text).matches(guide(title="cafe 10"))
    assert GuideQuery.create(text=text).matches(guide(title=f"x{text}x"))


def test_a_guide_must_have_every_given_tag_exactly() -> None:
    query = GuideQuery.create(tags=["กาแฟ", "One"])

    assert query.matches(guide(tags=("One", "กาแฟ", "Bangkok")))
    assert not query.matches(guide(tags=("กาแฟ",)))
    assert not query.matches(guide(tags=("กาแฟ", "one")))
    assert not query.matches(guide(tags=("กาแฟ", "One Bangkok")))


def test_tags_compare_after_nfc_normalisation() -> None:
    assert GuideQuery.create(tags=["cafe\u0301"]).matches(guide(tags=("café",)))


def test_text_and_tags_combine_with_and() -> None:
    query = GuideQuery.create(text="hidden", tags=["cafe"])

    assert query.matches(guide(title="Hidden gems", tags=("cafe",)))
    assert not query.matches(guide(title="Hidden gems", tags=("bar",)))
    assert not query.matches(guide(title="Open gems", tags=("cafe",)))
