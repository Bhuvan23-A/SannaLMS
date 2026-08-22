import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, keycloak } from '../api/client';

export interface ExamViolation {
  event_type: string;
  timestamp: string;
  details: Record<string, any>;
}

interface UseExamProctoringOptions {
  enabled: boolean;
  studentId?: string;
  examId?: string;
  maxStrikes?: number;
  onAutoSubmit?: () => void;
  onViolation?: (violation: ExamViolation) => void;
  onMobileDetected?: () => void;
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    || (navigator.maxTouchPoints > 0 && /Mobi|Android/i.test(ua));
}

// In-browser exam lockdown: detect tab switches / focus loss / copy-paste /
// devtools shortcuts, log every event to the Part-4 proctoring service through
// Kong, count strikes, and auto-submit the exam once the threshold is reached.
// Honest limitation: a web page cannot hard-block Alt+Tab — this deters,
// records, and penalizes instead (proctor review happens in the admin UI).
export function useExamProctoring({
  enabled,
  studentId,
  examId,
  maxStrikes = 3,
  onAutoSubmit,
  onViolation,
  onMobileDetected,
}: UseExamProctoringOptions) {
  const [strikes, setStrikes] = useState(0);
  const [lastViolation, setLastViolation] = useState<ExamViolation | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const strikesRef = useRef(0);
  const autoSubmittedRef = useRef(false);
  const cbRef = useRef({ onAutoSubmit, onViolation });
  cbRef.current = { onAutoSubmit, onViolation };

  const sendViolation = useCallback(
    (eventType: string, details: Record<string, any> = {}) => {
      if (!enabled) return;
      const deviceType = isMobileDevice() ? 'mobile' : 'desktop';
      const violation: ExamViolation = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        details: { ...details, device_type: deviceType },
      };
      setLastViolation(violation);
      setStrikes((prev) => {
        const next = prev + 1;
        strikesRef.current = next;
        return next;
      });
      cbRef.current.onViolation?.(violation);

      apiClient
        .post('/proctoring/violations', {
          student_id: studentId || keycloak.subject || '',
          exam_id: examId || '',
          event_type: eventType,
          timestamp: violation.timestamp,
          details,
        })
        .catch(() => {});
    },
    [enabled, studentId, examId],
  );

  useEffect(() => {
    if (!enabled) return;
    autoSubmittedRef.current = false;
    strikesRef.current = 0;
    setStrikes(0);
    setLastViolation(null);
    setAutoSubmitted(false);

    // Detect mobile device at exam start
    if (isMobileDevice()) {
      sendViolation('mobile_device_detected', {
        device_type: 'mobile',
        user_agent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
      });
      onMobileDetected?.();
    }

    const onVisibility = () => {
      if (document.hidden) sendViolation('tab_switch', { state: 'hidden' });
    };
    const onBlur = () => sendViolation('window_blur', { reason: 'window_lost_focus' });
    const onCopy = () => sendViolation('copy_attempt');
    const onCut = () => sendViolation('cut_attempt');
    const onPaste = () => sendViolation('paste_attempt');
    const onContextMenu = (e: Event) => {
      e.preventDefault();
      sendViolation('right_click_attempt');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const kc = e.keyCode;
      if (
        kc === 123 ||
        (e.ctrlKey && e.shiftKey && (kc === 73 || kc === 74 || kc === 67)) ||
        (e.ctrlKey && kc === 85)
      ) {
        e.preventDefault();
        sendViolation('devtools_attempt', { keyCode: kc });
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [enabled, sendViolation]);

  useEffect(() => {
    if (!enabled || autoSubmittedRef.current) return;
    if (strikes >= maxStrikes) {
      autoSubmittedRef.current = true;
      setAutoSubmitted(true);
      cbRef.current.onAutoSubmit?.();
    }
  }, [enabled, strikes, maxStrikes]);

  const reset = useCallback(() => {
    autoSubmittedRef.current = false;
    strikesRef.current = 0;
    setStrikes(0);
    setLastViolation(null);
    setAutoSubmitted(false);
  }, []);

  return { strikes, lastViolation, autoSubmitted, reset };
}