import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";

const CreateEditBranch = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams(); 
  const history = useHistory();

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_branch = localStorage.getItem("branch_detail");

  const incomingBranch = store_branch && JSON.parse(store_branch);
  const isEdit = Boolean(id);

  const [initialValues, setInitialValues] = useState({
    name: "",
    address: "",
    phone: "",
    state: "",
  });

  const loadBranchData = () => {
    if (incomingBranch) {
      setInitialValues({
        name: incomingBranch.name,
        address: incomingBranch.address,
        phone: incomingBranch.phone,
        state: incomingBranch.state,
      });
    }
  };

  useEffect(() => {
    loadBranchData();
  }, []);

  const validationSchema = Yup.object({
    name: Yup.string().required("Name is required"),
    address: Yup.string().required("Address is required"),
    state: Yup.string().required("State is required"),
    phone: Yup.string().required("Phone is required"),
  });

  const handleSubmit = async (values) => {
    try {
      let url = "";
      let method = "";

      if (isEdit) {
        // UPDATE PRODUCT
        url = `${BASE_URL}/api/branches/${id}`;
        method = "put";
      } else {
        // CREATE PRODUCT
        url = `${BASE_URL}/api/branches`;
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
      toast.success(isEdit ? "Branch Updated!" : "Branch Created!");
      history.push("/branch");
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-8">{isEdit ? "Edit Branch" : "Create Branch"}</h3>

          <div className="wg-box">
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
                    <fieldset className="col-md-4">
                      <div className="body-title">Name *</div>
                      <div className="body-content mb-15">
                        <Field
                          type="text"
                          name="name"
                          placeholder="Enter branch name"
                          className="mb-5"
                        />
                        <ErrorMessage
                          name="name"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                    <fieldset className="col-md-4">
                      <div className="body-title">Address *</div>
                      <div className="body-content">
                        <Field
                          type="text"
                          name="address"
                          placeholder="Enter branch adrress"
                          className="mb-5"
                        />
                        <ErrorMessage
                          name="address"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                  </div>
                  <div className="row mb-15">
                    <fieldset className="col-md-4 mb-12">
                      <div className="body-title">State *</div>
                      <div className="body-content">
                        <Field as="select" name="state" className="mb-5">
                          <option value="">Select state</option>

                          {/* States */}
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                          <option value="Arunachal Pradesh">
                            Arunachal Pradesh
                          </option>
                          <option value="Assam">Assam</option>
                          <option value="Bihar">Bihar</option>
                          <option value="Chhattisgarh">Chhattisgarh</option>
                          <option value="Goa">Goa</option>
                          <option value="Gujarat">Gujarat</option>
                          <option value="Haryana">Haryana</option>
                          <option value="Himachal Pradesh">
                            Himachal Pradesh
                          </option>
                          <option value="Jharkhand">Jharkhand</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Kerala">Kerala</option>
                          <option value="Madhya Pradesh">Madhya Pradesh</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Manipur">Manipur</option>
                          <option value="Meghalaya">Meghalaya</option>
                          <option value="Mizoram">Mizoram</option>
                          <option value="Nagaland">Nagaland</option>
                          <option value="Odisha">Odisha</option>
                          <option value="Punjab">Punjab</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Sikkim">Sikkim</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Telangana">Telangana</option>
                          <option value="Tripura">Tripura</option>
                          <option value="Uttar Pradesh">Uttar Pradesh</option>
                          <option value="Uttarakhand">Uttarakhand</option>
                          <option value="West Bengal">West Bengal</option>

                          {/* Union Territories (optional) */}
                          <option value="Andaman and Nicobar Islands">
                            Andaman and Nicobar Islands
                          </option>
                          <option value="Chandigarh">Chandigarh</option>
                          <option value="Dadra and Nagar Haveli and Daman and Diu">
                            Dadra and Nagar Haveli and Daman and Diu
                          </option>
                          <option value="Delhi">Delhi</option>
                          <option value="Jammu and Kashmir">
                            Jammu and Kashmir
                          </option>
                          <option value="Ladakh">Ladakh</option>
                          <option value="Lakshadweep">Lakshadweep</option>
                          <option value="Puducherry">Puducherry</option>
                        </Field>

                        <ErrorMessage
                          name="state"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>

                    <fieldset className="col-md-4">
                      <div className="body-title">Phone *</div>
                      <div className="body-content">
                        <Field
                          type="text"
                          name="phone"
                          className="mb-5"
                          placeholder="Enter branch phone no."
                          maxLength={10}
                        />
                        <ErrorMessage
                          name="phone"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </fieldset>
                  </div>
                  {/* SUBMIT BUTTON */}
                  <button className="tf-button w208" type="submit">
                    {isEdit ? "Update Branch" : "Create Branch"}
                  </button>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEditBranch;
