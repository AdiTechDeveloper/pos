// import React, { useState } from "react";
// import { Link } from "react-router-dom";
// import { useHistory } from "react-router-dom";
// import { toast } from "react-toastify";
// import axios from "axios";
// import ForgotPasswordModal from "./ForgotPassword";

// const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// const Login = () => {
//   const history = useHistory();
//   const [formData, setFormData] = useState({
//     username: "",
//     password: "",
//   });

//   const [errors, setErrors] = useState({});
//   const [showForgotModal, setShowForgotModal] = useState(false);

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//     setErrors({ ...errors, [e.target.name]: "" });
//   };

//   // validation
//   const validate = () => {
//     let temp = {};

//     if (!formData.username) temp.username = "Username is required";
//     if (!formData.password) temp.password = "Password is required";

//     setErrors(temp);

//     return Object.keys(temp).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;

//     try {
//       const response = await axios.post(`${BASE_URL}/api/login`, formData, {
//         headers: {
//           accept: "application/json",
//         },
//       });
//       const user_detail = response.data;
//       localStorage.setItem("user_detail", JSON.stringify(user_detail));

//       if (response.data) {
//         toast.success(user_detail.message || "Login successfull!");

//         if (user_detail.must_change_credentials) {
//           history.push("/change-password");
//         } else {
//           history.push("/dashboard");
//         }
//       }
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Invalid credentials!");
//       console.error("LOGIN ERROR:", err);
//     }
//   };

//   return (
//     <div className="wrap-login-page">
//       <div className="flex-grow flex flex-column justify-center gap30">
//         <div className="login-box">
//           <h3>Login to account</h3>
//           <form
//             className="form-login flex flex-column gap24"
//             onSubmit={handleSubmit}
//           >
//             {/* Username */}
//             <fieldset className="username">
//               <div className="body-title mb-10">
//                 Username <span className="tf-color-1">*</span>
//               </div>
//               <input
//                 type="text"
//                 placeholder="Enter your username"
//                 name="username"
//                 value={formData.username}
//                 onChange={handleChange}
//               />
//               {errors.username && (
//                 <small className="text-red-600 text-xl">
//                   {errors.username}
//                 </small>
//               )}
//             </fieldset>

//             {/* Password */}
//             <fieldset className="password">
//               <div className="body-title mb-10">
//                 Password <span className="tf-color-1">*</span>
//               </div>
//               <input
//                 type="password"
//                 placeholder="Enter your password"
//                 name="password"
//                 value={formData.password}
//                 onChange={handleChange}
//               />
//               {errors.password && (
//                 <small className="text-red-600 text-xl">
//                   {errors.password}
//                 </small>
//               )}
//             </fieldset>
//             <button type="submit" className="tf-button w-full text-white">
//               Login
//             </button>
//             {/* <div className="body-text text-center">
//               Do not have account? please Login here
//               <Link to="/register" className="body-text tf-color">
//                 {" "}
//                 Register Now{" "}
//               </Link>
//             </div> */}

//             <div className="body-text text-center">
//               Please Cashier Login here
//               <Link to="/cashier_login" className="body-text tf-color">
//                 {" "}
//                 Cashier Login
//               </Link>
//             </div>
//           </form>

//           <div className="body-text text-center mt-3">
//             Forgot Password?{" "}
//             <a
//               href="#forgot-password"
//               className="body-text tf-color fw-semibold"
//               onClick={(e) => {
//                 e.preventDefault();
//                 setShowForgotModal(true);
//               }}
//               style={{ cursor: "pointer" }}
//             >
//               Reset here
//             </a>
//           </div>

//           {showForgotModal && (
//             <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };
// export default Login;



import React, { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import ForgotPasswordModal from "./ForgotPassword";
import "../assets/css/login.css";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

/*
  Put your images inside:
  public/images/

  Then use these paths.
*/
const POS_LOGIN_IMAGE = "../../assets/images/avatar/pos.png";
const VAKARO_LOGO = "../../assets/images/avatar/logo.png";

const Login = () => {
  const history = useHistory();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setErrors({
      ...errors,
      [e.target.name]: "",
    });
  };

  const validate = () => {
    const temp = {};

    if (!formData.username) {
      temp.username = "Username is required";
    }

    if (!formData.password) {
      temp.password = "Password is required";
    }

    setErrors(temp);

    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const response = await axios.post(
        `${BASE_URL}/api/login`,
        formData,
        {
          headers: {
            accept: "application/json",
          },
        },
      );

      const user_detail = response.data;

      localStorage.setItem(
        "user_detail",
        JSON.stringify(user_detail),
      );

      if (response.data) {
        toast.success(
          user_detail.message || "Login successful!",
        );

        if (user_detail.must_change_credentials) {
          history.push("/change-password");
        } else {
          history.push("/dashboard");
        }
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Invalid credentials!",
      );

      console.error("LOGIN ERROR:", err);
    }
  };

  return (
    <main className="vakaro-login-page">
      {/* LEFT SIDE IMAGE PANEL */}
      <section className="vakaro-login-visual">
        <div className="vakaro-visual-content">
          {/* <div className="vakaro-visual-brand">
            <img src={VAKARO_LOGO} alt="Vakaro" />
          </div> */}

          <div className="vakaro-eyebrow">
            Your business
          </div>

          {/* <h1>
            At a <span>Glance.</span>
          </h1> */}

          <p className="vakaro-visual-description">
            See sales, stock, payments, customers and business
            performance from one connected POS dashboard.
          </p>


          <div className="vakaro-image-frame">
            <img
              className="vakaro-login-image"
              src={POS_LOGIN_IMAGE}
              alt="Vakaro POS dashboard"
            />
          </div>

        </div>

        <div className="vakaro-visual-footer">
          <span className="vakaro-status-dot" />
          Know what&apos;s happening.
          <strong>Act with confidence.</strong>
        </div>
      </section>

      {/* RIGHT SIDE LOGIN FORM */}
      <section className="vakaro-login-form-side">
        <div className="vakaro-login-card">
          <img
            className="vakaro-form-logo"
            src={VAKARO_LOGO}
            alt="Vakaro"
          />

          <p className="vakaro-form-eyebrow">
            Welcome to Vakaro
          </p>

          <h2>Login to your account</h2>

          <p className="vakaro-form-subtitle">
            Enter your details to continue to the store dashboard.
          </p>

          <form
            className="vakaro-form-login"
            onSubmit={handleSubmit}
          >
            <fieldset className="vakaro-field">
              <label htmlFor="username">
                Username{" "}
                <span className="vakaro-required">*</span>
              </label>

              <input
                id="username"
                className="vakaro-input"
                type="text"
                placeholder="Enter your username"
                name="username"
                value={formData.username}
                onChange={handleChange}
              />

              {errors.username && (
                <small className="vakaro-error">
                  {errors.username}
                </small>
              )}
            </fieldset>

            <fieldset className="vakaro-field">
              <label htmlFor="password">
                Password{" "}
                <span className="vakaro-required">*</span>
              </label>

              <input
                id="password"
                className="vakaro-input"
                type="password"
                placeholder="Enter your password"
                name="password"
                value={formData.password}
                onChange={handleChange}
              />

              {errors.password && (
                <small className="vakaro-error">
                  {errors.password}
                </small>
              )}
            </fieldset>

            <button
              type="submit"
              className="vakaro-submit"
            >
              Login to POS{" "}
              <span aria-hidden="true">→</span>
            </button>

            <p className="vakaro-cashier-text">
              Please Cashier Login here{" "}
              <Link
                to="/cashier_login"
                className="vakaro-cashier-link"
              >
                Cashier Login
              </Link>
            </p>
          </form>

          <p className="vakaro-forgot-text">
            Forgot Password?{" "}
            <a
              href="#forgot-password"
              className="vakaro-forgot-link"
              onClick={(e) => {
                e.preventDefault();
                setShowForgotModal(true);
              }}
            >
              Reset here
            </a>
          </p>

          <div className="vakaro-secure-note">
            <span aria-hidden="true">▣</span>
            Protected store access
          </div>

          {showForgotModal && (
            <ForgotPasswordModal
              onClose={() => setShowForgotModal(false)}
            />
          )}
        </div>
      </section>
    </main>
  );
};

export default Login;