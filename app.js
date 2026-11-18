(() => {
  'use strict';

  const KEYS = {
    products: 'firia_products_v1',
    transactions: 'firia_transactions_v1'
  };
  const app = document.getElementById('app');
  const toastNode = document.getElementById('toast');
  const state = {
    products: readStore(KEYS.products, []),
    transactions: readStore(KEYS.transactions, []),
    cart: {},
    view: 'cashier',
    payment: null,
    receiptId: null,
    editingProductId: null,
    zoomQr: false
  };
  let toastTimer = null;

  function readStore(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (_) { return fallback; }
  }
  function writeStore() {
    try {
      localStorage.setItem(KEYS.products, JSON.stringify(state.products));
      localStorage.setItem(KEYS.transactions, JSON.stringify(state.transactions));
    } catch (error) {
      showToast('Penyimpanan penuh. Ekspor backup dulu.');
      console.error('FIRIA storage error:', error);
    }
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }
  function rupiah(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }
  function dateText(iso) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(iso));
  }
  function todayKey(iso) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  function todayStats() {
    const today = todayKey(new Date().toISOString());
    const todays = state.transactions.filter((tx) => todayKey(tx.createdAt) === today);
    return { total: todays.reduce((sum, tx) => sum + tx.total, 0), count: todays.length };
  }
  function getCartItems() {
    return state.products
      .filter((product) => Number(state.cart[product.id]) > 0)
      .map((product) => ({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: Number(state.cart[product.id]),
        subtotal: Number(product.price) * Number(state.cart[product.id])
      }));
  }
  function cartTotal() { return getCartItems().reduce((sum, item) => sum + item.subtotal, 0); }
  function cartCount() { return getCartItems().reduce((sum, item) => sum + item.quantity, 0); }
  function showToast(message) {
    toastNode.textContent = message;
    toastNode.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastNode.classList.remove('show'), 2400);
  }
  function onlinePill() {
    return `<div class="online-pill ${navigator.onLine ? '' : 'offline'}"><span class="online-dot"></span>${navigator.onLine ? 'Siap digunakan' : 'Mode offline'}</div>`;
  }
  function hero() {
    const stats = todayStats();
    return `<section class="hero-card">
      <div class="hero-eyebrow">Ringkasan hari ini</div>
      <div class="hero-row">
        <div><div class="hero-value">${rupiah(stats.total)}</div><div class="hero-caption">Total penjualan hari ini</div></div>
        <div class="hero-count"><strong>${stats.count}</strong><span>Transaksi</span></div>
      </div>
    </section>`;
  }
  function navigation() {
    return `<nav class="nav" aria-label="Navigasi utama">
      <button class="nav-btn ${state.view === 'cashier' || state.view.startsWith('pay') || state.view === 'receipt' ? 'active' : ''}" data-action="nav" data-view="cashier">Kasir</button>
      <button class="nav-btn ${state.view === 'menu' ? 'active' : ''}" data-action="nav" data-view="menu">Menu</button>
      <button class="nav-btn ${state.view === 'history' ? 'active' : ''}" data-action="nav" data-view="history">Riwayat</button>
    </nav>`;
  }
  function shell(content, options = {}) {
    const showSummary = options.summary !== false;
    const showNav = options.nav !== false;
    return `<header class="topbar">
      <div class="brand"><div class="brand-mark">F</div><div><div class="brand-title">FIRIA</div><div class="brand-subtitle">Market Day • Kasir sederhana</div></div></div>
      ${onlinePill()}
    </header>
    ${showSummary ? hero() : ''}
    ${showNav ? navigation() : ''}
    ${content}`;
  }
  function renderCashier() {
    const products = state.products;
    let content = `<div class="section-head"><div><div class="section-title">Pilih menu</div><div class="section-caption">Tekan + sesuai jumlah pesanan</div></div><button class="secondary-btn add-menu-btn" data-action="open-add">＋ Menu</button></div>`;
    if (!products.length) {
      content += `<div class="empty-state"><div class="empty-icon">🧁</div><div class="empty-title">Belum ada menu muffin</div><div class="empty-text">Tambahkan varian muffin dan harganya. Kamu bisa menambah atau mengubah menu kapan saja.</div><button class="primary-btn" data-action="open-add">＋ Tambah menu pertama</button></div>`;
    } else {
      content += `<div class="product-list">${products.map((product) => {
        const quantity = Number(state.cart[product.id]) || 0;
        return `<article class="product-card">
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-price">${rupiah(product.price)}</div>
          <div class="stepper">
            <button class="step-btn" data-action="decrease" data-id="${escapeHtml(product.id)}" aria-label="Kurangi ${escapeHtml(product.name)}" ${quantity <= 0 ? 'disabled' : ''}>−</button>
            <span class="qty">${quantity}</span>
            <button class="step-btn" data-action="increase" data-id="${escapeHtml(product.id)}" aria-label="Tambah ${escapeHtml(product.name)}">＋</button>
          </div>
        </article>`;
      }).join('')}</div>`;
    }
    const items = getCartItems();
    if (items.length) {
      content += `<section class="cart-dock">
        <div class="cart-top"><div><div class="cart-label">Keranjang • ${cartCount()} item</div><div class="cart-total">${rupiah(cartTotal())}</div></div><div class="cart-count">${items.length} jenis menu</div></div>
        <button class="primary-btn" data-action="checkout">Lanjut pembayaran</button>
      </section>`;
    } else if (products.length) {
      content += `<section class="cart-dock"><div class="cart-top"><div><div class="cart-label">Keranjang masih kosong</div><div class="cart-total">${rupiah(0)}</div></div><div class="cart-count">Pilih muffin dulu</div></div><button class="primary-btn" disabled>Lanjut pembayaran</button></section>`;
    }
    return shell(content);
  }
  function renderMenu() {
    let content = `<div class="section-head"><div><div class="section-title">Atur menu</div><div class="section-caption">Tambahkan varian dan harga sendiri</div></div><button class="primary-btn add-menu-btn" data-action="open-add">＋ Tambah</button></div>`;
    if (!state.products.length) {
      content += `<div class="empty-state"><div class="empty-icon">🧁</div><div class="empty-title">Menu masih kosong</div><div class="empty-text">Contoh: Muffin Cokelat, Muffin Keju, Muffin Original. Tidak perlu menambahkan gambar.</div><button class="primary-btn" data-action="open-add">Tambah menu</button></div>`;
    } else {
      content += `<div class="menu-list">${state.products.map((product) => `<div class="menu-item">
        <div class="item-main"><div class="item-name">${escapeHtml(product.name)}</div><div class="item-meta">${rupiah(product.price)}</div></div>
        <button class="icon-btn" data-action="edit" data-id="${escapeHtml(product.id)}" aria-label="Edit menu">✎</button>
        <button class="icon-btn" data-action="delete" data-id="${escapeHtml(product.id)}" aria-label="Hapus menu">×</button>
      </div>`).join('')}</div>`;
    }
    content += `<p class="info-note">Menu yang ditambahkan akan langsung muncul di halaman Kasir. Menghapus menu tidak menghapus transaksi yang sudah selesai.</p>`;
    return shell(content);
  }
  function renderHistory() {
    const sorted = [...state.transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    let content = `<div class="section-head"><div><div class="section-title">Riwayat transaksi</div><div class="section-caption">Bukti transaksi yang sudah ditandai dibayar</div></div></div>`;
    if (!sorted.length) {
      content += `<div class="history-empty">Belum ada transaksi. Setelah pembayaran selesai, buktinya akan tersimpan di sini.</div>`;
    } else {
      content += `<div class="history-list">${sorted.map((tx) => `<article class="history-item">
        <div class="item-main"><div class="item-name">${escapeHtml(tx.id)}</div><div class="item-meta">${dateText(tx.createdAt)} · ${tx.payment === 'qris' ? 'QRIS' : 'Tunai'} · ${tx.items.reduce((n, i) => n + i.quantity, 0)} item</div></div>
        <div class="history-total">${rupiah(tx.total)}</div>
        <button class="icon-btn" data-action="show-receipt" data-id="${escapeHtml(tx.id)}" aria-label="Lihat bukti">›</button>
      </article>`).join('')}</div>`;
     content += `<div class="history-tools">
  <button class="small-btn" data-action="export-csv">Unduh laporan CSV</button>
  <button class="small-btn" data-action="export-backup">Backup data</button>
  <button class="small-btn" data-action="clear-history">Hapus Semua Riwayat</button>
</div>`;
    }
    content += `<p class="info-note">Data transaksi tersimpan di browser iPhone ini. Unduh backup secara berkala, terutama setelah Market Day selesai.</p>`;
    return shell(content);
  }
  function renderProductEditor() {
    const product = state.products.find((p) => p.id === state.editingProductId);
    const isEdit = Boolean(product);
    const name = product?.name ?? '';
    const price = product?.price ?? '';
    return `<div class="back-link-row"><button class="back-link" data-action="close-editor">← Kembali</button></div>
      <h1 class="view-title">${isEdit ? 'Edit menu' : 'Tambah menu'}</h1>
      <p class="view-subtitle">Masukkan nama varian muffin dan harga jualnya. Tidak perlu foto produk.</p>
      <form class="form-card" id="product-form">
        <div class="field"><label for="product-name">Nama menu / varian</label><input id="product-name" name="name" type="text" maxlength="48" placeholder="Contoh: Muffin Cokelat" value="${escapeHtml(name)}" required autocomplete="off"></div>
        <div class="field"><label for="product-price">Harga jual (rupiah)</label><input id="product-price" name="price" type="number" min="1" max="100000000" step="1" inputmode="numeric" placeholder="Contoh: 10000" value="${price}" required></div>
        <div class="form-actions"><button type="button" class="secondary-btn" data-action="close-editor">Batal</button><button type="submit" class="primary-btn">${isEdit ? 'Simpan perubahan' : 'Simpan menu'}</button></div>
      </form>`;
  }
  function renderPaymentChoice() {
    const items = getCartItems();
    return shell(`<button class="back-link" data-action="back-to-cashier">← Kembali ke pesanan</button>
      <h1 class="view-title">Pilih pembayaran</h1><p class="view-subtitle">Periksa total pesanan, lalu pilih cara pembayarannya.</p>
      ${renderCompactItems(items)}
      <div class="payment-total-card" style="margin:12px 0 15px"><div class="payment-total-label">TOTAL PEMBAYARAN</div><div class="payment-total">${rupiah(cartTotal())}</div></div>
      <div class="payment-choice">
        <button class="payment-option" data-action="choose-payment" data-method="cash"><span class="payment-symbol">💵</span><span><strong>Tunai / Cash</strong><small>Bayar langsung ke kasir</small></span></button>
        <button class="payment-option" data-action="choose-payment" data-method="qris"><span class="payment-symbol">▦</span><span><strong>QRIS</strong><small>Scan QRIS Gend Shop</small></span></button>
      </div>` , { summary: false, nav: false });
  }
  function renderCompactItems(items) {
    return `<div class="panel" style="padding:13px 15px"><div class="cart-label" style="margin-bottom:9px">Rincian pesanan</div>${items.map((item) => `<div class="receipt-line"><span>${escapeHtml(item.name)}<small>${item.quantity} × ${rupiah(item.price)}</small></span><strong>${rupiah(item.subtotal)}</strong></div>`).join('')}</div>`;
  }
  function renderCashPayment() {
    return shell(`<h1 class="view-title">Pembayaran tunai</h1><p class="view-subtitle">Terima uang dari pembeli, lalu tandai pembayaran selesai.</p>
      <div class="payment-total-card"><div class="payment-total-label">TOTAL YANG HARUS DIBAYAR</div><div class="payment-total">${rupiah(cartTotal())}</div></div>
      <div style="height:13px"></div>
      <button class="primary-btn" data-action="complete-payment">Sudah bayar</button>
      <div style="height:9px"></div><button class="secondary-btn" data-action="back-to-choice">Kembali</button>`, { summary: false, nav: false });
  }
  function renderQrPayment() {
    return shell(`<h1 class="view-title">Pembayaran QRIS</h1><p class="view-subtitle">Tampilkan QR ini ke pembeli untuk dipindai.</p>
      <div class="payment-total-card"><div class="payment-total-label">TOTAL YANG HARUS DIBAYAR</div><div class="payment-total">${rupiah(cartTotal())}</div></div>
      <p class="payment-note">Minta pembeli memasukkan nominal di atas saat scan QRIS statis. Pastikan pembayaran benar-benar berhasil sebelum menekan “Sudah bayar”.</p>
      <div style="height:12px"></div>
      <div class="qr-card"><img class="qr-image" src="./qris-gend-shop.jpeg" alt="QRIS Gend Shop untuk pembayaran" data-action="zoom-qr"><div class="qr-caption">Gend Shop · QRIS<br>Ketuk gambar untuk memperbesar</div><button class="qr-zoom" data-action="zoom-qr">Perbesar QRIS</button></div>
      <div class="payment-actions"><button class="secondary-btn" data-action="back-to-choice">Kembali</button><button class="primary-btn" data-action="complete-payment">Sudah bayar</button></div>`, { summary: false, nav: false });
  }
  function findTransaction(id) { return state.transactions.find((tx) => tx.id === id); }
  function renderReceipt() {
    const tx = findTransaction(state.receiptId);
    if (!tx) return shell(`<div class="empty-state">Bukti transaksi tidak ditemukan.</div><button class="primary-btn" data-action="nav" data-view="cashier">Kembali ke kasir</button>`, { summary: false, nav: false });
    return shell(`<h1 class="view-title" style="margin-bottom:12px">Bukti pembayaran</h1>
      <div class="receipt" id="receipt-print">
        <div class="receipt-head"><div class="receipt-logo">F</div><div class="receipt-title">FIRIA</div><div class="receipt-subtitle">Bukti transaksi · Market Day</div><div class="receipt-status">✓ LUNAS</div></div>
        <div class="receipt-meta"><span>No. transaksi</span><strong>${escapeHtml(tx.id)}</strong></div>
        <div class="receipt-meta"><span>Waktu</span><strong>${dateText(tx.createdAt)}</strong></div>
        <div class="receipt-meta"><span>Pembayaran</span><strong>${tx.payment === 'qris' ? 'QRIS' : 'Tunai'}</strong></div>
        <div class="receipt-lines">${tx.items.map((item) => `<div class="receipt-line"><span>${escapeHtml(item.name)}<small>${item.quantity} × ${rupiah(item.price)}</small></span><strong>${rupiah(item.subtotal)}</strong></div>`).join('')}</div>
        <div class="receipt-grand"><span>TOTAL</span><strong>${rupiah(tx.total)}</strong></div>
        <div class="receipt-foot">Terima kasih sudah membeli!<br>Semoga harimu menyenangkan 🧁</div>
      </div>
      <div class="receipt-actions" style="display:grid;gap:9px;margin-top:13px"><button class="primary-btn" data-action="print-receipt">Cetak / Simpan bukti</button><button class="secondary-btn" data-action="new-sale">Transaksi baru</button></div>`, { summary: false, nav: false });
  }
  function render() {
    if (state.editingProductId !== null || state.view === 'product-editor') {
      app.innerHTML = shell(renderProductEditor(), { summary: false, nav: false });
      return;
    }
    switch (state.view) {
      case 'menu': app.innerHTML = renderMenu(); break;
      case 'history': app.innerHTML = renderHistory(); break;
      case 'payment-choice': app.innerHTML = renderPaymentChoice(); break;
      case 'pay-cash': app.innerHTML = renderCashPayment(); break;
      case 'pay-qris': app.innerHTML = renderQrPayment(); break;
      case 'receipt': app.innerHTML = renderReceipt(); break;
      default: state.view = 'cashier'; app.innerHTML = renderCashier();
    }
    if (state.zoomQr) showQrZoom();
  }
  function showQrZoom() {
    if (document.querySelector('.zoom-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'zoom-overlay';
    overlay.innerHTML = `<button class="zoom-close" aria-label="Tutup" data-action="close-zoom">×</button><img src="./qris-gend-shop.jpeg" alt="QRIS Gend Shop diperbesar">`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('[data-action="close-zoom"]')) closeQrZoom();
    });
  }
  function closeQrZoom() {
    state.zoomQr = false;
    document.querySelector('.zoom-overlay')?.remove();
  }
  function startPayment(method) {
    if (!cartCount() || !cartTotal()) return;
    state.payment = method;
    state.view = method === 'qris' ? 'pay-qris' : 'pay-cash';
    render();
  }
  function completePayment() {
    const items = getCartItems();
    if (!items.length || !cartTotal()) { showToast('Keranjang masih kosong.'); return; }
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const suffix = String(Math.floor(Math.random() * 90) + 10);
    const tx = {
      id: `FIR-${stamp}-${suffix}`,
      createdAt: now.toISOString(),
      payment: state.payment || 'cash',
      items,
      total: items.reduce((sum, item) => sum + item.subtotal, 0)
    };
    state.transactions.push(tx);
    state.cart = {};
    state.receiptId = tx.id;
    state.view = 'receipt';
    writeStore();
    render();
  }
  function openEditor(id = null) {
    state.editingProductId = id;
    state.view = 'product-editor';
    render();
    setTimeout(() => document.getElementById('product-name')?.focus(), 40);
  }
  function closeEditor() {
    state.editingProductId = null;
    state.view = 'menu';
    render();
  }
  function saveProduct(form) {
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const price = Math.round(Number(formData.get('price')));
    if (!name) { showToast('Nama menu belum diisi.'); return; }
    if (!Number.isFinite(price) || price < 1 || price > 100000000) { showToast('Masukkan harga yang benar.'); return; }
    const existing = state.products.find((p) => p.id === state.editingProductId);
    if (existing) {
      existing.name = name;
      existing.price = price;
    } else {
      state.products.push({ id: makeId(), name, price });
    }
    writeStore();
    state.editingProductId = null;
    state.view = 'menu';
    render();
    showToast(existing ? 'Menu berhasil diperbarui.' : 'Menu berhasil ditambahkan.');
  }
  function makeId() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return `p-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
  function exportBackup() {
    const backup = { app: 'FIRIA', version: 1, exportedAt: new Date().toISOString(), products: state.products, transactions: state.transactions };
    downloadFile(`FIRIA-backup-${todayKey(new Date().toISOString())}.json`, JSON.stringify(backup, null, 2), 'application/json');
    showToast('File backup disiapkan.');
  }
  function exportCsv() {
    if (!state.transactions.length) { showToast('Belum ada transaksi.'); return; }
    const rows = [['ID Transaksi', 'Tanggal', 'Pembayaran', 'Menu', 'Jumlah', 'Harga Satuan', 'Subtotal', 'Total Transaksi']];
    state.transactions.forEach((tx) => tx.items.forEach((item) => rows.push([
      tx.id, dateText(tx.createdAt), tx.payment === 'qris' ? 'QRIS' : 'Tunai', item.name, item.quantity, item.price, item.subtotal, tx.total
    ])));
    const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    downloadFile(`FIRIA-laporan-${todayKey(new Date().toISOString())}.csv`, csv, 'text/csv;charset=utf-8');
    showToast('Laporan CSV disiapkan.');
  }
  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    switch (action) {
      case 'nav':
        if (state.view.startsWith('pay') || state.view === 'payment-choice') return;
        state.view = button.dataset.view || 'cashier';
        state.editingProductId = null;
        render();
        break;
      case 'increase':
        state.cart[id] = (Number(state.cart[id]) || 0) + 1;
        render();
        break;
      case 'decrease':
        state.cart[id] = Math.max(0, (Number(state.cart[id]) || 0) - 1);
        if (!state.cart[id]) delete state.cart[id];
        render();
        break;
      case 'checkout':
        if (!cartCount()) return;
        state.view = 'payment-choice';
        render();
        break;
      case 'choose-payment': startPayment(button.dataset.method); break;
      case 'back-to-cashier': state.view = 'cashier'; render(); break;
      case 'back-to-choice': state.view = 'payment-choice'; state.payment = null; render(); break;
      case 'complete-payment': completePayment(); break;
      case 'open-add': openEditor(); break;
      case 'edit': openEditor(id); break;
      case 'close-editor': closeEditor(); break;
      case 'delete': {
        const product = state.products.find((p) => p.id === id);
        if (product && window.confirm(`Hapus menu “${product.name}”?`)) {
          state.products = state.products.filter((p) => p.id !== id);
          delete state.cart[id];
          writeStore(); render(); showToast('Menu dihapus.');
        }
        break;
      }
      case 'show-receipt': state.receiptId = id; state.view = 'receipt'; render(); break;
        case 'clear-history':
  if (state.transactions.length && window.confirm('Yakin ingin menghapus semua riwayat transaksi?')) {
    state.transactions = [];
    writeStore();
    render();
    showToast('Semua riwayat berhasil dihapus.');
  }
  break;
      case 'new-sale': state.view = 'cashier'; state.payment = null; state.receiptId = null; render(); break;
      case 'print-receipt': window.print(); break;
      case 'export-backup': exportBackup(); break;
      case 'export-csv': exportCsv(); break;
      case 'zoom-qr': state.zoomQr = true; showQrZoom(); break;
      case 'close-zoom': closeQrZoom(); break;
    }
  });

  app.addEventListener('submit', (event) => {
    if (event.target.id === 'product-form') {
      event.preventDefault();
      saveProduct(event.target);
    }
  });

  window.addEventListener('online', () => { if (!state.view.startsWith('pay') && state.view !== 'payment-choice') render(); });
  window.addEventListener('offline', () => { if (!state.view.startsWith('pay') && state.view !== 'payment-choice') render(); });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('FIRIA offline cache not available yet:', error));
    });
  }

  render();
})();
