import logging

import pytest

from app.services import geoip as geoip_module
from app.services.geoip import init_geoip, lookup_country, lookup_country_code, resolve_geolite2_db_path


@pytest.fixture(autouse=True)
def reset_geoip_reader():
    geoip_module.close_geoip()
    yield
    geoip_module.close_geoip()


def test_resolve_geolite2_db_path_is_absolute():
    path = resolve_geolite2_db_path()
    assert path.is_absolute()


def test_lookup_country_code_public_ip(caplog):
    reader = init_geoip()
    if reader is None:
        pytest.skip("GeoLite2-Country.mmdb not available in this environment")

    caplog.set_level(logging.DEBUG)
    assert lookup_country_code("8.8.8.8") == "US"

    code, name = lookup_country("8.8.8.8")
    assert code == "US"
    assert name == "United States"


def test_lookup_country_code_logs_address_not_found(caplog):
    reader = init_geoip()
    if reader is None:
        pytest.skip("GeoLite2-Country.mmdb not available in this environment")

    caplog.set_level(logging.DEBUG)
    assert lookup_country_code("203.0.113.5") is None
    assert any("not found" in record.message.lower() for record in caplog.records)


def test_lookup_country_code_skips_localhost():
    assert lookup_country_code("127.0.0.1") is None
    assert lookup_country_code("::1") is None
