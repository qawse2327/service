import { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Heart, CheckCircle, Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '../../types/request';
import { getProduct, createBatchRequest } from '../../services/apiRequestService';
import { getProductImageUrl } from '../../utils/productImages';

// ─── localStorage keys ──────────────────────────────────────────
const KEY_TAGGED     = 'keep_tagged_products';
const KEY_PENDING    = 'keep_pending_fitting_items';
const KEY_SESSION    = 'keep_session_id';
const KEY_EXPIRES    = 'keep_session_expires_at';
const KEY_ASSIGNMENT = 'keep_customer_assignment';
const SESSION_TTL    = 60 * 60 * 1000;

// ─── Types ──────────────────────────────────────────────────────
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

// ─── Color → background mapping (placeholder용) ─────────────────
const COLOR_BG: Record<string, string> = {
  'Black':      '#2c2c2e', 'White':      '#f5f5f5',
  'Blue':       '#bfdbfe', 'Navy':       '#c7d7f5',
  'Beige':      '#f5e6d0', 'Khaki':      '#dce6c2',
  'Brown':      '#d9c4a8', 'Grey':       '#e0e0e5',
  'Cream':      '#fef8ea', 'Olive':      '#d4e0b4',
  'Red':        '#ffd0d0', 'Burgundy':   '#f0c8d0',
  'Forest':     '#c2e2ce', 'Floral':     '#fce2ee',
  'Charcoal':   '#d0d0d5', 'Ivory':      '#fef9ec',
  'Wine':       '#f0c0cc', 'Champagne':  '#faf0d8',
  'Dark Blue':  '#c8d4f0', 'Light Blue': '#d4eef8',
  'Camel':      '#f0ddb0', 'Sand':       '#ede4ca',
  'Earth':      '#d8c8b4', 'Sage':       '#d0ecdc',
  'Rust':       '#f4d0b8', 'Yellow':     '#fef3b0',
  'Orange':     '#f8d8b8', 'Pink':       '#f8dcea',
  'Dusty Pink': '#efd4d4', 'Dusty Rose': '#efd4d4',
};
const DEFAULT_BG = ['#f0e8da','#d8e6f0','#d8f0e6','#f0d8e6','#e6f0d8','#f0e8d8','#e6d8f0','#d8e0f0','#f0d8d8'];

function getColorBg(color: string, productId: number): string {
  return COLOR_BG[color] ?? DEFAULT_BG[productId % DEFAULT_BG.length];
}

// ─── 이미지 경로 규칙 ────────────────────────────────────────────
// /images/products/product-{두 자리 ID}-{color-slug}.png
// 예: /images/products/product-01-black.png
function getImageUrl(productId: number, color: string): string {
  return getProductImageUrl(productId, color);
}

function isDarkColor(color: string): boolean {
  return ['Black', 'Navy', 'Charcoal', 'Forest', 'Dark Blue', 'Wine', 'Burgundy'].includes(color);
}

// ─── Session helpers ────────────────────────────────────────────
function loadJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
}
function clearSession(): void {
  [KEY_SESSION, KEY_EXPIRES, KEY_ASSIGNMENT, KEY_PENDING, KEY_TAGGED].forEach(k => localStorage.removeItem(k));
}
function createSession(): string {
  const id = `session-${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(KEY_SESSION, id);
  localStorage.setItem(KEY_EXPIRES, String(Date.now() + SESSION_TTL));
  return id;
}
function ensureSession(): void {
  const sid = localStorage.getItem(KEY_SESSION);
  const exp = localStorage.getItem(KEY_EXPIRES);
  if (sid && exp && Date.now() < parseInt(exp, 10)) return;
  clearSession();
  createSession();
}
function getSessionId(): string {
  return localStorage.getItem(KEY_SESSION) ?? createSession();
}

// ─── ImageWithFallback ──────────────────────────────────────────
// 이미지 파일이 없으면 컬러 플레이스홀더로 대체
const ImageWithFallback = ({ productId, color }: { productId: number; color: string }) => {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(productId, color);
  const bg  = getColorBg(color, productId);
  const dark = isDarkColor(color);

  useEffect(() => { setFailed(false); }, [src]);

  if (failed) {
    return (
      <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Shirt size={44} style={{ opacity: 0.18, color: dark ? '#fff' : '#555' }} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', animation: 'fadeIn 0.3s ease' }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════
export const CustomerApp = () => {
  // ─── Session + State ──────────────────────────────────────────
  const [taggedProducts, setTaggedProducts] = useState<Product[]>(() => {
    ensureSession();
    return loadJson(KEY_TAGGED, []);
  });
  const [pendingItems, setPendingItems]   = useState<PendingItem[]>(() => loadJson(KEY_PENDING, []));
  const [assignment,   setAssignment]     = useState<CustomerAssignment | null>(() => loadJson(KEY_ASSIGNMENT, null));

  // ─── View ─────────────────────────────────────────────────────
  const [view,         setView]         = useState<'list' | 'detail'>('list');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailColor,   setDetailColor]   = useState<string | null>(null);
  const [detailSize,    setDetailSize]    = useState<string | null>(null);

  // ─── UI ───────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);
  const [successData,  setSuccessData]  = useState<CustomerAssignment | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  // ─── Swipe ────────────────────────────────────────────────────
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeDir    = useRef<'h' | 'v' | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // URL ?productId 로 상품 태그
  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get('productId');
    if (!pid) return;
    const num = parseInt(pid, 10);
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

  const savePending = (items: PendingItem[]) => {
    setPendingItems(items);
    localStorage.setItem(KEY_PENDING, JSON.stringify(items));
  };

  const handleResetSession = () => {
    clearSession(); createSession();
    setTaggedProducts([]); setPendingItems([]); setAssignment(null);
    setView('list'); setDetailProduct(null); setDetailColor(null); setDetailSize(null);
    setIsSubmitting(false); setShowSuccess(false); setSuccessData(null);
    const pid = new URLSearchParams(window.location.search).get('productId');
    if (pid) {
      const num = parseInt(pid, 10);
      if (!isNaN(num)) {
        getProduct(num)
          .then(p => { setTaggedProducts([p]); localStorage.setItem(KEY_TAGGED, JSON.stringify([p])); })
          .catch(() => {});
      }
    }
  };

  // ─── Detail open/close ────────────────────────────────────────
  const openDetail = (product: Product) => {
    const prev   = pendingItems.find(i => i.productId === String(product.id));
    const colors = [...new Set(product.variants.map(v => v.color))];
    setDetailProduct(product);
    setDetailColor(prev?.color ?? colors[0] ?? null);
    setDetailSize(prev?.size ?? null);
    setView('detail');
  };

  const closeDetail = () => {
    setView('list');
    setDetailProduct(null);
    setDetailColor(null);
    setDetailSize(null);
  };

  // ─── Detail computed ──────────────────────────────────────────
  const detailColors = useMemo(() => {
    if (!detailProduct) return [];
    return [...new Set(detailProduct.variants.map(v => v.color))];
  }, [detailProduct]);

  const detailSizes = useMemo(() => {
    if (!detailProduct) return [];
    return [...new Set(detailProduct.variants.map(v => v.size))];
  }, [detailProduct]);

  const colorIndex = detailColor ? detailColors.indexOf(detailColor) : 0;

  const isHearted = useMemo(() =>
    !!(detailProduct && detailColor && detailSize &&
      pendingItems.some(i => i.productId === String(detailProduct.id) && i.color === detailColor && i.size === detailSize)),
    [detailProduct, detailColor, detailSize, pendingItems]
  );

  const toggleDetailHeart = () => {
    if (!detailProduct || !detailColor || !detailSize) return;
    const pid = String(detailProduct.id);
    savePending(
      isHearted
        ? pendingItems.filter(i => i.productId !== pid)
        : [...pendingItems.filter(i => i.productId !== pid), { productId: pid, productName: detailProduct.name, color: detailColor, size: detailSize }]
    );
  };

  // ─── Swipe handlers (좌우 스와이프로 색상 이미지 전환) ──────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeDir.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (swipeDir.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 8 || dy > 8) swipeDir.current = dx > dy ? 'h' : 'v';
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (swipeDir.current !== 'h') return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) < 55) return;
    const next = dx > 0
      ? Math.min(colorIndex + 1, detailColors.length - 1)
      : Math.max(colorIndex - 1, 0);
    if (next !== colorIndex) setDetailColor(detailColors[next]);
  };

  // ─── Fitting request ──────────────────────────────────────────
  const handleFittingRequest = async () => {
    if (pendingItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createBatchRequest({ sessionId: getSessionId(), items: pendingItems });
      const a: CustomerAssignment = { customerNumber: result.customerNumber ?? 0, roomNumber: result.roomNumber };
      setAssignment(a);
      localStorage.setItem(KEY_ASSIGNMENT, JSON.stringify(a));
      savePending([]);
      setSuccessData(a);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error && err.message.includes('409')
        ? '현재 사용 가능한 피팅룸이 없습니다.'
        : '피팅 요청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────
  const activeColor = detailColor ?? detailColors[0] ?? 'Black';

  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#fafafa', position: 'relative' }}>

      {/* ── 앱 헤더 ───────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #ebebeb',
        height: '52px', padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-1.5px', color: '#111' }}>KEEP</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {assignment && (
            <span style={{ fontSize: '0.72rem', background: '#f0f0f0', color: '#555', fontWeight: 600, padding: '3px 8px', borderRadius: '8px' }}>
              고객번호 {assignment.customerNumber}번 {assignment.roomNumber != null && `· 피팅룸 ${assignment.roomNumber}번`}
            </span>
          )}
          <button
            onClick={handleResetSession}
            style={{ fontSize: '0.68rem', color: '#aaa', background: '#f5f5f5', border: '1px solid #e8e8e8', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            세션 초기화
          </button>
        </div>
      </header>

      {/* ── 리스트 뷰 ─────────────────────────────────────────── */}
      {view === 'list' && (
        <main style={{ padding: '12px 12px 110px' }}>
          {taggedProducts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '62vh', gap: '12px', color: '#bbb' }}>
              <Shirt size={64} style={{ opacity: 0.18 }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#888' }}>상품 태그를 스캔해주세요.</p>
              <p style={{ fontSize: '0.78rem', color: '#ccc', textAlign: 'center', lineHeight: 1.6 }}>
                URL에 <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>?productId=1</code> 을 추가하면<br />상품을 태그할 수 있습니다
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {taggedProducts.map(product => {
                const pending     = pendingItems.find(i => i.productId === String(product.id));
                const hearted     = !!pending;
                const firstColor  = product.variants[0]?.color ?? 'Black';

                return (
                  <div
                    key={product.id}
                    onClick={() => openDetail(product)}
                    style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                  >
                    {/* 이미지 영역 (4:5 비율) */}
                    <div style={{ position: 'relative', width: '100%', paddingBottom: '125%', background: getColorBg(firstColor, product.id) }}>
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <ImageWithFallback productId={product.id} color={pending?.color ?? firstColor} />
                      </div>

                      {/* 하트 버튼 */}
                      <button
                        onClick={e => { e.stopPropagation(); hearted ? savePending(pendingItems.filter(i => i.productId !== String(product.id))) : openDetail(product); }}
                        style={{ position: 'absolute', top: '9px', right: '9px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '33px', height: '33px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.12)' }}
                      >
                        <Heart size={15} fill={hearted ? '#ef4444' : 'none'} color={hearted ? '#ef4444' : '#888'} />
                      </button>

                      {/* 선택된 옵션 배지 */}
                      {pending && (
                        <div style={{ position: 'absolute', bottom: '9px', left: '9px', background: 'rgba(17,17,17,0.65)', color: '#fff', fontSize: '0.68rem', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', backdropFilter: 'blur(4px)', lineHeight: 1.4 }}>
                          {pending.color} · {pending.size}
                        </div>
                      )}
                    </div>

                    {/* 상품 정보 */}
                    <div style={{ padding: '10px 11px 13px' }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111', lineHeight: 1.4, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                        {product.name}
                      </p>
                      <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111' }}>
                        {product.price.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ── 상세 뷰 ───────────────────────────────────────────── */}
      {view === 'detail' && detailProduct && (
        <div style={{ position: 'fixed', inset: 0, background: '#fafafa', zIndex: 30, overflowY: 'auto', maxWidth: '480px', left: '50%', transform: 'translateX(-50%)', width: '100%' }}>

          {/* 상세 헤더 */}
          <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(250,250,250,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #ebebeb', height: '52px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', marginLeft: '-4px' }}>
              <ArrowLeft size={22} color="#111" />
            </button>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {detailProduct.name}
            </span>
            {pendingItems.some(i => i.productId === String(detailProduct.id)) && (
              <Heart size={19} fill="#ef4444" color="#ef4444" />
            )}
          </div>

          {/* ── 색상 이미지 캐러셀 ── */}
          <div
            style={{ width: '100%', paddingBottom: '116%', position: 'relative', background: getColorBg(activeColor, detailProduct.id), transition: 'background 0.35s ease', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
              <ImageWithFallback productId={detailProduct.id} color={activeColor} />
            </div>

            {/* 좌우 화살표 (색상 2개 이상일 때만) */}
            {detailColors.length > 1 && (
              <>
                {colorIndex > 0 && (
                  <button
                    onClick={() => setDetailColor(detailColors[colorIndex - 1])}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                  >
                    <ChevronLeft size={20} color="#333" />
                  </button>
                )}
                {colorIndex < detailColors.length - 1 && (
                  <button
                    onClick={() => setDetailColor(detailColors[colorIndex + 1])}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                  >
                    <ChevronRight size={20} color="#333" />
                  </button>
                )}

                {/* 색상 도트 인디케이터 */}
                <div style={{ position: 'absolute', bottom: '14px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '5px' }}>
                  {detailColors.map((c, idx) => (
                    <button
                      key={c}
                      onClick={() => setDetailColor(c)}
                      style={{ width: idx === colorIndex ? '22px' : '7px', height: '7px', borderRadius: '4px', background: idx === colorIndex ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)', border: 'none', cursor: 'pointer', transition: 'width 0.3s ease, background 0.3s ease', padding: 0 }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── 상품 정보 + 옵션 선택 ── */}
          <div style={{ padding: '22px 16px 130px', background: '#fafafa' }}>

            {/* 상품명 & 가격 */}
            <div style={{ marginBottom: '22px', paddingBottom: '18px', borderBottom: '1px solid #f0f0f0' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111', lineHeight: 1.4, marginBottom: '6px' }}>
                {detailProduct.name}
              </p>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111' }}>
                {detailProduct.price.toLocaleString()}원
              </p>
            </div>

            {/* 색상 선택 */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                색상{detailColor && <span style={{ color: '#111', fontWeight: 600, textTransform: 'none', marginLeft: '6px' }}>— {detailColor}</span>}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {detailColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setDetailColor(color)}
                    style={{ padding: '7px 18px', borderRadius: '999px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: detailColor === color ? 700 : 400, background: detailColor === color ? '#111' : '#f3f3f3', color: detailColor === color ? '#fff' : '#444', border: `1.5px solid ${detailColor === color ? '#111' : 'transparent'}`, transition: 'all 0.15s ease' }}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* 사이즈 선택 */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                사이즈{detailSize && <span style={{ color: '#111', fontWeight: 600, textTransform: 'none', marginLeft: '6px' }}>— {detailSize}</span>}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {detailSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setDetailSize(size)}
                    style={{ width: '56px', height: '46px', borderRadius: '10px', fontSize: '0.88rem', cursor: 'pointer', fontWeight: detailSize === size ? 700 : 400, background: detailSize === size ? '#111' : '#f3f3f3', color: detailSize === size ? '#fff' : '#444', border: `1.5px solid ${detailSize === size ? '#111' : 'transparent'}`, transition: 'all 0.15s ease' }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* 안내 텍스트 */}
            <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '14px', minHeight: '1.2em' }}>
              {!detailColor && !detailSize ? '색상과 사이즈를 선택해주세요.' :
               !detailColor ? '색상을 선택해주세요.' :
               !detailSize  ? '사이즈를 선택해주세요.' :
               isHearted    ? '피팅 목록에 추가됨 · 하단 버튼으로 요청하세요.' :
               '아래 버튼으로 피팅 목록에 추가하세요.'}
            </p>

            {/* 피팅 목록 추가 버튼 */}
            <button
              onClick={toggleDetailHeart}
              disabled={!detailColor || !detailSize}
              style={{ width: '100%', height: '54px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: (!detailColor || !detailSize) ? 'default' : 'pointer', transition: 'all 0.15s ease',
                background: (!detailColor || !detailSize) ? '#f3f3f3' : isHearted ? '#fff0f0' : '#111',
                color:      (!detailColor || !detailSize) ? '#ccc'     : isHearted ? '#ef4444' : '#fff',
                border: `1.5px solid ${isHearted ? '#fca5a5' : 'transparent'}`,
              }}
            >
              <Heart size={18}
                fill={(!detailColor || !detailSize) ? 'none' : isHearted ? '#ef4444' : '#fff'}
                color={(!detailColor || !detailSize) ? '#ccc' : isHearted ? '#ef4444' : '#fff'}
              />
              {isHearted ? '목록에서 제거' : '피팅 목록에 추가'}
            </button>
          </div>
        </div>
      )}

      {/* ── 피팅 요청 성공 모달 ───────────────────────────────── */}
      {showSuccess && successData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '22px', padding: '36px 24px', textAlign: 'center', width: '100%', maxWidth: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <CheckCircle size={54} color="#10b981" style={{ margin: '0 auto 18px' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', color: '#111' }}>피팅 요청 완료</h2>
            <div style={{ background: '#f7f7f7', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#666' }}>
                고객번호 <strong style={{ fontSize: '1.6em', color: '#111' }}>{successData.customerNumber}</strong>번
              </p>
              {successData.roomNumber != null
                ? <p style={{ fontSize: '0.9rem', color: '#666' }}>피팅룸 <strong style={{ fontSize: '1.6em', color: '#111' }}>{successData.roomNumber}</strong>번</p>
                : <p style={{ fontSize: '0.82rem', color: '#bbb' }}>피팅룸은 잠시 후 배정됩니다.</p>}
            </div>
            <p style={{ color: '#bbb', fontSize: '0.85rem', marginBottom: '22px' }}>직원이 상품을 준비하고 있습니다.</p>
            <button
              onClick={() => setShowSuccess(false)}
              style={{ width: '100%', padding: '15px', borderRadius: '14px', fontWeight: 800, fontSize: '0.95rem', background: '#111', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 하단 피팅 요청 버튼 ───────────────────────────────── */}
      {view === 'list' && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', padding: '10px 14px 22px', background: 'rgba(250,250,250,0.96)', borderTop: '1px solid #ebebeb', backdropFilter: 'blur(10px)', zIndex: 15 }}>
          <button
            onClick={handleFittingRequest}
            disabled={pendingItems.length === 0 || isSubmitting}
            style={{ width: '100%', height: '54px', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', cursor: pendingItems.length > 0 && !isSubmitting ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', transition: 'background 0.2s ease',
              background: pendingItems.length > 0 ? '#111' : '#f0f0f0',
              color:      pendingItems.length > 0 ? '#fff' : '#ccc',
            }}
          >
            {isSubmitting ? (
              <>
                <span style={{ width: '18px', height: '18px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }} />
                요청 중...
              </>
            ) : (
              <>
                <Heart size={18} fill={pendingItems.length > 0 ? '#fff' : 'none'} />
                피팅 요청하기
                {pendingItems.length > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, padding: '2px 7px', marginLeft: '2px' }}>
                    {pendingItems.length}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      )}

      {/* ── 토스트 ────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '82px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(17,17,17,0.88)', color: '#fff', padding: '11px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 500, zIndex: 60, whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }}>
          {toast}
        </div>
      )}
    </div>
  );
};
