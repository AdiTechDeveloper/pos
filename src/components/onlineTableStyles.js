// Shared react-data-table-component style for Online Settings tables
// (same clean look as the Staff page)
export const ONLINE_TABLE_STYLES = {
  table: { style: { backgroundColor: "transparent" } },
  headRow: {
    style: {
      minHeight: "48px",
      backgroundColor: "#fff",
      borderBottom: "1px solid #e5e7eb",
    },
  },
  headCells: {
    style: { fontWeight: 700, fontSize: "14px", color: "#111827" },
  },
  rows: {
    style: {
      minHeight: "60px",
      fontSize: "14px",
      borderBottom: "1px solid #f1f5f9",
    },
  },
  cells: { style: { fontSize: "14px" } },
  pagination: {
    style: {
      fontSize: "13px",
      borderTop: "1px solid #e5e7eb",
      minHeight: "52px",
    },
  },
};