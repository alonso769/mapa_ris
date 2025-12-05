import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

// --- IMPORTAR FIREBASE ---
import { db } from './firebaseConfig'; 
import { collection, getDocs, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';

// ==========================================
// 0. ESTILOS CSS PRO (DISEÑO DASHBOARD)
// ==========================================
const styleInjection = `
  body { margin: 0; background-color: #2e1065; color: #e2e8f0; font-family: 'Segoe UI', Roboto, sans-serif; }
  
  /* SCROLLBAR */
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #1e1b4b; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #818cf8; }
  
  /* MAPA */
  .leaflet-tooltip.label-mapa {
    background-color: rgba(30, 27, 75, 0.95) !important;
    border: 1px solid #8b5cf6 !important; color: #fff !important;
    font-weight: 700 !important; font-size: 11px !important;
    border-radius: 6px !important; padding: 2px 8px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
  }
  .leaflet-tooltip-bottom:before { border-bottom-color: rgba(30, 27, 75, 0.95) !important; }
  
  /* ANIMACIONES */
  .fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* GRÁFICOS */
  .chart-row { display: flex; align-items: center; margin-bottom: 10px; }
  .chart-label-container { width: 220px; text-align: right; padding-right: 15px; display: flex; align-items: center; justify-content: flex-end; }
  .chart-label { font-size: 11px; color: #c4b5fd; font-weight: 600; line-height: 1.2; white-space: normal; }
  .chart-track { flex: 1; background: #4c1d95; height: 14px; border-radius: 4px; overflow: hidden; position: relative; }
  .chart-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
  .chart-value { width: 40px; padding-left: 10px; font-weight: 800; color: #e2e8f0; font-size: 12px; }

  /* MODAL MODERN */
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.92); display: flex; justify-content: center; align-items: center; z-index: 10000; backdrop-filter: blur(8px); }
  .modal-content { background: #1e1b4b; border-radius: 16px; width: 95%; max-width: 1200px; height: 90vh; border: 1px solid #4338ca; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); display: flex; flexDirection: column; overflow: hidden; }
  .modal-header { padding: 20px 25px; background: #312e81; border-bottom: 1px solid #4338ca; display: flex; justify-content: space-between; align-items: center; }
  .modal-body { padding: 25px; overflow-y: auto; flex: 1; background: #0f172a; }
  
  /* GESTIÓN MANUAL: TARJETAS DE EDICIÓN */
  .edit-card-container { background: #1e1b4b; border: 1px solid #4338ca; border-radius: 12px; padding: 20px; margin-bottom: 15px; transition: all 0.2s; }
  .edit-card-container:hover { border-color: #6366f1; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  
  .uni-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 15px; }
  .uni-item { 
      background: #312e81; border: 1px solid #4c1d95; padding: 10px; border-radius: 8px; 
      display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; 
  }
  .uni-item.active { border-color: #8b5cf6; background: #4338ca; }
  .uni-label { font-size: 11px; color: #cbd5e1; font-weight: 600; width: 120px; line-height: 1.2; }
  
  /* INPUTS PRO */
  .input-modern { background: #0f172a; border: 1px solid #6366f1; color: white; padding: 8px; border-radius: 6px; width: 60px; text-align: center; font-weight: bold; font-size: 13px; }
  .input-modern:focus { outline: none; border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2); }
  
  .input-capacidad { background: #4c1d95; border: 2px solid #10b981; color: white; font-size: 16px; width: 80px; padding: 8px; border-radius: 8px; text-align: center; font-weight: 800; }

  /* TIEMPOS ROTACIÓN */
  .time-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
  .time-card { background: #1e1b4b; border: 1px solid #4338ca; border-radius: 10px; padding: 15px; }
  .time-field { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; background: #0f172a; padding: 6px 10px; border-radius: 6px; }
  .time-icon { font-size: 14px; margin-right: 8px; width: 20px; text-align: center; }

  /* KPI CARDS */
  .kpi-box { background: #312e81; border: 1px solid #4338ca; border-radius: 10px; padding: 12px; flex: 1; text-align: center; position: relative; overflow: hidden; }
  .kpi-label { font-size: 10px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1px; }
  .kpi-number { font-size: 22px; font-weight: 900; color: white; margin-top: 4px; }
  
  .career-select { background-color: #5b21b6; color: white; font-weight: 700; border: 2px solid #a78bfa; box-shadow: 0 0 10px rgba(139, 92, 246, 0.5); padding: 8px 12px; border-radius: 8px; cursor: pointer; }
  
  /* BOTONES */
  .btn-modern { border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
  .btn-modern:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .btn-close { background: rgba(255,255,255,0.1); color: #cbd5e1; }
  .btn-save { background: #10b981; color: white; }
  .btn-edit { background: #3b82f6; color: white; }
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
    'RIS 1': '#10b981', 'RIS 2': '#facc15', 'RIS 3': '#f97316', 'RIS 4': '#3b82f6', 
    'RIS 5': '#ef4444', 'RIS 6': '#8b5cf6', 'RIS 7': '#ec4899', 
    'SIN RIS': '#94a3b8', 'HOSPITAL': '#f43f5e', 'INSTITUTO': '#a855f7', 'DEFAULT': '#64748b'
};

const DISTRICT_TO_RIS: Record<string, string> = {
    'LIMA': 'RIS 1', 'CERCADO DE LIMA': 'RIS 1', 'BRENA': 'RIS 2', 'BREÑA': 'RIS 2', 'JESUS MARIA': 'RIS 2', 
    'PUEBLO LIBRE': 'RIS 2', 'MAGDALENA DEL MAR': 'RIS 3', 'SAN MIGUEL': 'RIS 3', 'LINCE': 'RIS 4', 
    'SAN ISIDRO': 'RIS 4', 'MIRAFLORES': 'RIS 4', 'SAN BORJA': 'RIS 4', 'SURQUILLO': 'RIS 4', 
    'LA VICTORIA': 'RIS 5', 'SAN LUIS': 'RIS 5', 'EL AGUSTINO': 'RIS 5', 'SANTA ANITA': 'RIS 5',
    'SAN JUAN DE LURIGANCHO': 'RIS 6', 'RIMAC': 'RIS 7', 'INDEPENDENCIA': 'RIS 7', 'COMAS': 'RIS 7'
};
const LISTA_DISTRITOS = Object.keys(DISTRICT_TO_RIS).sort();

const getColorByRis = (ris: string, nombre: string = '') => {
    const n = nombre.toUpperCase();
    if (n.startsWith('HOSPITAL')) return RIS_COLORS['HOSPITAL'];
    if (n.startsWith('INSTITUTO')) return RIS_COLORS['INSTITUTO'];
    const key = Object.keys(RIS_COLORS).find(k => (ris || '').toUpperCase().includes(k));
    return key ? RIS_COLORS[key] : RIS_COLORS['DEFAULT'];
};

const TILE_LAYERS = {
    claro: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    oscuro: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    satelite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
};

// ==========================================
// 2. UTILIDADES
// ==========================================
const normalizarTexto = (texto: string) => {
  if (!texto) return "";
  return String(texto).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 ]/g, "").trim();
};

const esSedeValida = (n: string) => !n.startsWith("HS ") && !n.startsWith("INST ") && !n.startsWith("HOSPITAL") && !n.startsWith("INSTITUTO");

// --- DATOS BASE (84 CENTROS + HOSPITALES + INSTITUTOS) ---
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
    capacidadTotal: number; // TOTAL OFERTADO
    cantidad: number;       // OCUPADO
    desglose: PlazasPorUniversidad[]; 
    disponible: number;     // LIBRE
    sinCoordenadas?: boolean;
}

// --- TIPOS DE TIEMPO ---
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

// --- WIDGET DE ESTADÍSTICAS PRO ---
const StatsWidget = ({ data, tiempos }: { data: CentroSalud[], tiempos: TiempoRotacionConfig }) => {
    const primerNivel = data.filter(c => !c.nombre.startsWith('HOSPITAL') && !c.nombre.startsWith('INSTITUTO'));
    const hospitales = data.filter(c => c.nombre.startsWith('HOSPITAL') || c.nombre.startsWith('INSTITUTO'));

    const disp1Nivel = primerNivel.reduce((acc, c) => acc + c.disponible, 0);
    const dispHosp = hospitales.reduce((acc, c) => acc + c.disponible, 0);
    
    const oferta1Nivel = primerNivel.reduce((acc, c) => acc + c.capacidadTotal, 0);
    const uso1Nivel = primerNivel.reduce((acc, c) => acc + c.cantidad, 0);
    const percentUso = oferta1Nivel > 0 ? (uso1Nivel / oferta1Nivel) * 100 : 0;

    const stats = React.useMemo(() => {
        const uni: Record<string, number> = {};
        data.forEach(c => {
            if(c.desglose) {
                c.desglose.forEach(d => {
                    uni[d.universidad] = (uni[d.universidad] || 0) + d.cantidad;
                });
            }
        });
        const sortD = (a:any, b:any) => b[1] - a[1];
        return Object.entries(uni).sort(sortD);
    }, [data]);

    if (data.length === 0) return <div style={{padding:'40px', textAlign:'center', color:'#a78bfa', fontSize:'14px', fontStyle:'italic'}}>No hay datos registrados.</div>;
    const maxVal = stats.length > 0 ? stats[0][1] : 1;

    return (
        <div className="fade-in" style={{paddingRight:'10px'}}>
            
            {/* 1. DISPONIBILIDAD */}
            <h4 style={{ color: '#34d399', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', borderBottom:'1px solid #064e3b', paddingBottom:'5px', letterSpacing:'0.5px' }}>
                <i className="fas fa-check-circle mr-2"></i> Disponibilidad de Plazas
            </h4>
            <div style={{display:'flex', gap:'15px', marginBottom:'25px'}}>
                <div className="kpi-box" style={{background:'#064e3b', borderColor:'#059669'}}>
                    <div className="kpi-label" style={{color:'#a7f3d0'}}>Primer Nivel</div>
                    <div className="kpi-number" style={{color:'#34d399'}}>{disp1Nivel}</div>
                    <div style={{fontSize:'10px', color:'#6ee7b7'}}>Vacantes Libres</div>
                </div>
                <div className="kpi-box" style={{background:'#4c1d95', borderColor:'#be185d'}}>
                    <div className="kpi-label" style={{color:'#fda4af'}}>Hosp. e Inst.</div>
                    <div className="kpi-number" style={{color:'#f43f5e'}}>{dispHosp}</div>
                    <div style={{fontSize:'10px', color:'#fbcfe8'}}>Vacantes Libres</div>
                </div>
            </div>

            {/* 2. OCUPACIÓN PRIMER NIVEL */}
            <h4 style={{ color: '#60a5fa', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', borderBottom:'1px solid #1e3a8a', paddingBottom:'5px', letterSpacing:'0.5px' }}>
                <i className="fas fa-chart-pie mr-2"></i> Ocupación Primer Nivel
            </h4>
            <div style={{marginBottom:'25px', background:'#1e1b4b', padding:'15px', borderRadius:'10px', border:'1px solid #312e81'}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#cbd5e1', marginBottom:'8px', fontWeight:'600'}}>
                    <span>Usado: <b style={{color:'#60a5fa'}}>{uso1Nivel}</b></span>
                    <span>Total: <b style={{color:'white'}}>{oferta1Nivel}</b></span>
                </div>
                <div style={{width:'100%', height:'16px', background:'#0f172a', borderRadius:'8px', overflow:'hidden', border:'1px solid #334155', position:'relative'}}>
                    <div style={{width: `${percentUso}%`, height:'100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', transition:'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'}}></div>
                </div>
                <div style={{textAlign:'right', fontSize:'11px', color:'#a5b4fc', marginTop:'6px', fontWeight:'700'}}>{percentUso.toFixed(1)}% Cubierto</div>
            </div>

            {/* 3. TIEMPOS DE ROTACIÓN */}
            {tiempos && Object.keys(tiempos).length > 0 && (
                <div style={{marginBottom:'25px'}}>
                    <h4 style={{ color: '#fbbf24', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginTop: '10px', borderBottom:'1px solid #78350f', paddingBottom:'5px', letterSpacing:'0.5px' }}>
                        <i className="fas fa-clock mr-2"></i> Tiempos de Rotación (Meses)
                    </h4>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'10px'}}>
                         {Object.entries(tiempos).map(([uni, t]:any) => (
                             <div key={uni} style={{background:'#312e81', padding:'10px', borderRadius:'8px', border:'1px solid #4c1d95'}}>
                                 <div style={{fontSize:'10px', fontWeight:'700', color:'#e2e8f0', marginBottom:'5px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{uni}</div>
                                 <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                                     <span style={{color:'#34d399'}}>PN: <b>{t.mesesPrimerNivel || '-'}</b></span>
                                     <span style={{color:'#f472b6'}}>H: <b>{t.mesesHospital || '-'}</b></span>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>
            )}

            {/* 4. ASIGNACIÓN UNIVERSIDAD */}
            <h4 style={{ color: '#a78bfa', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', margin: '10px 0 15px 0', borderBottom:'1px solid #581c87', paddingBottom:'5px', letterSpacing:'0.5px' }}>
                <i className="fas fa-university mr-2"></i> Asignación por Universidad
            </h4>
            <div style={{paddingBottom:'20px'}}>
                {stats.map(([k, v]) => (
                    <div key={k} className="chart-row">
                        <div className="chart-label-container"><span className="chart-label">{k}</span></div>
                        <div className="chart-track">
                            <div className="chart-fill" style={{ width: `${(v / maxVal) * 100}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}>
                                <span className="chart-value-label">{v}</span>
                            </div>
                        </div>
                        <div className="chart-total">{v}</div>
                    </div>
                ))}
            </div>
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
  const [tipoMapa, setTipoMapa] = useState<'claro' | 'oscuro' | 'satelite'>('oscuro');
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

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/yurivilc/peru-geojson/master/lima_callao_distritos.geojson')
      .then(res => res.json()).then(data => setGeoJsonData(data)).catch(console.error);
  }, []);

  useEffect(() => {
      // CARGAR TODO AL CAMBIAR CARRERA
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

  // --- CARGA DE DATOS ---
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
      } catch (error) { 
          console.error(`Error cargando:`, error); 
          setCentros(dataCentrosBase.map(c => ({ ...c, capacidadTotal: 0, desglose: [], disponible: 0, cantidad: 0 }))); 
      }
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

  // --- GESTIÓN MANUAL ---
  const handleOpenEdit = (centro: CentroSalud) => {
      setEditCentroId(centro.nombre);
      setEditTotalCapacity(centro.capacidadTotal || 0); 
      const vals: Record<string, number> = {};
      // Precargar datos existentes para que no salgan en 0
      if(centro.desglose) {
          centro.desglose.forEach(d => vals[d.universidad] = d.cantidad);
      }
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
          if(!confirm(`⚠️ Cuidado: Asignaste ${totalAsignado} plazas, pero la oferta es ${editTotalCapacity}. ¿Guardar?`)) return;
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

  // --- FILTRADO ---
  const centrosFiltrados = centros.map(centro => centro).filter(c => {
      const cumpleDistrito = filtroDistrito === 'todos' || (c.distrito && c.distrito === filtroDistrito);
      const matchSearch = searchTerm === '' || c.nombre.includes(searchTerm.toUpperCase());
      let cumpleTipo = true;
      if (filtroRis === 'HOSP') cumpleTipo = c.ris === 'SIN RIS';
      else if (filtroRis !== 'todos') cumpleTipo = c.ris === filtroRis;
      return cumpleDistrito && matchSearch && cumpleTipo;
  }).sort((a, b) => b.capacidadTotal - a.capacidadTotal);

  const modalCentrosFiltrados = centros.filter(c => c.nombre.includes(modalSearchTerm.toUpperCase()));

  const totalCapacidadGlobal = centrosFiltrados.reduce((acc, curr) => acc + curr.capacidadTotal, 0);
  const totalDisponibleGlobal = centrosFiltrados.reduce((acc, curr) => acc + curr.disponible, 0);

  const toggleCentro = (nombreCentro: string, lat: number, lng: number) => {
    if (centroExpandido === nombreCentro) setCentroExpandido(null);
    else { setCentroExpandido(nombreCentro); if (lat !== 0 && lat !== -12.046374) { setMapCenter([lat, lng]); setMapZoom(16); } }
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#2e1065', color: '#e2e8f0' }}>
      
      {/* HEADER */}
      <div style={{ background: '#4c1d95', padding: '0 24px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #6d28d9', zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: '#8b5cf6', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-calendar-check" style={{ fontSize: '20px', color: 'white' }}></i>
            </div>
            <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#f8fafc' }}>
                    ADJUDICACIÓN <span style={{ color: '#a78bfa' }}>2026</span>
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.6 }}>GESTIÓN DE PLAZAS</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowTimeModal(true)} disabled={selectedCareer === 'TODAS'} className="btn-modern" style={{ background: selectedCareer === 'TODAS' ? '#4b5563' : '#8b5cf6', color: 'white' }}>
                  <i className="fas fa-clock"></i> Tiempos
              </button>
              <button onClick={() => setShowManageModal(true)} disabled={selectedCareer === 'TODAS'} className="btn-modern" style={{ background: selectedCareer === 'TODAS' ? '#4b5563' : '#10b981', color: 'white' }}>
                  <i className="fas fa-edit"></i> Gestión Manual
              </button>
              <button onClick={() => navigate('/')} className="btn-modern btn-close">
                  <i className="fas fa-arrow-left"></i> Volver 2025
              </button>
          </div>
      </div>

      {/* FILTROS */}
      <div style={{ padding: '15px 24px', background: '#4c1d95', borderBottom: '1px solid #6d28d9', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{display:'flex', alignItems:'center', marginRight:'15px'}}>
              <span style={{fontSize:'12px', color:'#a5b4fc', marginRight:'8px', fontWeight:'700'}}>CARRERA:</span>
              <select value={selectedCareer} onChange={(e) => setSelectedCareer(e.target.value)} className="career-select" style={{ width: '240px' }}>
                  {CARRERAS_PARA_CARGA.map(c => <option key={c.id} value={c.id}>🎓 {c.label}</option>)}
              </select>
          </div>
          <div style={{ position: 'relative', flex: 1 }}><input type="text" placeholder="Buscar Sede..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} style={{ width: '100%', padding: '8px 8px 8px 12px', borderRadius: '6px', border: '1px solid #6d28d9', background: '#2e1065', color: 'white', fontSize: '13px', boxSizing: 'border-box' }} /></div>
          <select value={filtroDistrito} onChange={(e) => setFiltroDistrito(e.target.value)} style={{ width: '180px', padding: '8px', borderRadius: '6px', border: '1px solid #6d28d9', background: '#2e1065', color: 'white', fontSize: '13px' }}> <option value="todos">📍 Todos los Distritos</option> {LISTA_DISTRITOS.map(d => <option key={d} value={d}>{d}</option>)} </select>
          <button onClick={() => setFiltroRis(filtroRis === 'HOSP' ? 'todos' : 'HOSP')} className="btn-modern" style={{ background: filtroRis === 'HOSP' ? '#f43f5e' : '#2e1065', border: '1px solid #f43f5e' }}>🏥 HOSP/INST</button>
      </div>

      {/* MODAL TIEMPOS (DISEÑO PRO) */}
      {showTimeModal && (
          <div className="modal-overlay">
              <div className="modal-content" style={{maxWidth:'800px', height:'80vh'}}>
                  <div className="modal-header">
                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                         <i className="fas fa-clock" style={{color:'#fbbf24', fontSize:'20px'}}></i>
                         <h3 style={{margin:0, color:'#fbbf24'}}>Tiempos de Rotación (Meses)</h3>
                      </div>
                      <button onClick={() => setShowTimeModal(false)} className="close-modal-btn"><i className="fas fa-times"></i></button>
                  </div>
                  <div className="modal-body custom-scrollbar">
                       <div className="time-grid">
                           {UNIVERSIDADES.map(uni => (
                               <div key={uni} className="time-card">
                                    <div style={{fontSize:'11px', fontWeight:'700', color:'#e2e8f0', marginBottom:'10px', borderBottom:'1px solid #4c1d95', paddingBottom:'5px', minHeight:'32px', display:'flex', alignItems:'center'}}>{uni}</div>
                                    <div className="time-field">
                                        <span className="time-icon">🏥</span> <span style={{fontSize:'11px', color:'#a5b4fc'}}>Primer Nivel</span>
                                        <input type="text" className="input-meses-card" placeholder="-" 
                                               value={tiemposRotacion[uni]?.mesesPrimerNivel || ''}
                                               onChange={(e) => handleTimeChange(uni, 'mesesPrimerNivel', e.target.value)} />
                                    </div>
                                    <div className="time-field">
                                        <span className="time-icon">🏢</span> <span style={{fontSize:'11px', color:'#a5b4fc'}}>Hospital</span>
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

      {/* MODAL GESTIÓN (DISEÑO PRO) */}
      {showManageModal && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <div className="modal-header">
                      <h3 style={{margin:0, color:'#a78bfa'}}>Gestión Manual: {CARRERAS_PARA_CARGA.find(c=>c.id===selectedCareer)?.label}</h3>
                      <div style={{display:'flex', gap:'10px'}}>
                          <input type="text" placeholder="Filtrar lista..." value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)} className="input-plaza" style={{width:'200px', textAlign:'left'}} />
                          <button onClick={() => setShowManageModal(false)} className="close-modal-btn"><i className="fas fa-times"></i></button>
                      </div>
                  </div>
                  <div className="modal-body custom-scrollbar">
                      {modalCentrosFiltrados.map((centro) => (
                          <div key={centro.nombre} className="edit-card-container">
                              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', alignItems:'center'}}>
                                  <div style={{flex:1}}>
                                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                          <i className={`fas ${centro.nombre.startsWith('CS') ? 'fa-clinic-medical' : 'fa-hospital'}`} style={{color: getColorByRis(centro.ris, centro.tipo)}}></i>
                                          <span style={{fontWeight:'700', color:'#e2e8f0', fontSize:'14px'}}>{centro.nombre}</span>
                                      </div>
                                      <div style={{fontSize:'11px', color:'#94a3b8', marginTop:'4px', marginLeft:'26px'}}>
                                          Ofertado: <b style={{color:'white'}}>{centro.capacidadTotal}</b> | 
                                          Libre: <b style={{color: centro.disponible > 0 ? '#34d399' : '#f43f5e'}}>{centro.disponible}</b>
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
                                  <div style={{background:'#0f172a', padding:'20px', borderRadius:'10px', border:'1px solid #6366f1', animation:'fadeIn 0.3s'}}>
                                      <div style={{marginBottom:'20px', display:'flex', alignItems:'center', gap:'15px', borderBottom:'1px solid #334155', paddingBottom:'15px'}}>
                                          <label style={{fontSize:'13px', fontWeight:'800', color:'#34d399', textTransform:'uppercase'}}>Capacidad Total:</label>
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
                                  <div style={{fontSize:'10px', color:'#94a3b8', display:'flex', flexWrap:'wrap', gap:'6px', paddingLeft:'26px', marginTop:'5px'}}>
                                      {centro.desglose && centro.desglose.length > 0 ? centro.desglose.map(d => (
                                          <span key={d.universidad} style={{background:'#4c1d95', padding:'4px 8px', borderRadius:'4px', border:'1px solid #6d28d9', color:'#e2e8f0', display:'flex', alignItems:'center', gap:'5px'}}>
                                              <span style={{maxWidth:'150px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{d.universidad}</span>
                                              <b style={{color:'#f472b6', background:'#312e81', padding:'1px 6px', borderRadius:'3px'}}>{d.cantidad}</b>
                                          </span>
                                      )) : <span style={{opacity:0.5, fontStyle:'italic'}}>Sin asignaciones.</span>}
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
          <div style={{ flex: 3, position: 'relative', borderRight: '1px solid #6d28d9' }}>
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%", background: '#2e1065' }} zoomControl={false}>
                  <MapController center={mapCenter} zoom={mapZoom} />
                  <TileLayer url={TILE_LAYERS[tipoMapa]} attribution='&copy; CARTO' />
                  {geoJsonData && <GeoJSON data={geoJsonData} style={styleGeoJson} />}
                  {centrosFiltrados.map((centro, idx) => {
                      if (centro.sinCoordenadas) return null;
                      const isSelected = centroExpandido === centro.nombre;
                      const colorRis = getColorByRis(centro.ris, centro.tipo);
                      return (
                        <CircleMarker key={idx} center={[centro.lat, centro.lng]} pathOptions={{ color: isSelected ? 'white' : colorRis, fillColor: isSelected ? 'transparent' : colorRis, fillOpacity: isSelected ? 0 : 0.8, weight: isSelected ? 3 : 0, dashArray: isSelected ? '4,4' : '' }} radius={isSelected ? 12 : 6} eventHandlers={{ click: () => toggleCentro(centro.nombre, centro.lat, centro.lng) }}>
                             {isSelected && <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="label-mapa"> {centro.nombre} (Libres: {centro.disponible}) </Tooltip>}
                             {!isSelected && <Tooltip direction="top" offset={[0, -5]} opacity={1}> {centro.nombre}: {centro.disponible} libres </Tooltip>}
                        </CircleMarker>
                      );
                  })}
              </MapContainer>
          </div>

          <div style={{ flex: 1, minWidth: '340px', background: '#4c1d95', display: 'flex', flexDirection: 'column', boxShadow:'-5px 0 15px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #6d28d9', background:'#3b0764' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', gap:'10px' }}>
                       <div style={{ background: 'linear-gradient(135deg, #5b21b6, #4c1d95)', padding: '15px', borderRadius: '12px', flex: 1, textAlign:'center', boxShadow:'0 4px 10px rgba(91, 33, 182, 0.3)', border:'1px solid #6d28d9' }}>
                           <div style={{ fontSize: '11px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', letterSpacing:'1px' }}>Total Ofertado</div>
                           <div style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', marginTop:'5px' }}>{totalCapacidadGlobal}</div>
                       </div>
                       <div style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', padding: '15px', borderRadius: '12px', flex: 1, textAlign:'center', boxShadow:'0 4px 10px rgba(6, 78, 59, 0.3)', border:'1px solid #047857' }}>
                           <div style={{ fontSize: '11px', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', letterSpacing:'1px' }}>Disponible Total</div>
                           <div style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', marginTop:'5px' }}>{totalDisponibleGlobal}</div>
                       </div>
                  </div>
                  <div style={{ display: 'flex', background: '#2e1065', borderRadius: '8px', padding: '4px' }}>
                      <button onClick={() => setActiveTab('lista')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: activeTab === 'lista' ? '#8b5cf6' : 'transparent', color: activeTab === 'lista' ? 'white' : '#a78bfa', fontWeight: '700', cursor: 'pointer', transition:'all 0.2s' }}>SEDES</button>
                      <button onClick={() => setActiveTab('reportes')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: activeTab === 'reportes' ? '#8b5cf6' : 'transparent', color: activeTab === 'reportes' ? 'white' : '#a78bfa', fontWeight: '700', cursor: 'pointer', transition:'all 0.2s' }}>GRÁFICOS</button>
                  </div>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px', background:'#4c1d95' }} className="custom-scrollbar">
                  {activeTab === 'lista' ? (
                      centrosFiltrados.map((centro) => {
                          const isExpanded = centroExpandido === centro.nombre;
                          const colorRis = getColorByRis(centro.ris, centro.tipo);
                          return (
                              <div key={centro.nombre} style={{ marginBottom: '12px', border: `1px solid ${isExpanded ? colorRis : '#6d28d9'}`, borderRadius: '10px', background: '#2e1065', overflow: 'hidden', boxShadow:'0 2px 5px rgba(0,0,0,0.1)', transition:'all 0.2s' }}>
                                  <div onClick={() => toggleCentro(centro.nombre, centro.lat, centro.lng)} style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? `linear-gradient(90deg, ${colorRis}20, transparent)` : 'transparent' }}>
                                      <div style={{ overflow: 'hidden', flex: 1, display:'flex', alignItems:'center', gap:'8px' }}>
                                          <i className="fas fa-map-marker-alt" style={{color:colorRis}}></i>
                                          <div>
                                              <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '13px' }}>{centro.nombre}</div>
                                              <div style={{fontSize:'11px', color:'#94a3b8', display:'flex', gap:'10px'}}>
                                                  <span>Capacidad: <b>{centro.capacidadTotal}</b></span>
                                              </div>
                                          </div>
                                      </div>
                                      <span style={{ background: centro.disponible > 0 ? '#064e3b' : '#450a0a', color: centro.disponible > 0 ? '#34d399' : '#fca5a5', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', border: '1px solid #ffffff20', minWidth:'70px', textAlign:'center' }}>{centro.disponible} Libres</span>
                                  </div>
                                  {isExpanded && (
                                      <div style={{ padding: '15px', background: '#3b0764', borderTop: '1px solid #6d28d9', animation:'fadeIn 0.2s ease-out' }}>
                                          <div style={{fontSize:'11px', color:'#a78bfa', marginBottom:'12px', fontWeight:'800', letterSpacing:'0.5px'}}>ASIGNADO ({centro.cantidad}):</div>
                                          {centro.desglose?.map((d, i) => (
                                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', background:'#4c1d95', padding:'6px 10px', borderRadius:'6px' }}>
                                                  <span style={{color: '#e2e8f0', fontWeight:'600'}}>{d.universidad}</span>
                                                  <div style={{textAlign:'right'}}>
                                                      <span style={{fontWeight:'800', color: '#f472b6', display:'block'}}>{d.cantidad}</span>
                                                  </div>
                                              </div>
                                          ))}
                                          {(!centro.desglose || centro.desglose.length === 0) && <div style={{fontSize:'12px', color:'#64748b', fontStyle:'italic', padding:'10px', textAlign:'center', background:'#4c1d95', borderRadius:'6px'}}>Sin asignaciones registradas.</div>}
                                      </div>
                                  )}
                              </div>
                          );
                      })
                  ) : (
                      <div className="fade-in">
                          <StatsWidget data={centrosFiltrados} tiempos={tiemposRotacion} />
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Adjudicacion2026;