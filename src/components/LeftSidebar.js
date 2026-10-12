import React, { useEffect, useRef, useState } from "react";
import { getCategories, getBrands } from "../utils/api";

export default function LeftSidebar({
  selectedCategory,
  selectedBrand,
  setCategory,
  setBrand,
}) {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeBrand, setActiveBrand] = useState(null);
  const [processingCategory, setProcessingCategory] = useState(null);
  const [processingBrand, setProcessingBrand] = useState(null);

  // Refs block rapid clicks before React has time to re-render.
  const categoryClickLock = useRef(false);
  const brandClickLock = useRef(false);
  const categoryUnlockTimer = useRef(null);
  const brandUnlockTimer = useRef(null);

  const userDetailString = localStorage.getItem("user_detail");
  const userDetail = userDetailString ? JSON.parse(userDetailString) : null;
  const role = userDetail?.user?.role;

  const handleCategory = (id) => {
    if (categoryClickLock.current || activeCategory === id) return;

    categoryClickLock.current = true;
    setProcessingCategory(id);
    setActiveCategory(id);
    setCategory(id);

    categoryUnlockTimer.current = setTimeout(() => {
      categoryClickLock.current = false;
      setProcessingCategory(null);
    }, 500);
  };

  const handleBrand = (id) => {
    if (brandClickLock.current || activeBrand === id) return;

    brandClickLock.current = true;
    setProcessingBrand(id);
    setActiveBrand(id);
    setBrand(id);

    brandUnlockTimer.current = setTimeout(() => {
      brandClickLock.current = false;
      setProcessingBrand(null);
    }, 500);
  };

  useEffect(() => {
    setActiveCategory(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    setActiveBrand(selectedBrand);
  }, [selectedBrand]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCategories({ signal })
      .then((res) => {
        if (!signal.aborted) setCategories(res?.data?.categories || []);
      })
      .catch((err) => {
        if (
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED" ||
          signal.aborted
        ) return;
        console.error("Categories fetch error", err);
      });

    getBrands({ signal })
      .then((res) => {
        if (!signal.aborted) setBrands(res?.data?.brands || []);
      })
      .catch((err) => {
        if (
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED" ||
          signal.aborted
        ) return;
        console.error("Brands fetch error", err);
      });

    return () => {
      controller.abort();
      if (categoryUnlockTimer.current) clearTimeout(categoryUnlockTimer.current);
      if (brandUnlockTimer.current) clearTimeout(brandUnlockTimer.current);
    };
  }, []);

  return (
    <div className="pos-sidebar">
      {role !== "cashier" && (
        <div className="pos-sidebar-header">
          <a
            href="/dashboard"
            className="pos-back-button"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <span className="pos-back-icon">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </span>
            <span className="pos-back-text">Back to dashboard</span>
          </a>
        </div>
      )}

      <div className="p-8 border-b">
        <h2 className="text-4xl font-bold text-gray-800">Filters</h2>
        <p className="text-2xl text-gray-500 mt-1">Categories &amp; Brands</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div>
          <h3 className="text-3xl font-semibold text-gray-700 mb-20">
            Categories
          </h3>
          <div className="space-y-4">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                disabled={processingCategory !== null}
                aria-pressed={activeCategory === category.id}
                onClick={() => handleCategory(category.id)}
                className={`w-full text-left px-6 py-4 rounded-2xl font-bold text-2xl transition-all duration-200 disabled:opacity-70 disabled:cursor-wait
                  ${
                    activeCategory === category.id
                      ? "bg-blue-600 text-white shadow-xl transform scale-105"
                      : "bg-gray-100 hover:bg-blue-100 text-gray-700"
                  }
                `}
              >
                {processingCategory === category.id
                  ? "Applying..."
                  : category.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "35px" }}>
          <h3 className="text-3xl font-semibold text-gray-700 mb-20">
            Brands
          </h3>
          <div className="space-y-4">
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                disabled={processingBrand !== null}
                aria-pressed={activeBrand === brand.id}
                onClick={() => handleBrand(brand.id)}
                className={`w-full text-left px-6 py-4 rounded-2xl font-bold text-2xl transition-all duration-200 disabled:opacity-70 disabled:cursor-wait
                  ${
                    activeBrand === brand.id
                      ? "bg-green-600 text-white shadow-xl transform scale-105"
                      : "bg-gray-100 hover:bg-green-100 text-gray-800"
                  }
                `}
              >
                {processingBrand === brand.id ? "Applying..." : brand.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
