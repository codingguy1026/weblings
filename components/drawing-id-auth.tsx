'use client';

import { useEffect, useState } from 'react';

export type DrawingIdUser = { id: string; displayName: string };
export type DrawingIdState = {
  phase: 'checking' | 'unconfigured' | 'signed-out' | 'signed-in' | 'error';
  user: DrawingIdUser | null;
};

const checking: DrawingIdState = { phase: 'checking', user: null };

export function useDrawingIdAuth() {
  const [state, setState] = useState<DrawingIdState>(checking);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/drawing-id/me', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Session verification failed');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('configured' in data)) {
          throw new Error('Unexpected session response');
        }
        const session = data as { configured: boolean; user?: DrawingIdUser | null };
        if (controller.signal.aborted) return;
        if (!session.configured) {
          setState({ phase: 'unconfigured', user: null });
        } else if (session.user && typeof session.user.id === 'string' &&
          typeof session.user.displayName === 'string') {
          setState({ phase: 'signed-in', user: session.user });
        } else {
          setState({ phase: 'signed-out', user: null });
        }
      } catch {
        if (!controller.signal.aborted) setState({ phase: 'error', user: null });
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function signOut(): Promise<boolean> {
    if (busy || state.phase !== 'signed-in') return false;
    setBusy(true);
    try {
      const response = await fetch('/api/drawing-id/logout', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) return false;
      setState({ phase: 'signed-out', user: null });
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { ...state, busy, signOut };
}

export type AuthController = ReturnType<typeof useDrawingIdAuth>;

export function DrawingIdPanel({
  auth,
  onSignOut,
}: {
  auth: AuthController;
  onSignOut: () => void;
}) {
  return (
    <div className="drawing-id-panel">
      <div className="drawing-id-panel-head">
        <span className="drawing-id-emblem" aria-hidden="true">D.</span>
        <div>
          <h3>Drawing ID</h3>
          <p>하나의 계정으로 드로잉 서비스 연결</p>
        </div>
      </div>

      {auth.phase === 'checking' && <p role="status" className="drawing-id-help">로그인 상태를 확인하고 있어요…</p>}
      {auth.phase === 'unconfigured' && (
        <p className="drawing-id-help">Drawing ID OAuth 연결 설정이 아직 완료되지 않았어요. 배포 URL과 해당 서비스의 OAuth Client ID를 설정한 후 사용할 수 있어요.</p>
      )}
      {auth.phase === 'error' && (
        <p role="alert" className="drawing-id-help">인증 서버에 연결하지 못했어요. 인터넷 연결과 환경 설정을 확인해 주세요.</p>
      )}
      {auth.phase === 'signed-out' && (
        <>
          <p className="drawing-id-help">중앙 Drawing ID 페이지에서 로그인하고, 드챗으로 돌아와요. 비밀번호를 드챗에 입력할 필요가 없어요.</p>
          <a className="primary drawing-id-link" href="/api/drawing-id/start">Drawing ID로 계속하기</a>
        </>
      )}
      {auth.phase === 'signed-in' && auth.user && (
        <>
          <div className="drawing-id-profile">
            <span className="drawing-id-user-icon">{auth.user.displayName.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{auth.user.displayName}</strong>
              <p>Drawing ID로 연결됨</p>
            </div>
            <span className="drawing-id-connected">연결됨</span>
          </div>
          <button className="secondary" type="button" disabled={auth.busy} onClick={onSignOut}>
            {auth.busy ? '로그아웃 중…' : 'Drawing Chat에서 로그아웃'}
          </button>
        </>
      )}
      <p className="drawing-id-disclaimer">이 기능은 계정 인증만 연결합니다. 채팅 기록과 친구 목록은 아직 서버와 동기화되지 않는 데모입니다.</p>
    </div>
  );
}
