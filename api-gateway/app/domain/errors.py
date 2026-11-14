"""Domain errors: invariant violations raised by domain constructors and factories."""


class DomainError(Exception):
    """A value breaks a domain rule."""


class InvalidWorkingHours(DomainError):
    """Working Hours break a domain rule.

    For example a day outside 1-7, a time that is not HH:MM, an opening range that
    is empty or longer than 24 hours, or a week that is not exactly 7 days.
    """
