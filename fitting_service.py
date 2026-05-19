"""
KEEP Fitting Room Service — SQLite 기반
DB 파일: keep_service.db (이 파일과 같은 디렉토리에 자동 생성)
"""

import sqlite3
import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ─── DB 경로: 항상 프로젝트 루트 기준 ──────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "keep_service.db")

# ─── FastAPI 앱 ────────────────────────────────────────────────
app = FastAPI(title="KEEP Fitting Room Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic 모델 ────────────────────────────────────────────
class CreateRequestItem(BaseModel):
    product_id: str
    product_name: str
    color: str
    size: str
    fitting_room_id: Optional[str] = None
    status: str = "pending"
    session_id: str

class UpdateStatusBody(BaseModel):
    status: str

class BatchItem(BaseModel):
    product_id: str
    product_name: str
    color: str
    size: str

class BatchRequestBody(BaseModel):
    session_id: str
    items: List[BatchItem]

# ─── 시드 데이터: 상품 30개 ────────────────────────────────────
PRODUCTS = [
    (1,  "Classic White T-Shirt",    35000),
    (2,  "Denim Jacket Vintage",     89000),
    (3,  "Pleated Midi Skirt",       54000),
    (4,  "Oversize Wool Coat",      159000),
    (5,  "Slim Chino Pants",         62000),
    (6,  "Striped Linen Shirt",      48000),
    (7,  "Knit Cardigan",            71000),
    (8,  "Wide Leg Trousers",        68000),
    (9,  "Floral Sundress",          57000),
    (10, "Bomber Jacket",            98000),
    (11, "Turtleneck Sweater",       64000),
    (12, "Cargo Pants",              73000),
    (13, "Wrap Dress",               61000),
    (14, "Crewneck Sweatshirt",      52000),
    (15, "High Rise Jeans",          86000),
    (16, "Blazer Jacket",           124000),
    (17, "Polo Shirt",               42000),
    (18, "A-Line Dress",             59000),
    (19, "Utility Vest",             67000),
    (20, "Ribbed Tank Top",          28000),
    (21, "Tailored Trousers",        89000),
    (22, "Puffer Jacket",           142000),
    (23, "Satin Slip Dress",         77000),
    (24, "Windbreaker",              95000),
    (25, "Maxi Skirt",               56000),
    (26, "Henley T-Shirt",           38000),
    (27, "Trench Coat",             178000),
    (28, "Biker Shorts",             32000),
    (29, "Sherpa Fleece Jacket",    118000),
    (30, "Halter Neck Top",          44000),
]

# ─── 정규화 옵션: 제품당 색상 2개 × 사이즈 2개 = 총 120개 variant ─
# 일련번호 규칙: P{상품번호:03d}-C{색상번호:02d}-S{사이즈번호:02d}
# 색상 인덱스: sorted(colors) 기준 C01/C02
# 사이즈 인덱스: ["M","L"] 기준 S01=M, S02=L
CANONICAL_VARIANTS: dict = {
    1:  {"colors": ["Black", "White"],          "sizes": ["M", "L"]},
    2:  {"colors": ["Black", "Blue"],           "sizes": ["M", "L"]},
    3:  {"colors": ["Beige", "Navy"],           "sizes": ["M", "L"]},
    4:  {"colors": ["Black", "Camel"],          "sizes": ["M", "L"]},
    5:  {"colors": ["Khaki", "Navy"],           "sizes": ["M", "L"]},
    6:  {"colors": ["Blue", "White"],           "sizes": ["M", "L"]},
    7:  {"colors": ["Cream", "Grey"],           "sizes": ["M", "L"]},
    8:  {"colors": ["Black", "Brown"],          "sizes": ["M", "L"]},
    9:  {"colors": ["Floral", "Navy"],          "sizes": ["M", "L"]},
    10: {"colors": ["Black", "Olive"],          "sizes": ["M", "L"]},
    11: {"colors": ["Charcoal", "Ivory"],       "sizes": ["M", "L"]},
    12: {"colors": ["Black", "Olive"],          "sizes": ["M", "L"]},
    13: {"colors": ["Burgundy", "Forest"],      "sizes": ["M", "L"]},
    14: {"colors": ["Black", "Grey"],           "sizes": ["M", "L"]},
    15: {"colors": ["Dark Blue", "Light Blue"], "sizes": ["M", "L"]},
    16: {"colors": ["Black", "Navy"],           "sizes": ["M", "L"]},
    17: {"colors": ["Navy", "White"],           "sizes": ["M", "L"]},
    18: {"colors": ["Black", "White"],          "sizes": ["M", "L"]},
    19: {"colors": ["Khaki", "Olive"],          "sizes": ["M", "L"]},
    20: {"colors": ["Black", "White"],          "sizes": ["M", "L"]},
    21: {"colors": ["Black", "Grey"],           "sizes": ["M", "L"]},
    22: {"colors": ["Black", "Olive"],          "sizes": ["M", "L"]},
    23: {"colors": ["Black", "Champagne"],      "sizes": ["M", "L"]},
    24: {"colors": ["Blue", "Yellow"],          "sizes": ["M", "L"]},
    25: {"colors": ["Black", "Earth"],          "sizes": ["M", "L"]},
    26: {"colors": ["Sage", "White"],           "sizes": ["M", "L"]},
    27: {"colors": ["Beige", "Black"],          "sizes": ["M", "L"]},
    28: {"colors": ["Black", "Navy"],           "sizes": ["M", "L"]},
    29: {"colors": ["Brown", "Cream"],          "sizes": ["M", "L"]},
    30: {"colors": ["Black", "White"],          "sizes": ["M", "L"]},
}

# ─── DB 연결 ──────────────────────────────────────────────────
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

# ─── DB 초기화 (테이블이 없을 때만 생성 & 시드 삽입) ───────────
def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS products (
            id    INTEGER PRIMARY KEY,
            name  TEXT    NOT NULL,
            price INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS product_variants (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id  INTEGER NOT NULL,
            color       TEXT    NOT NULL,
            size        TEXT    NOT NULL,
            stock       INTEGER NOT NULL DEFAULT 0,
            serial_code TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS fitting_rooms (
            id                 INTEGER PRIMARY KEY,
            room_number        INTEGER NOT NULL UNIQUE,
            status             TEXT    NOT NULL DEFAULT 'available',
            current_request_id TEXT
        );

        CREATE TABLE IF NOT EXISTS fitting_requests (
            id              TEXT    PRIMARY KEY,
            customer_number INTEGER,
            session_id      TEXT    NOT NULL,
            fitting_room_id INTEGER,
            status          TEXT    NOT NULL DEFAULT 'pending',
            requested_at    TEXT    NOT NULL,
            completed_at    TEXT,
            FOREIGN KEY (fitting_room_id) REFERENCES fitting_rooms(id)
        );

        CREATE TABLE IF NOT EXISTS fitting_request_items (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id   TEXT    NOT NULL,
            product_id   TEXT,
            product_name TEXT    NOT NULL,
            color        TEXT    NOT NULL,
            size         TEXT    NOT NULL,
            variant_id   INTEGER,
            FOREIGN KEY (request_id) REFERENCES fitting_requests(id)
        );
    """)

    # 피팅룸 4개 시드 (없을 때만)
    if cur.execute("SELECT COUNT(*) FROM fitting_rooms").fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO fitting_rooms (id, room_number, status) VALUES (?, ?, 'available')",
            [(i, i) for i in range(1, 5)],
        )

    # 상품 30개 시드 (없을 때만) — variants는 migrate_db()에서 처리
    if cur.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        cur.executemany("INSERT INTO products (id, name, price) VALUES (?, ?, ?)", PRODUCTS)

    conn.commit()
    conn.close()
    print("[KEEP] DB ready:", DB_PATH)


# ─── DB 마이그레이션: serial_code 컬럼 추가 + variants 정규화 ──
def migrate_db():
    conn = get_db()
    cur = conn.cursor()

    # 1. product_variants에 serial_code 컬럼 추가 (이미 있으면 무시)
    try:
        cur.execute("ALTER TABLE product_variants ADD COLUMN serial_code TEXT")
        conn.commit()
        print("[KEEP] Migration: product_variants.serial_code 컬럼 추가")
    except sqlite3.OperationalError:
        pass

    # 2. fitting_request_items에 variant_id 컬럼 추가 (이미 있으면 무시)
    try:
        cur.execute("ALTER TABLE fitting_request_items ADD COLUMN variant_id INTEGER")
        conn.commit()
        print("[KEEP] Migration: fitting_request_items.variant_id 컬럼 추가")
    except sqlite3.OperationalError:
        pass

    # 3. product_variants를 120개(제품당 4개)로 정규화
    count = cur.execute(
        "SELECT COUNT(*) FROM product_variants WHERE serial_code IS NOT NULL"
    ).fetchone()[0]

    if count != 120:
        cur.execute("DELETE FROM product_variants")
        rows = []
        for product_id in sorted(CANONICAL_VARIANTS):
            config = CANONICAL_VARIANTS[product_id]
            colors = sorted(config["colors"])  # 알파벳 순 → C01/C02
            sizes  = config["sizes"]           # ["M","L"] → S01/S02
            for ci, color in enumerate(colors, start=1):
                for si, size in enumerate(sizes, start=1):
                    serial_code = f"P{product_id:03d}-C{ci:02d}-S{si:02d}"
                    rows.append((product_id, color, size, 0, serial_code))
        cur.executemany(
            "INSERT INTO product_variants (product_id, color, size, stock, serial_code) VALUES (?, ?, ?, ?, ?)",
            rows,
        )
        conn.commit()
        print(f"[KEEP] Migration: product_variants 정규화 완료 ({len(rows)}개)")

    conn.close()


# ─── 헬퍼 함수 ────────────────────────────────────────────────
def get_available_room(cur: sqlite3.Cursor):
    return cur.execute(
        "SELECT id, room_number FROM fitting_rooms WHERE status = 'available' ORDER BY room_number LIMIT 1"
    ).fetchone()

def find_variant_id(cur: sqlite3.Cursor, product_id: str, color: str, size: str) -> Optional[int]:
    """product_id + color + size로 variant_id 조회"""
    try:
        row = cur.execute(
            "SELECT id FROM product_variants WHERE product_id = ? AND color = ? AND size = ? LIMIT 1",
            (int(product_id), color, size),
        ).fetchone()
        return row["id"] if row else None
    except (ValueError, TypeError):
        return None

def get_next_customer_number(cur: sqlite3.Cursor) -> int:
    """오늘 날짜 기준 다음 customer_number 반환 (하루 단위 1번부터 시작)"""
    today = datetime.now().strftime('%Y-%m-%d')
    row = cur.execute(
        "SELECT COALESCE(MAX(customer_number), 0) + 1 FROM fitting_requests WHERE substr(requested_at, 1, 10) = ?",
        (today,),
    ).fetchone()
    return row[0]

def build_response(cur: sqlite3.Cursor, req) -> dict:
    """fitting_requests 행 + items를 프론트 응답 형태로 변환"""
    items_rows = cur.execute(
        """SELECT fri.id, fri.product_id, fri.product_name, fri.color, fri.size, fri.variant_id,
                  COALESCE(
                      pv1.serial_code,
                      (SELECT pv2.serial_code FROM product_variants pv2
                       WHERE pv2.product_id = CAST(
                           CASE WHEN fri.product_id LIKE 'prod-%'
                                THEN SUBSTR(fri.product_id, 6)
                                ELSE fri.product_id
                           END AS INTEGER)
                       AND pv2.color = fri.color AND pv2.size = fri.size LIMIT 1)
                  ) AS serial_code
           FROM fitting_request_items fri
           LEFT JOIN product_variants pv1 ON pv1.id = fri.variant_id
           WHERE fri.request_id = ?""",
        (req["id"],),
    ).fetchall()

    items_list = [
        {
            "id":           i["id"],
            "product_id":   i["product_id"],
            "product_name": i["product_name"],
            "color":        i["color"],
            "size":         i["size"],
            "variant_id":   i["variant_id"],
            "serial_code":  i["serial_code"],
        }
        for i in items_rows
    ]

    first = items_list[0] if items_list else {}

    room_number = None
    if req["fitting_room_id"]:
        room_row = cur.execute(
            "SELECT room_number FROM fitting_rooms WHERE id = ?",
            (req["fitting_room_id"],)
        ).fetchone()
        if room_row:
            room_number = room_row["room_number"]

    return {
        "request_id":      req["id"],
        "session_id":      req["session_id"],
        "customer_number": req["customer_number"],
        "fitting_room_id": str(req["fitting_room_id"]) if req["fitting_room_id"] else None,
        "room_number":     room_number,
        "status":          req["status"],
        "request_time":    req["requested_at"],
        "completed_at":    req["completed_at"],
        "items":           items_list,
        # 첫 번째 상품 필드 — 프론트 단일 상품 호환용
        "product_id":      first.get("product_id", ""),
        "product_name":    first.get("product_name", ""),
        "color":           first.get("color", ""),
        "size":            first.get("size", ""),
    }

# ─── 앱 시작 시 DB 초기화 ──────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()
    migrate_db()

# ─── API 엔드포인트 ────────────────────────────────────────────

@app.post("/api/requests")
def create_request(item: CreateRequestItem):
    """
    고객 피팅 요청 생성.
    같은 session_id로 여러 번 호출하면 fitting_request_items에만 추가되고
    fitting_requests 레코드는 세션당 1건만 생성됩니다.
    """
    conn = get_db()
    cur = conn.cursor()
    try:
        # 같은 세션의 오늘 날짜 기존 요청 확인
        today = datetime.now().strftime('%Y-%m-%d')
        existing = cur.execute(
            "SELECT id FROM fitting_requests WHERE session_id = ? AND substr(requested_at, 1, 10) = ?",
            (item.session_id, today),
        ).fetchone()

        if existing:
            request_id = existing["id"]
        else:
            # 새 fitting_request 생성 (오늘 기준 customer_number 발급)
            request_id = f"req-{uuid.uuid4().hex[:8]}"
            customer_number = get_next_customer_number(cur)

            cur.execute(
                """INSERT INTO fitting_requests
                   (id, customer_number, session_id, status, requested_at)
                   VALUES (?, ?, ?, 'pending', ?)""",
                (request_id, customer_number, item.session_id, datetime.now().isoformat()),
            )

        # variant_id 조회
        variant_id = find_variant_id(cur, item.product_id, item.color, item.size)

        # 상품 아이템 추가
        cur.execute(
            """INSERT INTO fitting_request_items
               (request_id, product_id, product_name, color, size, variant_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (request_id, item.product_id, item.product_name, item.color, item.size, variant_id),
        )

        conn.commit()

        req_row = cur.execute(
            "SELECT * FROM fitting_requests WHERE id = ?", (request_id,)
        ).fetchone()

        print(f"[KEEP] request: {item.product_name} ({item.color}/{item.size}) session={item.session_id[:12]}")
        return build_response(cur, req_row)

    finally:
        conn.close()


@app.post("/api/requests/batch")
def create_batch_request(body: BatchRequestBody):
    """
    일괄 피팅 요청.
    - 같은 session_id라도 항상 새 request_id(새 행) 생성
    - customer_number: session_id가 기존에 있으면 재사용, 없으면 MAX+1
    - fitting_room: 같은 session의 active 요청이 점유한 방이 있으면 재사용,
                    없으면 available 방 중 가장 낮은 번호 배정
    - available 방이 없으면 409 반환
    """
    if not body.items:
        raise HTTPException(status_code=400, detail="items is empty")

    conn = get_db()
    cur = conn.cursor()
    try:
        # 1. customer_number: 오늘 날짜 기준 같은 session_id의 기존 번호 재사용
        today = datetime.now().strftime('%Y-%m-%d')
        prev = cur.execute(
            "SELECT customer_number FROM fitting_requests WHERE session_id = ? AND substr(requested_at, 1, 10) = ? ORDER BY requested_at LIMIT 1",
            (body.session_id, today),
        ).fetchone()
        if prev:
            customer_number = prev["customer_number"]
        else:
            customer_number = get_next_customer_number(cur)

        # 2. 활성 방 확인 (같은 session_id의 non-completed 요청 중 방이 있는 것)
        active = cur.execute(
            """SELECT fitting_room_id FROM fitting_requests
               WHERE session_id = ? AND fitting_room_id IS NOT NULL
               AND status NOT IN ('completed', 'cancelled')
               ORDER BY requested_at DESC LIMIT 1""",
            (body.session_id,),
        ).fetchone()

        if active:
            room_id = active["fitting_room_id"]
            assign_new_room = False
        else:
            room = cur.execute(
                "SELECT id, room_number FROM fitting_rooms WHERE status = 'available' ORDER BY room_number LIMIT 1"
            ).fetchone()
            if not room:
                raise HTTPException(status_code=409, detail="현재 사용 가능한 피팅룸이 없습니다.")
            room_id = room["id"]
            assign_new_room = True

        # 3. 항상 새 request_id + 새 fitting_requests 행 생성
        request_id = f"req-{uuid.uuid4().hex[:8]}"
        cur.execute(
            """INSERT INTO fitting_requests
               (id, customer_number, session_id, status, fitting_room_id, requested_at)
               VALUES (?, ?, ?, 'pending', ?, ?)""",
            (request_id, customer_number, body.session_id, room_id, datetime.now().isoformat()),
        )

        # 4. 새로 방을 배정한 경우에만 fitting_rooms 업데이트
        if assign_new_room:
            cur.execute(
                "UPDATE fitting_rooms SET status = 'occupied', current_request_id = ? WHERE id = ?",
                (request_id, room_id),
            )

        # 5. 상품 아이템 삽입 (variant_id 포함)
        for item in body.items:
            variant_id = find_variant_id(cur, item.product_id, item.color, item.size)
            cur.execute(
                """INSERT INTO fitting_request_items
                   (request_id, product_id, product_name, color, size, variant_id)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (request_id, item.product_id, item.product_name, item.color, item.size, variant_id),
            )

        conn.commit()

        req_row = cur.execute(
            "SELECT * FROM fitting_requests WHERE id = ?", (request_id,)
        ).fetchone()

        print(f"[KEEP] batch: {len(body.items)} items, customer={customer_number}, room={room_id}")
        return build_response(cur, req_row)

    finally:
        conn.close()


@app.get("/api/requests")
def get_requests():
    """전체 피팅 요청 목록 (세션 단위, items 포함)"""
    conn = get_db()
    cur = conn.cursor()
    try:
        rows = cur.execute(
            "SELECT * FROM fitting_requests ORDER BY requested_at DESC"
        ).fetchall()
        return {"requests": [build_response(cur, row) for row in rows]}
    finally:
        conn.close()


@app.patch("/api/requests/{request_id}")
def update_request_status(request_id: str, body: UpdateStatusBody):
    """
    요청 상태 변경.
    pending → assigned: 빈 피팅룸 자동 배정
    assigned → completed: 피팅룸 반납 + completed_at 기록
    """
    conn = get_db()
    cur = conn.cursor()
    try:
        row = cur.execute(
            "SELECT * FROM fitting_requests WHERE id = ?", (request_id,)
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다.")

        old_status = row["status"]
        new_status = body.status

        if new_status == "assigned" and old_status == "pending":
            # 피팅룸은 batch 생성 시 이미 배정됨 — 상태만 변경
            cur.execute(
                "UPDATE fitting_requests SET status = 'assigned' WHERE id = ?",
                (request_id,),
            )
            print(f"[KEEP] assigned: {request_id} (room {row['fitting_room_id']})")

        elif new_status == "completed" and old_status == "assigned":
            room_id = row["fitting_room_id"]
            session_id = row["session_id"]
            cur.execute(
                "UPDATE fitting_requests SET status = 'completed', completed_at = ? WHERE id = ?",
                (datetime.now().isoformat(), request_id),
            )
            if room_id:
                # 같은 세션의 이 방을 사용하는 active 요청이 남아있으면 방 유지
                other_active = cur.execute(
                    """SELECT COUNT(*) FROM fitting_requests
                       WHERE session_id = ? AND fitting_room_id = ?
                       AND status NOT IN ('completed', 'cancelled') AND id != ?""",
                    (session_id, room_id, request_id),
                ).fetchone()[0]
                if other_active == 0:
                    cur.execute(
                        "UPDATE fitting_rooms SET status = 'available', current_request_id = NULL WHERE id = ?",
                        (room_id,),
                    )
                    print(f"[KEEP] completed: {request_id}, room {room_id} freed")
                else:
                    print(f"[KEEP] completed: {request_id}, room {room_id} kept ({other_active} active)")

        else:
            cur.execute(
                "UPDATE fitting_requests SET status = ? WHERE id = ?",
                (new_status, request_id),
            )

        conn.commit()

        updated = cur.execute(
            "SELECT * FROM fitting_requests WHERE id = ?", (request_id,)
        ).fetchone()
        return build_response(cur, updated)

    finally:
        conn.close()


@app.get("/api/fitting-rooms")
def get_fitting_rooms():
    """피팅룸 현황"""
    conn = get_db()
    cur = conn.cursor()
    try:
        rows = cur.execute(
            "SELECT * FROM fitting_rooms ORDER BY room_number"
        ).fetchall()
        return {"rooms": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/api/products")
def get_products():
    """상품 목록 (variants + serial_code 포함)"""
    conn = get_db()
    cur = conn.cursor()
    try:
        products = cur.execute("SELECT * FROM products ORDER BY id").fetchall()
        result = []
        for p in products:
            variants = cur.execute(
                "SELECT id, color, size, serial_code FROM product_variants WHERE product_id = ? ORDER BY serial_code",
                (p["id"],),
            ).fetchall()
            result.append({
                "id":       p["id"],
                "name":     p["name"],
                "price":    p["price"],
                "variants": [
                    {"id": v["id"], "color": v["color"], "size": v["size"], "serial_code": v["serial_code"]}
                    for v in variants
                ],
            })
        return {"products": result}
    finally:
        conn.close()


@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    """단일 상품 상세 (variants + serial_code 포함)"""
    conn = get_db()
    cur = conn.cursor()
    try:
        p = cur.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if not p:
            raise HTTPException(status_code=404, detail="Product not found")
        variants = cur.execute(
            "SELECT id, color, size, serial_code FROM product_variants WHERE product_id = ? ORDER BY serial_code",
            (product_id,),
        ).fetchall()
        return {
            "id":         p["id"],
            "name":       p["name"],
            "price":      p["price"],
            "image_url":  None,
            "category":   None,
            "variants":   [
                {"id": v["id"], "color": v["color"], "size": v["size"], "serial_code": v["serial_code"]}
                for v in variants
            ],
        }
    finally:
        conn.close()


_DB_VIEW_STYLE = """
<style>
  body { font-family: sans-serif; margin: 24px; background: #f5f5f5; color: #222; }
  h1 { font-size: 1.4rem; margin-bottom: 6px; }
  p.sub { color: #666; font-size: 0.85rem; margin-bottom: 20px; }
  a { color: #1a73e8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  table { border-collapse: collapse; background: #fff; width: 100%; font-size: 0.88rem; }
  th { background: #1a73e8; color: #fff; padding: 8px 12px; text-align: left; }
  td { padding: 7px 12px; border-bottom: 1px solid #e0e0e0; white-space: nowrap; }
  tr:hover td { background: #f0f7ff; }
  .badge { display: inline-block; background: #e8f0fe; color: #1a73e8;
           border-radius: 4px; padding: 1px 7px; font-size: 0.8rem; }
  .back { margin-bottom: 16px; display: inline-block; }
  .warn { color: #c62828; font-size: 0.85rem; margin-top: 10px; }
</style>
"""

HIGHLIGHT_TABLES = {"products", "product_variants", "fitting_requests", "fitting_request_items"}


@app.get("/db-view", response_class=HTMLResponse)
def db_view_index():
    """DB 테이블 목록 (읽기 전용 시연 페이지)"""
    conn = get_db()
    cur = conn.cursor()
    try:
        tables = cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()

        rows_html = ""
        for t in tables:
            name = t["name"]
            count = cur.execute(f"SELECT COUNT(*) FROM \"{name}\"").fetchone()[0]
            highlight = " ★" if name in HIGHLIGHT_TABLES else ""
            badge = f'<span class="badge">{count} rows</span>'
            rows_html += (
                f"<tr><td><a href='/db-view/{name}'>{name}{highlight}</a></td>"
                f"<td>{badge}</td></tr>\n"
            )

        html = f"""<!DOCTYPE html>
<html lang='ko'>
<head><meta charset='UTF-8'><title>KEEP DB View</title>{_DB_VIEW_STYLE}</head>
<body>
<h1>KEEP — DB 테이블 목록</h1>
<p class='sub'>★ 표시 테이블이 핵심 시연 테이블입니다. 테이블명을 클릭하면 데이터를 확인할 수 있습니다.</p>
<table>
  <thead><tr><th>테이블명</th><th>행 수</th></tr></thead>
  <tbody>{rows_html}</tbody>
</table>
<p class='warn'>⚠ 이 페이지는 읽기 전용입니다. 데이터 수정은 불가합니다.</p>
</body></html>"""
        return HTMLResponse(content=html)
    finally:
        conn.close()


@app.get("/db-view/{table_name}", response_class=HTMLResponse)
def db_view_table(table_name: str):
    """선택 테이블 데이터 조회 (최대 100행, 읽기 전용)"""
    conn = get_db()
    cur = conn.cursor()
    try:
        # sqlite_ 내부 테이블 차단
        if table_name.startswith("sqlite_"):
            raise HTTPException(status_code=403, detail="내부 테이블은 조회할 수 없습니다.")

        # 테이블 존재 여부 확인
        exists = cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
            (table_name,),
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail=f"테이블 '{table_name}'을 찾을 수 없습니다.")

        rows = cur.execute(f"SELECT * FROM \"{table_name}\" LIMIT 100").fetchall()
        total = cur.execute(f"SELECT COUNT(*) FROM \"{table_name}\"").fetchone()[0]

        if not rows:
            body_html = "<tr><td colspan='99' style='color:#999;padding:16px'>데이터 없음</td></tr>"
            header_html = "<th>—</th>"
        else:
            cols = rows[0].keys()
            header_html = "".join(f"<th>{c}</th>" for c in cols)
            body_html = ""
            for r in rows:
                cells = "".join(
                    f"<td>{'' if r[c] is None else r[c]}</td>" for c in cols
                )
                body_html += f"<tr>{cells}</tr>\n"

        shown = min(len(rows), 100)
        note = f"{shown}/{total}행 표시" + (" (100행 제한)" if total > 100 else "")

        html = f"""<!DOCTYPE html>
<html lang='ko'>
<head><meta charset='UTF-8'><title>KEEP DB — {table_name}</title>{_DB_VIEW_STYLE}</head>
<body>
<a class='back' href='/db-view'>← 테이블 목록으로</a>
<h1>{table_name}</h1>
<p class='sub'>{note}</p>
<div style='overflow-x:auto'>
<table>
  <thead><tr>{header_html}</tr></thead>
  <tbody>{body_html}</tbody>
</table>
</div>
<p class='warn'>⚠ 이 페이지는 읽기 전용입니다. 데이터 수정은 불가합니다.</p>
</body></html>"""
        return HTMLResponse(content=html)
    finally:
        conn.close()


@app.get("/admin/stats")
def get_admin_stats():
    """관리자 통계"""
    conn = get_db()
    cur = conn.cursor()
    try:
        total     = cur.execute("SELECT COUNT(*) FROM fitting_requests").fetchone()[0]
        pending   = cur.execute("SELECT COUNT(*) FROM fitting_requests WHERE status = 'pending'").fetchone()[0]
        assigned  = cur.execute("SELECT COUNT(*) FROM fitting_requests WHERE status = 'assigned'").fetchone()[0]
        completed = cur.execute("SELECT COUNT(*) FROM fitting_requests WHERE status = 'completed'").fetchone()[0]
        return {"total": total, "pending": pending, "assigned": assigned, "completed": completed}
    finally:
        conn.close()
