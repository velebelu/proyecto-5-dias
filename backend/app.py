from fastapi import FastAPI, HTTPException, Header, Depends, Query, status
from typing import List, Optional
from models import Item, ItemUpdate
from fastapi.middleware.cors import CORSMiddleware
import db

# ——— Seguridad simple con X-API-KEY ———
API_KEY = "2vaquitas"

def verify_api_key(x_api_key: str = Header(..., alias="X-API-KEY")):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="X-API-KEY inválida")

app = FastAPI(
    title="Despensa API (CSV)",
    version="0.2",
    dependencies=[Depends(verify_api_key)]  # aplica a todas las rutas
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # solo para desarrollo
    allow_methods=["*"],
    allow_headers=["*"],     # importante para X-API-KEY
)

@app.on_event("startup")
def startup_event():
    db.init_db()

# GET con filtros: ?q=...&categoria=...&belowMin=1
@app.get("/items", response_model=List[Item])
def get_items(
    q: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    belowMin: Optional[int] = Query(None)
):
    items = db.list_items(
        q=q,
        category=categoria,
        below_min=bool(belowMin)
    )
    return items

@app.post("/items", response_model=Item, status_code=201)
def create_item(item: Item):
    if not item.name.strip():
        raise HTTPException(status_code=400, detail="El nombre es obligatorio.")
    created = db.add_item(item)
    return created

@app.put("/items/{item_id}", response_model=Item)
def update_item(item_id: int, patch: ItemUpdate):
    # si no viene nada para actualizar:
    if all(getattr(patch, f) is None for f in ["name","category","quantity","unit","expiry_date","min_quantity","notes"]):
        raise HTTPException(status_code=400, detail="No has enviado ningún campo para actualizar.")
    try:
        updated = db.update_item(item_id, patch)
        return updated
    except ValueError:
        raise HTTPException(status_code=404, detail="Item no encontrado.")

@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int):
    ok = db.delete_item(item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Item no encontrado.")
    return None  # 204 No Content
