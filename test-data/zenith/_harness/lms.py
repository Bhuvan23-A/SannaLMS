"""Shared helpers for SannaLMS Zenith end-to-end testing."""
import json
import sys
import io
import time
import requests
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "https://sannalms.sannainnovations.com"
API = BASE + "/api/v1"
KC_TOKEN_URL = BASE + "/auth/realms/sannalms/protocol/openid-connect/token"
CLIENT_ID = "sannalms-client"

SSH_HOST = "195.35.21.204"
SSH_USER = "root"
SSH_PASSWORD = "FCx.xfQ9grQg7WdB"

SUPERADMIN = {"username": "superadmin", "password": "Admin@123"}

_results = []


def log(msg):
    print(msg, flush=True)


def record(suite, name, ok, detail="", critical=True):
    _results.append({"suite": suite, "name": name, "ok": bool(ok),
                     "detail": str(detail)[:300], "critical": critical})
    tag = "PASS" if ok else ("FAIL" if critical else "warn")
    log(f"  [{tag}] {name}" + (f" — {str(detail)[:200]}" if detail else ""))


def dump_results(path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(_results, f, indent=1)


_token_cache = {}


def get_token(username, password):
    key = username
    cached = _token_cache.get(key)
    now = time.time()
    if cached and cached["exp"] > now + 30:
        return cached["token"]
    for attempt in range(3):
        try:
            r = requests.post(KC_TOKEN_URL, data={
                "grant_type": "password",
                "client_id": CLIENT_ID,
                "username": username,
                "password": password,
            }, timeout=30)
            if r.status_code == 200:
                tok = r.json()
                _token_cache[key] = {
                    "token": tok["access_token"],
                    "exp": now + int(tok.get("expires_in", 60)),
                }
                return tok["access_token"]
            if r.status_code == 401:
                raise RuntimeError(f"login failed for {username}: 401 {r.text[:200]}")
            time.sleep(1)
        except requests.RequestException:
            if attempt == 2: raise
            time.sleep(1)
    raise RuntimeError(f"login failed for {username}: {r.status_code} {r.text[:200]}")


def api(method, path, token=None, json_body=None, params=None, files=None,
        data=None, headers=None, expect_json=True):
    """Call the API through Kong. Returns (status_code, parsed_or_raw)."""
    h = {}
    if token:
        h["Authorization"] = "Bearer " + token
    if headers:
        h.update(headers)
    url = path if path.startswith("http") else API + path
    try:
        r = requests.request(method, url, json=json_body, params=params,
                             files=files, data=data, headers=h, timeout=60)
    except requests.RequestException as e:
        return 0, f"network error: {e}"
    if not expect_json:
        return r.status_code, r.text[:400]
    try:
        return r.status_code, r.json()
    except ValueError:
        return r.status_code, r.text[:400]


def superadmin_headers():
    tok = get_token(**SUPERADMIN)
    return {"Authorization": "Bearer " + tok}


def as_user(email, password="Test@1234"):
    return get_token(email, password)


_ssh = None


def ssh_run(cmd, timeout=60):
    global _ssh
    if _ssh is None:
        _ssh = paramiko.SSHClient()
        _ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        _ssh.connect(SSH_HOST, username=SSH_USER, password=SSH_PASSWORD,
                     timeout=15, look_for_keys=False, allow_agent=False)
    _, stdout, stderr = _ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out.strip(), err.strip()


def sql(db, query):
    """Run a read query in a service database; returns list of dict rows."""
    import base64
    wrapped = ("SELECT coalesce(json_agg(t), '[]'::json) AS data "
               "FROM (%s) t" % query.rstrip().rstrip(";"))
    b64 = base64.b64encode(wrapped.encode()).decode()
    cmd = ("echo %s | base64 -d > /tmp/_q.sql; "
           "cat /tmp/_q.sql | docker exec -i sannalms-postgres psql "
           "-U postgres -d %s -A -t -f -" % (b64, db))
    out, err = ssh_run(cmd)
    line = "".join(out.strip().splitlines()) if out.strip() else ""
    if not line:
        return [{"__error__": (err or "empty result")[:200]}]
    try:
        return json.loads(line)
    except ValueError:
        return [{"__error__": (err or line)[:400]}]


def exec_sql(db, stmt):
    """Run a write statement (DELETE/UPDATE/INSERT); returns ('DELETE n', err)."""
    import base64
    b64 = base64.b64encode(stmt.encode()).decode()
    cmd = ("echo %s | base64 -d > /tmp/_w.sql; "
           "cat /tmp/_w.sql | docker exec -i sannalms-postgres psql "
           "-U postgres -d %s -A -t" % (b64, db))
    return ssh_run(cmd)


def summary():
    total = len(_results)
    passed = sum(1 for r in _results if r["ok"])
    failed = [r for r in _results if not r["ok"]]
    crit_failed = [r for r in failed if r["critical"]]
    log("")
    log("=" * 64)
    log(f"TOTAL {total} | PASS {passed} | FAIL {len(failed)} ({len(crit_failed)} critical)")
    for r in failed:
        log(f"  [{'CRIT' if r['critical'] else 'warn'}] {r['suite']}/{r['name']}: {r['detail']}")
    return {"total": total, "passed": passed, "failed": len(failed),
            "critical_failed": len(crit_failed)}
