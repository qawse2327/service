import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Activity, CheckCircle2, Clock, Package, RotateCcw, Users } from 'lucide-react';
import { useRequests } from '../../hooks/useRequests';

const RESET_KEY = 'keep_admin_view_reset_at';

// ─── 상태 한국어 레이블 ──────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending:   '접수됨',
  assigned:  '준비중',
  completed: '전달완료',
};

export const AdminApp = () => {
  const { requests, refreshRequests } = useRequests();

  useEffect(() => {
    refreshRequests();
    const interval = setInterval(refreshRequests, 3000);
    return () => clearInterval(interval);
  }, [refreshRequests]);

  // ─── 표시 데이터 초기화 기준 ────────────────────────────────
  const [resetAt, setResetAt] = useState<number | null>(() => {
    const saved = localStorage.getItem(RESET_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  const handleReset = () => {
    const now = Date.now();
    localStorage.setItem(RESET_KEY, String(now));
    setResetAt(now);
  };

  // ─── 필터링: resetAt 이후 요청만 표시 ───────────────────────
  const filteredRequests = useMemo(
    () => (resetAt ? requests.filter(r => r.requestTime >= resetAt) : requests),
    [requests, resetAt]
  );

  // ─── KPI 계산 ─────────────────────────────────────────────
  const kpi = useMemo(() => {
    const total      = filteredRequests.length;
    const completed  = filteredRequests.filter(r => r.status === 'completed').length;
    const inProgress = filteredRequests.filter(r => r.status === 'assigned').length;
    const allItems   = filteredRequests.flatMap(r => r.items);
    const totalItems = allItems.length;

    const done = filteredRequests.filter(r => r.status === 'completed' && r.completedAt != null);
    const avgMs = done.length > 0
      ? done.reduce((sum, r) => sum + (r.completedAt! - r.requestTime), 0) / done.length
      : null;

    return { total, completed, inProgress, totalItems, avgMs };
  }, [filteredRequests]);

  // ─── 분석 데이터 계산 ─────────────────────────────────────
  const analytics = useMemo(() => {
    const allItems = filteredRequests.flatMap(r => r.items);

    const productCounts: Record<string, number> = {};
    const optionCounts:  Record<string, number> = {};
    allItems.forEach(item => {
      productCounts[item.productName] = (productCounts[item.productName] || 0) + 1;
      const key = `${item.color} / ${item.size}`;
      optionCounts[key] = (optionCounts[key] || 0) + 1;
    });

    const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topOptions  = Object.entries(optionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const statusCounts = [
      { label: '접수됨',  count: filteredRequests.filter(r => r.status === 'pending').length,   color: '#f59e0b' },
      { label: '준비중',  count: filteredRequests.filter(r => r.status === 'assigned').length,   color: '#3b82f6' },
      { label: '전달완료', count: filteredRequests.filter(r => r.status === 'completed').length, color: '#10b981' },
    ];

    return { topProducts, topOptions, statusCounts };
  }, [filteredRequests]);

  // ─── 평균 처리 시간 포맷 ─────────────────────────────────
  const fmtAvg = (ms: number | null): string => {
    if (ms === null) return '-';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  // ─── 경과 시간 포맷 ──────────────────────────────────────
  const fmtElapsed = (req: (typeof filteredRequests)[number]): string => {
    if (req.status === 'completed') {
      if (req.completedAt) {
        const m = Math.floor((req.completedAt - req.requestTime) / 60000);
        return `${m}분`;
      }
      return '완료';
    }
    const m = Math.floor((Date.now() - req.requestTime) / 60000);
    return `${m}분`;
  };

  // ─── 최대값 (상태별 바 차트용) ──────────────────────────
  const maxStatusCount = Math.max(...analytics.statusCounts.map(s => s.count), 1);

  return (
    <div className="app-container" style={{ maxWidth: '1400px' }}>

      {/* ─── 헤더 ─────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="text-3xl font-bold">KEEP Admin Dashboard</h1>
          <p className="text-muted mt-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            피팅 요청 운영 현황 실시간 요약
            {resetAt && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--surface-hover)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                초기화 기준: {format(resetAt, 'MM/dd HH:mm:ss')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 500,
            background: 'var(--surface)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: '8px',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
          title="DB 데이터는 유지하고 화면 표시 기준만 현재 시각으로 초기화합니다."
        >
          <RotateCcw size={13} />
          표시 데이터 초기화
        </button>
      </div>

      {/* ─── KPI 카드 (5개) ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>
        <KpiCard icon={<Activity size={20} />} iconBg="#e0e7ff" iconColor="#4f46e5" label="총 요청 수"      value={String(kpi.total)}         delay={0}   />
        <KpiCard icon={<CheckCircle2 size={20} />} iconBg="#dcfce7" iconColor="#16a34a" label="완료 요청 수"  value={String(kpi.completed)}     delay={50}  />
        <KpiCard icon={<Users size={20} />}    iconBg="#bfdbfe" iconColor="#2563eb" label="진행 중"         value={String(kpi.inProgress)}    delay={100} />
        <KpiCard icon={<Clock size={20} />}    iconBg="#fef3c7" iconColor="#d97706" label="평균 처리 시간"   value={fmtAvg(kpi.avgMs)}         delay={150} compact />
        <KpiCard icon={<Package size={20} />}  iconBg="#fce7f3" iconColor="#db2777" label="요청 상품 수"    value={String(kpi.totalItems)}    delay={200} />
      </div>

      {/* ─── 분석 영역 (3분할) ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>

        {/* 상태별 요청 수 */}
        <div className="card p-5">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
            상태별 요청 수
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {analytics.statusCounts.map(({ label, count, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ minWidth: '52px', fontSize: '0.82rem', fontWeight: 600, color }}>{label}</span>
                <div style={{ flex: 1, background: 'var(--surface-hover)', borderRadius: '3px', height: '7px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: color, width: `${(count / maxStatusCount) * 100}%`, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ minWidth: '20px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>{count}</span>
              </div>
            ))}
            {kpi.total === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>요청 없음</p>}
          </div>
        </div>

        {/* 상품별 요청 수 */}
        <div className="card p-5">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
            상품별 요청 수 (상위 5)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {analytics.topProducts.length > 0 ? analytics.topProducts.map(([name, count]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, color: 'var(--primary)' }}>{count}</span>
              </div>
            )) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>요청 없음</p>}
          </div>
        </div>

        {/* 옵션별 요청 수 */}
        <div className="card p-5">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
            옵션별 요청 수 (상위 5)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {analytics.topOptions.length > 0 ? analytics.topOptions.map(([option, count]) => (
              <div key={option} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ flex: 1, fontSize: '0.83rem', fontFamily: 'monospace' }}>{option}</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, color: 'var(--primary)' }}>{count}</span>
              </div>
            )) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>요청 없음</p>}
          </div>
        </div>
      </div>

      {/* ─── 상세 요청 로그 ────────────────────────────────── */}
      <h2 className="text-xl font-bold mb-4">실시간 요청 로그</h2>
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '960px' }}>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>요청 시간</th>
              <th style={{ whiteSpace: 'nowrap' }}>고객번호</th>
              <th style={{ whiteSpace: 'nowrap' }}>피팅룸</th>
              <th>상품명</th>
              <th>색상</th>
              <th>사이즈</th>
              <th style={{ whiteSpace: 'nowrap' }}>일련번호</th>
              <th>상태</th>
              <th style={{ whiteSpace: 'nowrap' }}>경과</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(req => (
              <tr key={req.requestId}>
                <td className="font-medium" style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                  {format(req.requestTime, 'HH:mm:ss')}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                  #{req.customerNumber ?? '-'}
                </td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                  {req.roomNumber ? `피팅룸 ${req.roomNumber}번` : '현장 안내'}
                </td>
                <td className="text-sm">
                  {req.items.map(item => (
                    <div key={item.id} style={{ lineHeight: '1.85', whiteSpace: 'nowrap' }}>{item.productName}</div>
                  ))}
                </td>
                <td className="text-sm">
                  {req.items.map(item => (
                    <div key={item.id} style={{ lineHeight: '1.85' }}>{item.color}</div>
                  ))}
                </td>
                <td className="text-sm">
                  {req.items.map(item => (
                    <div key={item.id} style={{ lineHeight: '1.85' }}>{item.size}</div>
                  ))}
                </td>
                <td className="text-sm">
                  {req.items.map(item => (
                    <div key={item.id} style={{ fontFamily: 'monospace', fontWeight: 600, lineHeight: '1.85', color: item.serialCode ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {item.serialCode ?? '-'}
                    </div>
                  ))}
                </td>
                <td>
                  <span className={`status-badge ${req.status}`}>
                    {STATUS_LABEL[req.status] ?? req.status}
                  </span>
                </td>
                <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>
                  {fmtElapsed(req)}
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted">
                  {resetAt ? '초기화 이후 접수된 요청이 없습니다.' : '요청 로그가 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── KPI 카드 컴포넌트 ─────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  delay: number;
  compact?: boolean;
}

const KpiCard = ({ icon, iconBg, iconColor, label, value, delay, compact }: KpiCardProps) => (
  <div className="card p-5 flex items-center gap-3 animate-slide-in" style={{ animationDelay: `${delay}ms` }}>
    <div style={{ background: iconBg, padding: '0.7rem', borderRadius: '50%', color: iconColor, flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <p className="text-sm font-medium text-muted" style={{ whiteSpace: 'nowrap' }}>{label}</p>
      <h2 style={{ fontSize: compact ? '1.3rem' : '1.6rem', fontWeight: 700, lineHeight: 1.2, marginTop: '0.1rem' }}>
        {value}
      </h2>
    </div>
  </div>
);
