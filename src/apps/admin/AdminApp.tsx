import { useEffect } from 'react';
import { format } from 'date-fns';
import { Users, Activity, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRequests, useAdminStats } from '../../hooks/useRequests';

export const AdminApp = () => {
  const { t } = useTranslation();
  const { requests, refreshRequests } = useRequests();

  useEffect(() => {
    refreshRequests();
    const interval = setInterval(refreshRequests, 3000);
    return () => clearInterval(interval);
  }, [refreshRequests]);

  const stats = useAdminStats();

  return (
    <div className="app-container" style={{ maxWidth: '1400px' }}>
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold">{t('KEEP Admin Dashboard')}</h1>
          <p className="text-muted mt-2">{t('Real-time overview of NFC fitting requests and operations.')}</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid-cols-4 mb-8">
        <div className="card p-6 flex items-center gap-4 animate-slide-in" style={{ animationDelay: '0ms' }}>
          <div style={{ background: '#e0e7ff', padding: '1rem', borderRadius: '50%', color: '#4f46e5' }}>
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">{t('Total Requests')}</p>
            <h2 className="text-2xl font-bold">{stats.total}</h2>
          </div>
        </div>

        <div className="card p-6 flex items-center gap-4 animate-slide-in" style={{ animationDelay: '50ms' }}>
          <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '50%', color: '#d97706' }}>
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">{t('Awaiting Prep (Pending)')}</p>
            <h2 className="text-2xl font-bold">{stats.pending}</h2>
          </div>
        </div>

        <div className="card p-6 flex items-center gap-4 animate-slide-in" style={{ animationDelay: '100ms' }}>
          <div style={{ background: '#bfdbfe', padding: '1rem', borderRadius: '50%', color: '#2563eb' }}>
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">{t('In Progress (Assigned)')}</p>
            <h2 className="text-2xl font-bold">{stats.assigned}</h2>
          </div>
        </div>

        <div className="card p-6 flex items-center gap-4 animate-slide-in" style={{ animationDelay: '150ms' }}>
          <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '50%', color: '#16a34a' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">{t('Completed Requests')}</p>
            <h2 className="text-2xl font-bold">{stats.completed}</h2>
          </div>
        </div>
      </div>

      {/* 요청 로그 테이블 */}
      <h2 className="text-xl font-bold mb-4">{t('Live Request Log')}</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('Time')}</th>
              <th>고객번호</th>
              <th>{t('Fitting Room')}</th>
              <th>{t('Product')}</th>
              <th>{t('Status')}</th>
              <th>{t('Elapsed')}</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => {
              const elapsedMins = Math.floor((Date.now() - req.requestTime) / 60000);
              return (
                <tr key={req.requestId}>
                  <td className="font-medium">{format(req.requestTime, 'HH:mm:ss')}</td>
                  <td className="font-bold" style={{ textAlign: 'center' }}>#{req.customerNumber ?? '-'}</td>
                  <td className="font-bold" style={{ textAlign: 'center' }}>
                    {req.fittingRoomId ? `Room ${req.fittingRoomId}` : '-'}
                  </td>
                  <td className="text-sm">
                    {req.items.length > 0 ? (
                      req.items.map(item => (
                        <div key={item.id}>
                          <span>{item.productName}</span>
                          <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '4px' }}>
                            ({item.color}/{item.size})
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${req.status}`}>{t(req.status)}</span>
                  </td>
                  <td className="text-sm text-muted">
                    {req.status === 'completed' ? t('Done') : `${elapsedMins} ${t('min ago')}`}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">
                  {t('No request logs available.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
