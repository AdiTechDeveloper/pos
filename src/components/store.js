import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { Link, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./layout";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { Ban, CheckCircle2 } from "lucide-react";

const Store = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState(stores);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const handleEdit = (row) => {
    const adminUser = row.users?.find(
      (u) => u.id === row.user_id || u.id === row.admin_id,
    );

    navigate(`/create-store/${row.id}`, {
      state: {
        storeData: row,
        adminUsername: adminUser ? adminUser.username : "",
      },
    });
  };

  const handleDeleteConfirm = (id) => {
    handleDelete(id);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This store will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axios.delete(`${BASE_URL}/api/stores/${id}`, {
            headers: {
              Authorization: `Bearer ${user_data.token}`,
            },
          });

          toast.success(
            response.data?.message || "Store deleted successfully!",
          );

          fetchStore();
        } catch (error) {
          toast.error(
            error.response?.data?.message || "Failed to delete the store.",
          );
        }
      }
    });
  };

  const updateStoreStatus = async (id, status, reason) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/stores/${id}/status`,
        { status, reason },
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );

      toast.success(response.data?.message || "Store status updated.");
      fetchStore();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update the store status.",
      );
    }
  };

  const statusPopupStyles = `
    <style>
      .sp-popup { border-radius: 16px !important; padding: 24px 24px 20px !important; user-select: none; }
      .sp-title { font-size: 22px !important; font-weight: 800 !important; color: #111827 !important;
        padding: 0 !important; margin: 0 0 4px !important; background: none !important; line-height: 1.3 !important; }
      .sp-body { text-align: left; }
      .sp-store { display: inline-block; background: #f3f4f6; color: #111827; font-weight: 700;
        font-size: 16px; padding: 6px 12px; border-radius: 8px; margin: 6px 0 10px; }
      .sp-note { color: #6b7280; font-size: 14px; margin: 0 0 16px; line-height: 1.5; }
      .sp-label { display: block; font-size: 12px; font-weight: 700; letter-spacing: 0.05em;
        text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
      .sp-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
      .sp-option { position: relative; display: block; }
      .sp-option input { position: absolute; opacity: 0; pointer-events: none; }
      .sp-card { display: block; border: 2px solid #e5e7eb; border-radius: 12px; padding: 12px 14px;
        cursor: pointer; min-height: 68px; background: #fff; }
      .sp-card b { display: block; font-size: 15px; color: #111827; margin-bottom: 2px; }
      .sp-card small { display: block; font-size: 12px; color: #6b7280; line-height: 1.4; }
      .sp-option input:checked + .sp-card { border-color: #dc2626; background: #fef2f2; }
      .sp-reason { width: 100%; box-sizing: border-box; border: 2px solid #e5e7eb; border-radius: 12px;
        padding: 10px 12px; font-size: 15px; min-height: 88px; resize: none; font-family: inherit; }
      .sp-reason:focus { outline: none; border-color: #2f63f6; }
      .sp-actions { gap: 12px; margin-top: 20px !important; width: 100%; flex-wrap: nowrap !important; }
      .sp-btn { flex: 1; min-height: 48px; border: none !important; border-radius: 12px !important;
        font-size: 16px !important; font-weight: 700 !important; cursor: pointer; padding: 0 20px !important;
        box-shadow: none !important; }
      .sp-btn-danger { background: #dc2626 !important; color: #fff !important; }
      .sp-btn-success { background: #16a34a !important; color: #fff !important; }
      .sp-btn-muted { background: #e5e7eb !important; color: #374151 !important; }
    </style>
  `;

  const handleStatusChange = (row) => {
    const isBlocked = row.status && row.status !== "active";

    if (isBlocked) {
      Swal.fire({
        title: "Activate this store?",
        html: `
          ${statusPopupStyles}
          <div class="sp-body">
            <span class="sp-store" id="sp-store-name"></span>
            <p class="sp-note">The users of this store will be able to log in again.</p>
          </div>
        `,
        icon: "question",
        width: 520,
        showCancelButton: true,
        buttonsStyling: false,
        reverseButtons: true,
        confirmButtonText: "Yes, activate",
        cancelButtonText: "Cancel",
        customClass: {
          popup: "sp-popup",
          title: "sp-title",
          actions: "sp-actions",
          confirmButton: "sp-btn sp-btn-success",
          cancelButton: "sp-btn sp-btn-muted",
        },
        didOpen: () => {
          document.getElementById("sp-store-name").textContent = row.name;
        },
      }).then((result) => {
        if (result.isConfirmed) updateStoreStatus(row.id, "active", "");
      });
      return;
    }

    Swal.fire({
      title: "Block this store?",
      html: `
        ${statusPopupStyles}
        <div class="sp-body">
          <span class="sp-store" id="sp-store-name"></span>
          <p class="sp-note">
            All users of this store will be logged out immediately and will not be able to log in.
          </p>

          <span class="sp-label">Block type</span>
          <div class="sp-options">
            <label class="sp-option">
              <input type="radio" name="sp-status" value="frozen" checked />
              <span class="sp-card">
                <b>Frozen</b>
                <small>Subscription ended</small>
              </span>
            </label>
            <label class="sp-option">
              <input type="radio" name="sp-status" value="inactive" />
              <span class="sp-card">
                <b>Inactive</b>
                <small>Store deactivated</small>
              </span>
            </label>
          </div>

          <span class="sp-label">Reason (optional)</span>
          <textarea id="sp-reason" class="sp-reason" maxlength="255"
            placeholder="For example: Subscription payment pending"></textarea>
        </div>
      `,
      icon: "warning",
      width: 520,
      showCancelButton: true,
      buttonsStyling: false,
      reverseButtons: true,
      confirmButtonText: "Block store",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "sp-popup",
        title: "sp-title",
        actions: "sp-actions",
        confirmButton: "sp-btn sp-btn-danger",
        cancelButton: "sp-btn sp-btn-muted",
      },
      didOpen: () => {
        document.getElementById("sp-store-name").textContent = row.name;
      },
      preConfirm: () => ({
        status: document.querySelector('input[name="sp-status"]:checked').value,
        reason: document.getElementById("sp-reason").value.trim(),
      }),
    }).then((result) => {
      if (result.isConfirmed) {
        updateStoreStatus(row.id, result.value.status, result.value.reason);
      }
    });
  };

  const columns = [
    {
      name: "Store Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Logo",
      sortable: false,
      cell: (row) =>
        row.logo ? (
          <img
            src={`${BASE_URL}/storage/${row.logo}`}
            alt="Store Logo"
            className="w-40 h-15 object-cover mt-2"
          />
        ) : null,
    },
    {
      name: "Code",
      selector: (row) => row.code,
      sortable: true,
    },
    {
      name: "Contact Person",
      selector: (row) => row.contact_person_name,
      sortable: true,
    },
    {
      name: "GSTIN",
      selector: (row) => row.gstin,
      sortable: true,
    },
    {
      name: "Tag Line",
      selector: (row) => row.tagline,
      sortable: true,
    },
    {
      name: "Address",
      selector: (row) => row.address,
      sortable: true,
    },
    {
      name: "State",
      selector: (row) => row.state,
      sortable: true,
    },
    {
      name: "Phone",
      selector: (row) => row.phone,
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => {
        const status = row.status || "active";
        const look = {
          active: { bg: "#dcfce7", color: "#15803d", label: "Active" },
          frozen: { bg: "#fef3c7", color: "#b45309", label: "Frozen" },
          inactive: { bg: "#fee2e2", color: "#b91c1c", label: "Inactive" },
        }[status] || { bg: "#e5e7eb", color: "#374151", label: status };

        return (
          <span
            title={row.status_reason || ""}
            style={{
              background: look.bg,
              color: look.color,
              padding: "4px 12px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {look.label}
          </span>
        );
      },
    },
    {
      name: "Action",
      minWidth: "230px",
      cell: (row) => (
        <div className="list-icon-function">
          {/* <div
            className="item eye"
            onClick={() => navigate(`/stores/view/${row.id}`)}
          >
            <i className="icon-eye"></i>
          </div> */}
          {row.status && row.status !== "active" ? (
            <div
              className="item"
              title="Activate store"
              onClick={() => handleStatusChange(row)}
              style={{
                color: "#16a34a",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={20} />
            </div>
          ) : (
            <div
              className="item"
              title="Block store"
              onClick={() => handleStatusChange(row)}
              style={{
                color: "#dc2626",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ban size={20} />
            </div>
          )}
          <div className="item edit" onClick={() => handleEdit(row)}>
            <i className="icon-edit-3"></i>
          </div>
          <div
            className="item trash"
            onClick={() => handleDeleteConfirm(row.id)}
          >
            <i className="icon-trash-2"></i>
          </div>
        </div>
      ),
    },
  ];

  const fetchStore = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/stores`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
        withCredentials: true,
      });
      setStores(response.data.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchStore();
  }, []);

  useEffect(() => {
    const result = stores.filter((item) => {
      return Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    });

    setFilteredData(result);
  }, [search, stores]);

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* Page header + Breadcrumbs */}
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
                  All Store
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    margin: "2px 0 0 0",
                  }}
                >
                  Manage Store details
                </p>
              </div>
            </div>

            <ul className="breadcrumbs flex items-center flex-wrap gap10">
              <li>
                <Link to="/dashboard">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="/store">
                  <div className="text-tiny">Store</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Store</div>
              </li>
            </ul>
          </div>

          {/* Table Section */}
          <div className="wg-box mb-50">
            {/* TOP Search Box + Add Button */}
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search here..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-required="true"
                    />
                  </fieldset>
                  <div className="button-submit">
                    <button type="submit">
                      <i className="icon-search"></i>
                    </button>
                  </div>
                </form>
              </div>

              <Link className="tf-button style-1 w208" to="/create-store">
                <i className="icon-plus"></i>Add new
              </Link>
            </div>

            {/* DataTable */}
            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              pointerOnHover
              responsive
              customStyles={{
                headCells: {
                  style: {
                    fontWeight: "bold",
                    fontSize: "14px",
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default Store;
