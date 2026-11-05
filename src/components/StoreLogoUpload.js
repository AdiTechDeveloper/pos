
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API = process.env.REACT_APP_API_BASE_URL || "";
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const srcOf = (path) => {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${API}${path}`;
};

const errorText = (err, fallback) => {
  const errors = err?.response?.data?.errors;

  if (errors) {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }

  return err?.response?.data?.message || fallback;
};

export default function StoreLogoUpload({ storeName }) {
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  const inputRef = useRef(null);
  const previewRef = useRef("");

  useEffect(() => {
    fetchLogo();

    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  const fetchLogo = async () => {
    try {
      const res = await axios.get("/api/online/logo");
      setLogo(res.data?.data?.logo || null);
    } catch (err) {
      console.error("Logo fetch failed:", err);
    }
  };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!TYPES.includes(file.type)) {
      toast.error("Please use a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error("The logo must be 2 MB or smaller.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    previewRef.current = localPreview;

    setPreview(localPreview);
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await axios.post(
        "/api/online/logo",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
        }
      );

      setLogo(res.data?.data?.logo || null);

      toast.success("Logo uploaded successfully.");
    } catch (err) {
      toast.error(errorText(err, "Could not upload the logo."));
    } finally {
      setBusy(false);
      setPreview("");

      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = "";
      }
    }
  };

  const onRemove = async () => {
    const confirmed = window.confirm(
      "Remove the store logo?"
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      await axios.delete("/api/online/logo");

      setLogo(null);

      toast.success("Logo removed successfully.");
    } catch (err) {
      toast.error(errorText(err, "Could not remove the logo."));
    } finally {
      setBusy(false);
    }
  };

  const shown = preview || srcOf(logo);

  const letter =
    (storeName || "S").trim().charAt(0).toUpperCase() || "S";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          background: "#f8fafc",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          flexShrink: 0,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {shown ? (
          <img
            src={shown}
            alt="Store logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: 6,
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#94a3b8",
            }}
          >
            {letter}
          </span>
        )}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="ovx-label" style={{ margin: 0 }}>
          Store logo
        </p>

        <p
          style={{
            margin: "4px 0 10px",
            fontSize: 12,
            color: "#64748b",
            lineHeight: 1.4,
          }}
        >
          Square image (JPG, PNG or WebP), at least 100 x 100
          px, up to 2 MB. Without a logo, the first letter of
          your store name will be displayed.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPick}
            style={{ display: "none" }}
          />

          <button
            type="button"
            className="ovx-btn ovx-btn-primary ovx-btn-sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy
              ? "Please wait..."
              : logo
                ? "Change logo"
                : "Upload logo"}
          </button>

          {logo && (
            <button
              type="button"
              className="ovx-btn ovx-btn-del ovx-btn-sm"
              disabled={busy}
              onClick={onRemove}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
