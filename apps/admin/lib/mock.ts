// 정적 목업 데이터 — Claude Design "Omniseed Admin" 시안의 DCLogic 데이터를 이식.
// DB/API 연동 없음. 템플릿 표시용.

export type StatusTone = "active" | "dormant" | "left";
export type TierKey = "platinum" | "gold" | "silver" | "bronze";
export type AvatarTone = "dark" | "gray" | "mid";

export type Member = {
  id: number;
  name: string;
  initial: string;
  email: string;
  joined: string;
  last: string;
  avatar: AvatarTone;
  status: StatusTone;
  tier: TierKey;
};

export const AVATAR_COLORS: Record<AvatarTone, { bg: string; fg: string }> = {
  dark: { bg: "#1a1a1a", fg: "#ffffff" },
  gray: { bg: "#e5e5e5", fg: "#454545" },
  mid: { bg: "#454545", fg: "#ffffff" },
};

export const STATUS_META: Record<
  StatusTone,
  { label: string; fg: string; bg: string; dot: string }
> = {
  active: { label: "활성", fg: "#1a1a1a", bg: "#ebebeb", dot: "#1a1a1a" },
  dormant: { label: "휴면", fg: "#757575", bg: "#f1f1f1", dot: "#8f8f8f" },
  left: { label: "탈퇴", fg: "#ba1a1a", bg: "#ffdad6", dot: "#ba1a1a" },
};

export const TIER_META: Record<
  TierKey,
  { label: string; icon: string; color: string }
> = {
  platinum: { label: "플래티넘", icon: "workspace_premium", color: "#1a1a1a" },
  gold: { label: "골드", icon: "military_tech", color: "#2e2e2e" },
  silver: { label: "실버", icon: "star", color: "#5c5c5c" },
  bronze: { label: "브론즈", icon: "star", color: "#8f8f8f" },
};

export const members: Member[] = [
  { id: 1, name: "김서연", initial: "김", email: "seoyeon.kim@gmail.com", joined: "2026.06.22", last: "2시간 전", avatar: "dark", status: "active", tier: "platinum" },
  { id: 2, name: "이준호", initial: "이", email: "junho.lee@naver.com", joined: "2026.06.20", last: "어제", avatar: "gray", status: "active", tier: "gold" },
  { id: 3, name: "박지민", initial: "박", email: "jimin.park@kakao.com", joined: "2026.06.18", last: "5시간 전", avatar: "mid", status: "active", tier: "gold" },
  { id: 4, name: "최민준", initial: "최", email: "minjun.choi@gmail.com", joined: "2026.06.15", last: "3일 전", avatar: "gray", status: "dormant", tier: "silver" },
  { id: 5, name: "정하윤", initial: "정", email: "hayoon.jung@daum.net", joined: "2026.06.12", last: "1주 전", avatar: "gray", status: "active", tier: "silver" },
  { id: 6, name: "강도윤", initial: "강", email: "doyoon.kang@gmail.com", joined: "2026.06.09", last: "2주 전", avatar: "gray", status: "dormant", tier: "bronze" },
  { id: 7, name: "윤서아", initial: "윤", email: "seoa.yoon@naver.com", joined: "2026.06.05", last: "1개월 전", avatar: "gray", status: "dormant", tier: "bronze" },
  { id: 8, name: "임지우", initial: "임", email: "jiwoo.lim@gmail.com", joined: "2026.06.01", last: "—", avatar: "gray", status: "left", tier: "bronze" },
  { id: 9, name: "한예준", initial: "한", email: "yejun.han@kakao.com", joined: "2026.05.28", last: "10분 전", avatar: "dark", status: "active", tier: "platinum" },
];

export const MEMBER_FILTERS = ["전체", "활성", "휴면", "탈퇴"] as const;
export type MemberFilter = (typeof MEMBER_FILTERS)[number];

export function filterMembers(list: Member[], filter: MemberFilter): Member[] {
  if (filter === "전체") return list;
  const tone: StatusTone =
    filter === "활성" ? "active" : filter === "휴면" ? "dormant" : "left";
  return list.filter((m) => m.status === tone);
}

// --- 회원 상세 파생 (시안 d 객체 공식 그대로) ---
export function getMember(id: number): Member {
  return members.find((m) => m.id === id) ?? members[2]!;
}

export function memberDetail(m: Member) {
  return {
    info: [
      { k: "이름", v: m.name },
      { k: "이메일", v: m.email },
      { k: "연락처", v: `010-${1000 + m.id}-${2000 + m.id * 7}` },
      { k: "가입일", v: m.joined },
      { k: "가입 경로", v: m.id % 2 ? "카카오 간편가입" : "이메일" },
      { k: "마케팅 수신", v: m.id % 2 ? "동의" : "미동의" },
    ],
    activity: [
      { id: "login", icon: "login", text: "앱에서 로그인했어요", time: `${m.last} · iOS` },
      { id: "renew", icon: "shopping_bag", text: "프리미엄 구독을 갱신했어요", time: "2026.06.20 14:32" },
      { id: "profile", icon: "edit", text: "프로필 정보를 변경했어요", time: "2026.06.14 09:11" },
      { id: "signup", icon: "person_add", text: "회원으로 가입했어요", time: m.joined },
    ],
    stats: [
      { k: "총 주문", v: `${m.id * 7 + 4}회` },
      { k: "리뷰 작성", v: `${m.id * 2}개` },
      { k: "포인트", v: `${(m.id * 1240).toLocaleString()}P` },
    ],
    totalPaid: `₩${(m.id * 248000).toLocaleString()}`,
    lastPaid: "2026.06.20",
  };
}

// --- 대시보드 ---
export type Kpi = {
  label: string;
  value: string;
  icon: string;
  delta: string;
  sub: string;
  deltaIcon: string;
  positive: boolean;
};

export const kpis: Kpi[] = [
  { label: "전체 회원", value: "12,847", icon: "group", delta: "+3.2%", sub: "지난달 대비", deltaIcon: "trending_up", positive: true },
  { label: "활성 회원", value: "9,431", icon: "how_to_reg", delta: "+1.8%", sub: "지난달 대비", deltaIcon: "trending_up", positive: true },
  { label: "이번 달 신규", value: "628", icon: "person_add", delta: "+12.4%", sub: "전월 대비", deltaIcon: "trending_up", positive: true },
  { label: "휴면 회원", value: "2,104", icon: "bedtime", delta: "-2.1%", sub: "지난달 대비", deltaIcon: "trending_down", positive: false },
];

export const tiers = [
  { label: "브론즈", count: "6,210", pct: 48, color: "#aaaaaa" },
  { label: "실버", count: "3,840", pct: 30, color: "#757575" },
  { label: "골드", count: "2,015", pct: 16, color: "#3a3a3a" },
  { label: "플래티넘", count: "782", pct: 6, color: "#1a1a1a" },
];

// 가입 추이 sparkline (시안 SVG path, viewBox 0 0 620 240)
export const signupTrend = {
  line: "M0,170 L52,150 L103,160 L155,120 L207,135 L258,95 L310,110 L362,70 L413,85 L465,55 L517,72 L568,40 L620,52",
  area: "M0,170 L52,150 L103,160 L155,120 L207,135 L258,95 L310,110 L362,70 L413,85 L465,55 L517,72 L568,40 L620,52 L620,240 L0,240 Z",
  peak: { cx: 568, cy: 40 },
  labels: ["12주 전", "9주", "6주", "3주", "이번 주"],
};

// --- 콘텐츠 ---
export type PostStatus = "published" | "draft";
export const POST_TABS = [
  { label: "전체", count: "48" },
  { label: "게시됨", count: "32" },
  { label: "임시저장", count: "16" },
] as const;

export type Post = {
  title: string;
  cat: string;
  icon: string;
  cover: string;
  views: string;
  likes: string;
  date: string;
  status: PostStatus;
};

export const posts: Post[] = [
  { title: "2026년 상반기 서비스 업데이트 안내", cat: "공지", icon: "campaign", cover: "#1a1a1a", views: "12.4K", likes: "328", date: "06.22", status: "published" },
  { title: "신규 멤버십 등급 혜택 총정리", cat: "가이드", icon: "workspace_premium", cover: "#3a3a3a", views: "8.1K", likes: "241", date: "06.18", status: "published" },
  { title: "여름 시즌 이벤트 — 친구 초대 리워드", cat: "이벤트", icon: "redeem", cover: "#5c5c5c", views: "5.6K", likes: "189", date: "06.15", status: "published" },
  { title: "자주 묻는 질문 — 결제 및 환불", cat: "FAQ", icon: "help", cover: "#454545", views: "3.2K", likes: "94", date: "06.10", status: "published" },
  { title: "하반기 로드맵 (작성 중)", cat: "공지", icon: "edit_note", cover: "#8f8f8f", views: "—", likes: "—", date: "06.09", status: "draft" },
  { title: "커뮤니티 운영 정책 개정안", cat: "정책", icon: "gavel", cover: "#757575", views: "—", likes: "—", date: "06.05", status: "draft" },
];

export const POST_STATUS_META: Record<PostStatus, { label: string; fg: string; bg: string }> = {
  published: { label: "게시됨", fg: "#1a1a1a", bg: "#ebebeb" },
  draft: { label: "임시저장", fg: "#757575", bg: "#f1f1f1" },
};

// --- 결제 ---
export const payKpis = [
  { label: "이번 달 매출", value: "₩48.2M", sub: "전월 대비 +8.4%" },
  { label: "결제 건수", value: "1,284", sub: "전월 대비 +124" },
  { label: "환불액", value: "₩1.1M", sub: "결제액의 2.3%" },
  { label: "평균 결제액", value: "₩37,540", sub: "건당 평균" },
];

export type PayStatus = "done" | "pending" | "refund";
export const PAY_STATUS_META: Record<
  PayStatus,
  { label: string; fg: string; bg: string; dot: string; amtColor: string }
> = {
  done: { label: "완료", fg: "#1a1a1a", bg: "#ebebeb", dot: "#1a1a1a", amtColor: "#1a1a1a" },
  pending: { label: "대기", fg: "#757575", bg: "#f1f1f1", dot: "#8f8f8f", amtColor: "#454545" },
  refund: { label: "환불", fg: "#ba1a1a", bg: "#ffdad6", dot: "#ba1a1a", amtColor: "#ba1a1a" },
};

export type Payment = {
  txid: string;
  name: string;
  product: string;
  amount: string;
  date: string;
  status: PayStatus;
};

export const payments: Payment[] = [
  { txid: "TX-90412", name: "김서연", product: "프리미엄 연간", amount: "₩99,000", date: "06.22 14:32", status: "done" },
  { txid: "TX-90411", name: "이준호", product: "프리미엄 월간", amount: "₩9,900", date: "06.22 11:08", status: "done" },
  { txid: "TX-90410", name: "박지민", product: "포인트 충전", amount: "₩50,000", date: "06.21 19:45", status: "done" },
  { txid: "TX-90409", name: "최민준", product: "프리미엄 월간", amount: "₩9,900", date: "06.21 09:12", status: "pending" },
  { txid: "TX-90408", name: "정하윤", product: "프리미엄 연간", amount: "-₩99,000", date: "06.20 16:20", status: "refund" },
  { txid: "TX-90407", name: "한예준", product: "포인트 충전", amount: "₩30,000", date: "06.20 08:55", status: "done" },
  { txid: "TX-90406", name: "강도윤", product: "프리미엄 월간", amount: "₩9,900", date: "06.19 22:01", status: "done" },
];

// --- 설정 ---
export const settingsToggles = [
  { key: "notif", icon: "notifications", label: "푸시 알림", desc: "새 가입·결제 발생 시 알림을 받아요", defaultOn: true },
  { key: "email", icon: "mail", label: "이메일 리포트", desc: "매주 운영 리포트를 메일로 보내요", defaultOn: false },
  { key: "autoApprove", icon: "verified", label: "가입 자동 승인", desc: "신규 회원을 자동으로 승인해요", defaultOn: true },
  { key: "twoFactor", icon: "security", label: "2단계 인증", desc: "관리자 로그인에 인증을 요구해요", defaultOn: true },
];

export const settingsLinks = [
  { icon: "group", label: "팀 멤버", desc: "관리자 계정 3명" },
  { icon: "vpn_key", label: "API 키", desc: "연동 키 발급 및 관리" },
  { icon: "receipt_long", label: "결제 정보", desc: "구독 플랜 · 청구서" },
  { icon: "description", label: "약관 및 정책", desc: "이용약관 · 개인정보처리방침" },
];

// 최근 가입 회원 (대시보드, 상위 4)
export const recentMembers = members.slice(0, 4);
