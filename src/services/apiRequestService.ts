// ============================================================
// KEEP — API Request Service (IRequestService 구현체)
//
// 백엔드: FastAPI + SQLite (fitting_service.py)
// DB 구조: fitting_requests (세션 단위) + fitting_request_items (상품별)
// ============================================================

import type { IRequestService } from './requestService';
import type {
  FittingRequest,
  FittingRequestItem,
  FittingStatus,
  CreateSingleRequestBody,
  GetRequestsResponse,
  AdminStats,
  Product,
  ProductVariant,
  BatchFittingRequestBody,
} from '../types/request';

const BASE_URL = 'http://127.0.0.1:8000';

// ─── 백엔드 응답 타입 (snake_case) ────────────────────────────

interface ApiItem {
  id: number;
  product_id: string;
  product_name: string;
  color: string;
  size: string;
  variant_id?: number;
  serial_code?: string;
}

interface ApiRequestResponse {
  request_id: string;
  session_id: string;
  customer_number: number | null;
  fitting_room_id: string | null;
  room_number: number | null;
  status: FittingStatus;
  request_time: string;       // ISO 8601
  completed_at: string | null;
  items: ApiItem[];
  // 첫 번째 상품 호환 필드
  product_id: string;
  product_name: string;
  color: string;
  size: string;
}

interface ApiCreateBody {
  product_id: string;
  product_name: string;
  color: string;
  size: string;
  fitting_room_id: string | null;
  status: FittingStatus;
  session_id: string;
}

// ─── 매핑 함수 ────────────────────────────────────────────────

function mapItem(i: ApiItem): FittingRequestItem {
  return {
    id:          i.id,
    productId:   String(i.product_id),
    productName: i.product_name,
    color:       i.color,
    size:        i.size,
    variantId:   i.variant_id ?? undefined,
    serialCode:  i.serial_code ?? undefined,
  };
}

function mapResponse(r: ApiRequestResponse): FittingRequest {
  return {
    requestId:      r.request_id,
    sessionId:      r.session_id,
    customerNumber: r.customer_number,
    fittingRoomId:  r.fitting_room_id,
    roomNumber:     r.room_number ?? null,
    status:         r.status,
    requestTime:    new Date(r.request_time).getTime(),
    completedAt:    r.completed_at ? new Date(r.completed_at).getTime() : null,
    items:          (r.items ?? []).map(mapItem),
    productId:      r.product_id ?? '',
    productName:    r.product_name ?? '',
    color:          r.color ?? '',
    size:           r.size ?? '',
  };
}

function mapCreateBody(body: CreateSingleRequestBody): ApiCreateBody {
  return {
    product_id:      body.productId,
    product_name:    body.productName,
    color:           body.color,
    size:            body.size,
    fitting_room_id: body.fittingRoomId,
    status:          body.status,
    session_id:      body.sessionId,
  };
}

// ─── 상품 단건 조회 (IRequestService 외 독립 함수) ────────────────

interface ApiProductVariant { color: string; size: string; serial_code?: string; }
interface ApiProduct { id: number; name: string; price: number; image_url: string | null; category: string | null; variants: ApiProductVariant[]; }

function mapProductVariant(v: ApiProductVariant): ProductVariant {
  return { color: v.color, size: v.size, serialCode: v.serial_code ?? undefined };
}

function mapProduct(p: ApiProduct): Product {
  return {
    id:        p.id,
    name:      p.name,
    price:     p.price,
    imageUrl:  p.image_url,
    category:  p.category,
    variants:  p.variants.map(mapProductVariant),
  };
}

export async function createBatchRequest(body: BatchFittingRequestBody): Promise<FittingRequest> {
  const response = await fetch(`${BASE_URL}/api/requests/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: body.sessionId,
      items: body.items.map(item => ({
        product_id:   item.productId,
        product_name: item.productName,
        color:        item.color,
        size:         item.size,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(`[API] createBatchRequest 실패: ${response.status}`);
  }
  const data: ApiRequestResponse = await response.json();
  return mapResponse(data);
}

export async function getProduct(productId: number): Promise<Product> {
  const response = await fetch(`${BASE_URL}/api/products/${productId}`);
  if (!response.ok) {
    throw new Error(`[API] getProduct 실패: ${response.status}`);
  }
  const data: ApiProduct = await response.json();
  return mapProduct(data);
}

// ─── 서비스 구현체 ─────────────────────────────────────────────

export const apiRequestService: IRequestService = {

  async createRequest(body: CreateSingleRequestBody): Promise<FittingRequest> {
    const response = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapCreateBody(body)),
    });

    if (!response.ok) {
      throw new Error(`[API] createRequest 실패: ${response.status} ${response.statusText}`);
    }

    const data: ApiRequestResponse = await response.json();
    return mapResponse(data);
  },

  async getRequests(): Promise<GetRequestsResponse> {
    const response = await fetch(`${BASE_URL}/api/requests`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`[API] getRequests 실패: ${response.status} ${response.statusText}`);
    }

    const data: { requests: ApiRequestResponse[] } = await response.json();
    return { requests: data.requests.map(mapResponse) };
  },

  async updateStatus(requestId: string, status: FittingStatus): Promise<FittingRequest> {
    const response = await fetch(`${BASE_URL}/api/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`[API] updateStatus 실패: ${response.status} ${response.statusText}`);
    }

    const data: ApiRequestResponse = await response.json();
    return mapResponse(data);
  },

  async getAdminStats(): Promise<AdminStats> {
    const response = await fetch(`${BASE_URL}/admin/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`[API] getAdminStats 실패: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
};
