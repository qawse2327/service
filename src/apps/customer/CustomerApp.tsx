import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import { Heart, ArrowLeft, Shirt, CheckCircle } from 'lucide-react';
import type { Product } from '../../types/request';
import { getProduct, createBatchRequest } from '../../services/apiRequestService';

// ─── localStorage keys ──────────────────────────────────────────
const KEY_TAGGED     = 'keep_tagged_products';
const KEY_PENDING    = 'keep_pending_fitting_items';
const KEY_SESSION    = 'keep_session_id';
const KEY_EXPIRES    = 'keep_session_expires_at';
const KEY_ASSIGNMENT = 'keep_customer_assignment';

const SESSION_TTL = 60 * 60 * 1000; // 1시간

// ─── 로컬 타입 ──────────────────────────────────────────────────
interface PendingItem {
  productId: string;
  productName: string;
  color: string;
  size: string;
}

interface CustomerAssignment {
  customerNumber: number;
  roomNumber: number | null;
}

// ─── 헬퍼 (컴포넌트 외부) ──────────────────────────────────────
function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function clearSessionStorage(): void {
  [KEY_SESSION, KEY_EXPIRES, KEY_ASSIGNMENT, KEY_PENDING, KEY_TAGGED].forEach(k =>
    localStorage.removeItem(k)
  );
}

function createNewSession(): string {
  const newId = `session-${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(KEY_SESSION, newId);
  localStorage.setItem(KEY_EXPIRES, String(Date.now() + SESSION_TTL));
  return newId;
}

/**
 * 세션 유효성 검사 — 마운트 시 1회 실행.
 * 만료됐거나 없으면 localStorage 전체 초기화 후 새 세션 생성.
 * 이 함수는 useState 초기화 직전에 실행되므로
 * 초기화 이후 loadJson은 항상 유효한 상태를 읽는다.
 */
function checkAndInitSession(): void {
  const sessionId  = localStorage.getItem(KEY_SESSION);
  const expiresAt  = localStorage.getItem(KEY_EXPIRES);
  const now        = Date.now();

  if (sessionId && expiresAt && now < parseInt(expiresAt, 10)) {
    return; // 유효한 세션 — 아무것도 하지 않음
  }

  // 만료됐거나 없음 → 초기화 후 새 세션
  clearSessionStorage();
  createNewSession();
}

/** 피팅 요청 시 호출 — session_id를 반환 (절대 새로 만들지 않음) */
function getSessionId(): string {
  const existing = localStorage.getItem(KEY_SESSION);
  if (existing) return existing;
  return createNewSession(); // localStorage가 수동 삭제된 극단적 케이스만 처리
}

const CARD_BG = ['#f0e6d3','#d3e6f0','#d3f0e6','#f0d3e6','#e6f0d3','#f0ead3','#e6d3f0','#d3dff0','#f0d3d3'];

// ────────────────────────────────────────────────────────────────
export const CustomerApp = () => {
  // ─── 세션 유효성 검사 (마운트 1회, 상태 초기화보다 먼저 실행) ──
  const [taggedProducts, setTaggedProducts] = useState<Product[]>(() => {
    checkAndInitSession(); // ← 여기서 실행되므로 이후 loadJson은 유효한 상태를 읽음
    return loadJson(KEY_TAGGED, []);
  });
  const [pendingItems,   setPendingItems]   = useState<PendingItem[]>(() => loadJson(KEY_PENDING, []));
  const [assignment,     setAssignment]     = useState<CustomerAssignment | null>(() => loadJson(KEY_ASSIGNMENT, null));

  // ─── 뷰 상태 ─────────────────────────────────────────────────
  const [view,          setView]          = useState<'list' | 'detail'>('list');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailColor,   setDetailColor]   = useState<string | null>(null);
  const [detailSize,    setDetailSize]    = useState<string | null>(null);

  // ─── 요청/피드백 상태 ─────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);
  const [successData,  setSuccessData]  = useState<CustomerAssignment | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  // ─── toast ────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── URL ?productId= → 상품 조회 후 태그 목록 추가 ────────────
  useEffect(() => {
    const paramId = new URLSearchParams(window.location.search).get('productId');
    if (!paramId) return;
    const num = parseInt(paramId, 10);
    if (isNaN(num)) return;

    const existing: Product[] = loadJson(KEY_TAGGED, []);
    if (existing.some(p => p.id === num)) return;

    getProduct(num)
      .then(product => {
        setTaggedProducts(curr => {
          if (curr.some(p => p.id === num)) return curr;
          const updated = [...curr, product];
          localStorage.setItem(KEY_TAGGED, JSON.stringify(updated));
          return updated;
        });
      })
      .catch(() => showToast('상품 정보를 불러올 수 없습니다.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── pendingItems 저장 ────────────────────────────────────────
  const savePending = (items: PendingItem[]) => {
    setPendingItems(items);
    localStorage.setItem(KEY_PENDING, JSON.stringify(items));
  };

  // ─── 세션 초기화 (개발용) ─────────────────────────────────────
  const handleResetSession = () => {
    clearSessionStorage();
    createNewSession();

    // React 상태 초기화
    setTaggedProducts([]);
    setPendingItems([]);
    setAssignment(null);
    setView('list');
    setDetailProduct(null);
    setDetailColor(null);
    setDetailSize(null);
    setIsSubmitting(false);
    setShowSuccess(false);
    setSuccessData(null);

    // URL에 productId가 있으면 해당 상품을 다시 로딩
    const paramId = new URLSearchParams(window.location.search).get('productId');
    if (paramId) {
      const num = parseInt(paramId, 10);
      if (!isNaN(num)) {
        getProduct(num)
          .then(product => {
            setTaggedProducts([product]);
            localStorage.setItem(KEY_TAGGED, JSON.stringify([product]));
          })
          .catch(() => {});
      }
    }
  };

  // ─── 상세 화면 열기/닫기 ───────────────────────────────────────
  const openDetail = (product: Product) => {
    const prev = pendingItems.find(i => i.productId === String(product.id));
    setDetailProduct(product);
    setDetailColor(prev?.color ?? null);
    setDetailSize(prev?.size ?? null);
    setView('detail');
  };

  const closeDetail = () => {
    setView('list');
    setDetailProduct(null);
    setDetailColor(null);
    setDetailSize(null);
  };

  // ─── 메인 카드 하트 클릭 ─────────────────────────────────────
  const handleCardHeart = (product: Product, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const hasPending = pendingItems.some(i => i.productId === String(product.id));
    if (hasPending) {
      savePending(pendingItems.filter(i => i.productId !== String(product.id)));
    } else {
      openDetail(product);
    }
  };

  // ─── 색상 · 사이즈는 독립 선택 ───────────────────────────────
  const detailColors = useMemo(() => {
    if (!detailProduct) return [];
    return [...new Set(detailProduct.variants.map(v => v.color))];
  }, [detailProduct]);

  const detailSizes = useMemo(() => {
    if (!detailProduct) return [];
    return [...new Set(detailProduct.variants.map(v => v.size))];
  }, [detailProduct]);

  // ─── 상세 화면 하트 상태 ─────────────────────────────────────
  const isDetailHearted = useMemo(() => {
    if (!detailProduct || !detailColor || !detailSize) return false;
    return pendingItems.some(
      i => i.productId === String(detailProduct.id) && i.color === detailColor && i.size === detailSize
    );
  }, [detailProduct, detailColor, detailSize, pendingItems]);

  // ─── 상세 화면 하트 토글 ─────────────────────────────────────
  const handleDetailHeart = () => {
    if (!detailProduct || !detailColor || !detailSize) return;
    const pid = String(detailProduct.id);
    if (isDetailHearted) {
      savePending(pendingItems.filter(i => i.productId !== pid));
    } else {
      const filtered = pendingItems.filter(i => i.productId !== pid);
      savePending([...filtered, {
        productId:   pid,
        productName: detailProduct.name,
        color:       detailColor,
        size:        detailSize,
      }]);
    }
  };

  // ─── 피팅 요청 전송 ───────────────────────────────────────────
  const handleFittingRequest = async () => {
    if (pendingItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const sessionId = getSessionId(); // session_id 유지
      const result = await createBatchRequest({ sessionId, items: pendingItems });

      const newAssignment: CustomerAssignment = {
        customerNumber: result.customerNumber ?? 0,
        roomNumber:     result.roomNumber,
      };

      setAssignment(newAssignment);
      localStorage.setItem(KEY_ASSIGNMENT, JSON.stringify(newAssignment));
      savePending([]);

      setSuccessData(newAssignment);
      setShowSuccess(true);
    } catch (err) {
      console.error('Fitting request failed:', err);
      const msg = err instanceof Error && err.message.includes('409')
        ? '현재 사용 가능한 피팅룸이 없습니다.'
        : '피팅 요청에 실패했습니다. 다시 시도해주세요.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // 렌더링
  // ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg-color)', position: 'relative' }}>

      {/* ─── 앱 헤더 ─────────────────────────────────────────────── */}
      <div style={{
        padding: '0.9rem 1rem 0.7rem',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'var(--bg-color)', zIndex: 5,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>KEEP</span>
          <div style={{ marginTop: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: assignment ? 'var(--primary)' : 'var(--text-muted)' }}>
            {assignment
              ? `고객번호 ${assignment.customerNumber}번${assignment.roomNumber != null ? ` · 피팅룸 ${assignment.roomNumber}번` : ''}`
              : '고객번호: 요청 전'}
          </div>
        </div>

        {/* 개발용 세션 초기화 버튼 */}
        <button
          onClick={handleResetSession}
          style={{
            marginTop: '0.25rem',
            padding: '0.25rem 0.6rem',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            lineHeight: 1.4,
            flexShrink: 0,
          }}
        >
          세션 초기화
        </button>
      </div>

      {/* ─── 메인: 태그된 상품 카드 그리드 ───────────────────────── */}
      {view === 'list' && (
        <div style={{ padding: '1rem', paddingBottom: '90px' }}>
          {taggedProducts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '420px', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Shirt size={72} style={{ opacity: 0.18, marginBottom: '1.25rem' }} />
              <p style={{ fontSize: '1.05rem', fontWeight: 500 }}>상품 태그를 스캔해주세요.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {taggedProducts.map(product => {
                const hearted     = pendingItems.some(i => i.productId === String(product.id));
                const pendingItem = pendingItems.find(i => i.productId === String(product.id));
                const bg          = CARD_BG[product.id % CARD_BG.length];
                return (
                  <div
                    key={product.id}
                    onClick={() => openDetail(product)}
                    style={{ borderRadius: '12px', overflow: 'hidden', background: 'var(--surface)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  >
                    <div style={{ height: '150px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <Shirt size={52} style={{ opacity: 0.35 }} />
                      <button
                        onClick={(e) => handleCardHeart(product, e)}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                      >
                        <Heart size={17} fill={hearted ? '#ef4444' : 'none'} color={hearted ? '#ef4444' : '#888'} />
                      </button>
                    </div>
                    <div style={{ padding: '0.55rem 0.7rem 0.7rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.35, marginBottom: '0.2rem', color: 'var(--text-primary)' }}>{product.name}</p>
                      <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>{product.price.toLocaleString()}원</p>
                      {hearted && pendingItem && (
                        <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: 600 }}>
                          {pendingItem.color} / {pendingItem.size}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 상세 화면 ──────────────────────────────────────────── */}
      {view === 'detail' && detailProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-color)', zIndex: 20, overflowY: 'auto', paddingBottom: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 1 }}>
            <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}>
              <ArrowLeft size={24} />
            </button>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>상품 상세</span>
          </div>

          <div style={{ height: '300px', background: CARD_BG[detailProduct.id % CARD_BG.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shirt size={110} style={{ opacity: 0.3 }} />
          </div>

          <div style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, marginRight: '1rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.35rem' }}>{detailProduct.name}</h2>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{detailProduct.price.toLocaleString()}원</p>
              </div>
              <button
                onClick={handleDetailHeart}
                disabled={!detailColor || !detailSize}
                title={(!detailColor || !detailSize) ? '색상과 사이즈를 먼저 선택하세요' : ''}
                style={{ background: 'none', border: 'none', cursor: (!detailColor || !detailSize) ? 'default' : 'pointer', opacity: (!detailColor || !detailSize) ? 0.3 : 1, padding: '0.25rem', flexShrink: 0 }}
              >
                <Heart size={30} fill={isDetailHearted ? '#ef4444' : 'none'} color={isDetailHearted ? '#ef4444' : 'var(--text-primary)'} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>색상</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {detailColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setDetailColor(color)}
                    style={{
                      padding: '0.4rem 1.1rem', borderRadius: '2rem', fontSize: '0.9rem', cursor: 'pointer',
                      background: detailColor === color ? 'var(--primary)' : 'var(--surface-hover)',
                      color:      detailColor === color ? 'white' : 'var(--text-primary)',
                      border:     detailColor === color ? '2px solid var(--primary)' : '2px solid transparent',
                      fontWeight: detailColor === color ? 700 : 400,
                    }}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>사이즈</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {detailSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setDetailSize(size)}
                    style={{
                      padding: '0.4rem 1.1rem', borderRadius: '2rem', fontSize: '0.9rem', cursor: 'pointer', minWidth: '3rem',
                      background: detailSize === size ? 'var(--primary)' : 'var(--surface-hover)',
                      color:      detailSize === size ? 'white' : 'var(--text-primary)',
                      border:     detailSize === size ? '2px solid var(--primary)' : '2px solid transparent',
                      fontWeight: detailSize === size ? 700 : 400,
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {!detailColor && !detailSize
                ? '색상과 사이즈를 선택한 후 하트를 눌러주세요.'
                : !detailColor
                ? '색상을 선택해주세요.'
                : !detailSize
                ? '사이즈를 선택해주세요.'
                : isDetailHearted
                ? '피팅 요청 목록에 담겼습니다. 하트를 다시 누르면 취소됩니다.'
                : '오른쪽 상단 하트를 눌러 피팅 요청 목록에 추가하세요.'}
            </p>
          </div>
        </div>
      )}

      {/* ─── 피팅 요청 성공 모달 ─────────────────────────────────── */}
      {showSuccess && successData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-color)', borderRadius: '1.5rem', padding: '2rem 1.5rem', textAlign: 'center', width: '100%', maxWidth: '360px' }}>
            <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem' }}>피팅 요청 완료</h2>
            <div style={{ background: 'var(--surface)', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                고객번호: <strong style={{ fontSize: '1.4em', color: 'var(--primary)' }}>{successData.customerNumber}번</strong>
              </p>
              {successData.roomNumber != null ? (
                <p style={{ fontSize: '1rem' }}>
                  피팅룸: <strong style={{ fontSize: '1.4em', color: 'var(--primary)' }}>{successData.roomNumber}번</strong>
                </p>
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>피팅룸은 잠시 후 배정됩니다.</p>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>직원이 상품을 준비하고 있습니다.</p>
            <button
              onClick={() => setShowSuccess(false)}
              style={{ width: '100%', padding: '0.9rem', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ─── 하단 고정 피팅 요청 버튼 ─────────────────────────────── */}
      {view === 'list' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '0.875rem 1rem', background: 'var(--bg-color)', borderTop: '1px solid var(--border)', zIndex: 5 }}>
          <button
            onClick={handleFittingRequest}
            disabled={pendingItems.length === 0 || isSubmitting}
            style={{
              width: '100%', padding: '0.95rem', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
              background: pendingItems.length > 0 ? 'var(--primary)' : 'var(--surface-hover)',
              color:      pendingItems.length > 0 ? 'white' : 'var(--text-muted)',
              border:     'none',
              cursor:     pendingItems.length > 0 && !isSubmitting ? 'pointer' : 'default',
              opacity:    isSubmitting ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {isSubmitting ? (
              <>
                <span style={{ width: '18px', height: '18px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                요청 중...
              </>
            ) : (
              <>
                <Heart size={18} fill={pendingItems.length > 0 ? 'white' : 'none'} />
                피팅 요청하기 ({pendingItems.length}개)
              </>
            )}
          </button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
