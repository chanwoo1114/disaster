import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Map from "./pages/Map.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/map" element={<Map />} />
    </Routes>
  );
}

export default App;
