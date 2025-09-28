import {Routes, Route, useLocation} from "react-router-dom";
import Home from "./pages/Home.jsx";
import Map from "./pages/Map.jsx";
import {useEffect, useState} from "react";
import ModalMap from "./components/ModalMap.jsx";

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/map") setModalOpen(true);
    else setModalOpen(false);
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map modalOpen={modalOpen} />} />
      </Routes>
      {location.pathname === "/map" && modalOpen && (
        <ModalMap onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}
export default App
