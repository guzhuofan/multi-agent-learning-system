import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store';
import HomePage from './pages/HomePage';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </div>
        </Router>
      </ErrorBoundary>
    </Provider>
  );
}

export default App
