// ============================================================
// KEEP — 공통 데이터 타입 정의
// ============================================================

export type FittingStatus = 'pending' | 'assigned' | 'completed';

// ─── UI 레이어 ─────────────────────────────────────────────
/** NFC 태깅 시 선택된 단일 상품 (고객 화면 내부 상태용) */
export interface TaggedProduct {
  productId: string;
  productName: string;
  color: string;
  size: string;
}

// ─── API 레이어 ────────────────────────────────────────────

/** 피팅 요청 내 개별 상품 아이템 (fitting_request_items 행) */
export interface FittingRequestItem {
  id: number;
  productId: string;
  productName: string;
  color: string;
  size: string;
}

/**
 * FittingRequest — 세션 단위 피팅 요청 (fitting_requests 행)
 * 한 세션에 상품 여러 개가 있을 수 있으며 items[]에 담김.
 * productId/productName/color/size는 items[0] 기반 호환 필드.
 */
export interface FittingRequest {
  requestId: string;
  sessionId: string;
  customerNumber: number | null;
  fittingRoomId: string | null;
  roomNumber: number | null;   // fitting_rooms.room_number (고객에게 보여주는 번호)
  status: FittingStatus;
  requestTime: number;         // Unix ms (ISO 8601 → 변환)
  completedAt: number | null;
  items: FittingRequestItem[];
  // items[0] 호환 필드 (StaffApp/AdminApp 단일 상품 참조용)
  productId: string;
  productName: string;
  color: string;
  size: string;
}

/** POST /api/requests 요청 바디 (상품 1개) */
export interface CreateSingleRequestBody {
  productId: string;
  productName: string;
  color: string;
  size: string;
  fittingRoomId: string | null;
  status: FittingStatus;
  sessionId: string;
}

/** UI 진입점 — 태깅된 상품 배열 + 세션 정보 */
export interface CreateFittingRequestBody {
  products: TaggedProduct[];
  fittingRoomId: string | null;
  status: FittingStatus;
  sessionId: string;
}

/** PATCH /api/requests/:id 바디 */
export interface UpdateStatusBody {
  status: FittingStatus;
}

/** GET /api/requests 응답 */
export interface GetRequestsResponse {
  requests: FittingRequest[];
}

/** GET /api/products/{id} — 상품 옵션 단위 */
export interface ProductVariant {
  color: string;
  size: string;
}

/** GET /api/products/{id} 응답 */
export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
  variants: ProductVariant[];
}

/** POST /api/requests/batch — 일괄 요청의 상품 단위 */
export interface BatchFittingItem {
  productId: string;
  productName: string;
  color: string;
  size: string;
}

/** POST /api/requests/batch 요청 바디 */
export interface BatchFittingRequestBody {
  sessionId: string;
  items: BatchFittingItem[];
}

/** GET /admin/stats 응답 */
export interface AdminStats {
  total: number;
  pending: number;
  assigned: number;
  completed: number;
}
