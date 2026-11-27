import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  // Filters
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");

  // Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const user_data = JSON.parse(localStorage.getItem("user_detail") || "null");
  const userRole = user_data?.user?.role || user_data?.role;
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";
  const branches = appData?.branches || [];
  const categories = appData?.categories || [];
  const brands = appData?.brands || [];
  const [selectedBranch, setSelectedBranch] = useState("");

  // API /api/all-products already returns paginated products and meta.
  // Map its raw product shape to the row shape used by this page.
  const fetchProducts = useCallback(async (page = 1, pageSize = perPage) => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      const params = {
        page,
        per_page: pageSize,
        with_inventories: 1,
      };

      if (search.trim()) params.search = search.trim();
      if (categoryFilter !== "all") params.category_id = categoryFilter;
      if (brandFilter !== "all") params.brand_id = brandFilter;
      if (selectedBranch) params.branch_id = selectedBranch;
      if (stockFilter === "in_stock") params.in_stock = 1;

      const response = await axios.get("/api/all-products", {
        params,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data?.token || ""}`,
        },
      });

      // Ignore an older response if the user changed filters/page meanwhile.
      if (requestId !== requestIdRef.current) return;

      const rawProducts = response.data?.products || [];
      const rows = rawProducts.map((product) => {
        const inventories = Array.isArray(product.inventories)
          ? product.inventories
          : [];

        const totalQty = inventories.reduce((sum, inv) => {
          const qty = Number(
            inv.available_qty ?? (Number(inv.qty || 0) - Number(inv.sold_qty || 0)),
          ) || 0;
          return sum + qty;
        }, 0);

        const totalFree = inventories.reduce(
          (sum, inv) => sum + (Number(inv.free_qty ?? inv.free ?? 0) || 0),
          0,
        );

        const costTotal = inventories.reduce((sum, inv) => {
          const qty = Number(
            inv.available_qty ?? (Number(inv.qty || 0) - Number(inv.sold_qty || 0)),
          ) || 0;
          return sum + Number(inv.cost_price || 0) * qty;
        }, 0);

        const stock = Number(product.total_stock ?? totalQty) || 0;

        return {
          row_id: `prod-${product.id}`,
          product_id: product.id,
          id: product.id,
          inventory_ids: inventories.map((inv) => inv.id).filter(Boolean),
          sku: product.sku,
          name: product.name,
          brand: product.brand,
          category: product.category,
          hsn_code: product.hsn_code,
          gst_rate: product.gst_rate ?? product.gstRate,
          gst_inclusive: product.gst_inclusive,
          is_price_override: product.is_price_override,
          barcode: product.barcode || null,
          show_barcode: !!product.barcode,
          mrp: Number(inventories[0]?.mrp ?? product.mrp ?? 0),
          selling_price: Number(
            inventories[0]?.selling_price ?? product.selling_price ?? 0,
          ),
          cost_price: totalQty ? (costTotal / totalQty).toFixed(2) : (product.cost_price ?? 0),
          qty: stock,
          total_stock: stock,
          free: totalFree,
          total_qty: totalQty + totalFree,
          batch_count: inventories.length,
          batch_no: "-",
        };
      });

      setProducts(rows);
      setTotalRows(Number(response.data?.meta?.total || 0));
      setCurrentPage(Number(response.data?.meta?.page || page));
    } catch (error) {
      if (requestId === requestIdRef.current) {
        console.error("Products loading failed:", error);
        toast.error(error.response?.data?.message || "Failed to load products");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [
    perPage,
    search,
    categoryFilter,
    brandFilter,
    stockFilter,
    selectedBranch,
    user_data?.token,
  ]);

  // Load master filter lists and fetch the first page. Any filter change
  // automatically requests page 1 from the backend.
  useEffect(() => {
    if (isAdmin) appData?.loadBranches({ force: true });
    appData?.loadCategories?.();
    appData?.loadBrands?.();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && !isManager) return;

    setCurrentPage(1);

    const timer = setTimeout(() => {
      fetchProducts(1, perPage);
    }, search.trim() ? 350 : 0);

    return () => clearTimeout(timer);
  }, [fetchProducts, isAdmin, isManager, perPage]);

  // Low-stock and out-of-stock filtering is currently limited to the loaded
  // page because the existing getAllProducts endpoint does not implement these
  // two filter parameters yet. In-stock is filtered by the backend.
  const displayedProducts = useMemo(() => {
    if (stockFilter === "low_stock") {
      return products.filter((product) => {
        const stock = Number(product.total_stock || 0);
        return stock > 0 && stock <= 10;
      });
    }

    if (stockFilter === "out_of_stock") {
      return products.filter((product) => Number(product.total_stock || 0) <= 0);
    }

    return products;
  }, [products, stockFilter]);

  const handleEdit = (product) => {
    localStorage.setItem(
      "product_detail",

      JSON.stringify(product),
    );
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
      const response = await axios.delete(
        `${BASE_URL}/api/products/${id}`,

        {
          headers: {
            Accept: "application/json",

            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );

      if (response.status === 200) {
        await fetchProducts(currentPage, perPage);

        toast.success("Product Deleted");

        navigate("/product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);

      toast.error(error.response?.data?.message || "Failed to delete product");
    }
  };

  const columns = [
    {
      name: "SKU",

      selector: (row) => row?.sku,

      sortable: true,

      width: "120px",

      wrap: true,
    },

    {
      name: "Barcode",

      center: true,

      minWidth: "180px",

      cell: (row) =>
        row?.show_barcode && row?.barcode ? (
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

      minWidth: "120px",

      wrap: true,
    },

    {
      name: "Stock",

      selector: (row) => Number(row?.total_stock || 0),

      sortable: true,

      minWidth: "100px",

      center: true,

      cell: (row) => {
        const stock = Number(row?.total_stock || 0);

        return (
          <span
            style={{
              fontWeight: 700,

              color:
                stock <= 0 ? "#dc2626" : stock <= 10 ? "#d97706" : "#16a34a",
            }}
          >
            {stock}
          </span>
        );
      },
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

  const filterSelectStyle = {
    height: "44px",

    minWidth: "155px",

    border: "1px solid #e5e7eb",

    borderRadius: "8px",

    padding: "0 12px",

    background: "#ffffff",

    color: "#374151",

    fontSize: "14px",

    outline: "none",

    cursor: "pointer",
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* Page Header */}

          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <div
              style={{
                display: "flex",

                alignItems: "center",

                gap: "12px",
              }}
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

            {/* Breadcrumbs */}

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

          {/* Product Box */}

          <div className="wg-box mb-50">
            {/* Search + Add New */}

            <div
              style={{
                display: "flex",

                alignItems: "center",

                width: "100%",

                gap: "15px",

                marginBottom: "15px",
              }}
            >
              {/* Search */}

              <div
                className="wg-filter"
                style={{
                  flex: 1,
                }}
              >
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

              {/* Add Product */}

              <Link
                className="tf-button style-1 w208"
                to="/create-product"
                onClick={handleCreateProduct}
                style={{
                  flexShrink: 0,
                }}
              >
                <i className="icon-plus"></i>
                Add new
              </Link>
            </div>

            {/* Filters */}

            <div
              style={{
                display: "flex",

                alignItems: "center",

                gap: "10px",

                width: "100%",

                marginBottom: "20px",
              }}
            >
              {/* Admin Branch Filter */}

              {isAdmin && (
                <div
                  style={{
                    position: "relative",

                    minWidth: "180px",
                  }}
                >
                  <i
                    className="icon-filter"
                    style={{
                      position: "absolute",

                      left: "12px",

                      top: "50%",

                      transform: "translateY(-50%)",

                      color: "#6b7280",

                      fontSize: "14px",

                      pointerEvents: "none",

                      zIndex: 1,
                    }}
                  ></i>

                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    style={{
                      width: "100%",

                      height: "44px",

                      padding: "0 35px 0 34px",

                      border: "1px solid #d1d5db",

                      borderRadius: "8px",

                      background: "#ffffff",

                      color: "#374151",

                      fontSize: "14px",

                      fontWeight: 500,

                      cursor: "pointer",

                      outline: "none",

                      appearance: "none",
                    }}
                  >
                    <option value="">Branch: All</option>

                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        Branch: {branch.name}
                      </option>
                    ))}
                  </select>

                  <span
                    style={{
                      position: "absolute",

                      right: "12px",

                      top: "50%",

                      transform: "translateY(-50%)",

                      color: "#6b7280",

                      pointerEvents: "none",
                    }}
                  >
                    ▾
                  </span>
                </div>
              )}

              {/* Stock Filter */}

              <div
                style={{
                  position: "relative",

                  minWidth: "160px",
                }}
              >
                <i
                  className="icon-filter"
                  style={{
                    position: "absolute",

                    left: "12px",

                    top: "50%",

                    transform: "translateY(-50%)",

                    color: "#6b7280",

                    fontSize: "14px",

                    pointerEvents: "none",

                    zIndex: 1,
                  }}
                ></i>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  style={{
                    width: "100%",

                    height: "44px",

                    padding: "0 35px 0 34px",

                    border: "1px solid #d1d5db",

                    borderRadius: "8px",

                    background: "#ffffff",

                    color: "#374151",

                    fontSize: "14px",

                    fontWeight: 500,

                    cursor: "pointer",

                    outline: "none",

                    appearance: "none",
                  }}
                >
                  <option value="all">Stock: All</option>

                  <option value="in_stock">Stock: In Stock</option>

                  <option value="low_stock">Stock: Low Stock</option>

                  <option value="out_of_stock">Stock: Out of Stock</option>
                </select>

                <span
                  style={{
                    position: "absolute",

                    right: "12px",

                    top: "50%",

                    transform: "translateY(-50%)",

                    color: "#6b7280",

                    pointerEvents: "none",
                  }}
                >
                  ▾
                </span>
              </div>

              {/* Category Filter */}

              <div
                style={{
                  position: "relative",

                  minWidth: "180px",
                }}
              >
                <i
                  className="icon-filter"
                  style={{
                    position: "absolute",

                    left: "12px",

                    top: "50%",

                    transform: "translateY(-50%)",

                    color: "#6b7280",

                    fontSize: "14px",

                    pointerEvents: "none",

                    zIndex: 1,
                  }}
                ></i>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    width: "100%",

                    height: "44px",

                    padding: "0 35px 0 34px",

                    border: "1px solid #d1d5db",

                    borderRadius: "8px",

                    background: "#ffffff",

                    color: "#374151",

                    fontSize: "14px",

                    fontWeight: 500,

                    cursor: "pointer",

                    outline: "none",

                    appearance: "none",
                  }}
                >
                  <option value="all">Category: All</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      Category: {category.name}
                    </option>
                  ))}
                </select>

                <span
                  style={{
                    position: "absolute",

                    right: "12px",

                    top: "50%",

                    transform: "translateY(-50%)",

                    color: "#6b7280",

                    pointerEvents: "none",
                  }}
                >
                  ▾
                </span>
              </div>

              {/* Brand Filter */}

              <div
                style={{
                  position: "relative",

                  minWidth: "170px",
                }}
              >
                <i
                  className="icon-filter"
                  style={{
                    position: "absolute",

                    left: "12px",

                    top: "50%",

                    transform: "translateY(-50%)",

                    color: "#6b7280",

                    fontSize: "14px",

                    pointerEvents: "none",

                    zIndex: 1,
                  }}
                ></i>

                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  style={{
                    width: "100%",

                    height: "44px",

                    padding: "0 35px 0 34px",

                    border: "1px solid #d1d5db",

                    borderRadius: "8px",

                    background: "#ffffff",

                    color: "#374151",

                    fontSize: "14px",

                    fontWeight: 500,

                    cursor: "pointer",

                    outline: "none",

                    appearance: "none",
                  }}
                >
                  <option value="all">Brand: All</option>

                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      Brand: {brand.name}
                    </option>
                  ))}
                </select>

                <span
                  style={{
                    position: "absolute",

                    right: "12px",

                    top: "50%",

                    transform: "translateY(-50%)",

                    color: "#6b7280",

                    pointerEvents: "none",
                  }}
                >
                  ▾
                </span>
              </div>

              {/* Clear Filters */}

              {(search ||
                stockFilter !== "all" ||
                categoryFilter !== "all" ||
                brandFilter !== "all" ||
                (isAdmin && selectedBranch)) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");

                    setStockFilter("all");

                    setCategoryFilter("all");

                    setBrandFilter("all");

                    if (isAdmin) {
                      setSelectedBranch("");
                    }
                  }}
                  style={{
                    height: "44px",

                    padding: "0 16px",

                    display: "flex",

                    alignItems: "center",

                    gap: "7px",

                    border: "1px solid #fecaca",

                    borderRadius: "8px",

                    background: "#fff7f7",

                    color: "#dc2626",

                    fontSize: "14px",

                    fontWeight: 600,

                    cursor: "pointer",

                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="icon-close"></i>
                  Clear Filters
                </button>
              )}
            </div>

            {/* Products Table */}

            <DataTable
              key={`${perPage}-${search}-${stockFilter}-${categoryFilter}-${brandFilter}-${selectedBranch}`}
              columns={columns}
              data={displayedProducts}
              progressPending={loading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationRowsPerPageOptions={[25, 50, 100, 200, 500]}
              onChangePage={(page) => fetchProducts(page, perPage)}
              onChangeRowsPerPage={(newPerPage) => {
                setCurrentPage(1);
                setPerPage(newPerPage);
              }}
              paginationDefaultPage={currentPage}
              highlightOnHover
              pointerOnHover
              responsive
              noDataComponent="No products found"
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

        {/* Barcode Modal */}

        {selectedProduct && (
          <BarcodePrintModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default Product;
