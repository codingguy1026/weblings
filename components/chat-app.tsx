'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { contacts, initialMessages, stations, type Message, type Room, type Tab } from '../lib/demo';

const STORAGE_KEY = 'drawing-chat-next-demo-v1';
type IconName = 'users' | 'chat' | 'hash' | 'more' | 'search' | 'plus' | 'back' | 'send' | 'moon' | 'shield' | 'info';
const shapes: Record<IconName, ReactNode> = {
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  chat: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5a8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />,
  hash: <><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="11" y1="3" x2="7" y2="21" /><line x1="17" y1="3" x2="13" y2="21" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z" />,
  shield: <><path d="m12 22 7-4V6l-7-4-7 4v12z" /><path d="m9 12 2 2 4-4" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
};
function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>;
}
const tabs: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'friends', label: '친구', icon: 'users' },
  { key: 'chats', label: '채팅', icon: 'chat' },
  { key: 'stations', label: 'Station', icon: 'hash' },
  { key: 'more', label: '더보기', icon: 'more' },
];
const titles: Record<Tab, string> = { friends: '친구', chats: '채팅', stations: '스테이션', more: '더보기' };
function Avatar({ room }: { room: Room }) {
  return <span className={'pfp ' + room.color + (room.kind === 'station' ? ' station' : '')} aria-hidden="true">{room.initial}</span>;
}
function validMessages(value: unknown): value is Message[] {
  return Array.isArray(value) && value.length < 1000 && value.every(item =>
    item && typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.text === 'string' && item.text.length <= 2000 &&
    typeof item.time === 'string' &&
    (item.sender === 'me' || item.sender === 'other') &&
    (item.author === undefined || typeof item.author === 'string')
  );
}

export default function ChatApp() {
  const [tab, setTab] = useState<Tab>('chats');
  const [selectedId, setSelectedId] = useState('hana');
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [joined, setJoined] = useState<string[]>(['dev']);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          const data = saved as { messages?: unknown; joined?: unknown; theme?: unknown };
          if (data.messages && typeof data.messages === 'object') {
            const verified: Record<string, Message[]> = {};
            for (const room of [...contacts, ...stations]) {
              const candidate = (data.messages as Record<string, unknown>)[room.id];
              if (validMessages(candidate)) verified[room.id] = candidate;
            }
            setMessages({ ...initialMessages, ...verified });
          }
          if (data.theme === 'dark') setTheme('dark');
          if (Array.isArray(data.joined)) {
            setJoined(data.joined.filter((id): id is string => typeof id === 'string' && stations.some(s => s.id === id)));
          }
        }
      }
    } catch {
      // If storage is invalid or disabled, use the in-memory demo.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, theme, joined }));
    } catch {
      // Private browsing may prevent saving local demo data.
    }
  }, [messages, theme, joined, hydrated]);

  useEffect(() => {
    if (opened && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [opened, selectedId, messages]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const selected = [...contacts, ...stations].find(room => room.id === selectedId) ?? contacts[0];
  const isStation = selected.kind === 'station';
  const isJoined = joined.includes(selected.id);
  const currentMessages = messages[selected.id] ?? [];
  const possibleRooms = tab === 'friends' ? contacts : tab === 'stations'
    ? stations : contacts.filter(room => (messages[room.id] ?? []).length > 0);
  const visibleRooms = possibleRooms.filter(room =>
    (room.name + ' ' + (room.status ?? '') + ' ' + (room.description ?? '')).toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );

  function switchTab(next: Tab) {
    setTab(next);
    setOpened(false);
    setQuery('');
  }
  function openRoom(room: Room) {
    setSelectedId(room.id);
    setTab(room.kind === 'station' ? 'stations' : 'chats');
    setOpened(true);
    setDraft('');
    setQuery('');
  }
  function sendMessage() {
    const text = draft.trim();
    if (!text || (isStation && !isJoined)) return;
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const item: Message = { id: crypto.randomUUID(), sender: 'me', text, time };
    setMessages(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), item] }));
    setDraft('');
  }
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }
  function onDraftKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  }
  function resetDemo() {
    setMessages(initialMessages);
    setJoined(['dev']);
    setNotice('데모 대화가 초기화되었어요.');
  }
  const changeTheme = () => setTheme(value => value === 'dark' ? 'light' : 'dark');

  return (
    <div className={'app' + (opened ? ' detail-open' : '')}>
      <nav className="rail" aria-label="주 메뉴">
        <div className="logo" aria-label="Drawing Chat">d.</div>
        {tabs.slice(0, 3).map(item => (
          <button key={item.key} type="button" className={tab === item.key ? 'active' : ''} onClick={() => switchTab(item.key)} title={item.label} aria-label={item.label}>
            <Icon name={item.icon} />
            {tab === item.key && <span className="dot" />}
          </button>
        ))}
        <div className="rail-spacer" />
        <button type="button" className={tab === 'more' ? 'active' : ''} onClick={() => switchTab('more')} title="더보기" aria-label="더보기"><Icon name="more" /></button>
        <button type="button" className="avatar" onClick={() => switchTab('more')} aria-label="내 정보">D</button>
      </nav>

      <aside className="panel" aria-label={titles[tab] + ' 목록'}>
        <div className="panel-head">
          <div className="eyebrow">DRAWING / CHAT</div>
          <div className="heading">
            <h1>{titles[tab]}</h1>
            {tab !== 'more' && <button type="button" className="icon-btn" aria-label="새 대화" onClick={() => { switchTab('friends'); setNotice('친구 목록에서 대화를 시작해 보세요.'); }}><Icon name="plus" /></button>}
          </div>
        </div>
        {tab !== 'more' && <label className="search"><Icon name="search" /><input type="search" aria-label={titles[tab] + ' 검색'} value={query} onChange={event => setQuery(event.target.value)} placeholder="이름 또는 대화 검색" autoComplete="off" /></label>}
        <div className="list">
          {tab === 'more' ? (
            <>
              <div className="list-title">DRAWING CHAT</div>
              <button type="button" className="item" onClick={changeTheme}><Icon name="moon" /><span className="item-content"><span className="item-name">테마 변경</span><span className="item-sub">현재 {theme === 'dark' ? '다크' : '라이트'} 모드</span></span></button>
              <button type="button" className="item" onClick={() => setNotice('아직 실제 로그인이나 서버 연결이 없는 UI 시제품이에요.')}><Icon name="shield" /><span className="item-content"><span className="item-name">개인정보 및 보안</span><span className="item-sub">시제품 사용 안내</span></span></button>
            </>
          ) : (
            <>
              <div className="list-title">{tab === 'friends' ? '내 친구 · ' + contacts.length + '명' : tab === 'stations' ? '둘러보기 · ' + stations.length + '개' : '최근 대화'}</div>
              {visibleRooms.length === 0 ? <p className="notice">검색 결과가 없어요.</p> : visibleRooms.map(room => {
                const last = (messages[room.id] ?? []).at(-1);
                return <button key={room.id} className={'item' + (opened && selected.id === room.id ? ' selected' : '')} type="button" onClick={() => openRoom(room)}>
                  <Avatar room={room} />
                  <span className="item-content"><span className="item-name">{room.name}</span><span className="item-sub">{room.kind === 'station' ? room.description : last?.text ?? room.status ?? '대화를 시작해 보세요'}</span></span>
                  <span className="item-meta"><span className="item-time">{last?.time ?? ''}</span></span>
                </button>;
              })}
            </>
          )}
        </div>
        <div className="mobile-header">메시지 중심의 클래식 메신저 · UI 시제품</div>
      </aside>

      <section className="workspace" aria-label="대화 또는 상세 정보">
        {opened ? (
          <>
            <header className="conversation-head">
              <button className="mobile-back" type="button" aria-label="목록으로 돌아가기" onClick={() => setOpened(false)}><Icon name="back" /></button>
              <Avatar room={selected} />
              <div className="title-wrap"><h2>{selected.name}</h2><div className="subline">{isStation ? (selected.members ?? 0) + '명 참여 · Station' : '개인 채팅 · 데모'}</div></div>
              <div className="head-actions"><button type="button" className="icon-btn" aria-label="대화 정보" onClick={() => setNotice('대화 정보 기능은 다음 버전에 추가할 예정이에요.')}><Icon name="info" /></button></div>
            </header>
            <main className="messages" ref={messagesRef} aria-label="메시지 목록">
              <div className="day">DRAWING CHAT · UI 시제품</div>
              {currentMessages.map(message => {
                const mine = message.sender === 'me';
                const displayName = message.author ?? (mine ? '나' : selected.name);
                return <div className={'message' + (mine ? ' mine' : '')} key={message.id}>
                  {!mine && <span className="pfp blue" aria-hidden="true">{displayName.slice(0, 1)}</span>}
                  <div className="bubble-wrap">{isStation && !mine && <span className="sender">{displayName}</span>}<div className="bubble">{message.text}</div></div>
                  <span className="timestamp">{message.time}</span>
                </div>;
              })}
              {currentMessages.length === 0 && <p className="notice">아직 메시지가 없어요. 첫 대화를 시작해 보세요!</p>}
            </main>
            {isStation && !isJoined ? (
              <div className="composer-wrap"><button className="primary" type="button" onClick={() => { setJoined(prev => [...prev, selected.id]); setNotice('Station에 참여했어요 (데모).'); }}>이 Station에 참여하기</button><div className="fineprint">참여 후 데모 채널에 메시지를 작성할 수 있어요.</div></div>
            ) : (
              <form className="composer-wrap" onSubmit={onSubmit}>
                <div className="composer">
                  <textarea rows={1} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onDraftKey} aria-label="메시지 입력" placeholder="메시지 입력..." />
                  <button className="send" type="submit" aria-label="메시지 전송" disabled={!draft.trim()}><Icon name="send" /></button>
                </div>
                <div className="fineprint">Enter 전송 · Shift+Enter 줄바꿈 · 이 브라우저에만 저장되는 데모 메시지</div>
              </form>
            )}
          </>
        ) : tab === 'friends' ? (
          <div className="detail-content">
            <div className="kicker">YOUR CONNECTIONS</div><h2 className="hero-title">친구와 바로 대화하세요.</h2>
            <p className="intro">기존 메신저처럼 간단한 친구 목록. 소셜 피드를 강제로 끼워 넣지 않습니다.</p>
            {contacts.map(room => <div className="feature" key={room.id}><Avatar room={room} /><div className="feature-main"><h3>{room.name}</h3><p>{room.status || '상태 메시지가 없습니다'}</p></div><button className="secondary" type="button" onClick={() => openRoom(room)}>대화</button></div>)}
          </div>
        ) : tab === 'stations' ? (
          <div className="detail-content">
            <div className="kicker">OPEN CONVERSATIONS</div><h2 className="hero-title">Station에서 모여요.</h2>
            <p className="intro">개인 채팅과 분리된 관심사 공간. 직접 들어갈 때만 대화가 보여요.</p>
            {stations.map(room => <div className="feature" key={room.id}><Avatar room={room} /><div className="feature-main"><h3>{room.name}</h3><p>{room.description} · {room.members}명</p></div><button className="secondary" type="button" onClick={() => openRoom(room)}>열기</button></div>)}
          </div>
        ) : tab === 'more' ? (
          <div className="detail-content">
            <div className="kicker">DRAWING ECOSYSTEM</div><h2 className="hero-title">메신저는 메신저답게.</h2>
            <p className="intro">친구, 채팅, Station을 단순하게 분리한 Drawing Chat 디자인입니다.</p>
            <div className="feature"><Icon name="moon" /><div className="feature-main"><h3>화면 테마</h3><p>클래식 라이트 / 다크</p></div><button className="secondary" type="button" onClick={changeTheme}>{theme === 'dark' ? '라이트로' : '다크로'}</button></div>
            <div className="notice"><strong>시제품 안내</strong><p>Drawing ID 로그인, 실시간 메시지, 사용자 동기화, 신고, 푸시 알림, 종단간 암호화는 아직 구현되지 않았습니다. 가상의 친구와 메시지만 있으며 입력은 브라우저에만 저장됩니다. 개인정보나 비밀번호를 입력하지 마세요.</p></div>
            <button className="secondary reset-button" type="button" onClick={resetDemo}>데모 메시지 초기화</button>
          </div>
        ) : (
          <div className="empty">
            <span className="mark"><Icon name="chat" /></span>
            <span className="kicker">CONNECT PEOPLE · STAY SIMPLE</span>
            <h2>대화는 더 가볍게.</h2>
            <p>친구와 이야기하고, 관심사로 모이는 공간.<br />Drawing Chat의 클래식 메신저를 체험해 보세요.</p>
            <button className="primary" type="button" onClick={() => openRoom(contacts[0])}>대화 시작하기</button>
          </div>
        )}
      </section>

      <nav className="mobile-nav" aria-label="하단 메뉴">
        {tabs.map(item => <button key={item.key} type="button" className={tab === item.key ? 'active' : ''} onClick={() => switchTab(item.key)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
      </nav>
      {notice && <div className="toasts" role="status">{notice}</div>}
    </div>
  );
}
