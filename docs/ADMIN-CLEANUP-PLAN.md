# 🧹 Admin System Cleanup Plan

**Date:** October 2, 2025  
**Status:** Ready for Execution  
**Goal:** Clean slate for Cloudflare-style admin rebuild

---

## 📋 Current Admin Files Inventory

### **Files to ARCHIVE (old/duplicate/testing)**

```
✅ /public/admin/admin.html            (old admin page with password gate)
✅ /public/admin/debug.html             (debugging tool - not needed)
✅ /public/admin-panel.html             (Cloudflare Access bypass - duplicate)
✅ /public/scripts/enhanced-admin.js    (old enhanced admin script)
```

### **Files to KEEP (working/useful)**

```
✅ /public/admin/dashboard.html         (current working dashboard - will be replaced)
✅ /public/admin/diagnostic.html        (useful diagnostic tool)
✅ /public/admin/status.html            (API status monitor)
✅ /public/admin/system-check.html      (system health check)
✅ /functions/lib/admin.js              (backend admin library)
```

### **Files to UPDATE (references)**

```
✅ /functions/api/[[path]].js           (admin menu endpoint - needs updating)
✅ /public/login.html                   (redirect to new admin path)
```

### **Files UNTOUCHED (backups/reference)**

```
✅ /public/WORKING-VERSION/**           (all backups - keep as reference)
```

---

## 🗂️ Archive Structure

Create: `/public/admin/_archive-2025-10-02/`

Move these files:

```
admin.html              → _archive-2025-10-02/admin.html.old
debug.html              → _archive-2025-10-02/debug.html.old
/public/admin-panel.html → _archive-2025-10-02/admin-panel.html.old
/public/scripts/enhanced-admin.js → _archive-2025-10-02/enhanced-admin.js.old
```

---

## 🏗️ New Admin Structure (Fresh Start)

```
/public/admin/
├── index.html                    (NEW - Overview Dashboard)
├── inventory/
│   ├── index.html               (NEW - Inventory Browser)
│   ├── sync.html                (NEW - CF Images Sync)
│   └── batch-console.html       (NEW - Batch Operations)
├── requests/
│   ├── index.html               (NEW - Pipeline View)
│   └── calculator.html          (NEW - Offer Calculator)
├── customers/
│   └── index.html               (NEW - CRM)
├── data/
│   ├── index.html               (NEW - Table Browser)
│   └── saved-views.html         (NEW - Saved Filters)
├── deploys/
│   └── index.html               (NEW - Build Status)
├── logs/
│   └── index.html               (NEW - Analytics & Logs)
├── security/
│   ├── roles.html               (NEW - Permissions)
│   ├── sessions.html            (NEW - Active Sessions)
│   └── policies.html            (NEW - Rate Limits)
├── automations/
│   └── index.html               (NEW - Webhooks & Schedules)
├── audit/
│   └── index.html               (NEW - Audit Log)
├── _archive-2025-10-02/         (OLD FILES)
│   ├── admin.html.old
│   ├── debug.html.old
│   ├── admin-panel.html.old
│   └── enhanced-admin.js.old
├── diagnostic.html              (KEEP - Utility)
├── status.html                  (KEEP - Utility)
└── system-check.html            (KEEP - Utility)
```

---

## 🔧 Update Required

### 1. `/functions/api/[[path]].js` - Admin Menu

**Current:**

```javascript
if (path === "/api/admin/menu" && method === "GET") {
  return html(
    `
    <section class="admin-menu">
      <h2>Admin Controls</h2>
      <ul>
        <li><a href="/admin-panel.html" target="_blank">👑 Admin Panel</a></li>
        <li><a href="/admin/system-check.html" target="_blank">🔍 System Health Check</a></li>
        <li><a href="/admin/status.html" target="_blank">📊 API Status Monitor</a></li>
        <li><a href="/admin/diagnostic.html" target="_blank">🛠️ Diagnostics</a></li>
      </ul>
    </section>
  `,
    200,
    headers
  );
}
```

**New:**

```javascript
if (path === "/api/admin/menu" && method === "GET") {
  return html(
    `
    <section class="admin-menu">
      <h2>SBS Unity Admin</h2>
      <ul>
        <li><a href="/admin/" target="_blank">🏠 Overview</a></li>
        <li><a href="/admin/inventory/" target="_blank">📦 Inventory</a></li>
        <li><a href="/admin/requests/" target="_blank">📋 Requests</a></li>
        <li><a href="/admin/customers/" target="_blank">👥 Customers</a></li>
        <li><a href="/admin/data/" target="_blank">💾 Data</a></li>
        <li><a href="/admin/logs/" target="_blank">📊 Logs & Analytics</a></li>
        <li><a href="/admin/security/" target="_blank">🔒 Security</a></li>
        <li><a href="/admin/audit/" target="_blank">📜 Audit</a></li>
      </ul>
      <hr style="margin: 20px 0; border-color: #333;">
      <h3 style="font-size: 14px; color: #999;">Utilities</h3>
      <ul>
        <li><a href="/admin/system-check.html" target="_blank">🔍 System Check</a></li>
        <li><a href="/admin/status.html" target="_blank">📡 API Status</a></li>
        <li><a href="/admin/diagnostic.html" target="_blank">🛠️ Diagnostics</a></li>
      </ul>
    </section>
  `,
    200,
    headers
  );
}
```

### 2. `/public/login.html` - Redirect Path

**Current:**

```javascript
const defaultRedirect =
  data.user?.role === "admin" ? "/admin/dashboard.html" : "/shop.html";
```

**New:**

```javascript
const defaultRedirect = data.user?.role === "admin" ? "/admin/" : "/shop.html";
```

---

## ✅ Cleanup Checklist

- [ ] Create archive directory: `/public/admin/_archive-2025-10-02/`
- [ ] Move old files to archive:
  - [ ] `admin.html` → `_archive-2025-10-02/admin.html.old`
  - [ ] `debug.html` → `_archive-2025-10-02/debug.html.old`
  - [ ] `/public/admin-panel.html` → `_archive-2025-10-02/admin-panel.html.old`
  - [ ] `/public/scripts/enhanced-admin.js` → `_archive-2025-10-02/enhanced-admin.js.old`
- [ ] Update `/functions/api/[[path]].js` admin menu
- [ ] Update `/public/login.html` redirect paths (2 locations)
- [ ] Verify no orphaned references in other files
- [ ] Test login redirect still works
- [ ] Document archive location in README

---

## 🚀 Next Steps After Cleanup

1. Build new `/admin/index.html` (Overview Dashboard)
2. Implement inventory browser with CF Images sync
3. Build requests pipeline
4. Add CRM features
5. Integrate with existing diagnostic tools

---

## 🛡️ Safety Notes

- **All files archived, not deleted** - can be restored if needed
- **Working utilities preserved** - diagnostic.html, status.html, system-check.html
- **Backend admin.js untouched** - may contain useful functions
- **Backups untouched** - WORKING-VERSION folder remains intact
- **API endpoints preserved** - `/api/admin/*` routes still work

---

**Approved by:** SBS Team  
**Execution Date:** October 2, 2025  
**Rollback Plan:** Restore from `_archive-2025-10-02/` if issues occur
