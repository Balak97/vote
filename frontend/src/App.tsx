import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import VotePage from "./pages/VotePage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/results/:electionId" element={<ResultsPage />} />
      </Routes>
    </Layout>
  );
}
