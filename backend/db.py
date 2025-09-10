import csv
from typing import List, Dict, Any, Optional
from pathlib import Path
from models import Item, ItemUpdate

CSV_PATH = Path(__file__).with_name("despensa.csv")
FIELDNAMES = ["id", "name", "category", "quantity", "unit", "expiry_date", "min_quantity", "notes"]

def init_db():
    if not CSV_PATH.exists():
        with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
            writer.writeheader()

def _read_all() -> List[Dict[str, Any]]:
    init_db()
    items: List[Dict[str, Any]] = []
    with CSV_PATH.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["id"] = int(row["id"]) if row.get("id") else None
            row["quantity"] = float(row["quantity"]) if row.get("quantity") else 0.0
            row["min_quantity"] = float(row["min_quantity"]) if row.get("min_quantity") else 0.0
            items.append(row)
    return items

def _write_all(items: List[Dict[str, Any]]) -> None:
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        for it in items:
            writer.writerow({
                "id": it.get("id"),
                "name": it.get("name", ""),
                "category": it.get("category", ""),
                "quantity": it.get("quantity", 0),
                "unit": it.get("unit", "ud"),
                "expiry_date": it.get("expiry_date", ""),
                "min_quantity": it.get("min_quantity", 0),
                "notes": it.get("notes", "")
            })

def list_items(q: Optional[str] = None,
               category: Optional[str] = None,
               below_min: bool = False) -> List[Dict[str, Any]]:
    """
    Filtros:
      - q: búsqueda por nombre (contiene, insensible a mayúsculas)
      - category: categoría exacta (insensible a mayúsculas)
      - below_min: True -> solo items con quantity <= min_quantity
    """
    items = _read_all()

    if q:
        q_low = q.lower()
        items = [i for i in items if q_low in (i.get("name") or "").lower()]

    if category:
        cat_low = category.lower()
        items = [i for i in items if (i.get("category") or "").lower() == cat_low]

    if below_min:
        items = [i for i in items if float(i.get("quantity") or 0) <= float(i.get("min_quantity") or 0)]

    return items

def _next_id(items: List[Dict[str, Any]]) -> int:
    if not items:
        return 1
    return max(int(it["id"]) for it in items if it.get("id")) + 1

def add_item(item: Item) -> Dict[str, Any]:
    items = _read_all()
    new_id = _next_id(items)
    new_item = {
        "id": new_id,
        "name": item.name,
        "category": item.category or "",
        "quantity": float(item.quantity),
        "unit": item.unit or "ud",
        "expiry_date": item.expiry_date or "",
        "min_quantity": float(item.min_quantity),
        "notes": item.notes or ""
    }
    items.insert(0, new_item)  # opcional: arriba del todo
    _write_all(items)
    return new_item

def update_item(item_id: int, patch: ItemUpdate) -> Dict[str, Any]:
    """
    Actualiza solo los campos presentes en 'patch'.
    Lanza ValueError si no existe el id.
    """
    items = _read_all()
    idx = next((i for i, it in enumerate(items) if it.get("id") == item_id), None)
    if idx is None:
        raise ValueError("not found")

    current = items[idx].copy()
    for field in ["name", "category", "quantity", "unit", "expiry_date", "min_quantity", "notes"]:
        value = getattr(patch, field)
        if value is not None:
            current[field] = float(value) if field in ("quantity", "min_quantity") else value

    # normalizamos tipos
    current["quantity"] = float(current.get("quantity", 0))
    current["min_quantity"] = float(current.get("min_quantity", 0))
    items[idx] = current
    _write_all(items)
    return current

def delete_item(item_id: int) -> bool:
    items = _read_all()
    new_items = [it for it in items if it.get("id") != item_id]
    if len(new_items) == len(items):
        return False
    _write_all(new_items)
    return True
