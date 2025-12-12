// App.tsx
import React from 'react';
import { Routes, Route, HashRouter } from 'react-router-dom';
// Nota: La importación de MapaRis ya no es necesaria si eliminas su ruta.
import Adjudicacion2026 from './Adjudicacion2026'; 
// import MapaRis from './MapaRis'; // Se puede eliminar si no se usa.

function App() {
  return (
    <HashRouter> 
      <Routes>
        {/*
           Ruta Única: Ahora la ruta principal (/) carga Adjudicacion2026.
        */}
        <Route path="/" element={<Adjudicacion2026 />} /> 

        {/* Rutas Eliminadas/Comentadas para asegurar que solo exista Adjudicacion2026:
        <Route path="/maparis" element={<MapaRis />} /> 
        */}
        
      </Routes>
    </HashRouter>
  );
}

export default App;