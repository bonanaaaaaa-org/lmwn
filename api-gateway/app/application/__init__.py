"""Application: use cases over the domain, built from the ports they need.

Each use case is a factory, ``create_<use_case>(*, <port>=...)``, returning a
callable. Depends only on app.domain and app.application.ports.
"""
