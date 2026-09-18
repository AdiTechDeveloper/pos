import React, { useState } from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="bottom-page">
      <div className="body-text">
        © {new Date().getFullYear()} Vakaro. All rights reserved. | A product of{" "}
        <a
          href="https://theaditech.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          The AdiTech
        </a>{" "}
        |{" "}
        <a href="https://vakaro.in/" target="_blank" rel="noopener noreferrer">
          Visit Vakaro
        </a>
      </div>
    </div>
  );
};
export default Footer;
