import Navbar from "./navbar";
import Header from "./header";
import Footer from "./footer";
import useStockExpiryAlerts from "../hooks/useStockExpiryAlerts";

const Layout = ({ children }) => {
  const { total } = useStockExpiryAlerts();

  return (
    <>
      <div className="layout-wrap">
        <Navbar />
        <div className="section-content-right">
          <Header alertTotal={total} />
          <div className="main-content">
            {children}
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};
export default Layout;
