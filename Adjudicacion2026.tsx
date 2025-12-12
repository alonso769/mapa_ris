import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

// --- IMPORTAR FIREBASE ---
import { db } from './firebaseConfig'; 
import { collection, getDocs, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';

// ==========================================
// 0. ESTILOS CSS (TEMA CORPORATIVO)
// ==========================================
const styleInjection = `
  body { margin: 0; background-color: #f8fafc; color: #334155; font-family: 'Segoe UI', Roboto, sans-serif; }
  
  /* SCROLLBAR */
  .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #195c97; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #0c4a6e; }
  
  /* MAPA TOOLTIP */
  .leaflet-tooltip.label-mapa {
    background-color: #195c97 !important;
    border: 2px solid #329584 !important;
    color: #ffffff !important;
    font-weight: 700 !important;
    font-size: 11px !important;
    border-radius: 6px !important;
    padding: 3px 8px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
  }
  .leaflet-tooltip-bottom:before { border-bottom-color: #195c97 !important; }
  
  /* ANIMACIONES */
  .fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* GRÁFICOS */
  .chart-row { display: flex; align-items: center; margin-bottom: 12px; }
  .chart-label-container { width: 240px; text-align: right; padding-right: 15px; display: flex; align-items: center; justify-content: flex-end; }
  .chart-label { font-size: 11px; color: #475569; font-weight: 600; line-height: 1.2; white-space: normal; }
  .chart-track { flex: 1; background: #e2e8f0; height: 16px; border-radius: 4px; overflow: hidden; position: relative; border: 1px solid #cbd5e1; }
  .chart-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 5px; }
  .chart-value-label { font-size: 10px; font-weight: 800; color: white; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }
  .chart-total { width: 45px; padding-left: 10px; font-weight: 800; color: #1e293b; font-size: 12px; }

  /* MODAL */
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(15, 23, 42, 0.7); display: flex; justify-content: center; align-items: center; z-index: 10000; backdrop-filter: blur(5px); }
  .modal-content { background: #ffffff; padding: 0; border-radius: 16px; width: 95%; max-width: 1200px; height: 90vh; border: 1px solid #e2e8f0; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); display: flex; flexDirection: column; overflow: hidden; }
  .modal-header { padding: 15px 25px; background: #195c97; border-bottom: 1px solid #0c4a6e; display: flex; justify-content: space-between; align-items: center; color: white; }
  .modal-body { padding: 25px; overflow-y: auto; flex: 1; background: #f8fafc; }
  .modal-footer { padding: 15px 25px; background: #f1f5f9; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
  
  /* GESTIÓN MANUAL */
  .edit-card-container { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 15px; margin-bottom: 15px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .edit-card-container:hover { border-color: #195c97; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
  
  .uni-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 15px; }
  .uni-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
  .uni-item.active { border-color: #329584; background: #ecfdf5; }
  
  /* INPUTS */
  .input-plaza { background: #ffffff; border: 1px solid #94a3b8; color: #1e293b; padding: 5px; border-radius: 4px; width: 50px; text-align: center; font-weight: bold; font-size: 12px; }
  .input-plaza:focus { outline: none; border-color: #329584; box-shadow: 0 0 0 2px rgba(50, 149, 132, 0.2); }
  .input-total { background: #ffffff; border: 2px solid #195c97; color: #195c97; font-size: 14px; width: 80px; padding: 5px; text-align: center; font-weight: 800; border-radius: 6px; }

  /* TIEMPOS */
  .time-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
  .time-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .time-field { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; background: #f1f5f9; padding: 5px 8px; border-radius: 6px; }
  .input-meses-card { background: #ffffff; border: 1px solid #cbd5e1; color: #d97706; padding: 4px; border-radius: 4px; width: 70px; text-align: center; font-weight: 700; font-size: 11px; }
  
  /* KPI CARDS */
  .kpi-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; flex: 1; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .kpi-title { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
  .kpi-value { font-size: 22px; font-weight: 800; color: #195c97; }
  .kpi-sub { font-size: 10px; color: #94a3b8; }
  
  .career-select { background-color: #ffffff; color: #195c97; font-weight: 700; border: 2px solid #195c97; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
  .map-select { background-color: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px; border-radius: 6px; font-size: 12px; cursor: pointer; }

  /* BOTONES */
  .btn-modern { border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .btn-modern:hover { transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,0,0,0.15); }
  .btn-close { background: #94a3b8; color: white; }
  .btn-save { background: #329584; color: white; }
  .btn-edit { background: #195c97; color: white; }
  .close-modal-btn { background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; opacity: 0.8; }
  .close-modal-btn:hover { opacity: 1; }
  
  /* FOOTER */
  .source-footer { position: fixed; bottom: 10px; right: 10px; font-size: 10px; color: rgba(255,255,255,0.5); z-index: 9999; pointer-events: none; }
`;

// ==========================================
// 1. LISTAS OFICIALES
// ==========================================
const CARRERAS_PARA_CARGA = [
    { id: "TODAS", label: "📊 TODAS LAS CARRERAS" },
    { id: "MEDICINA", label: "MEDICINA HUMANA" },
    { id: "ENFERMERIA", label: "ENFERMERÍA" },
    { id: "OBSTETRICIA", label: "OBSTETRICIA" },
    { id: "ODONTOLOGIA", label: "ODONTOLOGÍA" },
    { id: "FARMACIA", label: "FARMACIA Y BIOQUÍMICA" },
    { id: "NUTRICION", label: "NUTRICIÓN" },
    { id: "PSICOLOGIA", label: "PSICOLOGÍA" },
    { id: "TRABAJO_SOCIAL", label: "TRABAJO SOCIAL" },
    { id: "BIOLOGIA", label: "BIOLOGÍA" },
    { id: "TM_LABORATORIO", label: "TM: LABORATORIO CLÍNICO" },
    { id: "TM_TERAPIA_FISICA", label: "TM: TERAPIA FÍSICA" },
    { id: "TM_RADIOLOGIA", label: "TM: RADIOLOGÍA" },
    { id: "TM_TERAPIA_OCUPACIONAL", label: "TM: TERAPIA OCUPACIONAL" },
    { id: "TM_TERAPIA_LENGUAJE", label: "TM: TERAPIA DE LENGUAJE" },
    { id: "TM_OPTOMETRIA", label: "TM: OPTOMETRÍA" }
];

const UNIVERSIDADES = [
    "UNIVERSIDAD NACIONAL MAYOR DE SAN MARCOS", "UNIVERSIDAD NACIONAL FEDERICO VILLARREAL",
    "UNIVERSIDAD ENRIQUE GUZMAN Y VALLE", "UNIVERSIDAD PERUANA CAYETANO HEREDIA",
    "UNIVERSIDAD SAN MARTIN DE PORRES", "UNIVERSIDAD PERUANA UNION",
    "UNIVERSIDAD FEMENINA DEL SAGRADO CORAZON", "UNIVERSIDAD CÉSAR VALLEJO",
    "UNIVERSIDAD PERUANA DE CIENCIAS APLICADAS", "UNIVERSIDAD PRIVADA DEL NORTE",
    "UNIVERSIDAD PRIVADA NORBERT WIENER", "UNIVERSIDAD SAN JUAN BAUTISTA",
    "UNIVERSIDAD TECNOLÓGICA DEL PERÚ", "UNIVERSIDAD CIENTIFICA DEL SUR",
    "UNIVERSIDAD RICARDO PALMA", "UNIVERSIDAD CATOLICA SEDES SAPIENTIAE",
    "UNIVERSIDAD CONTINENTAL", "UNIVERSIDAD CIENCIAS Y HUMANIDADES",
    "UNIVERSIDAD MARIA AUXILIADORA", "UNIVERSIDAD LE CORDON BLEU",
    "UNIVERSIDAD DE PIURA", "UNIVERSIDAD NACIONAL DANIEL ALCIDES CARRION",
    "UNIVERSIDAD NACIONAL HERMILIO VALDIZAN", "UNIVERSIDAD NACIONAL DE TRUJILLO",
    "UNIVERSIDAD NACIONAL DEL ALTIPLANO DE PUNO", "UNIVERSIDAD FRANKLIN ROOSEVELT",
    "UNIVERSIDAD SAN IGNACIO DE LOYOLA", "UNIVERSIDAD JOSÉ FAUSTINO SÁNCHEZ CARRIÓN",
    "UNIVERSIDAD DE LIMA"
];

const RIS_COLORS: Record<string, string> = {
    'RIS 1': '#329584', 'RIS 2': '#f59e0b', 'RIS 3': '#f97316', 
    'RIS 4': '#3b82f6', 'RIS 5': '#ef4444', 'RIS 6': '#8b5cf6', 
    'RIS 7': '#ec4899', 'SIN RIS': '#94a3b8', 
    'HOSPITAL': '#195c97', 'INSTITUTO': '#6366f1', 'DEFAULT': '#64748b'
};

const DISTRICT_TO_RIS: Record<string, string> = {
    'LIMA': 'RIS 1', 'CERCADO DE LIMA': 'RIS 1', 'BRENA': 'RIS 2', 'BREÑA': 'RIS 2', 'JESUS MARIA': 'RIS 2', 
    'PUEBLO LIBRE': 'RIS 2', 'MAGDALENA DEL MAR': 'RIS 3', 'SAN MIGUEL': 'RIS 3', 'LINCE': 'RIS 4', 
    'SAN ISIDRO': 'RIS 4', 'MIRAFLORES': 'RIS 4', 'SAN BORJA': 'RIS 4', 'SURQUILLO': 'RIS 4', 
    'LA VICTORIA': 'RIS 5', 'SAN LUIS': 'RIS 5', 'EL AGUSTINO': 'RIS 5', 'SANTA ANITA': 'RIS 5',
    'SAN JUAN DE LURIGANCHO': 'RIS 6', 'RIMAC': 'RIS 7', 'INDEPENDENCIA': 'RIS 7', 'COMAS': 'RIS 7'
};

const MAP_TYPES = {
    claro: { url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", name: "☀️ Claro" },
    oscuro: { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", name: "🌑 Oscuro" },
    satelite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", name: "🛰️ Satélite" }
};

const LISTA_DISTRITOS = Object.keys(DISTRICT_TO_RIS).sort();

const getColorByRis = (ris: string, nombre: string = '') => {
    const n = nombre.toUpperCase();
    if (n.startsWith('HOSPITAL')) return RIS_COLORS['HOSPITAL'];
    if (n.startsWith('INSTITUTO')) return RIS_COLORS['INSTITUTO'];
    const key = Object.keys(RIS_COLORS).find(k => (ris || '').toUpperCase().includes(k));
    return key ? RIS_COLORS[key] : RIS_COLORS['DEFAULT'];
};

const normalizarTexto = (texto: string) => {
  if (!texto) return "";
  return String(texto).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 ]/g, "").trim();
};

// --- DATOS BASE (TU LISTA COMPLETA DE 97 CENTROS) ---

const dataCentrosBase = [
  { id: 'r1_1', ris: 'RIS 1', nombre: 'CS CONDE DE LA VEGA', lat: -12.038921, lng: -77.050464, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_2', ris: 'RIS 1', nombre: 'CS CONTROL DE ZOONOSIS', lat: -12.049798, lng: -77.062240, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_3', ris: 'RIS 1', nombre: 'CS ITS Y VIH RAUL PATRUCCO PUIG', lat: -12.052736, lng: -77.022955, distrito: 'LA VICTORIA' },
  { id: 'r1_4', ris: 'RIS 1', nombre: 'CS JUAN PEREZ CARRANZA', lat: -12.053413, lng: -77.022688, distrito: 'LA VICTORIA' },
  { id: 'r1_5', ris: 'RIS 1', nombre: 'CS MIRONES', lat: -12.050879, lng: -77.067292, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_6', ris: 'RIS 1', nombre: 'CS MIRONES BAJO', lat: -12.050897, lng: -77.067321, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_7', ris: 'RIS 1', nombre: 'CS SAN SEBASTIAN', lat: -12.042331, lng: -77.038673, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_8', ris: 'RIS 1', nombre: 'CS UNIDAD VECINAL N°3', lat: -12.051273, lng: -77.082330, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_9', ris: 'RIS 1', nombre: 'CS VILLA MARIA DEL PERPETUO SOCORRO', lat: -12.037751, lng: -77.054586, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_10', ris: 'RIS 1', nombre: 'CSMC KUYANAKUSUN', lat: -12.037769, lng: -77.081481, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_11', ris: 'RIS 1', nombre: 'CSMC MIRONES BAJO', lat: -12.037769, lng: -77.081481, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_12', ris: 'RIS 1', nombre: 'CSMC SAN MARCOS', lat: -12.055392, lng: -77.082387, distrito: 'PUEBLO LIBRE' },
  { id: 'r1_13', ris: 'RIS 1', nombre: 'PS PALERMO', lat: -12.040929, lng: -77.068914, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_14', ris: 'RIS 1', nombre: 'PS RESCATE', lat: -12.041065, lng: -77.062272, distrito: 'CERCADO DE LIMA' },
  { id: 'r1_15', ris: 'RIS 1', nombre: 'PS SANTA ROSA', lat: -12.044848, lng: -77.111266, distrito: 'CALLAO' },
  // RIS 2
  { id: 'r2_1', ris: 'RIS 2', nombre: 'CS BREÑA', lat: -12.063762, lng: -77.057869, distrito: 'BREÑA' },
  { id: 'r2_2', ris: 'RIS 2', nombre: 'CS CHACRA COLORADA', lat: -12.053863, lng: -77.048067, distrito: 'BREÑA' },
  { id: 'r2_3', ris: 'RIS 2', nombre: 'CS HUACA PANDO', lat: -12.061594, lng: -77.083254, distrito: 'PUEBLO LIBRE' },
  { id: 'r2_4', ris: 'RIS 2', nombre: 'CS JESUS MARIA', lat: -12.077688, lng: -77.053306, distrito: 'JESUS MARIA' },
  { id: 'r2_5', ris: 'RIS 2', nombre: 'CS SAN MIGUEL', lat: -12.081167, lng: -77.098530, distrito: 'SAN MIGUEL' },
  { id: 'r2_6', ris: 'RIS 2', nombre: 'CSM EXCELENCIA SAN MIGUEL', lat: -12.081396, lng: -77.101266, distrito: 'SAN MIGUEL' },
  { id: 'r2_7', ris: 'RIS 2', nombre: 'CSMC HONORIO DELGADO', lat: -12.069174, lng: -77.058068, distrito: 'BREÑA' },
  { id: 'r2_8', ris: 'RIS 2', nombre: 'CSMC JESUS MARIA', lat: -12.074060, lng: -77.043524, distrito: 'JESUS MARIA' },
  { id: 'r2_9', ris: 'RIS 2', nombre: 'CSMC MAGDALENA', lat: -12.088394, lng: -77.063122, distrito: 'MAGDALENA DEL MAR' },
  { id: 'r2_10', ris: 'RIS 2', nombre: 'CSMI MAGDALENA', lat: -12.088383, lng: -77.068760, distrito: 'MAGDALENA DEL MAR' },
  { id: 'r2_11', ris: 'RIS 2', nombre: 'LABORATORIO REFERENCIAL', lat: -12.088656, lng: -77.067946, distrito: 'MAGDALENA DEL MAR' },
  // RIS 3
  { id: 'r3_1', ris: 'RIS 3', nombre: 'CS LINCE', lat: -12.081669, lng: -77.031994, distrito: 'LINCE' },
  { id: 'r3_2', ris: 'RIS 3', nombre: 'CS SAM ATANACIO DE PEDREGAL', lat: -12.120900, lng: -76.998887, distrito: 'SURQUILLO' },
  { id: 'r3_3', ris: 'RIS 3', nombre: 'CS SAN ISIDRO', lat: -12.106575, lng: -77.055120, distrito: 'SAN ISIDRO' },
  { id: 'r3_4', ris: 'RIS 3', nombre: 'CS SANTA CRUZ MIRAFLORES', lat: -12.118628, lng: -77.036754, distrito: 'MIRAFLORES' },
  { id: 'r3_5', ris: 'RIS 3', nombre: 'CS VILLA VICTORIA PORVENIR', lat: -12.108570, lng: -77.012094, distrito: 'SURQUILLO' },
  { id: 'r3_6', ris: 'RIS 3', nombre: 'CSMC SAN BORJA', lat: -12.108779, lng: -77.006470, distrito: 'SAN BORJA' },
  { id: 'r3_7', ris: 'RIS 3', nombre: 'CSMC SAN ISIDRO', lat: -12.107595, lng: -77.050509, distrito: 'SAN ISIDRO' },
  { id: 'r3_8', ris: 'RIS 3', nombre: 'CSMC SURQUILLO', lat: -12.118613, lng: -77.019213, distrito: 'SURQUILLO' },
  { id: 'r3_9', ris: 'RIS 3', nombre: 'CSMI SURQUILLO', lat: -12.118262, lng: -77.022244, distrito: 'SURQUILLO' },
  // RIS 4
  { id: 'r4_1', ris: 'RIS 4', nombre: 'CS EL PINO', lat: -12.066881, lng: -76.998619, distrito: 'EL AGUSTINO' },
  { id: 'r4_2', ris: 'RIS 4', nombre: 'CS MAX ARIAS SCHREIBER', lat: -12.059194, lng: -77.032271, distrito: 'LA VICTORIA' },
  { id: 'r4_3', ris: 'RIS 4', nombre: 'CS SAN COSME', lat: -12.061765, lng: -77.006846, distrito: 'LA VICTORIA' },
  { id: 'r4_4', ris: 'RIS 4', nombre: 'CS SAN LUIS', lat: -12.074450, lng: -76.997255, distrito: 'SAN LUIS' },
  { id: 'r4_5', ris: 'RIS 4', nombre: 'CS TODOS LOS SANTOS SAN BORJA', lat: -12.101842, lng: -76.993428, distrito: 'SAN BORJA' },
  { id: 'r4_6', ris: 'RIS 4', nombre: 'CSMC LA VICTORIA', lat: -12.071107, lng: -77.013469, distrito: 'LA VICTORIA' },
  { id: 'r4_7', ris: 'RIS 4', nombre: 'CSMC SAN COSME', lat: -12.061978, lng: -77.005306, distrito: 'LA VICTORIA' },
  { id: 'r4_8', ris: 'RIS 4', nombre: 'CSMI EL PORVENIR', lat: -12.067469, lng: -77.020826, distrito: 'LA VICTORIA' },
  { id: 'r4_9', ris: 'RIS 4', nombre: 'PS EL PINO', lat: -12.065860, lng: -77.002467, distrito: 'EL AGUSTINO' },
  { id: 'r4_10', ris: 'RIS 4', nombre: 'PS JARDÍN ROSA DE SANTA MARÍA', lat: -12.044257, lng: -77.014430, distrito: 'EL AGUSTINO' },
  { id: 'r4_11', ris: 'RIS 4', nombre: 'PS SAN JUAN MASIAS', lat: -12.084071, lng: -77.002460, distrito: 'SAN LUIS' },
  // RIS 5
  { id: 'r5_1', ris: 'RIS 5', nombre: 'CS CAJA DE AGUA', lat: -12.026599, lng: -77.014879, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_2', ris: 'RIS 5', nombre: 'CS CAMPOY', lat: -12.016004, lng: -76.965389, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_3', ris: 'RIS 5', nombre: 'CS CHACARILLA DE OTERO', lat: -12.020881, lng: -77.006867, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_4', ris: 'RIS 5', nombre: 'CS DANIEL ALCIDES CARRION', lat: -12.023003, lng: -76.977023, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_5', ris: 'RIS 5', nombre: 'CS LA HUAYRONA', lat: -11.993822, lng: -77.006580, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_6', ris: 'RIS 5', nombre: 'CS LA LIBERTAD', lat: -12.003994, lng: -76.995829, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_7', ris: 'RIS 5', nombre: 'CS MANGOMARCA', lat: -12.010634, lng: -76.979585, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_8', ris: 'RIS 5', nombre: 'CS SAN FERNANDO', lat: -12.002300, lng: -77.010607, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_9', ris: 'RIS 5', nombre: 'CS SANTA FE DE TOTORITA', lat: -11.996876, lng: -76.996041, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_10', ris: 'RIS 5', nombre: 'CS SANTA ROSA DE LIMA', lat: -12.005101, lng: -77.016472, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_11', ris: 'RIS 5', nombre: 'CS ZARATE', lat: -12.022964, lng: -76.994557, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_12', ris: 'RIS 5', nombre: 'CSMC JAVIER MARIATEGUI', lat: -12.017147, lng: -77.000884, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_13', ris: 'RIS 5', nombre: 'CSMC MANGOMARCA', lat: -12.019114, lng: -76.984995, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_14', ris: 'RIS 5', nombre: 'CSMC VILLA CAMPOY', lat: -12.007232, lng: -76.965202, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_15', ris: 'RIS 5', nombre: 'PS 15 DE ENERO', lat: -12.010915, lng: -77.018590, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r5_16', ris: 'RIS 5', nombre: 'PS AZCARRUNZ ALTO', lat: -12.017052, lng: -77.000957, distrito: 'SAN JUAN DE LURIGANCHO' },
  // RIS 6
  { id: 'r6_1', ris: 'RIS 6', nombre: 'CS BAYOVAR', lat: -11.951986, lng: -76.991581, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_2', ris: 'RIS 6', nombre: 'CS GANIMENDES', lat: -11.983037, lng: -77.011447, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_3', ris: 'RIS 6', nombre: 'CS HUASCAR II', lat: -11.966623, lng: -77.010997, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_4', ris: 'RIS 6', nombre: 'CS HUASCAR XV', lat: -11.955447, lng: -77.002372, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_5', ris: 'RIS 6', nombre: 'CS MEDALLA MILAGROSA', lat: -11.976887, lng: -77.006001, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_6', ris: 'RIS 6', nombre: 'CS SAN HILARION', lat: -11.995438, lng: -77.015830, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_7', ris: 'RIS 6', nombre: 'CSMC JAIME ZUBIETA', lat: -11.962834, lng: -76.988730, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_8', ris: 'RIS 6', nombre: 'CSMC NUEVO PERÚ', lat: -12.002900, lng: -77.018166, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_9', ris: 'RIS 6', nombre: 'PS AYACUCHO', lat: -11.987161, lng: -77.017107, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_10', ris: 'RIS 6', nombre: 'PS PROYECTOS ESPECIALES', lat: -11.955769, lng: -76.992456, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r6_11', ris: 'RIS 6', nombre: 'PS SAGRADA FAMILIA', lat: -11.976341, lng: -76.988859, distrito: 'SAN JUAN DE LURIGANCHO' },
  // RIS 7
  { id: 'r7_1', ris: 'RIS 7', nombre: 'CS 10 DE OCTUBRE', lat: -11.944904, lng: -76.987643, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_2', ris: 'RIS 7', nombre: 'CS CRUZ DE MOTUPE', lat: -11.940364, lng: -76.974795, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_3', ris: 'RIS 7', nombre: 'CS ENRIQUE MONTENEGRO', lat: -11.937029, lng: -76.971134, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_4', ris: 'RIS 7', nombre: 'CS JAIME ZUBIETA', lat: -11.963164, lng: -76.988935, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_5', ris: 'RIS 7', nombre: 'CS JOSE CARLOS MARIATEGUI', lat: -11.943840, lng: -76.984472, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_6', ris: 'RIS 7', nombre: 'CS JUAN PABLO II', lat: -11.952272, lng: -77.077927, distrito: 'SAN MARTIN DE PORRES' }, 
  { id: 'r7_7', ris: 'RIS 7', nombre: 'CS SANTA MARIA', lat: -11.964929, lng: -76.975984, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_8', ris: 'RIS 7', nombre: 'PS CESAR VALLEJO', lat: -11.939452, lng: -76.965759, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_9', ris: 'RIS 7', nombre: 'PS JOSE CARLOS MARIATEGUI V ETAPA', lat: -11.931092, lng: -76.990411, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_10', ris: 'RIS 7', nombre: 'PS MARISCAL CACERES', lat: -11.949206, lng: -76.981080, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_11', ris: 'RIS 7', nombre: 'PS TUPAC AMARU II', lat: -11.955745, lng: -76.975792, distrito: 'SAN JUAN DE LURIGANCHO' },
  
  { id: 'h_1', ris: 'SIN RIS', nombre: 'HOSPITAL NACIONAL DOS DE MAYO', lat: -12.056369, lng: -77.016048, distrito: 'CERCADO DE LIMA', tipo: 'HOSPITAL' },
  { id: 'h_2', ris: 'SIN RIS', nombre: 'HOSPITAL NACIONAL ARZOBISPO LOAYZA', lat: -12.049516, lng: -77.042667, distrito: 'CERCADO DE LIMA', tipo: 'HOSPITAL' },
  { id: 'h_3', ris: 'SIN RIS', nombre: 'HOSPITAL SAN JUAN DE LURIGANCHO', lat: -11.966064, lng: -77.003482, distrito: 'SAN JUAN DE LURIGANCHO', tipo: 'HOSPITAL' },
  { id: 'h_4', ris: 'SIN RIS', nombre: 'HOSPITAL NACIONAL SAN BARTOLOME', lat: -12.049583, lng: -77.042110, distrito: 'CERCADO DE LIMA', tipo: 'HOSPITAL' },
  { id: 'h_5', ris: 'SIN RIS', nombre: 'HOSPITAL DE EMERGENCIAS JOSE CASIMIRO ULLOA', lat: -12.127835, lng: -77.017796, distrito: 'MIRAFLORES', tipo: 'HOSPITAL' },
  { id: 'h_6', ris: 'SIN RIS', nombre: 'HOSPITAL SANTA ROSA', lat: -12.071516, lng: -77.061070, distrito: 'PUEBLO LIBRE', tipo: 'HOSPITAL' },
  { id: 'h_7', ris: 'SIN RIS', nombre: 'HOSPITAL VICTOR LARCO HERRERA', lat: -12.097315, lng: -77.064832, distrito: 'MAGDALENA DEL MAR', tipo: 'HOSPITAL' },
  { id: 'h_8', ris: 'SIN RIS', nombre: 'HOSPITAL DE EMERGENCIAS PEDIÁTRICAS', lat: -12.058125, lng: -77.021607, distrito: 'LA VICTORIA', tipo: 'HOSPITAL' },
  { id: 'i_1', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL DE ENFERMEDADES NEOPLÁSICAS', lat: -12.112320, lng: -76.998266, distrito: 'SAN BORJA', tipo: 'INSTITUTO' },
  { id: 'i_2', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL DE SALUD DEL NIÑO-BREÑA', lat: -12.064247, lng: -77.045720, distrito: 'BREÑA', tipo: 'INSTITUTO' },
  { id: 'i_3', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL DE SALUD DEL NIÑO-SAN BORJA', lat: -12.085823, lng: -76.992491, distrito: 'SAN BORJA', tipo: 'INSTITUTO' },
  { id: 'i_4', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL MATERNO PERINATAL', lat: -12.052537, lng: -77.022163, distrito: 'CERCADO DE LIMA', tipo: 'INSTITUTO' },
  { id: 'i_5', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL DE CIENCIAS NEUROLÓGICAS', lat: -12.045887, lng: -77.015878, distrito: 'CERCADO DE LIMA', tipo: 'INSTITUTO' }
];

// --- INTERFACES ---
interface PlazasPorUniversidad {
    universidad: string;
    cantidad: number;
}

interface CentroSalud {
    id?: string;
    ris: string;
    nombre: string;
    lat: number;
    lng: number;
    distrito?: string;
    tipo?: string;
    capacidadTotal: number;
    cantidad: number;
    desglose: PlazasPorUniversidad[]; 
    disponible: number;
    sinCoordenadas?: boolean;
}

interface TiempoRotacionConfig {
    [universidad: string]: {
        mesesPrimerNivel: string;
        mesesHospital: string;
    }
}

const MapController = ({ center, zoom }: { center: L.LatLngExpression, zoom: number }) => {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.5 }); }, [center, zoom, map]);
  return null;
};

// --- WIDGET DE ESTADÍSTICAS ---
const StatsWidget = ({ data, tiempos, selectedCareer }: { data: CentroSalud[], tiempos: TiempoRotacionConfig, selectedCareer: string }) => {
    // 1. Separar Niveles
    const primerNivel = data.filter(c => !c.nombre.startsWith('HOSPITAL') && !c.nombre.startsWith('INSTITUTO'));
    const hospitales = data.filter(c => c.nombre.startsWith('HOSPITAL') || c.nombre.startsWith('INSTITUTO'));

    // 2. Cálculos Totales (Adjudicado vs Ofertado)
    const ofertado1Nivel = primerNivel.reduce((acc, c) => acc + c.capacidadTotal, 0);
    const adjudicado1Nivel = primerNivel.reduce((acc, c) => acc + c.cantidad, 0);
    const pct1Nivel = ofertado1Nivel > 0 ? (adjudicado1Nivel / ofertado1Nivel) * 100 : 0;

    const ofertadoHosp = hospitales.reduce((acc, c) => acc + c.capacidadTotal, 0);
    const adjudicadoHosp = hospitales.reduce((acc, c) => acc + c.cantidad, 0);
    const pctHosp = ofertadoHosp > 0 ? (adjudicadoHosp / ofertadoHosp) * 100 : 0;

    // 3. Función Agrupar por Universidad (MODIFICADA)
    const getStats = (source: CentroSalud[]) => {
        const uni: Record<string, number> = {};
        source.forEach(c => {
            if(c.desglose) {
                c.desglose.forEach(d => {
                    let nombreUni = d.universidad;
                    // SI ES TODAS, QUITAMOS EL SUFIJO (XXX) PARA SUMAR AL TOTAL DE LA UNIVERSIDAD
                    if (selectedCareer === 'TODAS') {
                        nombreUni = nombreUni.split(' (')[0].trim();
                    }
                    uni[nombreUni] = (uni[nombreUni] || 0) + d.cantidad;
                });
            }
        });
        return Object.entries(uni).sort((a, b) => b[1] - a[1]);
    };

    // 4. Calcular stats para cada grupo
    const stats1Nivel = React.useMemo(() => getStats(primerNivel), [primerNivel, selectedCareer]);
    const statsHosp = React.useMemo(() => getStats(hospitales), [hospitales, selectedCareer]);
    const statsTotal = React.useMemo(() => getStats(data), [data, selectedCareer]);

    // Calcular máximos para las barras de progreso
    const max1Nivel = stats1Nivel.length > 0 ? stats1Nivel[0][1] : 1;
    const maxHosp = statsHosp.length > 0 ? statsHosp[0][1] : 1;
    const maxTotal = statsTotal.length > 0 ? statsTotal[0][1] : 1;

    if (data.length === 0) return <div style={{padding:'40px', textAlign:'center', color:'#64748b', fontSize:'14px', fontStyle:'italic'}}>No hay datos registrados.</div>;

    // Helper para renderizar cada bloque de gráfico
    const renderChart = (title: string, stats: [string, number][], max: number, color: string, icon: string) => (
        <div style={{marginBottom: '30px'}}>
             <h4 style={{ color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px', borderBottom: '1px solid #cbd5e1', paddingBottom: '5px' }}>
                <i className={`${icon} mr-2`}></i> {title}
            </h4>
            {stats.length === 0 ? <div style={{fontSize:'11px', color:'#94a3b8', fontStyle:'italic'}}>Sin asignaciones.</div> : 
             stats.map(([k, v]) => (
                <div key={k} className="chart-row">
                    <div className="chart-label-container">
                        <span className="chart-label">{k}</span>
                    </div>
                    <div className="chart-track">
                        <div className="chart-fill" style={{ width: `${(v / max) * 100}%`, background: color }}>
                            <span className="chart-value-label">{v}</span>
                        </div>
                    </div>
                    <div className="chart-total">{v}</div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fade-in" style={{paddingRight:'10px'}}>
            
            {/* 1. TOTALES DE ADJUDICACIÓN SEPARADOS (KPIs) */}
            <h4 style={{ color: '#195c97', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '15px', borderBottom:'2px solid #195c97', paddingBottom:'5px' }}>
                <i className="fas fa-chart-pie mr-2"></i> Adjudicación por Nivel
            </h4>

            {/* PRIMER NIVEL */}
            <div style={{marginBottom:'20px', background:'#ffffff', padding:'15px', borderRadius:'10px', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:'12px', fontWeight:'700', color:'#329584', marginBottom:'8px'}}>PRIMER NIVEL (CS/PS)</div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#64748b', marginBottom:'6px'}}>
                    <span>Adjudicado: <b>{adjudicado1Nivel}</b></span>
                    <span>Total: <b>{ofertado1Nivel}</b></span>
                </div>
                <div style={{width:'100%', height:'14px', background:'#f1f5f9', borderRadius:'7px', overflow:'hidden', border:'1px solid #cbd5e1'}}>
                    <div style={{width: `${pct1Nivel}%`, height:'100%', background: '#329584', transition:'width 0.8s ease'}}></div>
                </div>
                <div style={{textAlign:'right', fontSize:'10px', color:'#329584', marginTop:'4px'}}>{pct1Nivel.toFixed(1)}% Ocupado</div>
            </div>

            {/* HOSPITALES E INSTITUTOS */}
            <div style={{marginBottom:'25px', background:'#ffffff', padding:'15px', borderRadius:'10px', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:'12px', fontWeight:'700', color:'#195c97', marginBottom:'8px'}}>HOSPITALES E INSTITUTOS</div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#64748b', marginBottom:'6px'}}>
                    <span>Adjudicado: <b>{adjudicadoHosp}</b></span>
                    <span>Total: <b>{ofertadoHosp}</b></span>
                </div>
                <div style={{width:'100%', height:'14px', background:'#f1f5f9', borderRadius:'7px', overflow:'hidden', border:'1px solid #cbd5e1'}}>
                    <div style={{width: `${pctHosp}%`, height:'100%', background: '#195c97', transition:'width 0.8s ease'}}></div>
                </div>
                <div style={{textAlign:'right', fontSize:'10px', color:'#195c97', marginTop:'4px'}}>{pctHosp.toFixed(1)}% Ocupado</div>
            </div>

            {/* 2. TIEMPOS DE ROTACIÓN */}
            {tiempos && Object.keys(tiempos).length > 0 && (
                <div style={{marginBottom:'25px'}}>
                    <h4 style={{ color: '#f59e0b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', borderBottom:'2px solid #f59e0b', paddingBottom:'5px' }}>
                        <i className="fas fa-clock mr-2"></i> Tiempos (Meses)
                    </h4>
                    <div className="time-table-container">
                         <div className="time-row time-header">
                             <span>UNIVERSIDAD</span>
                             <span style={{textAlign:'center'}}>CS/PS</span>
                             <span style={{textAlign:'center'}}>HOSP</span>
                         </div>
                         {Object.entries(tiempos).map(([uni, t]:any) => (
                             <div key={uni} className="time-row">
                                 <span style={{color:'#334155', fontWeight:'600', fontSize:'10px'}}>{uni}</span>
                                 <span style={{textAlign:'center', color:'#329584', fontWeight:'700', fontSize:'11px'}}>{t.mesesPrimerNivel || '-'}</span>
                                 <span style={{textAlign:'center', color:'#195c97', fontWeight:'700', fontSize:'11px'}}>{t.mesesHospital || '-'}</span>
                             </div>
                         ))}
                    </div>
                </div>
            )}

            {/* 3. GRÁFICAS SEPARADAS */}
            
            {/* GRÁFICA 1: PRIMER NIVEL - SOLO SI ES 'TODAS' */}
            {selectedCareer === 'TODAS' && renderChart("Asignación - Primer Nivel (CS/PS)", stats1Nivel, max1Nivel, '#329584', 'fas fa-clinic-medical')}

            {/* GRÁFICA 2: HOSPITALES E INSTITUTOS - SOLO SI ES 'TODAS' */}
            {selectedCareer === 'TODAS' && renderChart("Asignación - Hospitales e Institutos", statsHosp, maxHosp, '#195c97', 'fas fa-hospital')}

            {/* GRÁFICA 3: TOTAL GENERAL - SIEMPRE */}
            {renderChart("Asignación Total General", statsTotal, maxTotal, '#334155', 'fas fa-chart-bar')}
        </div>
    );
};

// ==========================================
// 4. COMPONENTE PRINCIPAL
// ==========================================
const Adjudicacion2026: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
      const styleElement = document.createElement("style"); styleElement.innerHTML = styleInjection;
      document.head.appendChild(styleElement); return () => { document.head.removeChild(styleElement); };
  }, []);

  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression>([-12.05, -77.06]);
  const [mapZoom, setMapZoom] = useState(12);
  const [tipoMapa, setTipoMapa] = useState<'claro' | 'oscuro' | 'satelite'>('claro');
  const [activeTab, setActiveTab] = useState<'lista' | 'reportes'>('lista'); 

  const [selectedCareer, setSelectedCareer] = useState('MEDICINA'); 
  const [filtroRis, setFiltroRis] = useState('todos'); 
  const [filtroDistrito, setFiltroDistrito] = useState('todos'); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [centros, setCentros] = useState<CentroSalud[]>([]);
  const [centroExpandido, setCentroExpandido] = useState<string | null>(null);
  
  // MODAL GESTIÓN MANUAL
  const [showManageModal, setShowManageModal] = useState(false);
  const [editCentroId, setEditCentroId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [editTotalCapacity, setEditTotalCapacity] = useState<number>(0); 
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // MODAL TIEMPOS
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [tiemposRotacion, setTiemposRotacion] = useState<TiempoRotacionConfig>({}); 

  // NUEVO FILTRO DE ESTADO
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'libres' | 'ocupados'>('todos');

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/yurivilc/peru-geojson/master/lima_callao_distritos.geojson')
      .then(res => res.json()).then(data => setGeoJsonData(data)).catch(console.error);
  }, []);

  useEffect(() => {
      const fetchData = async () => {
          if (selectedCareer === 'TODAS') {
             await cargarDatosTodas();
          } else {
             await cargarDatosFirebase(selectedCareer);
             await cargarTiempos(selectedCareer);
          }
      };
      fetchData();
  }, [selectedCareer]);

  const styleGeoJson = (feature: any) => {
      const rawName = feature.properties.NOMBDIST || feature.properties.NOMB_DIST || "";
      const distrito = normalizarTexto(rawName); 
      const risAsignada = DISTRICT_TO_RIS[distrito] || 'DEFAULT';
      const color = RIS_COLORS[risAsignada];
      const esVisible = (filtroDistrito === 'todos' || distrito === normalizarTexto(filtroDistrito));
      const esJurisdiccion = risAsignada !== 'DEFAULT';
      return { fillColor: color, weight: esJurisdiccion ? 1 : 0.5, opacity: 1, color: 'white', fillOpacity: esVisible ? 0.5 : 0.1 };
  };

  const cargarDatosTodas = async () => {
      let centrosMap: Record<string, CentroSalud> = {};
      dataCentrosBase.forEach(base => {
          centrosMap[base.nombre] = { ...base, capacidadTotal: 0, cantidad: 0, desglose: [], disponible: 0 };
      });
      for (const carrera of CARRERAS_PARA_CARGA) {
          if (carrera.id === 'TODAS') continue;
          try {
              const snap = await getDocs(collection(db, `adjudicacion_2026_${carrera.id}`));
              snap.docs.forEach(doc => {
                  const data = doc.data();
                  if (centrosMap[data.nombre]) {
                      centrosMap[data.nombre].capacidadTotal += (data.capacidadTotal || 0);
                      centrosMap[data.nombre].cantidad += (data.cantidad || 0);
                      centrosMap[data.nombre].disponible += (data.disponible || 0);
                      if (data.desglose) {
                          data.desglose.forEach((d: any) => {
                              centrosMap[data.nombre].desglose.push({
                                  universidad: `${d.universidad} (${carrera.label.substring(0,3)})`,
                                  cantidad: d.cantidad
                              });
                          });
                      }
                  }
              });
          } catch (e) { }
      }
      setCentros(Object.values(centrosMap));
      setTiemposRotacion({});
  };

  const cargarDatosFirebase = async (careerId: string) => {
      try {
          const collectionName = `adjudicacion_2026_${careerId}`;
          const querySnapshot = await getDocs(collection(db, collectionName));
          const datosNube = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CentroSalud[];
          const mapaNube: Record<string, CentroSalud> = {};
          datosNube.forEach(d => { mapaNube[d.nombre] = d; });
          let listaFinal = dataCentrosBase.map(base => {
              const info = mapaNube[base.nombre];
              if (info) return { ...base, ...info };
              return { ...base, capacidadTotal: 0, desglose: [], disponible: 0, cantidad: 0 };
          });
          setCentros(listaFinal);
      } catch (error) { console.error(error); setCentros(dataCentrosBase.map(c => ({ ...c, capacidadTotal: 0, desglose: [], disponible: 0, cantidad: 0 }))); }
  };

  const cargarTiempos = async (careerId: string) => {
      try {
          const docRef = doc(db, `config_tiempos_2026`, careerId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              setTiemposRotacion(docSnap.data() as TiempoRotacionConfig);
          } else {
              setTiemposRotacion({});
          }
      } catch (e) { console.error("Error loading times:", e); }
  };

  const guardarTiempos = async () => {
      try {
          await setDoc(doc(db, `config_tiempos_2026`, selectedCareer), tiemposRotacion);
          setShowTimeModal(false);
          alert("✅ Tiempos guardados.");
      } catch (e) { console.error(e); alert("Error al guardar."); }
  };

  const handleTimeChange = (uni: string, field: 'mesesPrimerNivel' | 'mesesHospital', val: string) => {
      setTiemposRotacion(prev => ({
          ...prev,
          [uni]: { ...prev[uni], [field]: val }
      }));
  };

  const handleOpenEdit = (centro: CentroSalud) => {
      setEditCentroId(centro.nombre);
      setEditTotalCapacity(centro.capacidadTotal || 0); 
      const vals: Record<string, number> = {};
      if(centro.desglose) { centro.desglose.forEach(d => vals[d.universidad] = d.cantidad); }
      setEditValues(vals);
  };

  const handleInputChange = (uni: string, val: string) => {
      setEditValues(prev => ({ ...prev, [uni]: parseInt(val) || 0 }));
  };

  const handleSaveEdit = async () => {
      if (!editCentroId) return;
      const centro = centros.find(c => c.nombre === editCentroId);
      if (!centro) return;
      const nuevoDesglose: PlazasPorUniversidad[] = [];
      let totalAsignado = 0;
      Object.entries(editValues).forEach(([uni, cant]) => {
          if (cant > 0) {
              nuevoDesglose.push({ universidad: uni, cantidad: cant });
              totalAsignado += cant;
          }
      });
      if (totalAsignado > editTotalCapacity) {
          if(!confirm(`⚠️ Cuidado: Asignaste ${totalAsignado}, pero la oferta es ${editTotalCapacity}. ¿Guardar?`)) return;
      }
      const newData = {
          ...centro,
          capacidadTotal: editTotalCapacity, 
          desglose: nuevoDesglose,
          cantidad: totalAsignado,
          disponible: editTotalCapacity - totalAsignado
      };
      try {
          const collectionName = `adjudicacion_2026_${selectedCareer}`;
          await writeBatch(db).set(doc(collection(db, collectionName), editCentroId.replace(/[\/\s\.]/g, '_')), newData).commit();
          setCentros(prev => prev.map(c => c.nombre === editCentroId ? newData : c));
          setEditCentroId(null);
      } catch (e) { console.error(e); alert("Error al guardar."); }
  };

  const centrosFiltrados = centros.map(centro => centro).filter(c => {
      const cumpleDistrito = filtroDistrito === 'todos' || (c.distrito && c.distrito === filtroDistrito);
      const matchSearch = searchTerm === '' || c.nombre.includes(searchTerm.toUpperCase());
      let cumpleTipo = true;
      if (filtroRis === 'HOSP') cumpleTipo = c.ris === 'SIN RIS';
      else if (filtroRis !== 'todos') cumpleTipo = c.ris === filtroRis;

      // FILTRO DE ESTADO (LIBRE/OCUPADO)
      let cumpleEstado = true;
      if (filtroEstado === 'libres') cumpleEstado = c.disponible > 0;
      if (filtroEstado === 'ocupados') cumpleEstado = c.cantidad > 0;

      return cumpleDistrito && matchSearch && cumpleTipo && cumpleEstado;
  }).sort((a, b) => b.capacidadTotal - a.capacidadTotal);

  const modalCentrosFiltrados = centros.filter(c => c.nombre.includes(modalSearchTerm.toUpperCase()));

  // ==========================================
  // LOGICA AGREGADA: CÁLCULOS DETALLADOS PARA LAS TARJETAS LATERALES
  // ==========================================
  
  // 1. Totales Generales
  const totalCapacidadGlobal = centrosFiltrados.reduce((acc, curr) => acc + curr.capacidadTotal, 0);
  const totalDisponibleGlobal = centrosFiltrados.reduce((acc, curr) => acc + curr.disponible, 0);

  // 2. Separar listas
  const listaHospitales = centrosFiltrados.filter(c => c.nombre.startsWith('HOSPITAL') || c.nombre.startsWith('INSTITUTO'));
  const listaPrimerNivel = centrosFiltrados.filter(c => !c.nombre.startsWith('HOSPITAL') && !c.nombre.startsWith('INSTITUTO'));

  // 3. Totales por Grupo (Ofertado)
  const ofertaHosp = listaHospitales.reduce((acc, c) => acc + c.capacidadTotal, 0);
  const ofertaPrim = listaPrimerNivel.reduce((acc, c) => acc + c.capacidadTotal, 0);

  // 4. Totales por Grupo (Disponible)
  const dispHosp = listaHospitales.reduce((acc, c) => acc + c.disponible, 0);
  const dispPrim = listaPrimerNivel.reduce((acc, c) => acc + c.disponible, 0);

  const toggleCentro = (nombreCentro: string, lat: number, lng: number) => {
    if (centroExpandido === nombreCentro) setCentroExpandido(null);
    else { setCentroExpandido(nombreCentro); if (lat !== 0 && lat !== -12.046374) { setMapCenter([lat, lng]); setMapZoom(16); } }
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc', color: '#1e293b' }}>
      
      {/* HEADER */}
      <div style={{ background: '#ffffff', padding: '0 24px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', zIndex: 50, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: '#195c97', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-calendar-check" style={{ fontSize: '20px', color: 'white' }}></i>
            </div>
            <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#195c97' }}>
                    ADJUDICACIÓN <span style={{ color: '#329584' }}>2026</span>
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.6 }}>GESTIÓN DE PLAZAS</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                value={tipoMapa}
                onChange={(e) => setTipoMapa(e.target.value as any)}
                className="map-select"
              >
                {Object.entries(MAP_TYPES).map(([key, conf]) => (
                    <option key={key} value={key}>{conf.name}</option>
                ))}
              </select>

              <button onClick={() => setShowTimeModal(true)} disabled={selectedCareer === 'TODAS'} className="btn-modern btn-edit" style={{opacity: selectedCareer === 'TODAS' ? 0.5 : 1}}>
                  <i className="fas fa-clock"></i> Tiempos
              </button>
              <button onClick={() => setShowManageModal(true)} disabled={selectedCareer === 'TODAS'} className="btn-modern btn-save" style={{opacity: selectedCareer === 'TODAS' ? 0.5 : 1}}>
                  <i className="fas fa-edit"></i> Gestión Manual
              </button>
              <button onClick={() => navigate('/')} className="btn-modern btn-close">
                  <i className="fas fa-arrow-left"></i> Volver 2025
              </button>
          </div>
      </div>

      {/* FILTROS */}
      <div style={{ padding: '15px 24px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{display:'flex', alignItems:'center', marginRight:'15px'}}>
              <span style={{fontSize:'12px', color:'#195c97', marginRight:'8px', fontWeight:'700'}}>CARRERA:</span>
              <select value={selectedCareer} onChange={(e) => setSelectedCareer(e.target.value)} className="career-select" style={{ width: '240px' }}>
                  {CARRERAS_PARA_CARGA.map(c => <option key={c.id} value={c.id}>🎓 {c.label}</option>)}
              </select>
          </div>
          <div style={{ position: 'relative', flex: 1 }}><input type="text" placeholder="Buscar Sede..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} style={{ width: '100%', padding: '8px 8px 8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', fontSize: '13px', boxSizing: 'border-box' }} /></div>
          
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as any)} style={{ width: '140px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '13px' }}>
              <option value="todos">👁️ Todos</option>
              <option value="libres">🟢 Libres</option>
              <option value="ocupados">🔴 Ocupados</option>
          </select>

          <select value={filtroDistrito} onChange={(e) => setFiltroDistrito(e.target.value)} style={{ width: '180px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '13px' }}> <option value="todos">📍 Todos los Distritos</option> {LISTA_DISTRITOS.map(d => <option key={d} value={d}>{d}</option>)} </select>
          <button onClick={() => setFiltroRis(filtroRis === 'HOSP' ? 'todos' : 'HOSP')} className="btn-modern" style={{ background: filtroRis === 'HOSP' ? '#f43f5e' : '#ffffff', color: filtroRis === 'HOSP' ? 'white' : '#f43f5e', border: '1px solid #f43f5e' }}>🏥 HOSP/INST</button>
      </div>

      {/* MODAL TIEMPOS */}
      {showTimeModal && (
          <div className="modal-overlay">
              <div className="modal-content" style={{maxWidth:'800px', height:'80vh'}}>
                  <div className="modal-header">
                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                         <i className="fas fa-clock" style={{fontSize:'20px'}}></i>
                         <h3 style={{margin:0}}>Tiempos de Rotación (Meses)</h3>
                      </div>
                      <button onClick={() => setShowTimeModal(false)} className="close-modal-btn">×</button>
                  </div>
                  <div className="modal-body custom-scrollbar" style={{padding:'20px', background:'#f8fafc'}}>
                        <div className="time-grid">
                           {UNIVERSIDADES.map(uni => (
                               <div key={uni} className="time-card">
                                   <div style={{fontSize:'12px', fontWeight:'700', color:'#334155', marginBottom:'10px', borderBottom:'1px solid #e2e8f0', paddingBottom:'5px', minHeight:'32px', display:'flex', alignItems:'center'}}>{uni}</div>
                                   <div className="time-field">
                                       <span className="time-icon">🏥</span> <span style={{fontSize:'11px', color:'#329584'}}>Primer Nivel</span>
                                       <input type="text" className="input-meses-card" placeholder="-" 
                                              value={tiemposRotacion[uni]?.mesesPrimerNivel || ''}
                                              onChange={(e) => handleTimeChange(uni, 'mesesPrimerNivel', e.target.value)} />
                                   </div>
                                   <div className="time-field">
                                       <span className="time-icon">🏢</span> <span style={{fontSize:'11px', color:'#195c97'}}>Hospital</span>
                                       <input type="text" className="input-meses-card" placeholder="-"
                                              value={tiemposRotacion[uni]?.mesesHospital || ''}
                                              onChange={(e) => handleTimeChange(uni, 'mesesHospital', e.target.value)} />
                                   </div>
                               </div>
                           ))}
                        </div>
                  </div>
                  <div className="modal-footer">
                      <button onClick={guardarTiempos} className="btn-modern btn-save">GUARDAR CAMBIOS</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL GESTIÓN */}
      {showManageModal && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <div className="modal-header">
                      <h3 style={{margin:0}}>Gestión Manual: {CARRERAS_PARA_CARGA.find(c=>c.id===selectedCareer)?.label}</h3>
                      <div style={{display:'flex', gap:'10px'}}>
                          <input type="text" placeholder="Filtrar lista..." value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)} className="input-plaza" style={{width:'200px', textAlign:'left', border:'1px solid white'}} />
                          <button onClick={() => setShowManageModal(false)} className="close-modal-btn">×</button>
                      </div>
                  </div>
                  <div className="modal-body custom-scrollbar">
                      {modalCentrosFiltrados.map((centro) => (
                          <div key={centro.nombre} className="edit-card-container">
                              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', alignItems:'center'}}>
                                  <div style={{flex:1}}>
                                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                          <i className={`fas ${centro.nombre.startsWith('CS') ? 'fa-clinic-medical' : 'fa-hospital'}`} style={{color: getColorByRis(centro.ris, centro.tipo)}}></i>
                                          <span style={{fontWeight:'700', color:'#1e293b', fontSize:'14px'}}>{centro.nombre}</span>
                                      </div>
                                      <div style={{fontSize:'11px', color:'#64748b', marginTop:'4px', marginLeft:'26px'}}>
                                          Ofertado: <b style={{color:'#1e293b'}}>{centro.capacidadTotal}</b> | 
                                          Libre: <b style={{color: centro.disponible > 0 ? '#329584' : '#ef4444'}}>{centro.disponible}</b>
                                      </div>
                                  </div>
                                  <div style={{display:'flex', gap:'10px'}}>
                                    {editCentroId === centro.nombre ? (
                                        <>
                                            <button onClick={() => setEditCentroId(null)} className="btn-modern btn-close">CERRAR</button>
                                            <button onClick={handleSaveEdit} className="btn-modern btn-save">GUARDAR</button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleOpenEdit(centro)} className="btn-modern btn-edit">EDITAR</button>
                                    )}
                                  </div>
                              </div>
                              
                              {editCentroId === centro.nombre ? (
                                  <div style={{background:'#f1f5f9', padding:'20px', borderRadius:'10px', border:'1px solid #cbd5e1', animation:'fadeIn 0.3s'}}>
                                      <div style={{marginBottom:'20px', display:'flex', alignItems:'center', gap:'15px', borderBottom:'1px solid #e2e8f0', paddingBottom:'15px'}}>
                                          <label style={{fontSize:'13px', fontWeight:'800', color:'#329584', textTransform:'uppercase'}}>Capacidad Total:</label>
                                          <input 
                                              type="number" min="0" 
                                              className="input-total"
                                              value={editTotalCapacity}
                                              onChange={(e) => setEditTotalCapacity(parseInt(e.target.value) || 0)}
                                          />
                                      </div>
                                      
                                      <div className="uni-grid">
                                          {UNIVERSIDADES.map(uni => (
                                              <div key={uni} className={`uni-item ${editValues[uni] > 0 ? 'active' : ''}`}>
                                                  <span className="uni-label" title={uni}>{uni}</span>
                                                  <input 
                                                      type="number" min="0" 
                                                      className="input-plaza" 
                                                      value={editValues[uni] || ''} 
                                                      onChange={(e) => handleInputChange(uni, e.target.value)} 
                                                      placeholder="0" 
                                                  />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ) : (
                                  <div style={{fontSize:'10px', color:'#64748b', display:'flex', flexWrap:'wrap', gap:'6px', paddingLeft:'24px', marginTop:'5px'}}>
                                      {centro.desglose && centro.desglose.length > 0 ? centro.desglose.map(d => (
                                          <span key={d.universidad} style={{background:'#e0f2fe', padding:'4px 8px', borderRadius:'4px', border:'1px solid #bae6fd', color:'#0369a1', display:'flex', alignItems:'center', gap:'5px'}}>
                                              <span style={{maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{d.universidad}</span>
                                              <b style={{color:'#0c4a6e', background:'#bae6fd', padding:'1px 6px', borderRadius:'3px'}}>{d.cantidad}</b>
                                          </span>
                                      )) : <span style={{opacity:0.5, fontStyle:'italic'}}>Sin asignaciones registradas.</span>}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* MAPA Y SIDEBAR */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 3, position: 'relative', borderRight: '1px solid #cbd5e1' }}>
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%", background: '#e2e8f0' }} zoomControl={false}>
                  <MapController center={mapCenter} zoom={mapZoom} />
                  <TileLayer url={MAP_TYPES[tipoMapa].url} attribution='&copy; CARTO' />
                  {geoJsonData && <GeoJSON data={geoJsonData} style={styleGeoJson} />}
                  {centrosFiltrados.map((centro, idx) => {
                      if (centro.sinCoordenadas) return null;
                      const isSelected = centroExpandido === centro.nombre;
                      const colorRis = getColorByRis(centro.ris, centro.tipo);
                      return (
                        <CircleMarker key={idx} center={[centro.lat, centro.lng]} pathOptions={{ color: isSelected ? '#195c97' : colorRis, fillColor: isSelected ? 'white' : colorRis, fillOpacity: isSelected ? 0.5 : 0.8, weight: isSelected ? 4 : 0, dashArray: isSelected ? '4,4' : '' }} radius={isSelected ? 12 : 6} eventHandlers={{ click: () => toggleCentro(centro.nombre, centro.lat, centro.lng) }}>
                             {isSelected && <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="label-mapa"> {centro.nombre} (Libres: {centro.disponible}) </Tooltip>}
                             {!isSelected && <Tooltip direction="top" offset={[0, -5]} opacity={1}> {centro.nombre}: {centro.disponible} libres </Tooltip>}
                        </CircleMarker>
                      );
                  })}
              </MapContainer>
          </div>

          <div style={{ flex: 1, minWidth: '340px', background: '#ffffff', display: 'flex', flexDirection: 'column', boxShadow:'-5px 0 15px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background:'#f8fafc' }}>
                  
                  {/* === ZONA DE TARJETAS MODIFICADA PARA MOSTRAR DETALLES === */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', gap:'10px' }}>
                        
                        {/* TARJETA TOTAL OFERTADO */}
                        <div style={{ background: '#195c97', padding: '15px', borderRadius: '10px', flex: 1, color: 'white', boxShadow:'0 4px 6px rgba(0,0,0,0.1)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                            <div style={{textAlign:'center'}}>
                                <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', opacity:0.8 }}>Total Ofertado</div>
                                <div style={{ fontSize: '28px', fontWeight: '900', marginTop:'5px', marginBottom:'8px' }}>{totalCapacidadGlobal}</div>
                            </div>
                            {/* Desglose Ofertado */}
                            <div style={{borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'8px', display:'flex', flexDirection:'column', gap:'4px'}}>
                                 <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                                    <span style={{opacity:0.9}}><i className="fas fa-hospital"></i> Hosp/Inst:</span>
                                    <span style={{fontWeight:'bold'}}>{ofertaHosp}</span>
                                 </div>
                                 <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                                    <span style={{opacity:0.9}}><i className="fas fa-clinic-medical"></i> 1° Nivel:</span>
                                    <span style={{fontWeight:'bold'}}>{ofertaPrim}</span>
                                 </div>
                            </div>
                        </div>

                        {/* TARJETA DISPONIBLE TOTAL */}
                        <div style={{ background: '#329584', padding: '15px', borderRadius: '10px', flex: 1, color: 'white', boxShadow:'0 4px 6px rgba(0,0,0,0.1)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                            <div style={{textAlign:'center'}}>
                                <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', opacity:0.8 }}>Disponible Total</div>
                                <div style={{ fontSize: '28px', fontWeight: '900', marginTop:'5px', marginBottom:'8px' }}>{totalDisponibleGlobal}</div>
                            </div>
                             {/* Desglose Disponible */}
                            <div style={{borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'8px', display:'flex', flexDirection:'column', gap:'4px'}}>
                                 <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                                    <span style={{opacity:0.9}}><i className="fas fa-hospital"></i> Hosp/Inst:</span>
                                    <span style={{fontWeight:'bold'}}>{dispHosp}</span>
                                 </div>
                                 <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                                    <span style={{opacity:0.9}}><i className="fas fa-clinic-medical"></i> 1° Nivel:</span>
                                    <span style={{fontWeight:'bold'}}>{dispPrim}</span>
                                 </div>
                            </div>
                        </div>
                  </div>
                  {/* ========================================================= */}

                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0' }}>
                      <button onClick={() => setActiveTab('lista')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: activeTab === 'lista' ? '#ffffff' : 'transparent', color: activeTab === 'lista' ? '#195c97' : '#64748b', fontWeight: '700', cursor: 'pointer', boxShadow: activeTab === 'lista' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>SEDES</button>
                      <button onClick={() => setActiveTab('reportes')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: activeTab === 'reportes' ? '#ffffff' : 'transparent', color: activeTab === 'reportes' ? '#195c97' : '#64748b', fontWeight: '700', cursor: 'pointer', boxShadow: activeTab === 'reportes' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>GRÁFICOS</button>
                  </div>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px', background:'#ffffff' }} className="custom-scrollbar">
                  {activeTab === 'lista' ? (
                      centrosFiltrados.map((centro) => {
                          const isExpanded = centroExpandido === centro.nombre;
                          const colorRis = getColorByRis(centro.ris, centro.tipo);
                          return (
                              <div key={centro.nombre} style={{ marginBottom: '12px', border: `1px solid ${isExpanded ? colorRis : '#e2e8f0'}`, borderRadius: '10px', background: '#ffffff', overflow: 'hidden', boxShadow:'0 2px 4px rgba(0,0,0,0.05)', transition:'all 0.2s' }}>
                                  <div onClick={() => toggleCentro(centro.nombre, centro.lat, centro.lng)} style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? `${colorRis}10` : 'transparent' }}>
                                      <div style={{ overflow: 'hidden', flex: 1, display:'flex', alignItems:'center', gap:'10px' }}>
                                          <i className="fas fa-map-marker-alt" style={{color:colorRis, fontSize:'16px'}}></i>
                                          <div>
                                              <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px' }}>{centro.nombre}</div>
                                              <div style={{fontSize:'11px', color:'#64748b'}}>Capacidad: <b>{centro.capacidadTotal}</b></div>
                                          </div>
                                      </div>
                                      <span style={{ background: centro.disponible > 0 ? '#d1fae5' : '#fee2e2', color: centro.disponible > 0 ? '#059669' : '#dc2626', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', minWidth:'70px', textAlign:'center' }}>{centro.disponible} Libres</span>
                                  </div>
                                  {isExpanded && (
                                      <div style={{ padding: '15px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', animation:'fadeIn 0.2s ease-out' }}>
                                          <div style={{fontSize:'11px', color:'#195c97', marginBottom:'12px', fontWeight:'800', letterSpacing:'0.5px'}}>ASIGNADO ({centro.cantidad}):</div>
                                          {centro.desglose?.map((d, i) => (
                                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', background:'#ffffff', padding:'8px 10px', borderRadius:'6px', border:'1px solid #e2e8f0' }}>
                                                  <span style={{color: '#334155', fontWeight:'600', width:'80%'}}>{d.universidad}</span>
                                                  <span style={{fontWeight:'800', color: '#195c97'}}>{d.cantidad}</span>
                                              </div>
                                          ))}
                                          {(!centro.desglose || centro.desglose.length === 0) && <div style={{fontSize:'12px', color:'#94a3b8', fontStyle:'italic', padding:'10px', textAlign:'center'}}>Sin asignaciones registradas.</div>}
                                      </div>
                                  )}
                              </div>
                          );
                      })
                  ) : (
                      <div className="fade-in">
                          <StatsWidget data={centrosFiltrados} tiempos={tiemposRotacion} selectedCareer={selectedCareer} />
                      </div>
                  )}
              </div>
              <div className="source-footer" style={{padding:'10px', fontSize:'10px', color:'#94a3b8', textAlign:'right', borderTop:'1px solid #e2e8f0'}}>
                  Fuente: Adjudicación 2026 - UFDI
              </div>
          </div>
      </div>
    </div>
  );
};

export default Adjudicacion2026;