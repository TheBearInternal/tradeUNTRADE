import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PoliticiansPage from './pages/PoliticiansPage';
import PoliticianDetailPage from './pages/PoliticianDetailPage';
import StocksPage from './pages/StocksPage';
import AnalyticsPage from './pages/AnalyticsPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/politicians" element={<PoliticiansPage />} />
              <Route path="/politicians/:id" element={<PoliticianDetailPage />} />
              <Route path="/stocks" element={<StocksPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              {/* Add more routes as needed */}
              <Route path="*" element={
                <div className="text-center py-12">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    404 - Page Not Found
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    The page you're looking for doesn't exist.
                  </p>
                </div>
              } />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;