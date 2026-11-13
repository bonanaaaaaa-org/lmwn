"""Domain errors: invariant violations raised by domain constructors and factories."""


class DomainError(Exception):
    """A value breaks a domain rule."""


class InvalidWorkingHours(DomainError):
    """Working Hours cannot be normalised: a day outside 1-7 or a time that is not HH:MM."""
