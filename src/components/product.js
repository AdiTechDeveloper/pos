import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./layout";
import { toast } from "react-toastify";
import BarcodePrintModal from "./BarcodePrintModal";
import Barcode from "react-barcode";
import { useAppData } from "../context/AppDataContext";

const Product = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const appData = useAppData();
  const products = appData?.products || [];
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState(products);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [selectedProduct, setSelectedProduct] = useState(null);

  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const handleEdit = (product) => {
    localStorage.setItem("product_detail", JSON.stringify(product));
  };

  const handleDeleteConfirm = (id) => {
    if (window.confirm("Are you sure you want to delete this Product?")) {
      handleDelete(id);
    }
  };

  const handleCreateProduct = () => {
    localStorage.setItem("product_detail", null);
  };

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/products/${id}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      if (response.status === 200) {
        appData?.invalidate("products");
        await appData?.loadProducts();

        toast.success("Product Deleted");
        navigate("/product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);

      toast.error(error.response?.data?.message || "Failed to delete product");
    }
  };
  useEffect(() => {
    appData?.loadProducts();
  }, []);

  useEffect(() => {
    const text = search.toLowerCase();
    const result = products.filter((item) => {
      const searchString = `
      ${item.id}
      ${item.sku}
      ${item.barcode}
      ${item.name}
      ${item.brand?.name}
      ${item.category?.name}
      ${item.hsn_code}
      ${item.gst_rate?.rate}
      ${item.mrp}
      ${item.selling_price}
      ${item.cost_price}
    `.toLowerCase();

      return searchString.includes(text);
    });
    setFilteredData(result);
  }, [search, products]);

  const columns = [
    // {
    //   name: "ID",
    //   cell: (row, index) => (currentPage - 1) * perPage + index + 1,
    //   width: "80px",
    //   center: true,
    // },

    {
      name: "SKU",
      selector: (row) => row.sku,
      sortable: true,
      width: "120px",
      wrap: true,
    },

    {
      name: "Barcode",
      center: true,
      minWidth: "180px",
      cell: (row) =>
        row.show_barcode && row.barcode ? (
          <div className="barcode-cell">
            <Barcode
              value={row.barcode}
              width={1}
              height={35}
              displayValue={false}
            />
            <div className="barcode-text">{row.barcode}</div>
          </div>
        ) : (
          "-"
        ),
    },

    {
      name: "Name",
      selector: (row) => row?.name,
      sortable: true,
      minWidth: "220px",
      wrap: true,
    },

    {
      name: "Brand",
      selector: (row) => row?.brand?.name,
      sortable: true,
      minWidth: "120px",
      wrap: true,
    },

    {
      name: "Category",
      selector: (row) => row?.category?.name,
      sortable: true,
      minWidth: "100px",
      wrap: true,
    },

    {
      name: "HSN",
      selector: (row) => row?.hsn_code,
      sortable: true,
      width: "100px",
      wrap: true,
    },

    {
      name: "GST %",
      selector: (row) => row?.gst_rate?.rate,
      sortable: true,
      width: "90px",
      wrap: true,
    },

    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          GST Included
        </div>
      ),
      sortable: true,
      center: true,
      width: "100px",
      cell: (row) => {
        const isYes = row?.gst_inclusive === true || row?.gst_inclusive === 1;

        return (
          <span className={`gst-dot ${isYes ? "yes" : "no"}`}>
            {isYes ? "✓" : "✕"}
          </span>
        );
      },
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Price Override
        </div>
      ),
      sortable: true,
      center: true,
      width: "100px",
      cell: (row) => {
        const isYes =
          row?.is_price_override === true || row?.is_price_override === 1;

        return (
          <span className={`gst-dot ${isYes ? "yes" : "no"}`}>
            {isYes ? "✓" : "✕"}
          </span>
        );
      },
    },
    {
      name: "Action",
      center: true,
      width: "160px",
      cell: (row) => (
        <div className="list-icon-function">
          <span className="item edit" title="Edit">
            <Link
              to={`/product/edit/${row.product_id}`}
              onClick={() =>
                handleEdit({
                  id: row.product_id,
                  name: row.name,
                  sku: row.sku,
                  brand_id: row.brand?.id,
                  category_id: row.category?.id,
                  hsn_code: row.hsn_code,
                  gst_rate_id: row.gst_rate?.id,
                  gst_inclusive: row.gst_inclusive,
                })
              }
            >
              <i className="icon-edit-3" />
            </Link>
          </span>

          <span
            className="item trash"
            title="Delete"
            onClick={() => handleDeleteConfirm(row.product_id)}
          >
            <i className="icon-trash-2" />
          </span>
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
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
                    Products
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    View, add, and manage your product catalog and stock
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
                  <div className="text-tiny">Product</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Product</div>
              </li>
            </ul>
          </div>
          <div className="wg-box">
            <div className="flex items-center justify-between gap10 flex-wrap">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search products..."
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
                to="/create-product"
                onClick={handleCreateProduct}
              >
                <i className="icon-plus"></i>Add new
              </Link>
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              paginationPerPage={perPage}
              onChangePage={(page) => setCurrentPage(page)}
              highlightOnHover
              pointerOnHover
              responsive
              customStyles={{
                headCells: {
                  style: {
                    fontWeight: "bold",
                    fontSize: "12px",
                  },
                },
              }}
            />
            <div className="divider"></div>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <BarcodePrintModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </Layout>
  );
};
export default Product;
