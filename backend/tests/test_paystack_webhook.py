import hashlib
import hmac

from app.services.paystack import verify_paystack_signature


def test_verify_paystack_signature_accepts_valid_digest():
    secret = "sk_test_example"
    payload = b'{"event":"charge.success","data":{"reference":"ref_123"}}'
    signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha512).hexdigest()

    assert verify_paystack_signature(payload, signature, secret) is True


def test_verify_paystack_signature_rejects_invalid_digest():
    secret = "sk_test_example"
    payload = b'{"event":"charge.success"}'

    assert verify_paystack_signature(payload, "bad-signature", secret) is False


def test_verify_paystack_signature_rejects_missing_header():
    assert verify_paystack_signature(b"{}", None, "sk_test") is False


def test_verify_paystack_signature_rejects_tampered_payload():
    secret = "sk_test_example"
    payload = b'{"event":"charge.success"}'
    signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha512).hexdigest()
    tampered = b'{"event":"charge.success","data":{"amount":1}}'

    assert verify_paystack_signature(tampered, signature, secret) is False
