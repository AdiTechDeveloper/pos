import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";

const MAX_IMAGE_SIDE = 500;
const MAX_PICK_MB = 10;

// Photo browser mein hi chhoti kar do (max 500px, JPEG): category ki photo chhoti hi dikhti hai,
// to upload tez rahe aur online store fast khule. PNG ka transparent hissa safed ho jata hai.
const shrinkImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(new File([blob], "category.jpg", { type: "image/jpeg" }))
            : reject(new Error("Could not process this image")),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file is not a valid image"));
    };
    img.src = url;
  });

// Photo upload ke liye fetch: axios ka global "Content-Type: application/json" default (ya interceptor)
// FormData ko JSON bana deta hai, aur server ko file milti hi nahi. fetch par us setting ka asar nahi padta.
const uploadImageFile = async (url, file, token) => {
  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    body: fd, // Content-Type browser khud boundary ke saath lagata hai
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // empty / non-JSON jawab
  }

  if (!res.ok) {
    const firstError = data?.errors ? Object.values(data.errors).flat()[0] : null;
    throw new Error(data?.message || firstError || "Image upload failed");
  }
  return data;
};

const CreateEditCategory = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams();
  const navigate = useNavigate();

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_category = localStorage.getItem("category_detail");

  const incomingCategory = store_category && JSON.parse(store_category);
  const isEdit = Boolean(id);

  const [initialValues, setInitialValues] = useState({
    name: "",
    description: "",
    parent_id: "",
  });

  const appData = useAppData();
  const categories = appData?.categories || [];

  // Category image
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null); // naya chuna hua (chhota kiya hua) file
  const [imagePreview, setImagePreview] = useState(""); // dikhne wali photo: server ka URL ya naye file ka blob URL
  const [serverImage, setServerImage] = useState(""); // abhi server par jo photo hai
  const [removeImage, setRemoveImage] = useState(false);

  const loadCategoryData = () => {
    if (incomingCategory) {
      setInitialValues({
        name: incomingCategory.name,
        description: incomingCategory.description,
        parent_id: incomingCategory.parent_id,
      });
    }
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .required("Name is required")
      .min(3, "Name must be at least 3 characters long")
      .max(50, "Name cannot exceed 50 characters"),

    description: Yup.string()
      .required("Description is required")
      .min(10, "Description must be at least 10 characters long")
      .max(255, "Description cannot exceed 255 characters"),
  });

  useEffect(() => {
    loadCategoryData();
    appData?.loadCategories();

    // Edit mein photo server se taaza lo (localStorage wali copy purani ho sakti hai)
    if (isEdit) {
      axios
        .get(`${BASE_URL}/api/categories/${id}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        })
        .then((res) => {
          const url = res.data?.category?.image_url || "";
          setServerImage(url);
          setImagePreview(url);
        })
        .catch(() => {});
    }
  }, []);

  // Blob URL band karo, warna memory bhari rehti hai
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // wahi file dobara chunne par bhi onChange chale
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image");
      return;
    }
    if (file.size > MAX_PICK_MB * 1024 * 1024) {
      toast.error(`Image is too large (max ${MAX_PICK_MB} MB)`);
      return;
    }

    try {
      const small = await shrinkImage(file);
      setImageFile(small);
      setImagePreview(URL.createObjectURL(small));
      setRemoveImage(false);
    } catch (err) {
      toast.error(err.message || "Could not use this image");
    }
  };

  const onRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(Boolean(serverImage)); // server par photo thi to save par hatao
  };

  // Submit (Create + Update)
  const handleSubmit = async (values) => {
    try {
      let url = "";
      let method = "";

      if (isEdit) {
        url = `${BASE_URL}/api/categories/${id}`;
        method = "put";
      } else {
        url = `${BASE_URL}/api/categories`;
        method = "post";
      }

      const response = await axios({
        method,
        url,
        data: values,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      // Photo alag request se jaati hai (file JSON mein nahi bheji ja sakti). Category pehle save ho chuki hai.
      const categoryId = isEdit ? id : response.data?.category?.id;
      let imageFailed = false;
      try {
        const imgHeaders = {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        };
        if (imageFile && categoryId) {
          await uploadImageFile(
            `${BASE_URL}/api/categories/${categoryId}/image`,
            imageFile,
            user_data.token,
          );
        } else if (removeImage && isEdit) {
          await axios.delete(`${BASE_URL}/api/categories/${categoryId}/image`, {
            headers: imgHeaders,
          });
        }
      } catch (imgErr) {
        imageFailed = true;
        console.error("Error saving category image:", imgErr);
        toast.error(
          imgErr.response?.data?.message ||
            imgErr.message ||
            "Category saved, but the image could not be uploaded. Edit the category to try again.",
        );
      }

      appData?.invalidate("categories");
      await appData?.loadCategories();
      if (!imageFailed) {
        toast.success(isEdit ? "Category Updated!" : "Category Created!");
      }
      navigate("/category");
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">
            {isEdit ? "Edit Category" : "Create Category"}
          </h3>

          <div className="wg-box wg-content">
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {() => (
                <Form className="wg-form">
                  {/* Name */}
                  <div className="row mb-15">
                    <fieldset className="col-md-4 mb-15">
                      <div className="body-title">Name *</div>
                      <div className="body-content">
                        <Field
                          type="text"
                          name="name"
                          maxLength={50} 
                          placeholder="Enter category name"
                          className="mb-5"
                        />
                        <ErrorMessage
                          name="name"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                    <fieldset className="col-md-4 mb-15">
                      <div className="body-title">Parent Categories *</div>
                      <div className="body-content">
                        <Field as="select" name="parent_id" className="mb-5">
                          <option value="">Select Parent Category</option>
                          {categories.map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Field>
                      
                      </div>
                    </fieldset>
                    <fieldset className="col-md-4 mb-15">
                      <div className="body-title">Description *</div>
                      <div className="body-content">
                        <Field
                          as="textarea"
                          rows={1}
                          name="description"
                          maxLength={255} 
                          className="mb-5 form-control small-textarea"
                          placeholder="Enter description"

                        />
                        <ErrorMessage
                          name="description"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                  </div>


                  {/* Category Image */}
                  <div className="row mb-15">
                    <fieldset className="col-md-12 mb-15">
                      <div className="body-title">
                        Category Image{" "}
                        <span style={{ fontWeight: 400, color: "#64748b" }}>
                          (shown in your online store's category list)
                        </span>
                      </div>
                      <div
                        className="body-content"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            width: 96,
                            height: 96,
                            flexShrink: 0,
                            border: "2px dashed #cbd5e1",
                            borderRadius: 12,
                            overflow: "hidden",
                            display: "grid",
                            placeItems: "center",
                            background: "#f8fafc",
                          }}
                        >
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Category"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontSize: 12,
                                color: "#94a3b8",
                                textAlign: "center",
                                padding: 8,
                              }}
                            >
                              No image
                            </span>
                          )}
                        </div>

                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={onPickImage}
                            style={{ display: "none" }}
                          />
                          <button
                            type="button"
                            className="tf-button style-1"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {imagePreview ? "Change Image" : "Upload Image"}
                          </button>
                          {imagePreview && (
                            <button
                              type="button"
                              className="tf-button style-1 ml-5"
                              onClick={onRemoveImage}
                            >
                              Remove
                            </button>
                          )}
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 8,
                            }}
                          >
                            JPG, PNG or WebP. Resized to 500px automatically. A
                            square image looks best.
                          </div>
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="flex col">
                    <button className="tf-button w208" type="submit">
                      {isEdit ? "Update Category" : "Create Category"}
                    </button>
                    <button type="button" className="ml-5  tf-button style-1">
                      <a href="/category" style={{ color: "inherit", textDecoration: "none" }}
                      > Cancel</a>
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEditCategory;