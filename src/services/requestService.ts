// ============================================================
// KEEP — Request Service Interface
//
// ⚠️ 백엔드 구조: 요청 1개 = 상품 1개
//    createRequest는 단일 상품 바디(CreateSingleRequestBody)를 받음
//
// 이 인터페이스를 구현하는 모듈만 교체하면
// Mock → 실제 API로 전환됩니다.
// ============================================================

import type {
  FittingRequest,
  FittingStatus,
  CreateSingleRequestBody,
  GetRequestsResponse,
  AdminStats,
} from '../types/request';

/**
 * IRequestService
 *
 * 구현체: apiRequestService (src/services/apiRequestService.ts)
 * 진입점: src/services/index.ts
 */
export interface IRequestService {
  /**
   * [POST /api/requests] 피팅 요청 생성 (상품 1개)
   * 여러 상품 태깅 시 useRequests.createRequests()가 이 함수를 n번 호출
   */
  createRequest(body: CreateSingleRequestBody): Promise<FittingRequest>;

  /**
   * [GET /api/requests] 전체 요청 목록 조회
   */
  getRequests(): Promise<GetRequestsResponse>;

  /**
   * [PATCH /api/requests/:id] 요청 상태 변경
   */
  updateStatus(requestId: string, status: FittingStatus): Promise<FittingRequest>;

  /**
   * [GET /admin/stats] 관리자 통계 조회
   */
  getAdminStats(): Promise<AdminStats>;
}
