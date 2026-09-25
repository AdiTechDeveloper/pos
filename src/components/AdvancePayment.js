import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "./layout";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";

const getMethodBadge = (method) => {
  if (method === "cash")
    return <span className="status-badge bg-success">Cash</span>;
  if (method === "online")
    return <span className="status-badge bg-info">Online</span>;
  return <span className="status-badge bg-secondary">{method || "-"}</span>;
};

const ExpandedComponent = ({ data }) => {
  const historyColumns = [
    {
      name: "Date & Time",
      selector: (row) => row.created_at,
      sortable: true,
      cell: (row) => (
        <span>{new Date(row.created_at).toLocaleString("en-IN")}</span>
      ),
    },
    {
      name: "Advance Amount",
      selector: (row) => Number(row.amount || 0),
      sortable: true,
      cell: (row) => (
        <span className="amount-text">
          ₹{Number(row.amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Method",
      selector: (row) => row.method || "-",
      sortable: true,
      cell: (row) => getMethodBadge(row.method),
    },
    {
      name: "Transaction ID",
      selector: (row) => row.transaction_id || "-",
      sortable: true,
      cell: (row) => (
        <span className="transaction-id">{row.transaction_id || "-"}</span>
      ),
    },
    {
      name: "Received By",
      selector: (row) => row.received_by?.name || "-",
      sortable: true,
    },
    {
      name: "Branch",
      selector: (row) => row.branch?.name || "-",
      sortable: true,
    },
  ];

  return (
    <div className="ap-expansion-box">
      <h5 className="ap-expansion-title">Payment History</h5>
      <DataTable
        columns={historyColumns}
        data={data.history || []}
        dense
        pagination={false}
        noHeader
        customStyles={{
          headCells: {
            style: {
              fontWeight: 700,
              fontSize: "12px",
              color: "#64748b",
              backgroundColor: "#f8fafc",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "10px 14px",
            },
          },
          cells: {
            style: {
              padding: "10px 14px",
              fontSize: "14px",
              color: "#334155",
            },
          },
          rows: {
            style: {
              minHeight: "52px",
            },
          },
        }}
      />
    </div>
  );
};

const CustomerEditModal = ({ customer, onClose, onSave }) => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const userData = JSON.parse(localStorage.getItem("user_detail"));
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    mobile: customer?.mobile || "",
    add1: customer?.add1 || "",
    add2: customer?.add2 || "",
    area: customer?.area || "",
    city: customer?.city || "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!customer?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${BASE_URL}/api/customer/${customer.id}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${userData?.token}`,
            },
          },
        );
        const details =
          response.data?.data || response.data?.customer || response.data;

        if (details) {
          setFormData((current) => ({
            ...current,
            name: details.name ?? current.name,
            mobile: details.mobile ?? current.mobile,
            add1: details.add1 ?? current.add1,
            add2: details.add2 ?? current.add2,
            area: details.area ?? current.area,
            city: details.city ?? current.city,
          }));
        }
      } catch (error) {
        console.error("Failed to load customer details", error);
        toast.error("Customer details could not be loaded");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [customer?.id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["name", "Name"],
    ["mobile", "Mobile"],
    ["add1", "Address 1"],
    ["add2", "Address 2"],
    ["area", "Area"],
    ["city", "City"],
  ];

  return (
    <div className="ap-modal-backdrop" onClick={onClose}>
      <div className="ap-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ap-modal-header">
          <h4>Edit Customer</h4>
          <button type="button" className="ap-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="ap-form-grid">
            {fields.map(([name, label]) => (
              <label key={name} className="ap-form-field">
                <span>{label}</span>
                <input
                  type="text"
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  required={name === "name" || name === "mobile"}
                  disabled={loading || saving}
                />
              </label>
            ))}
          </div>
          <div className="ap-modal-actions">
            <button
              type="button"
              className="ap-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tf-button"
              disabled={loading || saving}
            >
              {loading
                ? "Loading..."
                : saving
                  ? "Updating..."
                  : "Update Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdvancePayment = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const [groupedData, setGroupedData] = useState([]);
  const [search, setSearch] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const fetchData = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/reports/advance-payments`, {
        headers: {
          Authorization: `Bearer ${user_data?.token}`,
        },
      });

      if (res.data.status) {
        groupCustomerData(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load advance payment report", err);
    }
  };

  const groupCustomerData = (payments) => {
    const groupedMap = {};

    payments.forEach((item) => {
      const customerId =
        item.customer?.id || item.customer?.mobile || "unknown";

      if (!groupedMap[customerId]) {
        groupedMap[customerId] = {
          customerInfo: item.customer,
          walletBalance: item.customer?.opening_balance || 0,
          history: [],
        };
      }
      groupedMap[customerId].history.push(item);
    });

    setGroupedData(Object.values(groupedMap));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCustomerUpdate = async (customerData) => {
    try {
      await axios.put(
        `${BASE_URL}/api/customer/${editingCustomer.id}`,
        customerData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${user_data?.token}`,
          },
        },
      );

      setGroupedData((currentGroups) =>
        currentGroups.map((group) =>
          group.customerInfo?.id === editingCustomer.id
            ? {
                ...group,
                customerInfo: { ...group.customerInfo, ...customerData },
              }
            : group,
        ),
      );
      setEditingCustomer(null);
      toast.success("Customer updated successfully");
    } catch (error) {
      console.error("Failed to update customer", error);
      toast.error(error.response?.data?.message || "Failed to update customer");
      throw error;
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupedRows = groupedData.map((group) => ({
    id:
      group.customerInfo?.id ||
      group.customerInfo?.mobile ||
      group.history[0]?.id ||
      Math.random(),
    customerName: group.customerInfo?.name || "-",
    mobile: group.customerInfo?.mobile || "-",
    walletBalance: Number(group.walletBalance || 0),
    totalAdvance: group.history.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0,
    ),
    latestDate: group.history[group.history.length - 1]?.created_at || null,
    paymentCount: group.history.length,
    lastMethod: group.history[group.history.length - 1]?.method || "-",
    customerInfo: group.customerInfo,
    history: group.history,
  }));

  const filteredGroups = groupedRows.filter((group) => {
    const text = search.toLowerCase().trim();
    const name = group.customerName?.toLowerCase() || "";
    const mobile = group.mobile?.toLowerCase() || "";
    const txIds = (group.history || [])
      .map((h) => h.transaction_id || "")
      .join(" ")
      .toLowerCase();

    return name.includes(text) || mobile.includes(text) || txIds.includes(text);
  });

  const columns = [
    {
      name: "Customer",
      selector: (row) => row.customerName,
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="customer-cell">
          <div className="customer-name-row">
            <div className="customer-name">{row.customerName}</div>
            <button
              type="button"
              className="ap-edit-button"
              title="Edit customer"
              onClick={(event) => {
                event.stopPropagation();
                setEditingCustomer(row.customerInfo);
              }}
            >
              <i className="icon-edit-3"></i>
            </button>
          </div>
          <div className="customer-mobile">{row.mobile}</div>
        </div>
      ),
    },
    {
      name: "Wallet Balance",
      selector: (row) => row.walletBalance,
      sortable: true,
      cell: (row) => (
        <span className="wallet-badge">
          ₹{Number(row.walletBalance).toFixed(2)}
        </span>
      ),
      center: true,
    },
    {
      name: "Last Payment",
      selector: (row) => row.latestDate || "-",
      sortable: true,
      cell: (row) => (
        <span>{row.latestDate ? formatDate(row.latestDate) : "-"}</span>
      ),
    },
    {
      name: "Total Advance",
      selector: (row) => row.totalAdvance,
      sortable: true,
      cell: (row) => (
        <span className="amount-text">
          ₹{Number(row.totalAdvance || 0).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Transactions",
      selector: (row) => row.paymentCount,
      sortable: true,
      center: true,
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center justify-between mb-27">
            <div className="flex items-center flex-wrap justify-between gap20 mb-27">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    width: "5px",
                    height: "34px",
                    borderRadius: "999px",
                    background: "linear-gradient(180deg, #2f63f6, #1f49dd)",
                    display: "inline-block",
                  }}
                />
                <div>
                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "#111827",
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                 Advance Payment
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                   View and manage customer advance payments and dues
                  </p>
                </div>
              </div>

            </div>
            <ul className="breadcrumbs flex items-center gap10">
              <li>
                <Link to="/">Dashboard</Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>Reports</li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>Advance Payments</li>
            </ul>
          </div>

          <div className="wg-box">
            <div className="flex items-center justify-between gap10 flex-wrap mb-20">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search customer, mobile, transaction..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </fieldset>
                  <div className="button-submit">
                    <button type="submit">
                      <i className="icon-search"></i>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="table-responsive">
              <DataTable
                columns={columns}
                data={filteredGroups}
                pagination
                highlightOnHover
                pointerOnHover
                responsive
                expandableRows
                expandableRowsComponent={ExpandedComponent}
                expandableRowsHideExpander
                expandOnRowClicked
                customStyles={{
                  headCells: {
                    style: {
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#475569",
                      backgroundColor: "#f8fafc",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      padding: "12px 14px",
                    },
                  },
                  cells: {
                    style: {
                      padding: "12px 14px",
                      fontSize: "14px",
                      color: "#1e293b",
                    },
                  },
                  rows: {
                    style: {
                      minHeight: "60px",
                      cursor: "pointer",
                    },
                  },
                  pagination: {
                    style: {
                      border: "none",
                      padding: "12px 0 0",
                    },
                  },
                }}
                expandableIcon={{
                  collapsed: <span className="ap-expand-icon">▸</span>,
                  expanded: <span className="ap-expand-icon is-open">▾</span>,
                }}
              />
            </div>
          </div>
        </div>

        {editingCustomer && (
          <CustomerEditModal
            customer={editingCustomer}
            onClose={() => setEditingCustomer(null)}
            onSave={handleCustomerUpdate}
          />
        )}

        <style>{`
          .customer-cell {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .customer-name {
            font-weight: 700;
            color: #0f172a;
          }

          .customer-name-row {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .ap-edit-button {
            border: 0;
            background: transparent;
            cursor: pointer;
            color: #2563eb;
            font-size: 15px;
            padding: 2px;
          }

          .ap-edit-button:hover {
            color: #1d4ed8;
          }

          /* Fixed Close Button CSS */
          button.ap-modal-close {
            border: 0 !important;
            background: transparent !important;
            cursor: pointer !important;
            position: relative !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 32px !important;
            height: 32px !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #64748b !important;
            font-size: 24px !important;
            line-height: 1 !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            box-shadow: none !important;
            outline: none !important;
          }

          button.ap-modal-close::before,
          button.ap-modal-close::after {
            content: none !important;
            display: none !important;
          }

          button.ap-modal-close:hover {
            color: #0f172a !important;
          }

          .customer-mobile {
            font-size: 12px;
            color: #64748b;
          }

          .wallet-badge {
            display: inline-block;
            background-color: #ecfdf5;
            color: #059669;
            border: 1px solid #a7f3d0;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 14px;
            font-weight: 700;
          }

          .amount-text {
            font-weight: 700;
            color: #0f172a;
          }

          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            color: white;
          }

          .bg-success { background-color: #10b981; }
          .bg-info { background-color: #3b82f6; }
          .bg-secondary { background-color: #64748b; }

          .transaction-id {
            display: inline-block;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 5px 8px;
            font-size: 12px;
            color: #334155;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }

          .ap-expand-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #eff6ff;
            color: #1d4ed8;
            font-size: 16px;
            font-weight: 700;
            line-height: 1;
            transition: all 0.2s ease;
          }

          .ap-expand-icon.is-open {
            background: #dbeafe;
          }

          .ap-expansion-box {
            padding: 14px 18px 18px;
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
          }

          .ap-expansion-title {
            margin: 0 0 12px;
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
          }

          .ap-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 1050;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(15, 23, 42, 0.55);
          }

          .ap-modal {
            width: min(640px, 100%);
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            padding: 24px;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
          }

          .ap-modal-header,
          .ap-modal-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .ap-modal-header {
            margin-bottom: 20px;
          }

          .ap-modal-header h4 {
            margin: 0;
            color: #0f172a;
          }

          .ap-form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .ap-form-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            color: #334155;
            font-size: 13px;
            font-weight: 600;
          }

          .ap-form-field input {
            width: 100%;
            min-height: 40px;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            color: #0f172a;
          }

          .ap-form-field input:focus {
            border-color: #2563eb;
            outline: 2px solid rgba(37, 99, 235, 0.15);
          }

          .ap-modal-actions {
            justify-content: flex-end;
            gap: 10px;
            margin-top: 24px;
          }

          .ap-cancel-button {
            min-height: 40px;
            padding: 8px 16px;
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            background: #ffffff;
            color: #334155;
            cursor: pointer;
          }

          @media (max-width: 600px) {
            .ap-form-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default AdvancePayment;
