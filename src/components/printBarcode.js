import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import Layout from "./layout";
import { toast } from "react-toastify";
import BarcodePrintModal from "./BarcodePrintModal";
import Barcode from "react-barcode";

const PrintBarcode = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const history = useHistory();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState(products);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [selectedProduct, setSelectedProduct] = useState(null);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const handlePrintBarcode = (row) => {
    setSelectedProduct(row);
  };

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/products`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      const rows = [];

      response.data.products.forEach((product) => {
        if (product.batches && product.batches.length > 0) {
          const grouped = {};

          product.batches.forEach((inv) => {
            const key = `${inv.batch_no}-${inv.batch_barcode}-${inv.mrp}-${inv.selling_price}`;

            if (!grouped[key]) {
              grouped[key] = {
                row_id: `inv-${product.id}-${key}`,
                inventory_ids: [inv.id],

                product_id: product.id,
                sku: product.sku,
                name: product.name,
                brand: product.brand,
                category: product.category,
                hsn_code: product.hsn_code,
                gst_rate: product.gst_rate,
                gst_inclusive: product.gst_inclusive,

                batch_no: inv.batch_no,

                mrp: Number(inv.mrp),
                selling_price: Number(inv.selling_price),

                qty: Number(inv.qty_available) || 0,
                free: Number(inv.free) || 0,

                cost_total:
                  Number(inv.cost_price) * Number(inv.qty_available || 0),

                barcodes: new Set([inv.batch_barcode]),
              };
            } else {
              grouped[key].inventory_ids.push(inv.id);
              grouped[key].qty += Number(inv.qty_available) || 0;
              grouped[key].free += Number(inv.free) || 0;
              grouped[key].cost_total +=
                Number(inv.cost_price) * Number(inv.qty_available || 0);
              grouped[key].barcodes.add(inv.batch_barcode);
            }
          });

          Object.values(grouped).forEach((row) => {
            row.total_qty = row.qty + row.free;
            row.cost_price = row.qty
              ? (row.cost_total / row.qty).toFixed(2)
              : 0;

            row.show_barcode = row.barcodes.size === 1;
            row.barcode = row.show_barcode ? [...row.barcodes][0] : null;

            delete row.barcodes;
            rows.push(row);
          });
        } else {
          rows.push({
            row_id: `prod-${product.id}`,

            product_id: product.id,
            sku: product.sku,
            name: product.name,
            brand: product.brand,
            category: product.category,
            hsn_code: product.hsn_code,
            gst_rate: product.gst_rate,
            gst_inclusive: product.gst_inclusive,

            batch_no: "-",
            barcode: product.barcode ?? null,

            mrp: Number(product.min_price) || 0,
            selling_price: Number(product.min_price) || 0,
            cost_price: product.cost_price ?? 0,

            qty: 0,
            free: 0,
            total_qty: 0,
            show_barcode: !!product.barcode,
          });
        }
      });

      setProducts(rows);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchProduct();
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
    {
      name: "ID",
      cell: (row, index) => (currentPage - 1) * perPage + index + 1,
      width: "80px",
      center: true,
    },

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
      name: "MRP",
      selector: (row) => row.mrp,
      sortable: true,
      width: "80px",
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
          Selling Price
        </div>
      ),
      selector: (row) => row.selling_price,
      sortable: true,
      width: "100px",
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
      name: "Action",
      center: true,
      width: "160px",
      cell: (row) => (
        <div className="list-icon-function">
          <span
            className="item print"
            title="Print Barcode"
            onClick={() => handlePrintBarcode(row)}
          >
            <i className="icon-printer" />
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
                  Print Barcode
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                   Generate and print barcodes for your products
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
                <div className="text-tiny">Barcode</div>
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
export default PrintBarcode;
