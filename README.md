# KEEP SITE

KEEP는 오프라인 의류 매장에서 고객이 NFC 태깅으로 상품 정보를 확인하고,  
피팅 요청을 보내면 직원과 관리자가 이를 확인/처리할 수 있는 웹 기반 MVP 서비스입니다.

현재는 배포 버전이 아니라 **로컬 실행 및 실기기 테스트용 버전**입니다.

---

## 1. 서비스 흐름

```txt
NFC 태깅
→ 고객 상품 확인
→ 옵션 선택
→ 하트로 상품 선택
→ 피팅 요청
→ 직원 요청 확인
→ 상품 전달 처리
→ 관리자 데이터 집계
```

---

## 2. 주요 기능

### 고객 페이지

- 상품 정보 확인
- 상품명 / 가격 / 이미지 확인
- 색상 / 사이즈 / 재고 옵션 확인
- 하트로 피팅 요청 상품 선택
- 피팅 요청 생성
- 고객번호 / 피팅룸 번호 확인
- 세션 ID 기반 고객 유지
- 개발용 세션 초기화

### 직원 페이지

- 피팅 요청 실시간 확인
- 고객번호 / 피팅룸 번호 확인
- 요청 상품 정보 확인
- 색상 / 사이즈 확인
- 상품 일련번호 확인
- 상품 전달 확인 처리

### 관리자 페이지

- 전체 피팅 요청 현황 확인
- 상태별 요청 수 확인
- 상품별 요청 수 확인
- 옵션별 요청 수 확인
- 평균 처리 시간 확인
- 실시간 요청 로그 확인
- 표시 데이터 초기화

---

## 3. 기술 스택

- **Frontend:** React / TypeScript / Vite
- **Backend:** FastAPI
- **Database:** SQLite
- **Test:** NFC 태그 / 모바일 브라우저

---

## 4. 실행 방법

### 프론트엔드 실행

```bash
npm install
npm run dev -- --host 0.0.0.0
```

PC에서 접속:

```txt
http://localhost:5173/customer.html
http://localhost:5173/staff.html
http://localhost:5173/admin.html
```

상품 페이지 예시:

```txt
http://localhost:5173/customer.html?productId=1
```

---

### 백엔드 실행

```bash
python -m uvicorn fitting_service:app --host 0.0.0.0 --port 8000
```

API 문서:

```txt
http://localhost:8000/docs
```

---

## 5. 핸드폰에서 접속하는 방법

핸드폰과 PC가 같은 Wi-Fi에 연결되어 있어야 합니다.

프론트엔드 실행 시 터미널에 표시되는 `Network` 주소를 확인합니다.

핸드폰에서는 아래 형식으로 접속합니다.

```txt
http://<PC_IP>:5173/customer.html?productId=1
http://<PC_IP>:5173/staff.html
http://<PC_IP>:5173/admin.html
```

백엔드 API 문서:

```txt
http://<PC_IP>:8000/docs
```

### 주의사항

모바일 테스트 시 프론트엔드의 API 주소가 `localhost` 또는 `127.0.0.1`이면 안 됩니다.

핸드폰에서 `localhost`는 PC가 아니라 핸드폰 자기 자신을 의미하므로,  
핸드폰 테스트 시에는 PC의 IP 주소를 사용해야 합니다.

예시:

```ts
const BASE_URL = "http://<PC_IP>:8000";
```

---

## 6. NFC 테스트

NFC 태그에는 아래 형식의 주소를 기록합니다.

```txt
http://<PC_IP>:5173/customer.html?productId=상품번호
```

예시:

```txt
http://<PC_IP>:5173/customer.html?productId=1
```

핸드폰으로 NFC를 태깅하면 해당 상품 페이지가 열립니다.

---

## 7. 현재 상태

기존 Mock 기반 프로토타입에서 벗어나,  
현재는 **FastAPI + SQLite DB 기반 로컬 MVP**로 구성되어 있습니다.

고객 페이지, 직원 페이지, 관리자 페이지가 하나의 DB/API 흐름으로 연결되어 있습니다.

```txt
고객 상품 조회
→ 옵션 선택
→ 피팅 요청 생성
→ 고객번호 / 피팅룸 번호 부여
→ 직원 화면 요청 표시
→ 관리자 화면 데이터 집계
```
