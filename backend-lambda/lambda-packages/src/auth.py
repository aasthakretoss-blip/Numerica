import json
import time
from typing import Dict, Any, Tuple
import requests
from jose import jwt
from functools import lru_cache
import os

JWKS_URL = os.getenv('COGNITO_JWKS_URL', '')
AUDIENCE = os.getenv('COGNITO_AUDIENCE')
ISSUER = os.getenv('COGNITO_ISSUER')

@lru_cache(maxsize=1)
def get_jwks() -> Dict[str, Any]:
    r = requests.get(JWKS_URL, timeout=5)
    r.raise_for_status()
    return r.json()

def verify_jwt(auth_header: str) -> Tuple[Dict[str, Any], str]:
    if not auth_header or not auth_header.startswith('Bearer '):
        raise ValueError('Missing or invalid Authorization header')
    token = auth_header.split(' ', 1)[1]
    jwks = get_jwks()
    unverified = jwt.get_unverified_header(token)
    kid = unverified.get('kid')
    key = next((k for k in jwks['keys'] if k['kid'] == kid), None)
    if not key:
        raise ValueError('Invalid token')
    claims = jwt.decode(token, key, options={"verify_aud": False}, issuer=ISSUER, algorithms=['RS256'])
    groups = claims.get('cognito:groups', [])
    return claims, groups

