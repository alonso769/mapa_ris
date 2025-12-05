import React from 'react';
// CAMBIO AQUÍ: Usamos 'HashRouter' en lugar de 'BrowserRouter'
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// Importamos tus dos componentes principales
import MapaRis from './MapaRis';            // Página de Internos 2025
import Adjudicacion2026 from './Adjudicacion2026'; // Página de Adjudicación 2026

function App() {
  return (
    // El Router envuelve toda la aplicación
    <Router>
      <Routes>
        {/* RUTA 1: La página de inicio (/) carga el Mapa 2025 */}
        <Route path="/" element={<MapaRis />} />

        {/* RUTA 2: La página (/adjudicacion2026) carga el Mapa 2026 */}
        <Route path="/adjudicacion2026" element={<Adjudicacion2026 />} />
      </Routes>
    </Router>
  );
}

export default App;