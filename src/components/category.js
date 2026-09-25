import React, { useState, useEffect } from "react";
import Layout from "./layout";
import { Link, useHistory } from "react-router-dom";
import DataTable from "react-data-table-component";
import axios from "axios";
import { toast } from "react-toastify";

const Category = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [filteredData, setFilteredData] = useState(categories);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const history = useHistory();

  const fetchCategory = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/categories`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };
  useEffect(() => {
    fetchCategory();
  }, []);

  const handleDelete = async (id) => {
    const response = await axios.delete(`${BASE_URL}/api/categories/${id}`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      },
    });
    if (response) {
      history.push("/category");
      toast.success("Category Deleted");
      fetchCategory();
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
      width: "250px",
    },
    {
      name: "Description",
      selector: (row) => row.description,
      sortable: true,
      width: "400px",
    },
    {
      name: "Parent Category",
      selector: (row) => row?.parent?.name,
      sortable: true,
      width: "300px",
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="list-icon-function">
          <div className="item edit">
            <Link
              to={`/category/edit/${row.id}`}
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

  useEffect(() => {
    const searchText = (search || "").toLowerCase();

    const result = categories.filter((item) =>
      [item.store?.name, item.name, item.description, item.parent?.name]
        .join(" ")
        .toLowerCase()
        .includes(searchText),
    );

    setFilteredData(result);
  }, [search, categories]);

  const handleCreateCategory = () => {
    localStorage.setItem("category_detail", null);
  };
  const handleEdit = (row) => {
    localStorage.setItem("category_detail", JSON.stringify(row));
  };

  const handleDeleteConfirm = (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      handleDelete(id);
    }
  };
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
                    Category
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Organize your products into categories for easier browsing
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
                  <div className="text-tiny">Category</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Category</div>
              </li>
            </ul>
          </div>
          <div className="wg-box wg-content">
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search categories..."
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
                to="/create-category"
                onClick={handleCreateCategory}
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
export default Category;
