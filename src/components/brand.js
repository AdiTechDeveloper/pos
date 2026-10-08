import React, { useState, useEffect } from "react";
import Layout from "./layout";
import { Link, useNavigate } from "react-router-dom";
import DataTable from "react-data-table-component";
import axios from "axios";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";

const Brand = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const appData = useAppData();
const brands = appData?.brands || [];
  const [filteredData, setFilteredData] = useState(brands);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const handleCreateBrand = () => {
    localStorage.setItem("brand_detail", null);
  };
  const handleEdit = (row) => {
    localStorage.setItem("brand_detail", JSON.stringify(row));
  };
  const handleDeleteConfirm = (id) => {
    if (window.confirm("Are you sure you want to delete this Brand?")) {
      handleDelete(id);
    }
  };
  const handleDelete = async (id) => {
  try {
    const response = await axios.delete(`${BASE_URL}/api/brands/${id}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      },
    });

    if (response.status === 200) {
      appData?.invalidate("brands");
      await appData?.loadBrands();

      toast.success("Brand Deleted");
      navigate("/brand");
    }
  } catch (error) {
    console.error("Error deleting brand:", error);

    toast.error(
      error.response?.data?.message || "Failed to delete brand"
    );
  }
};
 
  useEffect(() => {
  appData?.loadBrands();
}, []);

 useEffect(() => {
  const searchText = search.toLowerCase();

  const result = brands.filter((item) => {
    const name = String(item.name || "").toLowerCase();
    const description = String(item.description || "").toLowerCase();

    return (
      name.includes(searchText) ||
      description.includes(searchText)
    );
  });

  setFilteredData(result);
}, [search, brands]);
  const columns = [
    
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      width: "250px",
    },
    {
      name: "Description",
      selector: (row) => row.description,
      sortable: true,
      width: "500px",
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="list-icon-function">
          <div className="item edit">
            <Link to={`/brand/edit/${row.id}`} onClick={() => handleEdit(row)}
            title="Edit"
            >
              <i className="icon-edit-3"></i>
            </Link>
          </div>
          <div
            className="item trash"
            onClick={() => handleDeleteConfirm(row.id)}
            title="Delete"
          >
            <i className="icon-trash-2"></i>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
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
                    Brands
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Manage the brands associated with your products
                  </p>
                </div>
              </div>

            </div>
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
                  <div className="text-tiny">Brand</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Brand</div>
              </li>
            </ul>
          </div>
          <div className="wg-box brand-box" style={{ width: "80%" }}>
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search brands..."
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
                to="/create-brand"
                onClick={handleCreateBrand}
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
export default Brand;
