import {Route, Routes} from "react-router-dom";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Result from "./pages/Result.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/result" element={<Result/>}/>
    </Routes>
  );
}

export default App;
