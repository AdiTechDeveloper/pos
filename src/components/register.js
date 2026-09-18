import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Register = () => {
  const history = useHistory();
  const [userType, setUserType] = useState("");
  const [user, setUser] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = ({ target }) => {
    const name = target && target.name;
    const value = target && target.value;
    setUser({ ...user, [name]: value });
    setErrors({
      ...errors,
      [name]: "",
    });
  };
  const validate = () => {
    let temp = {};

    if (!user.name) temp.name = "Name is required";
    if (!user.address) temp.address = "Address is required";
    if (!user.state) temp.state = "State is required";
    if (!user.phone) temp.phone = "Phone is required";
    else if (user.phone.length < 10) temp.phone = "Phone must be 10 digits";

    setErrors(temp);

    return Object.keys(temp).length === 0; // true → no errors
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return; // stops submit
    }
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/api/stores`, user, {
        headers: {
          accept: "application/json",
        },
      });
      if (response) {
        toast.success("Store registered successfully!");
        history.push("/login");

        setUser({ name: "", address: "", phone: "" });
      }
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.message || "Registration failed",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className="wrap-login-page sign-up">
        <div className="flex-grow flex flex-column justify-center gap30">
          <div className="login-box">
            <h3>Create your account</h3>

            <form
              className="form-login flex flex-column gap24"
              onSubmit={handleRegister}
            >
              {/* Name */}
              <fieldset className="name">
                <div className="body-title mb-10">
                  Your name <span className="tf-color-1">*</span>
                </div>
                <input
                  className="flex-grow"
                  type="text"
                  placeholder="Enter your name"
                  name="name"
                  value={user.name}
                  onChange={handleChange}
                />
                {errors.name && <p className="error-text">{errors.name}</p>}
              </fieldset>

              {/* Address */}
              <fieldset className="address">
                <div className="body-title mb-10">
                  Address <span className="tf-color-1">*</span>
                </div>
                <input
                  className="flex-grow"
                  type="text"
                  placeholder="Enter your address"
                  name="address"
                  value={user.address}
                  onChange={handleChange}
                />
                {errors.address && (
                  <p className="error-text">{errors.address}</p>
                )}
              </fieldset>
              <fieldset className="address">
                <div className="body-title mb-10">
                  State <span className="tf-color-1">*</span>
                </div>
                <input
                  className="flex-grow"
                  type="text"
                  placeholder="Enter your state"
                  name="state"
                  value={user.state}
                  onChange={handleChange}
                />
                {errors.state && <p className="error-text">{errors.state}</p>}
              </fieldset>

              {/* Phone */}
              <fieldset className="phone">
                <div className="body-title mb-10">
                  Phone <span className="tf-color-1">*</span>
                </div>
                <input
                  className="flex-grow"
                  type="text"
                  placeholder="Enter your phone"
                  name="phone"
                  value={user.phone}
                  maxLength={10}
                  onChange={handleChange}
                />
                {errors.phone && <p className="error-text">{errors.phone}</p>}
              </fieldset>

              {/* Submit Button */}
              <button className="tf-button w-full" disabled={loading}>
                {loading ? "Registering..." : "Register"}
              </button>
            </form>

            <div className="body-text text-center">
              Already have an account?
              <Link to="/" className="body-text tf-color">
                {" "}
                Login Now{" "}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default Register;
