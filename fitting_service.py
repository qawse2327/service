"""
KEEP Fitting Room Service — SQLite 기반
DB 파일: keep_service.db (이 파일과 같은 디렉토리에 자동 생성)
"""

import sqlite3
import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

# (product_id, color, size, stock)
VARIANTS = [
    # 1: Classic White T-Shirt
    (1,"White","S",10),(1,"White","M",8),(1,"White","L",5),(1,"White","XL",3),
    (1,"Black","S",7),(1,"Black","M",9),(1,"Black","L",6),(1,"Black","XL",4),
    (1,"Grey","S",6),(1,"Grey","M",7),(1,"Grey","L",8),(1,"Grey","XL",2),
    # 2: Denim Jacket Vintage
    (2,"Blue","M",5),(2,"Blue","L",4),(2,"Blue","XL",3),
    (2,"Black","M",4),(2,"Black","L",6),(2,"Black","XL",2),
    # 3: Pleated Midi Skirt
    (3,"Beige","S",8),(3,"Beige","M",6),(3,"Beige","L",4),
    (3,"Navy","S",5),(3,"Navy","M",7),(3,"Navy","L",3),
    (3,"Olive","S",4),(3,"Olive","M",5),(3,"Olive","L",6),
    # 4: Oversize Wool Coat
    (4,"Charcoal","Free",6),(4,"Camel","Free",4),(4,"Black","Free",5),
    # 5: Slim Chino Pants
    (5,"Khaki","28",7),(5,"Khaki","30",8),(5,"Khaki","32",5),(5,"Khaki","34",3),
    (5,"Navy","28",4),(5,"Navy","30",6),(5,"Navy","32",7),(5,"Navy","34",4),
    (5,"Olive","28",3),(5,"Olive","30",5),(5,"Olive","32",6),(5,"Olive","34",2),
    # 6: Striped Linen Shirt
    (6,"White","S",6),(6,"White","M",8),(6,"White","L",5),(6,"White","XL",3),
    (6,"Blue","S",5),(6,"Blue","M",7),(6,"Blue","L",6),(6,"Blue","XL",2),
    # 7: Knit Cardigan
    (7,"Cream","S",5),(7,"Cream","M",7),(7,"Cream","L",6),
    (7,"Grey","S",4),(7,"Grey","M",6),(7,"Grey","L",8),
    (7,"Pink","S",7),(7,"Pink","M",5),(7,"Pink","L",3),
    # 8: Wide Leg Trousers
    (8,"Black","S",6),(8,"Black","M",8),(8,"Black","L",5),(8,"Black","XL",3),
    (8,"Brown","S",4),(8,"Brown","M",6),(8,"Brown","L",7),(8,"Brown","XL",2),
    (8,"Sand","S",5),(8,"Sand","M",7),(8,"Sand","L",4),(8,"Sand","XL",3),
    # 9: Floral Sundress
    (9,"Floral","S",5),(9,"Floral","M",7),(9,"Floral","L",4),
    (9,"Navy","S",6),(9,"Navy","M",5),(9,"Navy","L",3),
    # 10: Bomber Jacket
    (10,"Olive","S",4),(10,"Olive","M",6),(10,"Olive","L",5),(10,"Olive","XL",3),
    (10,"Black","S",5),(10,"Black","M",7),(10,"Black","L",6),(10,"Black","XL",2),
    (10,"Khaki","S",3),(10,"Khaki","M",5),(10,"Khaki","L",4),(10,"Khaki","XL",2),
    # 11: Turtleneck Sweater
    (11,"Ivory","S",5),(11,"Ivory","M",7),(11,"Ivory","L",6),(11,"Ivory","XL",3),
    (11,"Charcoal","S",4),(11,"Charcoal","M",6),(11,"Charcoal","L",8),(11,"Charcoal","XL",4),
    (11,"Wine","S",6),(11,"Wine","M",5),(11,"Wine","L",4),(11,"Wine","XL",2),
    # 12: Cargo Pants
    (12,"Olive","S",5),(12,"Olive","M",7),(12,"Olive","L",6),(12,"Olive","XL",3),
    (12,"Black","S",6),(12,"Black","M",8),(12,"Black","L",5),(12,"Black","XL",4),
    # 13: Wrap Dress
    (13,"Burgundy","S",5),(13,"Burgundy","M",6),(13,"Burgundy","L",4),
    (13,"Forest","S",4),(13,"Forest","M",7),(13,"Forest","L",5),
    # 14: Crewneck Sweatshirt
    (14,"Grey","S",8),(14,"Grey","M",10),(14,"Grey","L",7),(14,"Grey","XL",5),
    (14,"Black","S",6),(14,"Black","M",9),(14,"Black","L",8),(14,"Black","XL",4),
    (14,"Navy","S",5),(14,"Navy","M",7),(14,"Navy","L",6),(14,"Navy","XL",3),
    # 15: High Rise Jeans
    (15,"Light Blue","24",5),(15,"Light Blue","26",7),(15,"Light Blue","28",6),(15,"Light Blue","30",4),
    (15,"Dark Blue","24",4),(15,"Dark Blue","26",8),(15,"Dark Blue","28",7),(15,"Dark Blue","30",5),
    # 16: Blazer Jacket
    (16,"Navy","S",4),(16,"Navy","M",6),(16,"Navy","L",5),
    (16,"Black","S",5),(16,"Black","M",7),(16,"Black","L",6),
    (16,"Camel","S",3),(16,"Camel","M",5),(16,"Camel","L",4),
    # 17: Polo Shirt
    (17,"White","S",8),(17,"White","M",10),(17,"White","L",7),(17,"White","XL",4),
    (17,"Navy","S",6),(17,"Navy","M",9),(17,"Navy","L",8),(17,"Navy","XL",3),
    (17,"Forest","S",5),(17,"Forest","M",7),(17,"Forest","L",6),(17,"Forest","XL",2),
    # 18: A-Line Dress
    (18,"Black","S",6),(18,"Black","M",8),(18,"Black","L",5),
    (18,"White","S",5),(18,"White","M",7),(18,"White","L",4),
    # 19: Utility Vest
    (19,"Olive","S",4),(19,"Olive","M",6),(19,"Olive","L",5),(19,"Olive","XL",3),
    (19,"Khaki","S",5),(19,"Khaki","M",7),(19,"Khaki","L",6),(19,"Khaki","XL",2),
    # 20: Ribbed Tank Top
    (20,"White","S",10),(20,"White","M",8),(20,"White","L",6),
    (20,"Black","S",9),(20,"Black","M",7),(20,"Black","L",5),
    (20,"Beige","S",7),(20,"Beige","M",6),(20,"Beige","L",4),
    # 21: Tailored Trousers
    (21,"Black","28",6),(21,"Black","30",8),(21,"Black","32",7),(21,"Black","34",4),
    (21,"Grey","28",5),(21,"Grey","30",7),(21,"Grey","32",6),(21,"Grey","34",3),
    (21,"Navy","28",4),(21,"Navy","30",6),(21,"Navy","32",5),(21,"Navy","34",2),
    # 22: Puffer Jacket
    (22,"Black","S",5),(22,"Black","M",7),(22,"Black","L",6),(22,"Black","XL",4),
    (22,"Olive","S",4),(22,"Olive","M",5),(22,"Olive","L",4),(22,"Olive","XL",3),
    (22,"Red","S",3),(22,"Red","M",4),(22,"Red","L",5),(22,"Red","XL",2),
    # 23: Satin Slip Dress
    (23,"Champagne","S",4),(23,"Champagne","M",6),(23,"Champagne","L",3),
    (23,"Black","S",5),(23,"Black","M",7),(23,"Black","L",4),
    (23,"Dusty Pink","S",6),(23,"Dusty Pink","M",5),(23,"Dusty Pink","L",3),
    # 24: Windbreaker
    (24,"Yellow","S",4),(24,"Yellow","M",5),(24,"Yellow","L",4),(24,"Yellow","XL",2),
    (24,"Blue","S",5),(24,"Blue","M",6),(24,"Blue","L",5),(24,"Blue","XL",3),
    (24,"Orange","S",3),(24,"Orange","M",4),(24,"Orange","L",3),(24,"Orange","XL",2),
    # 25: Maxi Skirt
    (25,"Black","S",6),(25,"Black","M",8),(25,"Black","L",5),
    (25,"Earth","S",5),(25,"Earth","M",7),(25,"Earth","L",4),
    # 26: Henley T-Shirt
    (26,"White","S",7),(26,"White","M",9),(26,"White","L",6),(26,"White","XL",4),
    (26,"Sage","S",5),(26,"Sage","M",7),(26,"Sage","L",6),(26,"Sage","XL",3),
    (26,"Rust","S",4),(26,"Rust","M",6),(26,"Rust","L",5),(26,"Rust","XL",2),
    # 27: Trench Coat
    (27,"Beige","S",4),(27,"Beige","M",6),(27,"Beige","L",5),
    (27,"Black","S",3),(27,"Black","M",5),(27,"Black","L",4),
    # 28: Biker Shorts
    (28,"Black","S",10),(28,"Black","M",8),(28,"Black","L",6),
    (28,"Navy","S",7),(28,"Navy","M",6),(28,"Navy","L",5),
    # 29: Sherpa Fleece Jacket
    (29,"Brown","S",4),(29,"Brown","M",6),(29,"Brown","L",5),(29,"Brown","XL",3),
    (29,"Cream","S",5),(29,"Cream","M",7),(29,"Cream","L",6),(29,"Cream","XL",2),
    # 30: Halter Neck Top
    (30,"Black","S",8),(30,"Black","M",6),(30,"Black","L",4),
    (30,"White","S",7),(30,"White","M",5),(30,"White","L",3),
    (30,"Dusty Rose","S",6),(30,"Dusty Rose","M",5),(30,"Dusty Rose","L",4),
]

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
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            color      TEXT    NOT NULL,
            size       TEXT    NOT NULL,
            stock      INTEGER NOT NULL DEFAULT 10,
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
            FOREIGN KEY (request_id) REFERENCES fitting_requests(id)
        );
    """)

    # 피팅룸 4개 시드 (없을 때만)
    if cur.execute("SELECT COUNT(*) FROM fitting_rooms").fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO fitting_rooms (id, room_number, status) VALUES (?, ?, 'available')",
            [(i, i) for i in range(1, 5)],
        )

    # 상품 30개 + 옵션 시드 (없을 때만)
    if cur.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        cur.executemany("INSERT INTO products (id, name, price) VALUES (?, ?, ?)", PRODUCTS)
        cur.executemany(
            "INSERT INTO product_variants (product_id, color, size, stock) VALUES (?, ?, ?, ?)",
            VARIANTS,
        )

    conn.commit()
    conn.close()
    print("[KEEP] DB ready:", DB_PATH)

# ─── 헬퍼 함수 ────────────────────────────────────────────────
def get_available_room(cur: sqlite3.Cursor):
    return cur.execute(
        "SELECT id, room_number FROM fitting_rooms WHERE status = 'available' ORDER BY room_number LIMIT 1"
    ).fetchone()

def build_response(cur: sqlite3.Cursor, req) -> dict:
    """fitting_requests 행 + items를 프론트 응답 형태로 변환"""
    items = cur.execute(
        "SELECT id, product_id, product_name, color, size FROM fitting_request_items WHERE request_id = ?",
        (req["id"],),
    ).fetchall()

    items_list = [
        {
            "id":           i["id"],
            "product_id":   i["product_id"],
            "product_name": i["product_name"],
            "color":        i["color"],
            "size":         i["size"],
        }
        for i in items
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
        # 같은 세션의 기존 요청 확인
        existing = cur.execute(
            "SELECT id FROM fitting_requests WHERE session_id = ?",
            (item.session_id,),
        ).fetchone()

        if existing:
            request_id = existing["id"]
        else:
            # 새 fitting_request 생성
            request_id = f"req-{uuid.uuid4().hex[:8]}"
            customer_number = cur.execute(
                "SELECT COUNT(*) FROM fitting_requests"
            ).fetchone()[0] + 1

            cur.execute(
                """INSERT INTO fitting_requests
                   (id, customer_number, session_id, status, requested_at)
                   VALUES (?, ?, ?, 'pending', ?)""",
                (request_id, customer_number, item.session_id, datetime.now().isoformat()),
            )

        # 상품 아이템 추가
        cur.execute(
            """INSERT INTO fitting_request_items
               (request_id, product_id, product_name, color, size)
               VALUES (?, ?, ?, ?, ?)""",
            (request_id, item.product_id, item.product_name, item.color, item.size),
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
        # 1. customer_number: 같은 session_id의 기존 번호 재사용
        prev = cur.execute(
            "SELECT customer_number FROM fitting_requests WHERE session_id = ? ORDER BY requested_at LIMIT 1",
            (body.session_id,),
        ).fetchone()
        if prev:
            customer_number = prev["customer_number"]
        else:
            max_num = cur.execute("SELECT MAX(customer_number) FROM fitting_requests").fetchone()[0]
            customer_number = (max_num or 0) + 1

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

        # 5. 상품 아이템 삽입
        for item in body.items:
            cur.execute(
                """INSERT INTO fitting_request_items
                   (request_id, product_id, product_name, color, size)
                   VALUES (?, ?, ?, ?, ?)""",
                (request_id, item.product_id, item.product_name, item.color, item.size),
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
    """상품 목록 (variants 포함)"""
    conn = get_db()
    cur = conn.cursor()
    try:
        products = cur.execute("SELECT * FROM products ORDER BY id").fetchall()
        result = []
        for p in products:
            variants = cur.execute(
                "SELECT color, size, stock FROM product_variants WHERE product_id = ?",
                (p["id"],),
            ).fetchall()
            result.append({
                "id":       p["id"],
                "name":     p["name"],
                "price":    p["price"],
                "variants": [dict(v) for v in variants],
            })
        return {"products": result}
    finally:
        conn.close()


@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    """단일 상품 상세 (variants 포함)"""
    conn = get_db()
    cur = conn.cursor()
    try:
        p = cur.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if not p:
            raise HTTPException(status_code=404, detail="Product not found")
        variants = cur.execute(
            "SELECT color, size FROM product_variants WHERE product_id = ? ORDER BY color, size",
            (product_id,),
        ).fetchall()
        return {
            "id":         p["id"],
            "name":       p["name"],
            "price":      p["price"],
            "image_url":  None,
            "category":   None,
            "variants":   [{"color": v["color"], "size": v["size"]} for v in variants],
        }
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
