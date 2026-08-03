/**
 * Day 9 - Lightweight Browser Lockdown & Violation Detector Snippet
 * Inject this script into any LMS exam page to automatically detect:
 * 1. Tab switching / Visibility change
 * 2. Window loss of focus (blur)
 * 3. Copy, Cut, and Paste attempts
 * 4. Context menu (right click) prevention
 * 5. Common developer tool shortcuts (F12, Ctrl+Shift+I)
 */

(function () {
    const CONFIG = {
        apiEndpoint: '/api/proctoring/violations',
        studentId: window.LMS_STUDENT_ID || 'STU_101',
        examId: window.LMS_EXAM_ID || 'EXAM_999',
        enabled: true
    };

    function sendViolation(eventType, details = {}) {
        if (!CONFIG.enabled) return;

        const payload = {
            student_id: CONFIG.studentId,
            exam_id: CONFIG.examId,
            event_type: eventType,
            timestamp: new Date().toISOString(),
            details: details
        };

        console.warn(`[LMS Proctoring Alert] Violation Detected: ${eventType}`, payload);

        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error('[LMS Proctoring] Failed to log violation:', err));

        // Dispatch custom browser event for UI warning toast
        window.dispatchEvent(new CustomEvent('lmsViolationEvent', { detail: payload }));
    }

    // 1. Tab Switch / Visibility Change Detection
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            sendViolation('tab_switch', { state: 'hidden', userAgent: navigator.userAgent });
        }
    });

    // 2. Window Blur (Focus Loss)
    window.addEventListener('blur', function () {
        sendViolation('window_blur', { reason: 'window_lost_focus' });
    });

    // 3. Copy / Cut / Paste Detection
    document.addEventListener('copy', function (e) {
        sendViolation('copy_attempt', { selection: window.getSelection().toString().substring(0, 50) });
    });

    document.addEventListener('cut', function (e) {
        sendViolation('cut_attempt');
    });

    document.addEventListener('paste', function (e) {
        sendViolation('paste_attempt');
    });

    // 4. Disable Context Menu (Right Click)
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        sendViolation('right_click_attempt');
    });

    // 5. Detect Developer Tools Shortcuts
    document.addEventListener('keydown', function (e) {
        // F12 or Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+U
        if (
            e.keyCode === 123 ||
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
            (e.ctrlKey && e.keyCode === 85)
        ) {
            e.preventDefault();
            sendViolation('devtools_attempt', { keyCode: e.keyCode });
        }
    });

    console.log('✅ LMS Exam Browser Lockdown System Initialized.');
})();
