import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as XLSX from 'xlsx'; 
import { useNavigate } from 'react-router-dom';

// --- IMPORTAR FIREBASE ---
import { db } from './firebaseConfig'; 
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

// ==========================================
// UTILITIES Y CONSTANTES GENERALES
// ==========================================

const AZUL_PRINCIPAL = '#195c97';
const VERDE_PRINCIPAL = '#329584';
const BLANCO_PRINCIPAL = '#ffffff';
const GRIS_FONDO = '#f8f9fa'; 

// Función para generar un ID de elemento HTML seguro a partir de un nombre
const getSafeHtmlId = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_');

// ==========================================
// 0. ESTILOS CSS INYECTADOS
// ==========================================
const styleInjection = `
  body { margin: 0; background-color: ${BLANCO_PRINCIPAL}; color: #333; font-family: 'Segoe UI', sans-serif; }
  
  /* Scrollbar simple para tema claro */
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #999; }
  
  /* Tooltip para las etiquetas del mapa */
  .leaflet-tooltip.label-mapa {
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid ${AZUL_PRINCIPAL};
    color: #333; 
    font-weight: 700; 
    font-size: 11px;
    border-radius: 6px; 
    padding: 2px 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    backdrop-filter: blur(4px);
  }
  .leaflet-tooltip-bottom:before { border-bottom-color: rgba(255, 255, 255, 0.95); }
  
  .fade-in { animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform { translateY(5px); } } to { opacity: 1; transform { translateY(0); } } }

  .chart-bar-bg { background: #e0e0e0; border-radius: 4px; height: 8px; overflow: hidden; width: 100%; margin-top: 4px; }
  .chart-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }

  /* Estilos para el nuevo buscador de sedes (Profesional) */
  .autocomplete-container { position: relative; width: 100%; }
  .autocomplete-list { 
    position: absolute; 
    top: calc(100% + 5px); 
    left: 0; 
    right: 0; 
    z-index: 1000; 
    background-color: ${BLANCO_PRINCIPAL}; 
    border: 1px solid ${AZUL_PRINCIPAL}; 
    max-height: 250px; 
    overflow-y: auto; 
    box-shadow: 0 6px 12px rgba(0,0,0,0.2);
    border-radius: 6px; 
  }
  .autocomplete-item {
    padding: 10px 12px;
    cursor: pointer;
    font-size: 13px;
    color: #333;
    border-bottom: 1px solid #f0f0f0;
    display: block; 
  }
  .autocomplete-item:last-child { border-bottom: none; }
  .autocomplete-item:hover { background-color: #e6f7ff; color: ${AZUL_PRINCIPAL}; }
  .autocomplete-item-details { 
    font-size: 10px; 
    font-weight: 600; 
    display: block; 
    margin-top: 2px;
    color: #666; 
}
  /* Estilo para el elemento seleccionado en la lista (para asegurar visibilidad) */
  .centro-seleccionado {
    background-color: #e6f7ff !important;
    border-color: ${AZUL_PRINCIPAL} !important;
  }
`;

// ==========================================
// 1. CONFIGURACIÓN (CON COLORES DE HOSPITALES/INSTITUTOS)
// ==========================================

const RIS_COLORS: Record<string, string> = {
    // Colores de RIS originales del mapa (se mantienen)
    'RIS 1': '#10b981', 'RIS 2': '#facc15', 'RIS 3': '#f97316', 
    'RIS 4': '#3b82f6', 'RIS 5': '#ef4444', 'RIS 6': '#8b5cf6', 
    'RIS 7': '#ec4899', 'DEFAULT': '#64748b',
    // AGREGADO: Colores específicos para Hospitales/Institutos
    'SIN RIS': '#94a3b8', 'HOSPITAL': '#f43f5e', 'INSTITUTO': '#a855f7' 
};

const DISTRICT_TO_RIS: Record<string, string> = {
    'LIMA': 'RIS 1', 'CERCADO DE LIMA': 'RIS 1',
    'BREÑA': 'RIS 2', 'JESUS MARIA': 'RIS 2', 'PUEBLO LIBRE': 'RIS 2',
    'MAGDALENA DEL MAR': 'RIS 3', 'SAN MIGUEL': 'RIS 3',
    'LINCE': 'RIS 4', 'SAN ISIDRO': 'RIS 4', 'MIRAFLORES': 'RIS 4', 'SAN BORJA': 'RIS 4', 'SURQUILLO': 'RIS 4',
    'LA VICTORIA': 'RIS 5', 'SAN LUIS': 'RIS 5',
    'EL AGUSTINO': 'RIS 5', 'SANTA ANITA': 'RIS 5',
    'SAN JUAN DE LURIGANCHO': 'RIS 6', 
    'RIMAC': 'RIS 7', 'INDEPENDENCIA': 'RIS 7', 'COMAS': 'RIS 7'
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
    satelite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
};

// ==========================================
// 2. UTILIDADES
// ==========================================
const normalizarTexto = (texto: string) => {
  if (!texto) return "";
  return String(texto).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 ]/g, "").trim();
};

const calcularSimilitud = (str1: string, str2: string) => {
  const s1 = normalizarTexto(str1).replace(/\s+/g, '');
  const s2 = normalizarTexto(str2).replace(/\s+/g, '');
  if (s1 === s2) return 1; 
  if (s1.includes(s2) || s2.includes(s1)) return 0.95;
  return 0; 
};

const formatearFechaExcel = (valor: any) => {
    if (!valor) return "";
    if (typeof valor === 'number') {
        const date = new Date(Math.round((valor - 25569) * 86400 * 1000));
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return String(valor).trim();
};

const esSedeValida = (n: string) => !n.startsWith("HS ") && !n.startsWith("INST ") && !n.startsWith("HOSPITAL") && !n.startsWith("INSTITUTO");

const LISTA_UNIVERSIDADES = ["PRIVADA DEL NORTE", "CÉSAR VALLEJO", "MAYOR DE SAN MARCOS", "SAN MARTIN DE PORRES", "PERUANA CAYETANO HEREDIA", "CONTINENTAL", "NORBERT WIENER", "CIENTIFICA DEL SUR", "RICARDO PALMA", "CIENCIAS Y HUMANIDADES", "DANIEL ALCIDES CARRION", "FEDERICO VILLARREAL", "TECNOLÓGICA DEL PERÚ", "SAN JUAN BAUTISTA", "MARIA AUXILIADORA", "PERUANA DE CIENCIAS APLICADAS", "LE CORDON BLEU", "ENRIQUE GUZMAN Y VALLE", "CATOLICA SEDES SAPIENTIAE", "PERUANA UNION", "PIURA", "ALTIPLANO DE PUNO", "HERMILIO VALDIZAN"];
const LISTA_CARRERAS = ["OBSTETRICIA", "ENFERMERIA", "PSICOLOGÍA", "MEDICINA HUMANA", "LABORATORIO CLINICO Y ANATOMIA PATOLOGICA", "NUTRICION", "ODONTOLOGÍA", "BIOLOGIA", "RADIOLOGIA", "TERAPIA FISICA Y REHABILITACIÓN", "TERAPIA OCUPACIONAL", "TERAPIA DE LENGUAJE", "OPTOMETRÍA"];

const getPesoRotacion = (nombre: string) => {
    const n = nombre.toUpperCase();
    if (n.includes("PRIMERA") || n.includes("1RA") || n === "1") return 1;
    if (n.includes("SEGUNDA") || n.includes("2DA") || n === "2") return 2;
    if (n.includes("TERCERA") || n.includes("3RA") || n === "3") return 3;
    return 99; 
};

// --- DATOS BASE (Hospitales e Institutos incluidos) ---
const dataCentrosBase = [
  // RIS 1
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
  { id: 'r7_6', ris: 'RIS 7', nombre: 'CS JUAN PABLO II', lat: -11.952272, lng: -77.077927, distrito: 'SAN MARTIN DE PORRES' }, // Excepción SJL/SMP
  { id: 'r7_7', ris: 'RIS 7', nombre: 'CS SANTA MARIA', lat: -11.964929, lng: -76.975984, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_8', ris: 'RIS 7', nombre: 'PS CESAR VALLEJO', lat: -11.939452, lng: -76.965759, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_9', ris: 'RIS 7', nombre: 'PS JOSE CARLOS MARIATEGUI V ETAPA', lat: -11.931092, lng: -76.990411, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_10', ris: 'RIS 7', nombre: 'PS MARISCAL CACERES', lat: -11.949206, lng: -76.981080, distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'r7_11', ris: 'RIS 7', nombre: 'PS TUPAC AMARU II', lat: -11.955745, lng: -76.975792, distrito: 'SAN JUAN DE LURIGANCHO' },

{ id: 'h_1', ris: 'SIN RIS', nombre: 'HOSPITAL NACIONAL DOS DE MAYO', lat: -12.056369, lng: -77.016048, tipo: 'HOSPITAL', distrito: 'CERCADO DE LIMA' },
  { id: 'h_2', ris: 'SIN RIS', nombre: 'HOSPITAL NACIONAL ARZOBISPO LOAYZA', lat: -12.049516, lng: -77.042667, tipo: 'HOSPITAL', distrito: 'CERCADO DE LIMA' },
  { id: 'h_3', ris: 'SIN RIS', nombre: 'HOSPITAL SAN JUAN DE LURIGANCHO', lat: -11.966064, lng: -77.003482, tipo: 'HOSPITAL', distrito: 'SAN JUAN DE LURIGANCHO' },
  { id: 'h_4', ris: 'SIN RIS', nombre: 'HOSPITAL NACIONAL SAN BARTOLOME', lat: -12.049583, lng: -77.042110, tipo: 'HOSPITAL', distrito: 'CERCADO DE LIMA' },
  { id: 'h_5', ris: 'SIN RIS', nombre: 'HOSPITAL DE EMERGENCIAS JOSE CASIMIRO ULLOA', lat: -12.127835, lng: -77.017796, tipo: 'HOSPITAL', distrito: 'MIRAFLORES' },
  { id: 'h_6', ris: 'SIN RIS', nombre: 'HOSPITAL SANTA ROSA', lat: -12.071516, lng: -77.061070, tipo: 'HOSPITAL', distrito: 'PUEBLO LIBRE' },
  { id: 'h_7', ris: 'SIN RIS', nombre: 'HOSPITAL VICTOR LARCO HERRERA', lat: -12.097315, lng: -77.064832, tipo: 'HOSPITAL', distrito: 'MAGDALENA DEL MAR' },
  { id: 'h_8', ris: 'SIN RIS', nombre: 'HOSPITAL DE EMERGENCIAS PEDIÁTRICAS', lat: -12.058125, lng: -77.021607, tipo: 'HOSPITAL', distrito: 'LA VICTORIA' },
  { id: 'i_1', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL DE ENFERMEDADES NEOPLÁSICAS', lat: -12.112320, lng: -76.998266, tipo: 'INSTITUTO', distrito: 'SAN BORJA' },
  { id: 'i_2', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL DE SALUD DEL NIÑO-BREÑA', lat: -12.064247, lng: -77.045720, tipo: 'INSTITUTO', distrito: 'BREÑA' },
  { id: 'i_3', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL DE SALUD DEL NIÑO-SAN BORJA', lat: -12.085823, lng: -76.992491, tipo: 'INSTITUTO', distrito: 'SAN BORJA' },
  { id: 'i_4', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL MATERNO PERINATAL', lat: -12.052537, lng: -77.022163, tipo: 'INSTITUTO', distrito: 'CERCADO DE LIMA' },
  { id: 'i_5', ris: 'SIN RIS', nombre: 'INSTITUTO NACIONAL DE CIENCIAS NEUROLÓGICAS', lat: -12.045887, lng: -77.015878, tipo: 'INSTITUTO', distrito: 'CERCADO DE LIMA' }
];
// --- INTERFACES (se mantienen) ---
interface RotacionDetalle { nombre: string; establecimiento: string; fechaInicio?: string; fechaFin?: string; tipo?: string; }
interface DetalleInterno { dni: string; carrera?: string; universidad?: string; facultad?: string; rotaciones: RotacionDetalle[]; }
interface CentroSalud { id?: string; ris: string; nombre: string; lat: number; lng: number; cantidad: number; detalles?: DetalleInterno[]; sinCoordenadas?: boolean; cantidadVisual?: number; detallesVisuales?: DetalleInterno[]; distrito?: string; tipo?: string; }

// --- CONTROLADOR MAPA (se mantiene) ---
const MapController = ({ center, zoom }: { center: L.LatLngExpression, zoom: number }) => {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.5 }); }, [center, zoom, map]);
  return null;
};

// --- WIDGET DE ESTADÍSTICAS (Actualizado con nuevos colores) ---
const StatsWidget = ({ data }: { data: CentroSalud[] }) => {
    const stats = React.useMemo(() => {
        const carr: Record<string, number> = {};
        const uni: Record<string, number> = {};
        data.forEach(c => {
            c.detallesVisuales?.forEach(d => {
                const ca = d.carrera || 'OTROS'; const un = d.universidad || 'OTROS';
                carr[ca] = (carr[ca] || 0) + 1; uni[un] = (uni[un] || 0) + 1;
            });
        });
        const sortD = (a:any, b:any) => b[1] - a[1];
        return { carreras: Object.entries(carr).sort(sortD), universidades: Object.entries(uni).sort(sortD) };
    }, [data]);

    const renderBar = (label: string, val: number, max: number, color: string) => (
        <div key={label} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', fontSize: '11px' }}>
            <div style={{ width: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#666', textAlign: 'right', paddingRight: '10px' }}>{label}</div>
            <div style={{ flex: 1, background: '#e0e0e0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(val / max) * 100}%`, background: color, height: '100%', borderRadius: '4px' }}></div>
            </div>
            <div style={{ width: '30px', paddingLeft: '10px', fontWeight: '700', color: '#333' }}>{val}</div>
        </div>
    );

    if (data.length === 0) return <div style={{padding:'20px', textAlign:'center', color:'#999', fontSize:'12px'}}>No hay datos para mostrar.</div>;
    return (
        <div className="fade-in">
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: AZUL_PRINCIPAL, fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', borderBottom:'1px solid #ddd', paddingBottom:'5px' }}>Por Carrera</h4>
                {stats.carreras.map(([k, v]) => renderBar(k, v, stats.carreras[0][1], AZUL_PRINCIPAL))}
            </div>
            <div>
                <h4 style={{ color: VERDE_PRINCIPAL, fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', borderBottom:'1px solid #ddd', paddingBottom:'5px' }}>Por Universidad</h4>
                {stats.universidades.map(([k, v]) => renderBar(k, v, stats.universidades[0][1], VERDE_PRINCIPAL))}
            </div>
        </div>
    );
};

// ==========================================
// 4. COMPONENTE PRINCIPAL
// ==========================================
const MapaRis: React.FC = () => {
  const navigate = useNavigate(); // Hook de navegación
  
    // Referencia para el contenedor de la lista lateral para hacer scroll
    const listRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
      const styleElement = document.createElement("style"); styleElement.innerHTML = styleInjection;
      document.head.appendChild(styleElement); return () => { document.head.removeChild(styleElement); };
  }, []);

  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression>([-12.05, -77.06]);
  const [mapZoom, setMapZoom] = useState(12);
  const [tipoMapa, setTipoMapa] = useState<'claro' | 'satelite'>('claro'); // Eliminado 'oscuro'
  const [activeTab, setActiveTab] = useState<'lista' | 'reportes'>('lista'); 

  const [filtroRis, setFiltroRis] = useState('todos');
  const [filtroDistrito, setFiltroDistrito] = useState('todos'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroUniversidad, setFiltroUniversidad] = useState('todas');
  const [filtroCarrera, setFiltroCarrera] = useState('todas');
  
  // --- ESTADO AGREGADO PARA EL BUSCADOR DE SEDES ---
  const [sedeSearchTerm, setSedeSearchTerm] = useState('');
  const [sedeSearchResults, setSedeSearchResults] = useState<CentroSalud[]>([]);
  // ----------------------------------------------------

  const [centros, setCentros] = useState<CentroSalud[]>([]);
  const [centroExpandido, setCentroExpandido] = useState<string | null>(null);
  
  const [listaUniversidades, setListaUniversidades] = useState<string[]>([]);
  const [listaCarreras, setListaCarreras] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/yurivilc/peru-geojson/master/lima_callao_distritos.geojson')
      .then(res => res.json()).then(data => setGeoJsonData(data)).catch(console.error);
    cargarDatosFirebase();
  }, []);

  // --- LÓGICA AGREGADA PARA EL BUSCADOR DE SEDES ---
  useEffect(() => {
    if (sedeSearchTerm.length > 2) {
      const normalizedSearch = normalizarTexto(sedeSearchTerm);
      const results = centros.filter(c => normalizarTexto(c.nombre).includes(normalizedSearch));
      setSedeSearchResults(results);
    } else {
      setSedeSearchResults([]);
    }
  }, [sedeSearchTerm, centros]);

  const handleSedeSelect = (centro: CentroSalud) => {
    // 1. Mueve el mapa al centro seleccionado
    if (centro.lat && centro.lng && centro.lat !== 0 && centro.lng !== 0) { 
      setMapCenter([centro.lat, centro.lng]);
      setMapZoom(16);
    }
    
    // 2. Expande el detalle en la lista lateral
    setCentroExpandido(centro.nombre);
    
    // 3. Asegura que el elemento sea visible en la lista lateral (Scroll)
    setTimeout(() => {
        const element = document.getElementById(`centro-${getSafeHtmlId(centro.nombre)}`);
        if (element && listRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);

    // 4. Limpia el buscador
    setSedeSearchTerm('');
    setSedeSearchResults([]);
  };
  // ----------------------------------------------------


  const styleGeoJson = (feature: any) => {
      const rawName = feature.properties.NOMBDIST || feature.properties.NOMB_DIST || "";
      const distrito = normalizarTexto(rawName); 
      const risAsignada = DISTRICT_TO_RIS[distrito] || 'DEFAULT';
      const color = RIS_COLORS[risAsignada];
      const esVisible = (filtroRis === 'todos' || risAsignada === filtroRis) && (filtroDistrito === 'todos' || distrito === normalizarTexto(filtroDistrito));
      const esJurisdiccion = risAsignada !== 'DEFAULT';
      return { fillColor: color, weight: esJurisdiccion ? 1 : 0.5, opacity: 1, color: BLANCO_PRINCIPAL, fillOpacity: esVisible ? 0.5 : 0.1 };
  };

  const actualizarListasFiltros = (data: CentroSalud[]) => {
      const unis = new Set<string>(); const carrs = new Set<string>();
      data.forEach(c => c.detalles?.forEach(d => {
          if (d.universidad && d.universidad !== "SIN UNIVERSIDAD") unis.add(d.universidad);
          if (d.carrera && d.carrera !== "SIN CARRERA") carrs.add(d.carrera);
      }));
      setListaUniversidades(Array.from(unis).sort()); setListaCarreras(Array.from(carrs).sort());
  };

  const cargarDatosFirebase = async () => {
      try {
          const querySnapshot = await getDocs(collection(db, "centros"));
          const datosNube = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), detalles: doc.data().detalles || [] })) as CentroSalud[];
          const mapaNube: Record<string, CentroSalud> = {};
          datosNube.forEach(d => { mapaNube[d.nombre] = d; });
          let listaFinal = dataCentrosBase.map(base => {
              const infoNube = mapaNube[base.nombre];
              return infoNube ? { ...base, ...infoNube } : { ...base, cantidad: 0, detalles: [] };
          });
          datosNube.forEach(nube => { if (!listaFinal.find(c => c.nombre === nube.nombre)) listaFinal.push(nube); });
          setCentros(listaFinal); actualizarListasFiltros(listaFinal);
      } catch (error) { console.error("Error:", error); setCentros(dataCentrosBase.map(c => ({ ...c, cantidad: 0, detalles: [] }))); }
  };

  const procesarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBinary = evt.target?.result; const wb = XLSX.read(dataBinary, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]]; const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (jsonData.length === 0) { alert("Excel vacío."); return; }
        const primerFila = jsonData[0] as object; const keys = Object.keys(primerFila);
        const colDNI = keys.find(k => k.includes("DNI"));
        const colSede = keys.find(k => k.includes("SEDE") && k.includes("DOCENTE"));
        if (!colSede || !colDNI) { alert(`⚠️ Error de columnas.`); return; }
        
        const mapaEstudiantes: Record<string, DetalleInterno> = {};
        const colEstablecimiento = keys.find(k => k.includes("ESTABLECIMIENTO"));
        const colRotacion = keys.find(k => k.includes("NOMBRE_ROTACION"));
        const colCarrera = keys.find(k => k.includes("CARRERA"));
        const colUniversidad = keys.find(k => k.includes("UNIVERSIDAD"));
        const colFacultad = keys.find(k => k.includes("FACULTAD"));
        const colInicio = keys.find(k => k.includes("FECHA") && k.includes("INICIO"));
        const colFin = keys.find(k => k.includes("FECHA") && (k.includes("FIN") || k.includes("TERMINO")));
        const colTipo = keys.find(k => k === "TIPO");

        jsonData.forEach((row: any) => {
            const dni = String(row[colDNI]).trim();
            const sedeDocente = String(row[colSede]).trim();
            const establecimiento = colEstablecimiento ? String(row[colEstablecimiento]).trim() : sedeDocente;
            const nombreRotacion = colRotacion ? String(row[colRotacion]).trim() : "Rotación";
            const carrera = colCarrera ? String(row[colCarrera]).trim().toUpperCase() : "SIN CARRERA";
            const universidad = colUniversidad ? String(row[colUniversidad]).trim().toUpperCase() : "SIN UNIVERSIDAD";
            const facultad = colFacultad ? String(row[colFacultad]).trim() : "";
            const inicio = colInicio ? formatearFechaExcel(row[colInicio]) : "";
            const fin = colFin ? formatearFechaExcel(row[colFin]) : "";
            const tipo = colTipo ? String(row[colTipo]) : "";

            if (!dni || dni === "undefined") return;
            if (!mapaEstudiantes[dni]) mapaEstudiantes[dni] = { dni, carrera, universidad, facultad, rotaciones: [] };
            mapaEstudiantes[dni].rotaciones.push({ nombre: nombreRotacion, establecimiento, fechaInicio: inicio, fechaFin: fin, tipo: tipo });
        });

        const centrosActualizados: Record<string, CentroSalud> = {};
        dataCentrosBase.forEach(cb => { centrosActualizados[cb.nombre] = { ...cb, cantidad: 0, detalles: [] }; });
        let conteoTotal = 0; let conteoSinCoord = 0;
        const processedPairs = new Set<string>();

        jsonData.forEach((row: any) => {
            const dni = String(row[colDNI]).trim();
            const sedeExcel = String(row[colSede]).trim();
            if (!dni || !sedeExcel) return;
            let nombreCentroFinal = ""; let matchEncontrado = false;
            const exacto = dataCentrosBase.find(c => normalizarTexto(c.nombre) === normalizarTexto(sedeExcel));
            if (exacto) { nombreCentroFinal = exacto.nombre; matchEncontrado = true; } 
            else {
                let mejorScore = 0; let candidato = "";
                dataCentrosBase.forEach(cb => {
                    const score = calcularSimilitud(sedeExcel, cb.nombre);
                    if (score > 0.7 && score > mejorScore) { mejorScore = score; candidato = cb.nombre; }
                });
                if (candidato) { nombreCentroFinal = candidato; matchEncontrado = true; }
            }
            if (!matchEncontrado) {
                nombreCentroFinal = sedeExcel;
                if (!centrosActualizados[nombreCentroFinal]) {
                    centrosActualizados[nombreCentroFinal] = { id: `auto_${Math.random().toString(36).substr(2, 9)}`, ris: "HOSPITALES", nombre: nombreCentroFinal, lat: -12.046374, lng: -77.042793, cantidad: 0, detalles: [], sinCoordenadas: true };
                    conteoSinCoord++;
                }
            }
            if (mapaEstudiantes[dni]) {
                const uniqueKey = `${nombreCentroFinal}-${dni}`;
                if (!processedPairs.has(uniqueKey)) {
                    if (!centrosActualizados[nombreCentroFinal].detalles) centrosActualizados[nombreCentroFinal].detalles = [];
                    centrosActualizados[nombreCentroFinal].cantidad += 1;
                    centrosActualizados[nombreCentroFinal].detalles!.push(mapaEstudiantes[dni]);
                    processedPairs.add(uniqueKey);
                    conteoTotal++;
                }
            }
        });

        if(confirm(`Procesamiento Finalizado:\n✅ Total Internos: ${conteoTotal}\nℹ️ Centros Nuevos: ${conteoSinCoord}\n\n¿Subir a la nube?`)) {
            const batch = writeBatch(db); let opCount = 0;
            for (const centro of Object.values(centrosActualizados)) {
                if (centro.cantidad > 0 || !centro.sinCoordenadas) {
                    batch.set(doc(collection(db, "centros"), centro.nombre.replace(/[\/\s\.]/g, '_')), centro);
                    opCount++;
                }
                if (opCount >= 450) { await batch.commit(); opCount = 0; }
            }
            if (opCount > 0) await batch.commit();
            alert("✅ Carga completa."); cargarDatosFirebase(); 
        }
      } catch (error) { console.error(error); alert("Error al procesar."); }
    };
    reader.readAsArrayBuffer(file);
  };

  const centrosFiltrados = centros.map(centro => {
      const detallesFiltrados = (centro.detalles || []).filter(d => {
          const matchDNI = searchTerm === '' || d.dni.includes(searchTerm);
          const matchUni = filtroUniversidad === 'todas' || (d.universidad || '').includes(filtroUniversidad);
          const matchCarrera = filtroCarrera === 'todas' || (d.carrera || '').includes(filtroCarrera);
          return matchDNI && matchUni && matchCarrera;
      });
      const detallesOrdenados = detallesFiltrados.map(d => ({ ...d, rotaciones: [...d.rotaciones].sort((a, b) => getPesoRotacion(a.nombre) - getPesoRotacion(b.nombre)) }));
      return { ...centro, cantidadVisual: detallesOrdenados.length, detallesVisuales: detallesOrdenados };
  }).filter(c => {
      const cumpleRis = filtroRis === 'todos' || (c.ris && c.ris.includes(filtroRis));
      const cumpleDistrito = filtroDistrito === 'todos' || (c.distrito && c.distrito === filtroDistrito);
      const tieneResultados = c.cantidadVisual > 0;
      
      const isExpanded = centroExpandido === c.nombre; // Centro seleccionado por click o búsqueda
      
      // La clave aquí es que el centro seleccionado (expandido) SIEMPRE debe mostrarse
      const filtrosActivos = searchTerm !== '' || filtroUniversidad !== 'todas' || filtroCarrera !== 'todas';
      if (filtrosActivos) return (cumpleRis && cumpleDistrito && tieneResultados) || isExpanded;

      return (cumpleRis && cumpleDistrito) || isExpanded; 
  }).sort((a, b) => b.cantidadVisual - a.cantidadVisual);

  const totalInternos = centrosFiltrados.reduce((acc, curr) => acc + curr.cantidadVisual, 0);
  const universoSedes = centros.filter(c => esSedeValida(c.nombre)).length;
  const sedesActivasCount = centrosFiltrados.filter(c => esSedeValida(c.nombre) && c.cantidadVisual > 0).length;

  const toggleCentro = (nombreCentro: string, lat: number, lng: number) => {
    if (centroExpandido === nombreCentro) setCentroExpandido(null);
    else { 
      setCentroExpandido(nombreCentro); 
      
      // Centrado del mapa para Hospitales/Institutos/CS
      if (lat !== 0 && lng !== 0) { 
        setMapCenter([lat, lng]); 
        setMapZoom(16); 
      } else {
        // Fallback a Lima
        setMapCenter([-12.05, -77.06]);
        setMapZoom(12);
      }
      
      // Mueve el scroll de la lista lateral al elemento
      setTimeout(() => {
        const element = document.getElementById(`centro-${getSafeHtmlId(nombreCentro)}`);
        if (element && listRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };
    
  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: BLANCO_PRINCIPAL, color: '#333' }}>
      
      {/* HEADER */}
      <div style={{ background: AZUL_PRINCIPAL, padding: '0 24px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #104169', zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: VERDE_PRINCIPAL, width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-map-marked-alt" style={{ fontSize: '20px', color: BLANCO_PRINCIPAL }}></i>
            </div>
            <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: BLANCO_PRINCIPAL }}>
                    GEO<span style={{ color: VERDE_PRINCIPAL }}>INTERNOS</span> <span style={{color:BLANCO_PRINCIPAL, fontSize:'14px', border:'1px solid ${BLANCO_PRINCIPAL}', padding:'2px 6px', borderRadius:'4px'}}>2025</span>
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#dddddd' }}>FUENTE - INTERNAO 2025 - UFDI</p>
            </div>
          </div>
          
          <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
            {/* Selector de Capa Base del Mapa */}
            <select value={tipoMapa} onChange={(e) => setTipoMapa(e.target.value as 'claro' | 'satelite')} style={{ background: BLANCO_PRINCIPAL, color: AZUL_PRINCIPAL, border: '1px solid #ccc', borderRadius: '6px', padding: '8px 16px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                <option value="claro">Mapa Claro</option>
                <option value="satelite">Satélite</option>
            </select>
            
            <button onClick={() => navigate('/adjudicacion2026')} style={{ background: VERDE_PRINCIPAL, border: '2px solid ${BLANCO_PRINCIPAL}', color: BLANCO_PRINCIPAL, borderRadius: '6px', padding: '8px 16px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display:'flex', alignItems:'center', gap:'8px', transition:'all 0.2s' }}>
                Ir a Adjudicación 2026 <i className="fas fa-arrow-right"></i>
            </button>

            <button onClick={() => fileInputRef.current?.click()} style={{ background: BLANCO_PRINCIPAL, color: AZUL_PRINCIPAL, border: '1px solid ${AZUL_PRINCIPAL}', borderRadius: '6px', padding: '8px 16px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>Actualizar Data 2025</button>
            <input type="file" accept=".xlsx, .xls" onChange={procesarExcel} style={{display: 'none'}} ref={fileInputRef} />
          </div>
      </div>

      {/* FILTROS */}
      <div style={{ padding: '15px 24px', background: BLANCO_PRINCIPAL, borderBottom: '1px solid #ccc', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'start' }}>
          
          {/* BUSCADOR DE SEDES (Mejorado) */}
          <div className="autocomplete-container" style={{ gridColumn: 'span 1' }}>
              <input 
                  type="text" 
                  placeholder="Buscar Sede (Hospital/CS/Inst)..." 
                  value={sedeSearchTerm} 
                  onChange={(e) => setSedeSearchTerm(e.target.value)} 
                  style={{ width: '100%', padding: '8px 8px 8px 12px', borderRadius: sedeSearchResults.length > 0 ? '6px 6px 0 0' : '6px', border: `1px solid ${sedeSearchResults.length > 0 ? AZUL_PRINCIPAL : '#ccc'}`, background: BLANCO_PRINCIPAL, color: '#333', fontSize: '13px', boxSizing: 'border-box' }} 
              />
              {sedeSearchResults.length > 0 && (
                  <div className="autocomplete-list" style={{ borderRadius: '0 0 6px 6px', borderTop: 'none' }}>
                      {sedeSearchResults.map((centro) => (
                          <div 
                              key={centro.id || centro.nombre} 
                              className="autocomplete-item" 
                              onClick={() => handleSedeSelect(centro)}
                          >
                              <div style={{fontWeight: 600}}>{centro.nombre}</div>
                              <span className="autocomplete-item-details" style={{color: getColorByRis(centro.ris, centro.nombre)}}>
                                  {centro.distrito} / {centro.ris === 'SIN RIS' ? (centro.nombre.startsWith('HOSPITAL') ? 'HOSPITAL' : 'INSTITUTO') : centro.ris}
                              </span>
                          </div>
                      ))}
                  </div>
              )}
          </div>
          {/* Buscador de DNI / Interno */}
          <div style={{ position: 'relative' }}><input type="text" placeholder="Buscar DNI..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: BLANCO_PRINCIPAL, color: '#333', fontSize: '13px', boxSizing: 'border-box' }} /></div>
          
          <select value={filtroDistrito} onChange={(e) => setFiltroDistrito(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: BLANCO_PRINCIPAL, color: '#333', fontSize: '13px' }}> <option value="todos">📍 Todos los Distritos</option> {LISTA_DISTRITOS.map(d => <option key={d} value={d}>{d}</option>)} </select>
          <select value={filtroUniversidad} onChange={(e) => setFiltroUniversidad(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: BLANCO_PRINCIPAL, color: '#333', fontSize: '13px' }}> <option value="todas">🎓 Universidades</option> {LISTA_UNIVERSIDADES.map(u => <option key={u} value={u}>{u}</option>)} </select>
          <select value={filtroCarrera} onChange={(e) => setFiltroCarrera(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: BLANCO_PRINCIPAL, color: '#333', fontSize: '13px' }}> <option value="todas">🩺 Carreras</option> {LISTA_CARRERAS.map(c => <option key={c} value={c}>{c}</option>)} </select>
          <div style={{ display: 'flex', gap: '2px', background: BLANCO_PRINCIPAL, padding: '2px', borderRadius: '6px', border: '1px solid #ccc' }}> {['todos', 'RIS 1', 'RIS 2', 'RIS 3', 'RIS 4', 'RIS 5', 'RIS 6', 'RIS 7'].map(ris => ( <button key={ris} onClick={() => setFiltroRis(ris)} style={{ flexGrow: 1, padding: '6px 4px', fontSize: '10px', fontWeight: '700', border: 'none', borderRadius: '4px', cursor: 'pointer', background: filtroRis === ris ? getColorByRis(ris === 'todos' ? 'DEFAULT' : ris) : 'transparent', color: filtroRis === ris ? BLANCO_PRINCIPAL : '#666' }}>{ris === 'todos' ? 'ALL' : ris.replace('RIS ','R')}</button> ))} </div>
      </div>

      {/* MAPA Y SIDEBAR */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 3, position: 'relative', borderRight: '1px solid #ccc' }}>
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%", background: '#f0f0f0' }} zoomControl={false}>
                  <MapController center={mapCenter} zoom={mapZoom} />
                  <TileLayer url={TILE_LAYERS[tipoMapa]} attribution='&copy; CARTO' />
                  {geoJsonData && <GeoJSON data={geoJsonData} style={styleGeoJson} />}
                  {centrosFiltrados.map((centro, idx) => {
                      if (centro.sinCoordenadas) return null;
                      const isSelected = centroExpandido === centro.nombre;
                      // CORREGIDO: Obtenemos el color, incluyendo lógica de Hospitales/Institutos
                      const colorRis = getColorByRis(centro.ris, centro.nombre);
                      
                      // LÓGICA de Etiquetas
                      const showLabel = isSelected || filtroDistrito !== 'todos' || filtroUniversidad !== 'todas' || filtroCarrera !== 'todas';

                      return (
                        <CircleMarker key={idx} center={[centro.lat, centro.lng]} pathOptions={{ color: isSelected ? AZUL_PRINCIPAL : colorRis, fillColor: isSelected ? BLANCO_PRINCIPAL : colorRis, fillOpacity: isSelected ? 0.3 : 0.8, weight: isSelected ? 3 : 0, dashArray: isSelected ? '4,4' : '' }} radius={isSelected ? 10 : 6} eventHandlers={{ click: () => toggleCentro(centro.nombre, centro.lat, centro.lng) }}>
                             {showLabel && <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="label-mapa"> {centro.nombre.replace('CS ','').replace('CSMC ','').replace('PS ','')} ({centro.cantidadVisual}) </Tooltip>}
                             {!showLabel && <Tooltip direction="top" offset={[0, -5]} opacity={1}> {centro.nombre}: {centro.cantidadVisual} </Tooltip>}
                        </CircleMarker>
                      );
                  })}
              </MapContainer>
          </div>

          <div style={{ flex: 1, minWidth: '320px', background: GRIS_FONDO, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #ccc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                       <div style={{ background: '#eee', padding: '12px', borderRadius: '8px', flex: 1, marginRight: '10px' }}>
                           <div style={{ fontSize: '10px', fontWeight: '700', color: AZUL_PRINCIPAL, textTransform: 'uppercase' }}>Internos</div>
                           <div style={{ fontSize: '24px', fontWeight: '800', color: '#333' }}>{totalInternos}</div>
                       </div>
                       <div style={{ background: '#eee', padding: '12px', borderRadius: '8px', flex: 1 }}>
                           <div style={{ fontSize: '10px', fontWeight: '700', color: VERDE_PRINCIPAL, textTransform: 'uppercase' }}>Sedes</div>
                           <div style={{ fontSize: '24px', fontWeight: '800', color: '#333' }}>{sedesActivasCount} <span style={{fontSize:'14px', color:'#999'}}>/ {universoSedes}</span></div>
                       </div>
                  </div>
                  
                  <div style={{ display: 'flex', background: BLANCO_PRINCIPAL, borderRadius: '8px', padding: '4px', border: '1px solid #ccc' }}>
                      <button onClick={() => setActiveTab('lista')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: activeTab === 'lista' ? AZUL_PRINCIPAL : 'transparent', color: activeTab === 'lista' ? BLANCO_PRINCIPAL : AZUL_PRINCIPAL, fontWeight: '700', cursor: 'pointer' }}>LISTA</button>
                      <button onClick={() => setActiveTab('reportes')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: activeTab === 'reportes' ? AZUL_PRINCIPAL : 'transparent', color: activeTab === 'reportes' ? BLANCO_PRINCIPAL : AZUL_PRINCIPAL, fontWeight: '700', cursor: 'pointer' }}>REPORTES</button>
                  </div>
              </div>
              
              <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '15px' }} className="custom-scrollbar">
                  {activeTab === 'lista' ? (
                      centrosFiltrados.map((centro) => {
                          const isExpanded = centroExpandido === centro.nombre;
                          const colorRis = getColorByRis(centro.ris, centro.nombre);
                          return (
                              <div 
                                    key={centro.nombre} 
                                    id={`centro-${getSafeHtmlId(centro.nombre)}`} /* ID limpio para el scroll */
                                    className={isExpanded ? 'centro-seleccionado' : ''} /* Clase para resaltar */
                                    style={{ marginBottom: '10px', border: `1px solid ${isExpanded ? colorRis : '#eee'}`, borderRadius: '8px', background: BLANCO_PRINCIPAL, overflow: 'hidden' }}
                                >
                                  <div onClick={() => toggleCentro(centro.nombre, centro.lat, centro.lng)} style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? `${AZUL_PRINCIPAL}10` : 'transparent' }}>
                                      <div style={{ overflow: 'hidden', flex: 1 }}>
                                          <div style={{ fontWeight: '700', color: '#333', fontSize: '13px' }}>{centro.nombre}</div>
                                          <span style={{ fontSize: '10px', fontWeight: '700', color: colorRis }}>{centro.ris}</span>
                                      </div>
                                      <span style={{ background: '#e0e0e0', color: '#333', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', border: '1px solid #ccc' }}>{centro.cantidadVisual}</span>
                                  </div>
                                  {isExpanded && (
                                      <div style={{ padding: '0', background: '#f0f0f0', borderTop: '1px solid #eee' }}>
                                          {centro.detallesVisuales && centro.detallesVisuales.length > 0 && (
                                              <div style={{ padding: '15px', background: BLANCO_PRINCIPAL, borderBottom: '1px solid #eee' }}>
                                                  <StatsWidget data={[centro]} />
                                              </div>
                                          )}
                                          <div style={{ padding: '15px' }}>
                                              {centro.detallesVisuales?.map((det, i) => (
                                                  <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #ccc' }}>
                                                      <div style={{display: 'flex', justifyContent:'space-between', fontSize: '12px', fontWeight: '700', color: '#333', marginBottom: '4px'}}>
                                                          <span>{det.dni}</span><span style={{color:AZUL_PRINCIPAL}}>{det.carrera}</span>
                                                      </div>
                                                      <div style={{ color: '#666', fontSize: '10px', marginBottom: '8px' }}>{det.universidad}</div>
                                                      <div style={{ paddingLeft: '8px', borderLeft: '2px solid #ccc' }}>
                                                          {det.rotaciones.map((rot, r) => (
                                                              <div key={r} style={{ fontSize: '11px', marginBottom: '2px', color: '#333' }}>
                                                                  <b style={{color: colorRis}}>{rot.nombre}:</b> {rot.establecimiento}
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          );
                      })
                  ) : (
                      <div className="fade-in">
                          <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666', textAlign: 'center', fontStyle: 'italic' }}>Resumen: {filtroDistrito !== 'todos' ? filtroDistrito : 'Global'}</div>
                          <StatsWidget data={centrosFiltrados} />
                    </div>
                  )}
              </div>
            </div>
      </div>
    </div>
  );
};

export default MapaRis;