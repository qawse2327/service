import { useEffect } from 'react';
import { useRequests } from '../../hooks/useRequests';
import { Clock, CheckSquare, Shirt } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { FittingStatus } from '../../types/request';

export const StaffApp = () => {
  const { t, i18n } = useTranslation();
  const { requests, updateStatus, refreshRequests } = useRequests();

  useEffect(() => {
    refreshRequests();
    const interval = setInterval(refreshRequests, 3000);
    return () => clearInterval(interval);
  }, [refreshRequests]);

  const handleStatusChange = async (requestId: string, nextStatus: FittingStatus) => {
    await updateStatus(requestId, nextStatus);
  };

  return (
    <div className="app-container">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold">{t('KEEP Staff Portal')}</h1>
          <p className="text-muted mt-2">{t('Manage fitting requests for NFC customers.')}</p>
        </div>
      </div>

      <div className="flex-col gap-4">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-muted" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
            {t('No fitting requests at the moment.')}
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.requestId} className="card p-4 flex-col gap-4 animate-slide-in">

              {/* 요청 헤더: 고객번호 · 피팅룸 · 상태 · 시간 */}
              <div className="flex justify-between items-start border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg">
                      고객 #{req.customerNumber ?? '-'}
                      {req.fittingRoomId && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>
                          — {t('Fitting Room')} {req.fittingRoomId}
                        </span>
                      )}
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
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted flex gap-2 mt-1">
                          <span>{t('Color')}: <strong style={{ color: 'var(--text-primary)' }}>{item.color}</strong></span>
                          <span>|</span>
                          <span>{t('Size')}: <strong style={{ color: 'var(--text-primary)' }}>{item.size}</strong></span>
                        </p>
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
