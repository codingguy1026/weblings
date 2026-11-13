export type Tab = 'friends' | 'chats' | 'stations' | 'more';

export interface Room {
  id: string;
  kind: 'person' | 'station';
  name: string;
  initial: string;
  color: 'pink' | 'blue' | 'green' | 'orange';
  status?: string;
  description?: string;
  members?: number;
}

export interface Message {
  id: string;
  sender: 'me' | 'other';
  text: string;
  time: string;
  author?: string;
}

export const contacts: Room[] = [
  { id: 'hana', kind: 'person', name: '하나', initial: '하', color: 'pink', status: '오늘도 좋은 하루 🌿' },
  { id: 'min', kind: 'person', name: '민준', initial: '민준', color: 'blue', status: '프로젝트 만드는 중' },
  { id: 'seo', kind: 'person', name: '서윤', initial: '서', color: 'orange', status: '안녕하세요!' },
  { id: 'ji', kind: 'person', name: '지호', initial: '지', color: 'green', status: '' },
];

export const stations: Room[] = [
  { id: 'dev', kind: 'station', name: 'Drawing 개발', initial: '#', color: 'blue', members: 124, description: '새로운 Drawing 프로젝트에 대해 이야기해요.' },
  { id: 'baseball', kind: 'station', name: '야구 라운지', initial: '⚾', color: 'green', members: 86, description: '오늘의 야구 이야기를 자유롭게!' },
  { id: 'creative', kind: 'station', name: '창작자 광장', initial: '✎', color: 'pink', members: 49, description: '그림, 글, 작품에 관한 대화.' },
];

export const initialMessages: Record<string, Message[]> = {
  hana: [
    { id: 'h1', sender: 'other', text: '오늘 뭐 하고 있어?', time: '12:20' },
    { id: 'h2', sender: 'me', text: '드로잉 챗 화면 구상 중 ㅋㅋㅋ', time: '12:22' },
    { id: 'h3', sender: 'other', text: '완성되면 보여줘!', time: '12:24' },
  ],
  min: [{ id: 'm1', sender: 'other', text: '이번에 만든 화면 확인했어?', time: '11:48' }],
  seo: [{ id: 's1', sender: 'other', text: '내일 보자!', time: '어제' }],
  ji: [],
  dev: [
    { id: 'd1', sender: 'other', author: '서윤', text: 'Station에 오신 걸 환영해요! 👋', time: '12:10' },
    { id: 'd2', sender: 'other', author: '민준', text: '새 프로젝트 기대된다!', time: '12:15' },
  ],
  baseball: [{ id: 'b1', sender: 'other', author: '야구 팬', text: '오늘 경기도 재미있겠다 ⚾', time: '12:14' }],
  creative: [{ id: 'c1', sender: 'other', author: '작가', text: '이번 주 작업물 같이 공유해요.', time: '어제' }],
};
