// Online Settings + Online Orders pages ki styling (theme CSS isse override nahi kar sakta)
export const ONLINE_CSS = `.ovx{width:100% !important;color:#0f172a !important;font-size:14px !important;line-height:1.5 !important;padding-bottom:50px !important;font-family:inherit !important}
.ovx *{box-sizing:border-box !important}
:where(.ovx) :where(h3,h4,p,ul,li){margin:0 !important;padding:0 !important;list-style:none !important}
.ovx-head{display:flex !important;justify-content:space-between !important;align-items:flex-start !important;gap:16px !important;flex-wrap:wrap !important;margin-bottom:24px !important}
.ovx-titlewrap{display:flex !important;gap:14px !important;align-items:stretch !important}
.ovx-bar{display:block !important;width:4px !important;border-radius:4px !important;background:#2563eb !important;flex-shrink:0 !important}
.ovx-title{font-size:24px !important;font-weight:800 !important;line-height:1.2 !important;color:#0f172a !important}
.ovx-sub{font-size:18px !important;color:#64748b !important;margin-top:4px !important;line-height:1.35 !important}
.ovx-crumb{display:flex !important;align-items:center !important;gap:10px !important;font-size:14px !important;color:#475569 !important;padding-top:6px !important}
.ovx-muted{color:#94a3b8 !important}
.ovx-dim{color:#94a3b8 !important}
.ovx-card{background:#fff !important;border:1px solid #e2e8f0 !important;border-radius:14px !important;padding:22px 24px !important;margin-bottom:20px !important;box-shadow:0 1px 3px rgba(15,23,42,.06) !important}
.ovx-card-title{font-size:16px !important;font-weight:700 !important;line-height:1.3 !important;color:#0f172a !important}
.ovx-card-hint{font-size:14px !important;color:#64748b !important;margin-top:4px !important;margin-bottom:18px !important}
.ovx-grid2{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:20px !important}
.ovx-grid3{display:grid !important;grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:16px !important;align-items:end !important}
.ovx-grid4{display:grid !important;grid-template-columns:repeat(4,minmax(0,1fr)) !important;gap:20px !important}
.ovx-pair{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:20px !important;margin-bottom:20px !important}
.ovx-pair .ovx-card{margin-bottom:0 !important}
.ovx-mt{margin-top:20px !important}
.ovx-field{display:block !important}
.ovx-label{display:block !important;font-size:14px !important;font-weight:600 !important;color:#1e293b !important;margin-bottom:6px !important}
.ovx-fhint{display:block !important;font-size:12px !important;color:#64748b !important;margin-top:6px !important;line-height:1.4 !important}
.ovx-input{display:block !important;width:100% !important;height:44px !important;padding:0 14px !important;font-size:14px !important;line-height:normal !important;color:#0f172a !important;background:#fff !important;border:1px solid #cbd5e1 !important;border-radius:10px !important;outline:none !important;margin:0 !important}
.ovx-input:focus{border-color:#2563eb !important;box-shadow:0 0 0 3px rgba(37,99,235,.15) !important}
textarea.ovx-input{height:auto !important;padding:10px 14px !important;resize:vertical !important}
.ovx-input.ovx-sm{height:38px !important;width:130px !important;font-size:14px !important;padding:0 12px !important}
.ovx-btn{display:inline-flex !important;align-items:center !important;justify-content:center !important;gap:8px !important;height:44px !important;padding:0 22px !important;margin:0 !important;font-size:14px !important;font-weight:600 !important;line-height:1 !important;text-align:center !important;border-radius:10px !important;border:1px solid transparent !important;cursor:pointer !important;white-space:nowrap !important;background:transparent !important;color:#0f172a !important}
.ovx-btn svg{flex-shrink:0 !important}
.ovx-btn:disabled{opacity:.55 !important;cursor:not-allowed !important}
.ovx-btn-primary{background:#2563eb !important;color:#fff !important}
.ovx-btn-primary:hover{background:#1d4ed8 !important}
.ovx-btn-green{background:#059669 !important;color:#fff !important}
.ovx-btn-green:hover{background:#047857 !important}
.ovx-btn-red{background:#dc2626 !important;color:#fff !important}
.ovx-btn-outline{background:#fff !important;color:#0f172a !important;border-color:#cbd5e1 !important}
.ovx-btn-outline:hover{background:#f8fafc !important}
.ovx-btn-soundon{background:#ecfdf5 !important;color:#065f46 !important;border-color:#059669 !important}
.ovx-btn-ghost-red{color:#dc2626 !important;padding:0 16px !important}
.ovx-btn-ghost-red:hover{background:#fef2f2 !important}
.ovx-btn-sm{height:36px !important;padding:0 14px !important;font-size:14px !important;border-radius:8px !important}
.ovx-btn-edit{background:#eff6ff !important;color:#1d4ed8 !important;border-color:#bfdbfe !important}
.ovx-btn-edit:hover{background:#dbeafe !important}
.ovx-btn-del{background:#fef2f2 !important;color:#b91c1c !important;border-color:#fecaca !important}
.ovx-btn-del:hover{background:#fee2e2 !important}
.ovx-btn-full{width:100% !important}
.ovx-toggle{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:16px !important;width:100% !important;padding:14px 18px !important;text-align:left !important;background:#fff !important;border:1px solid #cbd5e1 !important;border-radius:12px !important;cursor:pointer !important;color:#0f172a !important}
.ovx-toggle.on{background:#eff6ff !important;border-color:#2563eb !important}
.ovx-toggle-title{display:block !important;font-size:16px !important;font-weight:700 !important;line-height:1.3 !important}
.ovx-toggle-hint{display:block !important;font-size:12px !important;color:#64748b !important;margin-top:3px !important}
.ovx-switch{position:relative !important;display:block !important;width:44px !important;height:24px !important;border-radius:12px !important;background:#cbd5e1 !important;flex-shrink:0 !important}
.ovx-toggle.on .ovx-switch{background:#2563eb !important}
.ovx-knob{position:absolute !important;top:3px !important;left:3px !important;width:18px !important;height:18px !important;border-radius:50% !important;background:#fff !important;box-shadow:0 1px 2px rgba(0,0,0,.25) !important;transition:left .15s !important}
.ovx-toggle.on .ovx-knob{left:23px !important}
.ovx-box{background:#f8fafc !important;border:1px solid #e2e8f0 !important;border-radius:12px !important;padding:18px !important}
.ovx-tablewrap{overflow-x:auto !important;margin-top:20px !important;border:1px solid #e2e8f0 !important;border-radius:12px !important}
.ovx-table{width:100% !important;min-width:640px !important;border-collapse:collapse !important;font-size:14px !important}
.ovx-table th{text-align:left !important;padding:12px 16px !important;font-size:12px !important;font-weight:700 !important;color:#475569 !important;text-transform:uppercase !important;letter-spacing:.04em !important;background:#f8fafc !important;border-bottom:1px solid #e2e8f0 !important}
.ovx-table td{padding:12px 16px !important;border-bottom:1px solid #f1f5f9 !important;vertical-align:middle !important;height:60px !important}
.ovx-table tr:last-child td{border-bottom:none !important}
.ovx-table .ovx-right{text-align:right !important;white-space:nowrap !important}
.ovx-table .ovx-right .ovx-btn+.ovx-btn{margin-left:8px !important}
.ovx-pin{font-size:16px !important;font-weight:700 !important}
.ovx-check{width:18px !important;height:18px !important;cursor:pointer !important;accent-color:#2563eb !important}
.ovx-list li{display:flex !important;flex-wrap:wrap !important;align-items:center !important;justify-content:space-between !important;gap:12px !important;padding:14px 0 !important;border-top:1px solid #f1f5f9 !important}
.ovx-list li:first-child{border-top:none !important;padding-top:0 !important}
.ovx-list-name{font-size:16px !important;font-weight:700 !important}
.ovx-list a{font-size:14px !important;color:#2563eb !important;text-decoration:underline !important;word-break:break-all !important}
.ovx-actions{display:flex !important;justify-content:flex-end !important;margin:0 0 20px !important}
.ovx-alert{padding:12px 16px !important;border-radius:10px !important;font-size:14px !important;font-weight:600 !important;margin-bottom:16px !important}
.ovx-alert-err{background:#fef2f2 !important;color:#b91c1c !important}
.ovx-alert-warn{background:#fffbeb !important;color:#92400e !important}
.ovx-alert-warn-strong{background:#fef3c7 !important;color:#78350f !important;font-weight:700 !important}
.ovx-center{text-align:center !important;padding:40px 0 !important;font-size:14px !important;color:#64748b !important}
.ovx-tabs{display:inline-flex !important;gap:4px !important;padding:4px !important;background:#f1f5f9 !important;border-radius:10px !important;margin-bottom:20px !important}
.ovx-tab{display:inline-flex !important;align-items:center !important;justify-content:center !important;height:38px !important;padding:0 22px !important;margin:0 !important;font-size:14px !important;font-weight:600 !important;line-height:1 !important;border:none !important;border-radius:8px !important;background:transparent !important;color:#475569 !important;cursor:pointer !important}
.ovx-tab.on{background:#fff !important;color:#2563eb !important;box-shadow:0 1px 3px rgba(15,23,42,.12) !important}
.ovx-orders{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:20px !important}
.ovx-order{background:#fff !important;border:1px solid #e2e8f0 !important;border-top:4px solid #cbd5e1 !important;border-radius:14px !important;padding:20px 22px !important;box-shadow:0 1px 3px rgba(15,23,42,.06) !important}
.ovx-order.is-new{box-shadow:0 0 0 3px #fde68a !important}
.ovx-order.st-placed{border-top-color:#f59e0b !important}
.ovx-order.st-accepted,.ovx-order.st-preparing{border-top-color:#0ea5e9 !important}
.ovx-order.st-ready,.ovx-order.st-out_for_delivery{border-top-color:#10b981 !important}
.ovx-order.st-cancelled{border-top-color:#ef4444 !important}
.ovx-order-head{display:flex !important;justify-content:space-between !important;align-items:flex-start !important;gap:12px !important}
.ovx-order-no{font-size:16px !important;font-weight:800 !important}
.ovx-small{font-size:12px !important;color:#64748b !important}
.ovx-badges{display:flex !important;flex-direction:column !important;align-items:flex-end !important;gap:6px !important}
.ovx-badge{display:inline-flex !important;align-items:center !important;padding:3px 12px !important;border-radius:6px !important;font-size:12px !important;font-weight:700 !important;line-height:1.4 !important;background:#f1f5f9 !important;color:#334155 !important}
.ovx-badge.up{text-transform:uppercase !important}
.ovx-badge.b-placed{background:#fef3c7 !important;color:#78350f !important}
.ovx-badge.b-accepted,.ovx-badge.b-preparing{background:#e0f2fe !important;color:#0c4a6e !important}
.ovx-badge.b-ready,.ovx-badge.b-out_for_delivery{background:#d1fae5 !important;color:#064e3b !important}
.ovx-badge.b-cancelled{background:#fee2e2 !important;color:#991b1b !important}
.ovx-cust{margin-top:14px !important;font-size:14px !important}
.ovx-cust a{color:#047857 !important;font-weight:600 !important;text-decoration:underline !important}
.ovx-text{margin-top:6px !important;font-size:14px !important;color:#475569 !important}
.ovx-items{margin-top:14px !important;border:1px solid #f1f5f9 !important;border-radius:10px !important}
.ovx-items li{display:flex !important;justify-content:space-between !important;gap:12px !important;padding:10px 14px !important;font-size:14px !important;border-top:1px solid #f1f5f9 !important}
.ovx-items li:first-child{border-top:none !important}
.ovx-total-row{display:flex !important;justify-content:space-between !important;align-items:center !important;gap:12px !important;margin-top:14px !important}
.ovx-total{font-size:16px !important;font-weight:800 !important}
.ovx-order-actions{display:flex !important;flex-wrap:wrap !important;gap:10px !important;margin-top:16px !important}
.ovx-modal-bg{position:fixed !important;top:0 !important;right:0 !important;bottom:0 !important;left:0 !important;z-index:99999 !important;display:grid !important;place-items:center !important;padding:16px !important;background:rgba(0,0,0,.45) !important}
.ovx-modal{width:100% !important;max-width:460px !important;background:#fff !important;border-radius:14px !important;padding:22px !important;color:#0f172a !important;box-shadow:0 20px 50px rgba(0,0,0,.25) !important}
.ovx-modal-title{font-size:16px !important;font-weight:700 !important;margin-bottom:8px !important}
.ovx-modal-actions{display:flex !important;justify-content:flex-end !important;gap:10px !important;margin-top:18px !important}
@media (max-width:1100px){.ovx-grid4{grid-template-columns:repeat(2,minmax(0,1fr)) !important}.ovx-orders{grid-template-columns:minmax(0,1fr) !important}.ovx-pair{grid-template-columns:minmax(0,1fr) !important}}
@media (max-width:760px){.ovx-grid2,.ovx-grid3,.ovx-grid4{grid-template-columns:minmax(0,1fr) !important}.ovx-card{padding:18px 16px !important}}`;