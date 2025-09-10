from pydantic import BaseModel, Field
from typing import Optional

class Item(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=200)      # nombre
    category: Optional[str] = Field(default=None, max_length=100)  # categoría
    quantity: float = Field(default=0, ge=0)                  # cantidad
    unit: Optional[str] = Field(default="ud", max_length=20)  # unidad (ud, kg, l, etc.)
    expiry_date: Optional[str] = None                         # caducidad (YYYY-MM-DD)
    min_quantity: float = Field(default=0, ge=0)              # mínimo
    notes: Optional[str] = Field(default=None, max_length=500)      # notas

class ItemUpdate(BaseModel):
    # todos opcionales para permitir actualizaciones parciales (PUT tipo PATCH)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=20)
    expiry_date: Optional[str] = None
    min_quantity: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=500)

