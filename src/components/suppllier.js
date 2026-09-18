import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import Layout from "./layout";
import { toast } from "react-toastify";
const SupplierBill = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const history = useHistory();
  const [search, setSearch] = useState("");
  const [supplierBill, setSupplierBill] = useState([]);
  const [filteredData, setFilteredData] = useState(supplierBill);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const handleCreateSupplier = () => {
    localStorage.setItem("supplier_detail", null);
  };

  const handleEdit = (row) => {
    localStorage.setItem("supplier_detail", JSON.stringify(row));
  };
  const handleDeleteConfirm = (id) => {
    if (window.confirm("Are you sure you want to delete this Supplier?")) {
      handleDelete(id);
    }
  };
  const handleDelete = async (id) => {
    const response = await axios.delete(`${BASE_URL}/api/suppliers/${id}`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      },
    });
    if (response) {
      toast.success("Supplier deleted successfully!");
      history.push("/suppliers");
      fetchSupplierBill();
    }
  };

  const columns = [
    {
      name: "Id",
      selector: (row) => row.id,
      sortable: true,
      width: "100px",
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      wrap: true,
    },
    {
      name: "GstIn",
      selector: (row) => row.gstin,
      sortable: true,
      wrap: true,
    },
    {
      name: "Contact",
      selector: (row) => row.contact,
      sortable: true,
      wrap: true,
    },
    {
      name: "Address",
      selector: (row) => row.address,
      sortable: true,
      wrap: true,
    },
    {
      name: "State",
      selector: (row) => row.state,
      sortable: true,
      wrap: true,
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="list-icon-function">
          <div className="item edit">
            <Link
              to={`/suppliers/edit/${row.id}`}
              onClick={() => handleEdit(row)}
            >
              <i className="icon-edit-3"></i>
            </Link>
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

  const fetchSupplierBill = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/suppliers`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setSupplierBill(response.data.suppliers);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };
  useEffect(() => {
    fetchSupplierBill();
  }, []);

  useEffect(() => {
    const searchText = search.toLowerCase();

    const result = supplierBill.filter((item) => {
      return (
        item.store?.name?.toLowerCase().includes(searchText) ||
        item.name?.toLowerCase().includes(searchText) ||
        String(item.gstin || "")
          .toLowerCase()
          .includes(searchText) ||
        String(item.contact || "")
          .toLowerCase()
          .includes(searchText) || // <-- CONTACT SEARCH
        item.address?.toLowerCase().includes(searchText) ||
        item.state?.toLowerCase().includes(searchText) ||
        item.description?.toLowerCase().includes(searchText)
      );
    });

    setFilteredData(result);
  }, [search, supplierBill]);

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>All Suppliers</h3>
            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="#">
                  <div className="text-tiny">Supplier Bill</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Supplier Bill</div>
              </li>
            </ul>
          </div>
          <div className="wg-box">
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search suppliers..."
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

              <Link
                className="tf-button style-1 w208"
                to="/create-suppliers"
                onClick={handleCreateSupplier}
              >
                <i className="icon-plus"></i>Add new
              </Link>
            </div>

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
            <div className="divider"></div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default SupplierBill;
