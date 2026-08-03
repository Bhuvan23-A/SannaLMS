import json
import urllib.request
import urllib.error
import time

def run_test(name, url, payload, headers=None, method='POST'):
    if headers is None:
        headers = {}
    
    headers['Content-Type'] = 'application/json'
    data = json.dumps(payload).encode('utf-8') if payload else None
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    print(f"Running Test [{name}] ... ", end="", flush=True)
    try:
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            elapsed = time.time() - start_time
            print(f"SUCCESS ({elapsed:.3f}s)")
            return True, res_data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        try:
            err_json = json.loads(err_msg)
            print(f"FAILED (HTTP {e.code}): {err_json}")
        except:
            print(f"FAILED (HTTP {e.code}): {err_msg}")
        return False, None
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False, None

def test_sandbox():
    print("\n--- Testing Code Sandbox Execution (Go Engine) ---")
    url = "http://localhost:4003/api/v1/sandbox/execute"
    
    # 1. Python compilation/execution test
    python_code = "import sys\nx = sys.stdin.read().strip()\nprint(f'Hello {x}')"
    payload = {
        "language": "python",
        "code": python_code,
        "input": "SannaLMS User",
        "timeout": 3000
    }
    success, res = run_test("Python Execution", url, payload)
    if success:
        print(f"   Output: {res.get('output').strip()}")
        print(f"   Status: {res.get('status')}")
    
    # 2. Infinite Loop / Timeout test
    timeout_code = "import time\nwhile True:\n    time.sleep(1)"
    payload = {
        "language": "python",
        "code": timeout_code,
        "input": "",
        "timeout": 1500
    }
    success, res = run_test("Timeout Handling", url, payload)
    if success:
        print(f"   Status: {res.get('status')}")
        print(f"   Error: {res.get('error')}")

    # 3. C++ Compilation/Execution Test
    cpp_code = """
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << endl;
    }
    return 0;
}
"""
    payload = {
        "language": "cpp",
        "code": cpp_code,
        "input": "42 18",
        "timeout": 5000
    }
    success, res = run_test("C++ Compile & Run", url, payload)
    if success:
        print(f"   Output: {res.get('output').strip()}")
        print(f"   Status: {res.get('status')}")

def test_assessment():
    print("\n--- Testing Assessment Engine (Node.js) ---")
    
    # Check health
    success, res = run_test("Healthcheck", "http://localhost:4004/health", None, method='GET')
    if not success:
        return
    
    tenant_headers = {"x-tenant-id": "default"}
    
    # Start Session
    start_payload = {
        "studentId": "00000000-0000-0000-0000-000000000001",
        "testId": "11111111-1111-1111-1111-111111111111",
        "durationSeconds": 1800
    }
    
    success, session = run_test("Start Test Session", "http://localhost:4004/api/v1/assessment/start", start_payload, headers=tenant_headers)
    if not success:
        return
        
    question = session.get('question')
    if not question:
        print("   Warning: Question bank is currently empty. Insert mock questions in DB to test adaptive scaling.")
        return

    print(f"   Started test. First question ID: {question.get('id')} (Difficulty: {question.get('difficulty')})")

    # Submit an answer to verify adaptive selector
    submit_payload = {
        "studentId": "00000000-0000-0000-0000-000000000001",
        "testId": "11111111-1111-1111-1111-111111111111",
        "questionId": question.get('id'),
        "answer": "A"
    }
    
    success, response = run_test("Submit Answer & Adapt", "http://localhost:4004/api/v1/assessment/submit-answer", submit_payload, headers=tenant_headers)
    if success:
        print(f"   Correct: {response.get('correct')}")
        print(f"   Next Difficulty: {response.get('nextDifficulty')}")

    # Submit test
    finalize_payload = {
        "studentId": "00000000-0000-0000-0000-000000000001",
        "testId": "11111111-1111-1111-1111-111111111111"
    }
    success, final_res = run_test("Finalize Test", "http://localhost:4004/api/v1/assessment/submit-test", finalize_payload, headers=tenant_headers)
    if success:
        print(f"   Score Saved: {final_res.get('score')}")

if __name__ == "__main__":
    print("==================================================")
    print(" SannaLMS Part 3 Integration Tests Sandbox")
    print("==================================================")
    
    # We test sandbox first (Go engine)
    try:
        test_sandbox()
    except Exception as e:
        print(f"Sandbox test exception: {e}")
        
    # We test assessment next (Node service)
    try:
        test_assessment()
    except Exception as e:
        print(f"Assessment test exception: {e}")
