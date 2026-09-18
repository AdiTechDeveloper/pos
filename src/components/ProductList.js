import React, { useEffect, useState, useRef } from "react";
import { getProducts, scanBarcode } from "../utils/api";
import BatchSelectModal from "../components/BatchSelectModal";

export default function ProductList({
  selectedCategory,
  selectedBrand,
  addToCart,
  setSelectedCategory,
  setSelectedBrand,
  refreshProducts,
}) {
  const resetFilters = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedBrand(null);
  };

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [batchOptions, setBatchOptions] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const barcodeRef = useRef();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts({
        category_id: selectedCategory,
        brand_id: selectedBrand,
        search,
      });

      setProducts(res.data.products || []);
    } catch (e) {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedCategory, selectedBrand, search, refreshProducts]);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, [barcode]);

  const buildCartItem = (product, batch) => {
    const rawInclusive =
      product?.is_gst_inclusive ??
      product?.is_inclusive ??
      product?.gst_inclusive ??
      product?.is_gst_included ??
      batch?.is_gst_inclusive ??
      0;

    const isInclusive =
      rawInclusive === true ||
      rawInclusive === 1 ||
      rawInclusive === "1" ||
      rawInclusive === "true"
        ? 1
        : 0;

    const gstRate = Number(
      product?.gst_rate?.rate ??
        product?.gst_rate ??
        batch?.gst_rate?.rate ??
        batch?.gst_rate ??
        0,
    );

    const is_price_override = Number(product?.is_price_override) === 1 ? 1 : 0;
    const inventoryId = batch.inventory_id || batch.id;
    const totalStock = Number(batch.total_stock ?? batch.qty_available ?? 0);

    return {
      cart_key: `${inventoryId}`,
      inventory_id: inventoryId,

      product_id: product?.id || batch?.product_id,
      name: product?.name || batch?.name,

      batch_no: batch.batch_no,
      selling_price: Number(batch.selling_price),
      expiry_date: batch.expiry_date,

      stock: totalStock,
      total_stock: totalStock,
      free_qty: 0,

      gst_percent: gstRate,
      gst_inclusive: isInclusive,

      is_price_override: is_price_override,

      qty: 1,
    };
  };

  const handleCardClick = (product) => {
    if (!product.total_stock || product.total_stock <= 0) return;

    // Single Batch Case
    if (product.batch_count <= 1 && product.batches?.length) {
      addToCart(buildCartItem(product, product.batches[0]));
      return;
    }

    // Multiple Batches Case
    setActiveProduct(product);
    setBatchOptions(
      (product.batches || []).map((b) => ({
        ...b,
        product_ref: product,
      })),
    );
    setShowBatchModal(true);
  };

  const handleBarcodeScan = async () => {
    try {
      const res = await scanBarcode(barcode.trim());

      const data = res.data || res;

      if (!data?.status) {
        alert(data?.message || "Product not found");
        return;
      }

      const { product, batches } = data;

      if (!batches || batches.length === 0) {
        alert("Out of stock");
        return;
      }

      if (batches.length === 1) {
        addToCart(buildCartItem(product, batches[0]));
      } else {
        setActiveProduct(product);
        setBatchOptions(batches.map((b) => ({ ...b, product })));
        setShowBatchModal(true);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Product not found";
      alert(errorMessage);
    } finally {
      setBarcode("");
    }
  };

  const getExpiryStatus = (dateStr) => {
    if (!dateStr) return null;
    const diffDays = Math.ceil(
      (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays <= 7) return { level: "critical", diffDays };
    if (diffDays <= 30) return { level: "warning", diffDays };
    return null;
  };

  const criticalCount = products.filter(
    (p) => getExpiryStatus(p.nearest_expiry)?.level === "critical",
  ).length;

  const formatPrice = (p) => {
    if (p.has_multiple_prices && p.min_price !== p.max_price) {
      return `₹${p.min_price} - ₹${p.max_price}`;
    }
    return `₹${p.min_price ?? p.max_price ?? "-"}`;
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
      <div className="flex gap-6 mb-12">
        <input
          ref={barcodeRef}
          type="text"
          placeholder="Scan barcode..."
          className="border p-5 text-2xl w-96 rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-400"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && barcode.trim()) {
              handleBarcodeScan();
            }
          }}
        />
        <input
          type="text"
          placeholder="Search product..."
          className="border p-5 text-2xl w-full rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {loading &&
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl shadow-md animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 bg-gray-100 rounded mb-2 w-2/3"></div>
              <div className="h-4 bg-gray-100 rounded mb-2 w-1/2"></div>
              <div className="mt-6 flex justify-between items-center">
                <span className="h-8 w-20 bg-gray-200 rounded"></span>
                <span className="h-8 w-20 bg-gray-100 rounded"></span>
              </div>
            </div>
          ))}

        {products.length === 0 && !loading && (
          <div className="col-span-3 text-center py-20">
            <h2 className="text-5xl font-bold text-gray-700">
              No Products Found
            </h2>
            <p className="text-gray-500 text-2xl mt-8">
              Try adjusting your search, category, or brand filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-8 px-6 py-3 text-2xl rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 transition"
            >
              Reset Filters
            </button>
          </div>
        )}

        {!loading &&
          products.map((p) => {
            const expiryStatus = getExpiryStatus(p.nearest_expiry);
            const isCritical = expiryStatus?.level === "critical";
            const isWarning = expiryStatus?.level === "warning";
            const inStock = p.total_stock > 0;

            return (
              <div
                key={p.id}
                onClick={() => handleCardClick(p)}
                className={`group p-6 rounded-3xl bg-white flex flex-col justify-between transition relative border ${
                  inStock
                    ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl"
                    : "opacity-50 cursor-not-allowed"
                }`}
                style={{
                  borderLeft: isCritical
                    ? "6px solid #dc2626"
                    : isWarning
                      ? "6px solid #f59e0b"
                      : "6px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                {isCritical && (
                  <span className="absolute top-4 right-4 flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
                    🔥 Sell First
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-extrabold text-2xl leading-tight">
                      {p.name}
                    </h3>
                    {expiryStatus && !isCritical && (
                      <span className="shrink-0 px-3 py-1 rounded-lg text-sm font-bold bg-orange-100 text-orange-800">
                        {expiryStatus.diffDays}d left
                      </span>
                    )}
                    {isCritical && (
                      <span className="shrink-0 px-3 py-1 rounded-lg text-sm font-bold bg-red-600 text-white mt-8">
                        {expiryStatus.diffDays <= 0
                          ? "Expires Today"
                          : `${expiryStatus.diffDays}d left`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-lg font-medium text-gray-600">
                      {p.brand?.name}
                    </p>

                    {p.last_purchase_bill_no && (
                      <span className="px-2 py-0.5 text-xl font-semibold text-indigo-800 bg-indigo-100 rounded">
                        #{p.last_purchase_bill_no}
                      </span>
                    )}
                  </div>

                  {p.batch_count > 1 && (
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                      {p.batch_count} batches
                    </span>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span className="text-3xl font-bold text-blue-700">
                    {formatPrice(p)}
                  </span>

                  <span
                    className={`px-4 py-2 rounded-full text-lg font-semibold ${
                      p.total_stock < 5
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {p.total_stock} in stock
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {showBatchModal && (
        <BatchSelectModal
          options={batchOptions}
          onSelect={(selectedBatch) => {
            addToCart(buildCartItem(activeProduct, selectedBatch));
            setShowBatchModal(false);
          }}
          onClose={() => setShowBatchModal(false)}
        />
      )}
    </div>
  );
}
