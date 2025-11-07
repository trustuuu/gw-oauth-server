import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Approve from "./server_form/Approve";
import Home from "./Home";
import Login from "./server_form/Login";
import Activate from "./server_form/Activate";

function App() {
  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route exact path="/login" element={<Login />} />
        <Route exact path="/approve" element={<Approve />} />
        <Route exact path="/activate" element={<Activate />} />
      </Routes>
    </Router>
  );
}

export default App;
