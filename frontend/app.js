const API_BASE = "http://127.0.0.1:8000";
const DEFAULT_API_KEY = "2vaquitas"; // pon tu clave si es otra

(function() {
  let ITEMS = [];
  let CATS = new Set();

  const el = {
    baseUrl: document.getElementById('baseUrl'),
    apiKey: document.getElementById('apiKey'),
    saveSettings: document.getElementById('saveSettings'),
    q: document.getElementById('q'),
    categoria: document.getElementById('categoria'),
    belowMin: document.getElementById('belowMin'),
    btnBuscar: document.getElementById('btnBuscar'),
    btnLimpiar: document.getElementById('btnLimpiar'),
    tabla: document.getElementById('tabla').querySelector('tbody'),
    empty: document.getElementById('empty'),
    form: document.getElementById('form'),
    formTitle: document.getElementById('formTitle'),
    id: document.getElementById('id'),
    name: document.getElementById('name'),
    category: document.getElementById('category'),
    quantity: document.getElementById('quantity'),
    unit: document.getElementById('unit'),
    expiry_date: document.getElementById('expiry_date'),
    min_quantity: document.getElementById('min_quantity'),
    notes: document.getElementById('notes'),
    btnCancelar: document.getElementById('btnCancelar'),
    btnBorrar: document.getElementById('btnBorrar'),
    categoryList: document.getElementById('categoryList'),
    toast: document.getElementById('toast'),
  };

  function loadSettings() {
    el.baseUrl.value = localStorage.getItem('BASE_URL') || el.baseUrl.value || 'http://127.0.0.1:8000';
    el.apiKey.value = localStorage.getItem('API_KEY') || '';
  }
  function saveSettings() {
    localStorage.setItem('BASE_URL', el.baseUrl.value.trim());
    localStorage.setItem('API_KEY', el.apiKey.value.trim());
    toast('Ajustes guardados');
  }

  async function api(path, opts={}) {
    const base = el.baseUrl.value.trim().replace(/\/$/, '');
    const headers = Object.assign({}, opts.headers || {}, {
      'X-API-KEY': el.apiKey.value.trim(),
    });
    if (opts.body && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(base + path, Object.assign({}, opts, { headers }));
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Error ${res.status}: ${text || res.statusText}`);
    }
    if (res.status === 204) return null;
    return await res.json();
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(el.toast._t);
    el.toast._t = setTimeout(() => { el.toast.hidden = true; }, 1800);
  }

  function clearForm() {
    el.form.reset();
    el.id.value = '';
    el.unit.value = 'ud';
    el.quantity.value = '0';
    el.min_quantity.value = '0';
    el.formTitle.textContent = 'Añadir / Editar';
    el.btnBorrar.style.display = 'none';
  }

  function fillForm(item) {
    el.id.value = item.id;
    el.name.value = item.name || '';
    el.category.value = item.category || '';
    el.quantity.value = item.quantity ?? 0;
    el.unit.value = item.unit || 'ud';
    el.expiry_date.value = (item.expiry_date || '').slice(0, 10);
    el.min_quantity.value = item.min_quantity ?? 0;
    el.notes.value = item.notes || '';
    el.formTitle.textContent = `Editar: ${item.name}`;
    el.btnBorrar.style.display = '';
  }

  function renderCategoriesFrom(items) {
    CATS = new Set();
    items.forEach(i => { const c = (i.category || '').trim(); if (c) CATS.add(c); });
    const opts = ['<option value="">Todas las categorías</option>']
      .concat(Array.from(CATS).sort().map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`));
    el.categoria.innerHTML = opts.join('');
    el.categoryList.innerHTML = Array.from(CATS).sort().map(c => `<option value="${escapeHtml(c)}">`).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderTable(items) {
    el.tabla.innerHTML = items.map(item => {
      const id = item.id;
      const below = Number(item.quantity) <= Number(item.min_quantity);
      return `<tr class="${below ? 'below' : ''}">
        <td>${escapeHtml(item.name || '')}</td>
        <td>${escapeHtml(item.category || '')}</td>
        <td>${item.quantity ?? 0}</td>
        <td>${escapeHtml(item.unit || '')}</td>
        <td>${escapeHtml((item.expiry_date || '').slice(0,10))}</td>
        <td>${item.min_quantity ?? 0}</td>
        <td>${escapeHtml(item.notes || '')}</td>
        <td class="actions-cell">
          <button class="btn small" data-act="plus" data-id="${id}">+1</button>
          <button class="btn small" data-act="minus" data-id="${id}">-1</button>
          <button class="btn" data-act="edit" data-id="${id}">Editar</button>
          <button class="btn danger" data-act="delete" data-id="${id}">Borrar</button>
        </td>
      </tr>`;
    }).join('');
    el.empty.style.display = items.length ? 'none' : 'block';
  }

  function applyFilters(items) {
    const q = el.q.value.trim().toLowerCase();
    const cat = el.categoria.value.trim().toLowerCase();
    const bm = el.belowMin.checked;
    return items.filter(i => {
      const okQ = q ? (String(i.name||'').toLowerCase().includes(q)) : true;
      const okC = cat ? (String(i.category||'').toLowerCase() === cat) : true;
      const okB = bm ? (Number(i.quantity||0) <= Number(i.min_quantity||0)) : true;
      return okQ && okC && okB;
    });
  }

  async function fetchItems({refillCategories=false}={}) {
    const data = await api('/items');
    ITEMS = Array.isArray(data) ? data : [];
    if (refillCategories) renderCategoriesFrom(ITEMS);
    renderTable(applyFilters(ITEMS));
  }

  async function createItem(payload) {
    const created = await api('/items', { method: 'POST', body: JSON.stringify(payload) });
    toast('Producto creado');
    await fetchItems({refillCategories:true});
    if (created.category) {
      el.categoria.value = created.category;
      renderTable(applyFilters(ITEMS));
    }
  }

  async function updateItem(id, patch) {
    const updated = await api(`/items/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    toast('Producto actualizado');
    await fetchItems({refillCategories:true});
    return updated;
  }

  async function deleteItem(id) {
    await api(`/items/${id}`, { method: 'DELETE' });
    toast('Producto borrado');
    await fetchItems({refillCategories:true});
  }

  el.saveSettings.addEventListener('click', () => {
    saveSettings();
    fetchItems({refillCategories:true}).catch(err => alert(err.message));
  });

  el.btnBuscar.addEventListener('click', () => {
    renderTable(applyFilters(ITEMS));
  });

  el.btnLimpiar.addEventListener('click', () => {
    el.q.value = '';
    el.categoria.value = '';
    el.belowMin.checked = false;
    renderTable(ITEMS);
  });

  el.tabla.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const id = Number(btn.dataset.id);
    const item = ITEMS.find(x => x.id === id);
    if (!item) { alert('No encontrado'); return; }

    try {
      if (act === 'plus') {
        await updateItem(id, { quantity: Number(item.quantity || 0) + 1 });
      } else if (act === 'minus') {
        const next = Math.max(0, Number(item.quantity || 0) - 1);
        await updateItem(id, { quantity: next });
      } else if (act === 'edit') {
        fillForm(item);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      } else if (act === 'delete') {
        if (confirm(`¿Borrar "${item.name}"?`)) await deleteItem(id);
      }
    } catch (err) {
      alert(err.message);
    }
  });

  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: el.name.value.trim(),
      category: el.category.value.trim() || null,
      quantity: Number(el.quantity.value || 0),
      unit: el.unit.value.trim() || 'ud',
      expiry_date: el.expiry_date.value || null,
      min_quantity: Number(el.min_quantity.value || 0),
      notes: el.notes.value.trim() || null
    };
    if (!payload.name) { alert('El nombre es obligatorio'); return; }
    if (payload.quantity < 0 || payload.min_quantity < 0) { alert('No se admiten negativos'); return; }

    try {
      const id = el.id.value.trim();
      if (id) {
        await updateItem(Number(id), payload);
      } else {
        await createItem(payload);
      }
      clearForm();
    } catch (err) {
      alert(err.message);
    }
  });

  el.btnCancelar.addEventListener('click', () => clearForm());

  el.btnBorrar.addEventListener('click', async () => {
    const id = Number(el.id.value || 0);
    if (!id) return;
    if (confirm('¿Borrar este producto?')) {
      try {
        await deleteItem(id);
        clearForm();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  loadSettings();
  saveSettings();
  fetchItems({refillCategories:true}).catch(err => {
    console.error(err);
    alert('No se ha podido cargar la lista. Revisa la Base URL, el servidor (uvicorn) y la X-API-KEY.');
  });
})();
