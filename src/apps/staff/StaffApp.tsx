import { useEffect, useState, useMemo } from 'react';
import { useRequests } from '../../hooks/useRequests';
import { Clock, CheckSquare, Shirt, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { FittingStatus } from '../../types/request';

const HIDDEN_IDS_KEY = 'keep_staff_hidden_request_ids';

const loadHiddenIds = (): Set<string> => {
  try {
    const saved = localStorage.getItem(HIDDEN_IDS_KEY);
    return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
  } catch {
    return new Set();
  }
};

export const StaffApp = () => {
  const { t, i18n } = useTranslation();
  const { requests, updateStatus, refreshRequests } = useRequests();

  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(loadHiddenIds);

  useEffect(() => {
    refreshRequests();
    const interval = setInterval(refreshRequests, 3000);
    return () => clearInterval(interval);
  }, [refreshRequests]);

  const visibleRequests = useMemo(
    () => requests.filter(r => !hiddenRequestIds.has(r.requestId)),
    [requests, hiddenRequestIds]
  );

  const handleReset = () => {
    const nextHidden = new Set(hiddenRequestIds);
    visibleRequests.forEach(r => nextHidden.add(r.requestId));
    localStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify([...nextHidden]));
    setHiddenRequestIds(nextHidden);
  };

  const handleStatusChange = async (requestId: string, nextStatus: FittingStatus) => {
    await updateStatus(requestId, nextStatus);
  };

  return (
    <div className="app-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="text-3xl font-bold">{t('KEEP Staff Portal')}</h1>
          <p className="text-muted mt-2">{t('Manage fitting requests for NFC customers.')}</p>
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
          title="DB 데이터는 유지하고 현재 화면에 표시된 요청만 숨깁니다."
        >
          <RotateCcw size={13} />
          화면 초기화
        </button>
      </div>

      <div className="flex-col gap-4">
        {visibleRequests.length === 0 ? (
          <div className="p-8 text-center text-muted" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
            {t('No fitting requests at the moment.')}
          </div>
        ) : (
          visibleRequests.map((req) => (
            <div key={req.requestId} className="card p-4 flex-col gap-4 animate-slide-in">

              {/* 요청 헤더: 고객번호 · 피팅룸 · 상태 · 시간 */}
              <div className="flex justify-between items-start border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg">
                      고객 #{req.customerNumber ?? '-'}
                      <span style={{ marginLeft: '0.5rem', color: req.roomNumber ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {req.roomNumber ? `— 피팅룸 ${req.roomNumber}번` : '— 현장 안내'}
                      </span>
                    </span>
                    <span className={`status-badge ${req.status}`}>{t(req.status)}</span>
                  </div>
                  <div className="text-sm text-muted flex items-center gap-1">
                    <Clock size={14} />
                    {formatDistanceToNow(req.requestTime, {
                      addSuffix: true,
                      locale: i18n.language === 'ko' ? ko : enUS,
                    })}
                  </div>
                </div>

                {/* 상태 변경 버튼 */}
                <div className="flex gap-2">
                  {req.status === 'pending' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleStatusChange(req.requestId, 'assigned')}
                    >
                      {t('Start Preparing')}
                    </button>
                  )}
                  {req.status === 'assigned' && (
                    <button
                      className="btn btn-secondary"
                      style={{ background: '#10b981', color: 'white', borderColor: '#10b981' }}
                      onClick={() => handleStatusChange(req.requestId, 'completed')}
                    >
                      <CheckSquare size={18} /> {t('Complete')}
                    </button>
                  )}
                  {req.status === 'completed' && (
                    <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, padding: '0.4rem 0.75rem' }}>
                      ✓ {t('COMPLETED')}
                    </span>
                  )}
                </div>
              </div>

              {/* 요청 상품 목록 */}
              <div>
                <h4 className="text-sm font-semibold text-muted mb-3 flex items-center gap-2">
                  <Shirt size={16} /> {t('Requested Item')} ({req.items.length}개)
                </h4>
                <div className="flex-col gap-2">
                  {req.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 items-center p-3"
                      style={{ background: 'var(--surface-hover)', borderRadius: '8px' }}
                    >
                      <div style={{ flex: 1 }}>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted flex gap-2 mt-1">
                          <span>{t('Color')}: <strong style={{ color: 'var(--text-primary)' }}>{item.color}</strong></span>
                          <span>|</span>
                          <span>{t('Size')}: <strong style={{ color: 'var(--text-primary)' }}>{item.size}</strong></span>
                          <span>|</span>
                          <span>수량: <strong style={{ color: 'var(--text-primary)' }}>1개</strong></span>
                        </p>
                        {item.serialCode && (
                          <p className="text-sm mt-1" style={{ fontFamily: 'monospace', letterSpacing: '0.04em', color: 'var(--primary)', fontWeight: 700 }}>
                            {item.serialCode}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};
