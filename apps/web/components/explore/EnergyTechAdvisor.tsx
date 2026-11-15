"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/messages";
import {
  ENERGY_CONCEPTS,
  type EnergyConceptId,
  type EnergyOptimizationGoal,
  type EnergyTargetScope,
  type EnergyVariableLens,
  type EvaluatedEnergySite,
  type MetricReadout,
} from "@/lib/globe/energy-tech";
import { paletteGradientCss, type PaletteId } from "@/lib/globe/climate";

const INSUFFICIENT_LABEL = "Insufficient evidence";

/* -------------------------------------------------------------------------- */
/*  BILINGUAL LOCALIZATION DICTIONARY (ES / EN)                               */
/* -------------------------------------------------------------------------- */

interface LocalizedVarMeta {
  label: string;
  dataset: string;
  role: string;
  isProxy?: boolean;
}

interface LocalizedConceptText {
  icon: string;
  title: string;
  shortTitle: string;
  oneLiner: string;
  question: string;
  whyCross: string;
  opportunity: string;
  coverageBadge: string;
  methodologyNote: string;
  varAName: string;
  varBName: string;
  lensLabels: Record<EnergyVariableLens, string>;
  scaleLowLabel: string;
  scaleHighLabel: string;
  variables: LocalizedVarMeta[];
}

const CONCEPT_TEXT: Record<Locale, Record<EnergyConceptId, LocalizedConceptText>> = {
  es: {
    hydropower_stability: {
      icon: "💧",
      title: "Hidroeléctrica y Bombeo",
      shortTitle: "Hidroeléctrica",
      oneLiner: "Cruza el agua que corre por los ríos (escorrentía) con la lluvia y la evaporación.",
      question: "¿En qué cuencas y provincias se está perdiendo caudal en los ríos aunque llueva parecido?",
      whyCross:
        "No toda la lluvia llega a las turbinas: cuando sube la temperatura, el suelo y la vegetación evaporan más agua (ET) y queda menos escorrentía útil (Q) para embalses y centrales de bombeo.",
      opportunity: "Planificación hidroeléctrica, bombeo reversible y reglas de gestión plurianual de embalses",
      coverageBadge: "100 % Datos directos NASA / NOAA",
      methodologyNote:
        "Cruza la precipitación satelital NASA GPM IMERG V07 (0,1°) con la escorrentía total (superficial + subterránea), evapotranspiración y humedad del suelo (0–10 cm) del modelo terrestre NASA GLDAS v2.1 Noah (0,25°, 2000–2025).",
      varAName: "Escorrentía en ríos (Q)",
      varBName: "Pérdida por evaporación (ET)",
      lensLabels: {
        composite: "Índice de estabilidad hidroeléctrica (0–100)",
        primary: "Variable A · Escorrentía en ríos Q (mm/año)",
        secondary: "Variable B · Evaporación ET (mm/año)",
        trend: "Tendencia decadal de escorrentía (mm/década)",
      },
      scaleLowLabel: "Menor caudal / Mayor pérdida por evaporación",
      scaleHighLabel: "Mayor caudal estable y menor estrés hídrico",
      variables: [
        {
          label: "Escorrentía total en ríos (Q)",
          dataset: "NASA GLDAS Noah v2.1 (malla 0,25°)",
          role: "Agua efectiva que llega a los cauces y embalses hidroeléctricos",
        },
        {
          label: "Evapotranspiración (ET)",
          dataset: "NASA GLDAS Noah v2.1 (malla 0,25°)",
          role: "Agua que vuelve a la atmósfera por calor antes de llegar al río",
        },
        {
          label: "Precipitación acumulada (P)",
          dataset: "NASA GPM IMERG Final V07 (0,1°)",
          role: "Entrada total de lluvia y nieve sobre la cuenca",
        },
        {
          label: "Humedad superficial del suelo (0–10 cm)",
          dataset: "NASA GLDAS v2.1 + NOAA",
          role: "Reserva hídrica del terreno que amortigua sequías estacionales",
        },
      ],
    },
    floating_solar: {
      icon: "🛟",
      title: "Solar Flotante en Embalses",
      shortTitle: "Solar Flotante",
      oneLiner: "Cruza la estabilidad del nivel del agua (satélite SWOT) con la evaporación ahorrable.",
      question: "¿Qué embalses mantienen una lámina de agua estable y ahorrarían más agua al cubrirse con paneles flotantes?",
      whyCross:
        "Los paneles solares flotantes rinden más refrigerados por el agua y frenan la evaporación del embalse, pero necesitan que la superficie del agua no suba y baje bruscamente para no tensar los amarres.",
      opportunity: "Fotovoltaica flotante (FPV) en embalses existentes sin ocupar suelo agrícola + ahorro de agua",
      coverageBadge: "100 % Datos directos NASA SWOT / GLDAS",
      methodologyNote:
        "Cruza las pasadas del satélite altimétrico radar NASA/CNES SWOT L2 HR LakeSP (2023–2026: área de lámina de agua en km² y estabilidad de cota WSE en m) en 48 embalses españoles con la evaporación NASA GLDAS y la temperatura NASA MERRA-2.",
      varAName: "Estabilidad de lámina SWOT",
      varBName: "Evaporación ahorrable (ET)",
      lensLabels: {
        composite: "Índice de aptitud para solar flotante (0–100)",
        primary: "Variable A · Área / Estabilidad de lámina SWOT",
        secondary: "Variable B · Evaporación potencial ET (mm/año)",
        trend: "Tendencia de calentamiento local (°C/década)",
      },
      scaleLowLabel: "Lámina muy variable / Menor aptitud",
      scaleHighLabel: "Lámina muy estable y alto ahorro de evaporación",
      variables: [
        {
          label: "Estabilidad de superficie de agua (1 − CV)",
          dataset: "NASA/CNES SWOT L2 LakeSP (2023–2026)",
          role: "Mide cuán estable se mantiene el espejo de agua entre pasadas del satélite",
        },
        {
          label: "Pérdida evaporativa (ET)",
          dataset: "NASA GLDAS Noah v2.1 (0,25°)",
          role: "Volumen de agua que se evapora y que la sombra de los paneles ayudaría a conservar",
        },
        {
          label: "Temperatura del aire (T2M)",
          dataset: "NASA MERRA-2 v5.12.4 (0,5°)",
          role: "En climas cálidos, el agua refrigera el panel flotante y mejora su eficiencia",
        },
        {
          label: "Superficie media del embalse",
          dataset: "SWOT PLD + Hidrografía",
          role: "Tamaño medio del espejo de agua observado desde órbita (km²)",
        },
      ],
    },
    industrial_cooling: {
      icon: "❄️",
      title: "Refrigeración Centros de Datos",
      shortTitle: "Refrigeración",
      oneLiner: "Cruza el calor de verano con los días extremos (>35 °C) y las noches tropicales (≥20 °C).",
      question: "¿Dónde se están reduciendo las horas de refrigeración gratuita (free-cooling) para centros de datos e industria?",
      whyCross:
        "Los centros de datos y plantas industriales usan aire exterior fresco (especialmente de noche) para enfriar servidores sin gastar tanta electricidad ni agua. Más días >35 °C y más noches ≥20 °C disparan el consumo de enfriadoras.",
      opportunity: "Ubicación de centros de datos (data centers), computación e industria electrointensiva",
      coverageBadge: "100 % Datos directos NASA / NOAA",
      methodologyNote:
        "Cruza la temperatura media de verano (JJA) de NASA MERRA-2 con el conteo de días de calor extremo (Tmáx > 35 °C) y noches tropicales (Tmín ≥ 20 °C) de ~175 estaciones NOAA GHCN-Daily y la escorrentía de NASA GLDAS.",
      varAName: "Temperatura media de verano",
      varBName: "Días extremos > 35 °C",
      lensLabels: {
        composite: "Índice de resiliencia de refrigeración (0–100)",
        primary: "Variable A · Temperatura en verano JJA (°C)",
        secondary: "Variable B · Días de calor > 35 °C (días/año)",
        trend: "Tendencia de días > 35 °C (días/década)",
      },
      scaleLowLabel: "Fuerte estrés térmico / Pérdida de free-cooling",
      scaleHighLabel: "Veranos frescos y buena refrigeración nocturna",
      variables: [
        {
          label: "Temperatura media de verano (JJA)",
          dataset: "NASA MERRA-2 M2TMNXSLV v5.12.4",
          role: "Carga térmica base para sistemas de refrigeración seca en los meses críticos",
        },
        {
          label: "Días de calor extremo (Tmáx > 35 °C)",
          dataset: "NOAA GHCN-Daily (~175 estaciones)",
          role: "Días en que los enfriadores secos pierden potencia y sube el pico eléctrico",
        },
        {
          label: "Noches tropicales (Tmín ≥ 20 °C)",
          dataset: "NOAA GHCN-Daily (~175 estaciones)",
          role: "Noches en que el aire no refresca lo suficiente para enfriar gratis (free-cooling)",
        },
        {
          label: "Viento superficial y escorrentía",
          dataset: "NOAA AWND + NASA GLDAS v2.1",
          role: "Ventilación natural convectiva y disponibilidad hídrica de respaldo",
        },
      ],
    },
    solar_resilience: {
      icon: "☀️",
      title: "Resiliencia Térmica Solar FV",
      shortTitle: "Resiliencia Solar",
      oneLiner: "Cruza el indicador de cielo despejado (ΔT) con los días de sobrecarga térmica (>35 °C) y polvo/sequía.",
      question: "¿Dónde coincide mucho sol despejado con menor pérdida de rendimiento por calor extremo y sequía?",
      whyCross:
        "Los paneles solares necesitan cielo despejado, pero a partir de 25 °C en célula pierden ~0,4 % de potencia por cada grado extra, y las rachas largas sin lluvia acumulan polvo (soiling) sobre el vidrio.",
      opportunity: "Diseño de plantas fotovoltaicas en mesetas soleadas pero más frescas y ventiladas",
      coverageBadge: "Datos NASA/NOAA + Proxy físico de cielo despejado",
      methodologyNote:
        "Los paneles de silicio pierden ~0,4 %/°C por encima de 25 °C. En este modo exploratorio se cruza la amplitud térmica diurna ΔT = Tmáx − Tmín de NOAA (indicador físico Hargreaves-Samani de transmitancia de cielo despejado) con los días >35 °C y la racha seca máxima. Nota: para radiación solar directa NASA POWER y polvo MODIS, abre también la herramienta 'Cribado Solar FV' en la barra derecha.",
      varAName: "Proxy cielo despejado (ΔT)",
      varBName: "Días de calor > 35 °C",
      lensLabels: {
        composite: "Índice de resiliencia solar FV (0–100)",
        primary: "Variable A · Proxy cielo despejado ΔT (°C)",
        secondary: "Variable B · Días de penalización > 35 °C (días/año)",
        trend: "Tendencia de días > 35 °C (días/década)",
      },
      scaleLowLabel: "Mayor penalización por calor extremo / sequía",
      scaleHighLabel: "Cielo despejado con temperaturas más moderadas",
      variables: [
        {
          label: "Amplitud térmica diurna ΔT (Proxy cielo despejado)",
          dataset: "NOAA GHCN-Daily (Tmáx − Tmín)",
          role: "Mayor diferencia entre día y noche indica cielos más despejados y secos",
          isProxy: true,
        },
        {
          label: "Días de penalización térmica (> 35 °C)",
          dataset: "NOAA GHCN-Daily (~175 estaciones)",
          role: "Calor ambiental extremo que reduce entre un 4 % y un 8 % la potencia pico del panel",
        },
        {
          label: "Racha seca máxima sin lluvia (< 1 mm)",
          dataset: "NOAA GHCN-Daily + NASA GPM IMERG",
          role: "Días seguidos sin lluvia que limpie de forma natural el polvo acumulado en los paneles",
        },
        {
          label: "Temperatura media de verano (JJA)",
          dataset: "NASA MERRA-2 v5.12.4",
          role: "Régimen térmico estival de operación de módulos e inversores",
        },
      ],
    },
    hydrogen_water: {
      icon: "⚡",
      title: "Hidrógeno Verde y Agua",
      shortTitle: "Hidrógeno + Agua",
      oneLiner: "Cruza el recurso renovable (viento + sol) con el agua disponible en ríos y las rachas de sequía.",
      question: "¿Dónde hay buen recurso eólico y solar junto con disponibilidad real de agua sin agravar la sequía?",
      whyCross:
        "Producir 1 kg de hidrógeno verde por electrólisis consume ~9 litros de agua purificada (y más si requiere refrigeración). Ubicar electrolizadores donde sobra sol pero falta agua exige usar agua regenerada o desalada.",
      opportunity: "Valles de hidrógeno verde (electrólisis) compatibles con la seguridad hídrica de cada cuenca",
      coverageBadge: "Datos NASA/NOAA + Proxy solar",
      methodologyNote:
        "Cruza la velocidad del viento en estaciones NOAA y la amplitud solar de cielo despejado con la escorrentía de ríos de NASA GLDAS (mm/año) y la duración de las rachas secas de NOAA.",
      varAName: "Escorrentía disponible (Q)",
      varBName: "Recurso eólico + solar",
      lensLabels: {
        composite: "Índice de sinergia H₂ + Agua (0–100)",
        primary: "Variable A · Escorrentía disponible Q (mm/año)",
        secondary: "Variable B · Índice renovable viento + sol (0–100)",
        trend: "Tendencia decadal de escorrentía (mm/década)",
      },
      scaleLowLabel: "Estrés hídrico / Requiere desalación o agua regenerada",
      scaleHighLabel: "Buen balance entre energía renovable y agua",
      variables: [
        {
          label: "Escorrentía total en ríos (Q)",
          dataset: "NASA GLDAS Noah v2.1 (0,25°)",
          role: "Disponibilidad de agua dulce en la cuenca para electrólisis y refrigeración",
        },
        {
          label: "Velocidad del viento en superficie (AWND)",
          dataset: "NOAA GHCN-Daily",
          role: "Recurso eólico para dar más horas equivalentes al electrolizador",
        },
        {
          label: "Proxy de cielo despejado (ΔT)",
          dataset: "NOAA GHCN-Daily (Tmáx − Tmín)",
          role: "Potencial de generación fotovoltaica diurna de bajo coste",
          isProxy: true,
        },
        {
          label: "Racha seca máxima (< 1 mm)",
          dataset: "NOAA GHCN-Daily",
          role: "Riesgo de restricción hídrica estacional durante sequías",
        },
      ],
    },
    energy_agriculture: {
      icon: "🌱",
      title: "Agrovoltaica y Suelo",
      shortTitle: "Agrovoltaica",
      oneLiner: "Cruza la pérdida de humedad del suelo (0–10 cm) con el calor extremo (>35 °C) y el verdor MODIS.",
      question: "¿Dónde puede la sombra parcial de paneles solares proteger cultivos frente a la desecación del suelo y las olas de calor?",
      whyCross:
        "En zonas agrícolas donde el suelo superficial se está secando y aumentan los días >35 °C, elevar paneles agrovoltaicos reduce la evaporación del terreno y protege los cultivos del golpe de calor, evitando además talar bosques densos (NDVI alto).",
      opportunity: "Agrovoltaica elevada sobre cultivos leñosos/hortícolas y exclusión de zonas boscosas densas",
      coverageBadge: "100 % Datos directos NASA / NOAA",
      methodologyNote:
        "Cruza la humedad superficial del suelo (0–10 cm) de NASA GLDAS v2.1 con el índice de vegetación NASA MODIS NDVI (0,05° CMG) y los días de calor extremo (>35 °C) de NOAA.",
      varAName: "Humedad del suelo 0–10 cm",
      varBName: "Días de calor > 35 °C",
      lensLabels: {
        composite: "Índice de sinergia agrovoltaica (0–100)",
        primary: "Variable A · Humedad del suelo 0–10 cm (mm)",
        secondary: "Variable B · Días de calor en cultivos > 35 °C (días/año)",
        trend: "Tendencia de humedad del suelo (mm/década)",
      },
      scaleLowLabel: "Menor sinergia o conflicto con bosque denso",
      scaleHighLabel: "Alta sinergia agrícola (protección de suelo y cultivo)",
      variables: [
        {
          label: "Humedad superficial del suelo (0–10 cm)",
          dataset: "NASA GLDAS Noah v2.1 (0,25°)",
          role: "Agua en la capa de raíces que la sombra parcial del panel ayuda a retener",
        },
        {
          label: "Verdor de la vegetación (NDVI)",
          dataset: "NASA MODIS Terra MOD13C2 v061",
          role: "Distingue tierras de cultivo moderadas de bosques densos (NDVI > 0,62) a proteger",
        },
        {
          label: "Días de estrés térmico en cultivos (> 35 °C)",
          dataset: "NOAA GHCN-Daily (~175 estaciones)",
          role: "Episodios de calor extremo donde la sombra del panel evita daños en la cosecha",
        },
        {
          label: "Evapotranspiración (ET)",
          dataset: "NASA GLDAS Noah v2.1 (0,25°)",
          role: "Demanda evaporativa de la atmósfera sobre el suelo agrícola",
        },
      ],
    },
    wind_solar_complementarity: {
      icon: "🌬️",
      title: "Híbrido Viento + Sol",
      shortTitle: "Viento + Sol",
      oneLiner: "Cruza la velocidad del viento en estaciones con el indicador solar (ΔT) y el régimen de lluvias.",
      question: "¿En qué provincias se complementan mejor el viento y el sol para aprovechar un mismo punto de conexión a red?",
      whyCross:
        "Cuando sopla más viento (invierno, frentes nubosos o noche) suele haber menos sol, y viceversa en verano. Hibridar eólica y fotovoltaica en la misma subestación permite una generación más plana y estable todo el año.",
      opportunity: "Parques híbridos eólico-fotovoltaicos que comparten evacuación a red y baterías (BESS)",
      coverageBadge: "Datos NASA/NOAA + Proxy solar",
      methodologyNote:
        "Cruza la velocidad media del viento en superficie de estaciones NOAA (AWND, m/s) con la amplitud solar de cielo despejado (ΔT) y la precipitación de NASA GPM IMERG.",
      varAName: "Velocidad media del viento",
      varBName: "Proxy cielo despejado (ΔT)",
      lensLabels: {
        composite: "Índice de hibridación viento + sol (0–100)",
        primary: "Variable A · Velocidad del viento (m/s · NOAA)",
        secondary: "Variable B · Proxy cielo despejado ΔT (°C)",
        trend: "Tendencia de velocidad del viento (m/s/década)",
      },
      scaleLowLabel: "Predominio de una sola tecnología",
      scaleHighLabel: "Alto equilibrio entre recurso eólico y solar",
      variables: [
        {
          label: "Velocidad media del viento (AWND)",
          dataset: "NOAA GHCN-Daily (estaciones)",
          role: "Aporte eólico (especialmente invernal y nocturno) al nudo de red",
        },
        {
          label: "Amplitud de cielo despejado (ΔT)",
          dataset: "NOAA GHCN-Daily (Tmáx − Tmín)",
          role: "Aporte solar diurno y estival complementario al viento",
          isProxy: true,
        },
        {
          label: "Régimen de lluvia / nubosidad (P)",
          dataset: "NASA GPM IMERG V07 (0,1°)",
          role: "Indicador de paso de frentes atlánticos frente a bloqueo anticiclónico",
        },
      ],
    },
  },
  en: {
    hydropower_stability: {
      icon: "💧",
      title: "Hydropower & Pumped Storage",
      shortTitle: "Hydropower",
      oneLiner: "Crosses river runoff with rainfall and evaporative loss.",
      question: "Where is river runoff declining faster than rainfall because warming boosts evaporation?",
      whyCross:
        "Not all rain reaches hydro turbines: as temperatures rise, soil and vegetation evaporate more water (ET), leaving less effective river runoff (Q) for reservoirs and pumped storage.",
      opportunity: "Hydroelectric planning, reversible pumped-storage siting & multi-year reservoir rules",
      coverageBadge: "100% Direct NASA / NOAA Data",
      methodologyNote:
        "Crosses NASA GPM IMERG V07 precipitation (0.1°) with NASA GLDAS v2.1 Noah 0.25° total runoff, evapotranspiration and topsoil moisture (0–10 cm) over 2000–2025.",
      varAName: "River Runoff (Q)",
      varBName: "Evaporation Loss (ET)",
      lensLabels: {
        composite: "Hydropower Stability Score (0–100)",
        primary: "Variable A · Total River Runoff Q (mm/yr)",
        secondary: "Variable B · Evapotranspiration Loss ET (mm/yr)",
        trend: "Runoff Decadal Trend (mm/decade)",
      },
      scaleLowLabel: "Lower runoff / Higher evaporative stress",
      scaleHighLabel: "Stronger runoff & hydro stability",
      variables: [
        {
          label: "Total River Runoff (Q)",
          dataset: "NASA GLDAS Noah v2.1 (0.25° grid)",
          role: "Effective water inflow reaching rivers and hydroelectric reservoirs",
        },
        {
          label: "Evapotranspiration (ET)",
          dataset: "NASA GLDAS Noah v2.1 (0.25° grid)",
          role: "Atmospheric water loss decoupling runoff from rainfall under warming",
        },
        {
          label: "Accumulated Precipitation (P)",
          dataset: "NASA GPM IMERG Final V07 (0.1°)",
          role: "Total meteorological rainfall input to the basin",
        },
        {
          label: "Topsoil Moisture (0–10 cm)",
          dataset: "NASA GLDAS v2.1 + NOAA",
          role: "Basin hydrological memory and seasonal buffer",
        },
      ],
    },
    floating_solar: {
      icon: "🛟",
      title: "Floating Solar on Reservoirs",
      shortTitle: "Floating Solar",
      oneLiner: "Crosses NASA SWOT water-level stability with evaporation savings.",
      question: "Which reservoirs keep a stable water surface where floating solar panels could thrive and cut evaporation?",
      whyCross:
        "Floating PV panels run cooler over water and shade reservoirs from evaporation, but they need a relatively stable water surface so mooring lines are not stressed by extreme drawdown.",
      opportunity: "Floating photovoltaics (FPV) on existing reservoirs without land-use conflict + water saving",
      coverageBadge: "100% Direct NASA SWOT / GLDAS Data",
      methodologyNote:
        "Crosses NASA/CNES SWOT L2 HR LakeSP satellite pass time series (2023–2026 water surface area km² & elevation stability) across 48 Spanish reservoirs with NASA GLDAS evaporation loss and MERRA-2 air temperature.",
      varAName: "SWOT Surface Stability",
      varBName: "Evaporation Loss (ET)",
      lensLabels: {
        composite: "Floating Solar Suitability Score (0–100)",
        primary: "Variable A · SWOT Water Area & Stability",
        secondary: "Variable B · Evaporation Potential ET (mm/yr)",
        trend: "Local Warming Trend (°C/decade)",
      },
      scaleLowLabel: "High drawdown volatility / Lower fit",
      scaleHighLabel: "Stable water surface & high evaporation savings",
      variables: [
        {
          label: "Water Surface Stability (1 − CV)",
          dataset: "NASA/CNES SWOT L2 LakeSP (2023–2026)",
          role: "Low surface area & elevation volatility minimizes mooring mechanical stress",
        },
        {
          label: "Evaporative Loss Potential (ET)",
          dataset: "NASA GLDAS Noah v2.1 (0.25°)",
          role: "Water volume saved from evaporation by floating PV shading",
        },
        {
          label: "Ambient Air Temperature (T2M)",
          dataset: "NASA MERRA-2 v5.12.4 (0.5°)",
          role: "Water-cooled FPV modules gain efficiency in warm climates",
        },
        {
          label: "Mean Reservoir Surface Area",
          dataset: "SWOT PLD + Hydrography",
          role: "Observed open-water surface area from satellite passes (km²)",
        },
      ],
    },
    industrial_cooling: {
      icon: "❄️",
      title: "Data Center & Industrial Cooling",
      shortTitle: "Cooling Shift",
      oneLiner: "Crosses summer heat with extreme hot days (>35 °C) and tropical nights (≥20 °C).",
      question: "Where are nocturnal free-cooling windows shrinking and extreme heat spikes rising?",
      whyCross:
        "Data centers and industrial plants rely on cool outside air (especially at night) to shed heat without heavy chiller electricity or water use. Rising >35 °C days and ≥20 °C nights erode that margin.",
      opportunity: "Hyperscale data centers, edge compute & industrial cooling siting",
      coverageBadge: "100% Direct NASA / NOAA Data",
      methodologyNote:
        "Crosses NASA MERRA-2 summer (JJA) temperature trends with NOAA GHCN-Daily extreme heat days (Tmax > 35 °C), tropical nights (Tmin ≥ 20 °C) and GLDAS water runoff.",
      varAName: "Summer Mean Temp (JJA)",
      varBName: "Extreme Days > 35 °C",
      lensLabels: {
        composite: "Free-Cooling Resilience Score (0–100)",
        primary: "Variable A · Summer JJA Temperature (°C)",
        secondary: "Variable B · Extreme Heat Days > 35 °C (days/yr)",
        trend: "Hot Days Decadal Trend (days/decade)",
      },
      scaleLowLabel: "Severe heat stress / Free-cooling loss",
      scaleHighLabel: "Cooler summers & strong night free-cooling",
      variables: [
        {
          label: "Summer Mean Temperature (JJA)",
          dataset: "NASA MERRA-2 M2TMNXSLV v5.12.4",
          role: "Baseline thermal load for dry/adiabatic industrial cooling systems",
        },
        {
          label: "Extreme Heat Days (Tmax > 35 °C)",
          dataset: "NOAA GHCN-Daily (~175 stations)",
          role: "Days where dry cooling derates and peak chiller power spikes",
        },
        {
          label: "Tropical Nights (Tmin ≥ 20 °C)",
          dataset: "NOAA GHCN-Daily (~175 stations)",
          role: "Loss of nocturnal radiative and convective free-cooling capacity",
        },
        {
          label: "Surface Wind & Water Runoff",
          dataset: "NOAA AWND + NASA GLDAS v2.1",
          role: "Natural convective heat dissipation and water backup",
        },
      ],
    },
    solar_resilience: {
      icon: "☀️",
      title: "Solar PV Thermal Resilience",
      shortTitle: "Solar Resilience",
      oneLiner: "Crosses clear-sky proxy (ΔT) with extreme heat derating days (>35 °C) and dry spells.",
      question: "Where do sunny skies coincide with lower extreme-heat derating and shorter dust-soiling droughts?",
      whyCross:
        "Silicon PV panels need clear skies, but lose ~0.4% output per °C above 25 °C cell temperature, while long rainless spells let dust build up on modules.",
      opportunity: "Thermally resilient utility-scale PV parks on high-insolation, cooler plateaus",
      coverageBadge: "Direct NASA/NOAA + Clear-Sky Proxy",
      methodologyNote:
        "Crosses NOAA diurnal temperature range ΔT = Tmax − Tmin (Hargreaves-Samani clear-sky transmittance proxy) with >35 °C heat days and dry-spell duration. Tip: open 'Solar PV Screening' in the right toolbar for direct NASA POWER radiation and MODIS dust.",
      varAName: "Clear-Sky Proxy (ΔT)",
      varBName: "Heat Days > 35 °C",
      lensLabels: {
        composite: "Solar Thermal Resilience Score (0–100)",
        primary: "Variable A · Clear-Sky Proxy ΔT (°C)",
        secondary: "Variable B · Thermal Derating Days > 35 °C (days/yr)",
        trend: "Hot Days Decadal Trend (days/decade)",
      },
      scaleLowLabel: "Higher heat derating & drought soiling",
      scaleHighLabel: "Clear skies with milder thermal stress",
      variables: [
        {
          label: "Clear-Sky Insolation Proxy (ΔT)",
          dataset: "NOAA GHCN-Daily (Tmax − Tmin)",
          role: "Physical Hargreaves-Samani proxy for clear-sky solar transmittance",
          isProxy: true,
        },
        {
          label: "PV Thermal Derating Days (> 35 °C)",
          dataset: "NOAA GHCN-Daily (~175 stations)",
          role: "Extreme ambient heat causing ~4–8% peak power derating in PV modules",
        },
        {
          label: "Max Dry Spell (< 1 mm)",
          dataset: "NOAA GHCN-Daily + NASA GPM IMERG",
          role: "Consecutive rainless days without natural rain-wash of dust on PV glass",
        },
        {
          label: "Summer Mean Temperature (JJA)",
          dataset: "NASA MERRA-2 v5.12.4",
          role: "Baseline summer operating temperature for modules and inverters",
        },
      ],
    },
    hydrogen_water: {
      icon: "⚡",
      title: "Green Hydrogen & Water",
      shortTitle: "Hydrogen + Water",
      oneLiner: "Crosses wind + solar potential with river water runoff and drought length.",
      question: "Where do strong wind and solar resources align with sustainable river water availability?",
      whyCross:
        "Producing 1 kg of green hydrogen via electrolysis requires ~9 L of purified water (plus cooling water). Siting electrolyzers where renewables are high but basins are drying requires desalinated or reclaimed water.",
      opportunity: "Green hydrogen clusters aligned with basin water security",
      coverageBadge: "NASA/NOAA Data + Solar Proxy",
      methodologyNote:
        "Crosses NOAA surface wind speed and clear-sky solar amplitude with NASA GLDAS river runoff (mm/yr) and NOAA consecutive dry days.",
      varAName: "Available River Runoff (Q)",
      varBName: "Wind + Solar Index",
      lensLabels: {
        composite: "Green H₂ + Water Synergy Score (0–100)",
        primary: "Variable A · Available River Runoff Q (mm/yr)",
        secondary: "Variable B · Wind + Solar Renewable Index (0–100)",
        trend: "Runoff Decadal Trend (mm/decade)",
      },
      scaleLowLabel: "High water stress / Needs desalinated water",
      scaleHighLabel: "Strong balance of renewables & water",
      variables: [
        {
          label: "Total River Runoff (Q)",
          dataset: "NASA GLDAS Noah v2.1 (0.25°)",
          role: "Freshwater availability for electrolysis feed and cooling",
        },
        {
          label: "Surface Wind Speed (AWND)",
          dataset: "NOAA GHCN-Daily",
          role: "Wind resource boosting electrolyzer full-load operating hours",
        },
        {
          label: "Clear-Sky Solar Proxy (ΔT)",
          dataset: "NOAA GHCN-Daily (Tmax − Tmin)",
          role: "Low-cost daytime solar PV resource",
          isProxy: true,
        },
        {
          label: "Max Consecutive Dry Days (< 1 mm)",
          dataset: "NOAA GHCN-Daily",
          role: "Seasonal drought curtailment risk for freshwater intake",
        },
      ],
    },
    energy_agriculture: {
      icon: "🌱",
      title: "Agrivoltaics & Soil",
      shortTitle: "Agrivoltaics",
      oneLiner: "Crosses topsoil drying (0–10 cm) with crop heat stress (>35 °C) and MODIS greenness.",
      question: "Where can elevated solar panels shade crops to reduce topsoil drying and heatwave damage?",
      whyCross:
        "Where cropland topsoil is losing moisture and >35 °C days are rising, partial shade from elevated agrivoltaic panels cuts soil evaporation and shields crops—while avoiding dense forests (high NDVI).",
      opportunity: "Elevated agrivoltaics over woody/horticultural crops while protecting dense forest land",
      coverageBadge: "100% Direct NASA / NOAA Data",
      methodologyNote:
        "Crosses NASA GLDAS v2.1 topsoil moisture (0–10 cm) with NASA MODIS NDVI vegetation index (0.05°) and NOAA >35 °C heat-stress days.",
      varAName: "Topsoil Moisture 0–10 cm",
      varBName: "Crop Heat Days > 35 °C",
      lensLabels: {
        composite: "Agrivoltaic Synergy Score (0–100)",
        primary: "Variable A · Topsoil Moisture 0–10 cm (mm)",
        secondary: "Variable B · Crop Heat-Stress Days > 35 °C (days/yr)",
        trend: "Topsoil Moisture Trend (mm/decade)",
      },
      scaleLowLabel: "Lower synergy or dense forest conflict",
      scaleHighLabel: "High agrivoltaic crop & soil protection synergy",
      variables: [
        {
          label: "Topsoil Moisture (0–10 cm)",
          dataset: "NASA GLDAS Noah v2.1 (0.25°)",
          role: "Root-zone moisture conserved by partial panel shading",
        },
        {
          label: "Vegetation Greenness (NDVI)",
          dataset: "NASA MODIS Terra MOD13C2 v061",
          role: "Separates moderate cropland from dense forests (NDVI > 0.62) to avoid land conflict",
        },
        {
          label: "Crop Heat-Stress Days (> 35 °C)",
          dataset: "NOAA GHCN-Daily (~175 stations)",
          role: "Heatwave episodes where panel shade protects crop yield",
        },
        {
          label: "Evapotranspiration (ET)",
          dataset: "NASA GLDAS Noah v2.1 (0.25°)",
          role: "Atmospheric evaporative demand over agricultural land",
        },
      ],
    },
    wind_solar_complementarity: {
      icon: "🌬️",
      title: "Wind + Solar Hybrid",
      shortTitle: "Wind + Solar",
      oneLiner: "Crosses station wind speed with clear-sky solar proxy (ΔT) and rainfall regime.",
      question: "Where do wind and solar resources complement each other to share grid substations?",
      whyCross:
        "Wind often blows stronger during winter, cloudy fronts, and nights when solar output drops, whereas solar peaks in summer daytime. Hybridizing both at the same grid node smooths generation.",
      opportunity: "Co-located wind + solar hybrid plants sharing grid interconnection and batteries (BESS)",
      coverageBadge: "NASA/NOAA Data + Solar Proxy",
      methodologyNote:
        "Crosses NOAA surface wind speed (AWND, m/s) with clear-sky solar amplitude (ΔT) and NASA GPM IMERG precipitation.",
      varAName: "Surface Wind Speed",
      varBName: "Clear-Sky Solar (ΔT)",
      lensLabels: {
        composite: "Wind + Solar Hybrid Score (0–100)",
        primary: "Variable A · Surface Wind Speed (m/s · NOAA)",
        secondary: "Variable B · Clear-Sky Solar Proxy ΔT (°C)",
        trend: "Wind Speed Trend (m/s/decade)",
      },
      scaleLowLabel: "Single-technology dominant",
      scaleHighLabel: "Strong wind & solar balance",
      variables: [
        {
          label: "Surface Wind Speed (AWND)",
          dataset: "NOAA GHCN-Daily (stations)",
          role: "Wind generation resource (especially winter & night)",
        },
        {
          label: "Clear-Sky Solar Proxy (ΔT)",
          dataset: "NOAA GHCN-Daily (Tmax − Tmin)",
          role: "Daytime & summer solar generation complement",
          isProxy: true,
        },
        {
          label: "Precipitation Regime (P)",
          dataset: "NASA GPM IMERG V07 (0.1°)",
          role: "Cloud & frontal passage indicator vs. clear-sky highs",
        },
      ],
    },
  },
};

const SCOPE_META: Record<
  Locale,
  Record<EnergyTargetScope, { icon: string; shortLabel: string; fullLabel: string; count: string; hint: string }>
> = {
  es: {
    basin: {
      icon: "🏞️",
      shortLabel: "Cuencas",
      fullLabel: "Cuencas hidrográficas",
      count: "8 cuencas",
      hint: "Grandes cuencas fluviales (Ebro, Duero, Tajo, Guadalquivir, Guadiana…)",
    },
    reservoir: {
      icon: "💧",
      shortLabel: "Embalses SWOT",
      fullLabel: "Embalses medidos por satélite SWOT",
      count: "48 embalses",
      hint: "Láminas de agua observadas por el radar satelital NASA/CNES SWOT (2023–2026)",
    },
    provincia: {
      icon: "🗺️",
      shortLabel: "Provincias",
      fullLabel: "Provincias españolas",
      count: "52 provincias",
      hint: "Comparativa provincial completa con series 2000–2025",
    },
    ccaa: {
      icon: "🏛️",
      shortLabel: "CCAA",
      fullLabel: "Comunidades Autónomas",
      count: "19 CCAA",
      hint: "Síntesis autonómica (NUTS-2)",
    },
  },
  en: {
    basin: {
      icon: "🏞️",
      shortLabel: "Basins",
      fullLabel: "Major River Basins",
      count: "8 basins",
      hint: "Major river basins (Ebro, Duero, Tajo, Guadalquivir, Guadiana…)",
    },
    reservoir: {
      icon: "💧",
      shortLabel: "SWOT Reservoirs",
      fullLabel: "NASA SWOT Satellite Reservoirs",
      count: "48 reservoirs",
      hint: "Open-water bodies measured by NASA/CNES SWOT radar passes (2023–2026)",
    },
    provincia: {
      icon: "🗺️",
      shortLabel: "Provinces",
      fullLabel: "Spanish Provinces",
      count: "52 provinces",
      hint: "Province-level comparison across 2000–2025",
    },
    ccaa: {
      icon: "🏛️",
      shortLabel: "Autonomous Comm.",
      fullLabel: "Autonomous Communities (CCAA)",
      count: "19 regions",
      hint: "Regional NUTS-2 synthesis",
    },
  },
};

const GOAL_META: Record<
  Locale,
  Record<EnergyOptimizationGoal, { icon: string; shortLabel: string; fullLabel: string; desc: string }>
> = {
  es: {
    ideal: {
      icon: "🏆",
      shortLabel: "Mejores condiciones",
      fullLabel: "Ordenar de mayor a menor aptitud (0–100)",
      desc: "Muestra primero los lugares donde el cruce de variables es más favorable.",
    },
    at_risk: {
      icon: "⚠️",
      shortLabel: "Mayor estrés / alerta",
      fullLabel: "Ordenar por mayor estrés o vulnerabilidad",
      desc: "Muestra primero los lugares donde el calor, la sequía o la pérdida de agua son más críticos.",
    },
    significant_only: {
      icon: "📈",
      shortLabel: "Tendencia confirmada",
      fullLabel: "Solo lugares con cambio estadístico significativo (p < 0,05)",
      desc: "Filtra lugares donde el test de Mann-Kendall confirma una tendencia física real (p < 0,05).",
    },
  },
  en: {
    ideal: {
      icon: "🏆",
      shortLabel: "Best Conditions",
      fullLabel: "Rank highest suitability first (0–100)",
      desc: "Lists places where the crossed variables are most favorable first.",
    },
    at_risk: {
      icon: "⚠️",
      shortLabel: "Highest Stress",
      fullLabel: "Rank highest climate/water stress first",
      desc: "Lists places where warming, drought, or runoff loss are most acute first.",
    },
    significant_only: {
      icon: "📈",
      shortLabel: "Confirmed Trends",
      fullLabel: "Only statistically significant trends (p < 0.05)",
      desc: "Filters to places where Mann-Kendall confirms a robust trend (p < 0.05).",
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  HELPERS FOR HUMAN-READABLE LABELS & LOCALIZED SITE INTERPRETATIONS        */
/* -------------------------------------------------------------------------- */

function getStatusPresentation(
  site: EvaluatedEnergySite,
  locale: Locale,
): {
  icon: string;
  badgeText: string;
  meaningText: string;
  badgeClass: string;
  barColorClass: string;
} {
  if (!Number.isFinite(site.score) || site.advantageLabel === INSUFFICIENT_LABEL) {
    return {
      icon: "○",
      badgeText: locale === "es" ? "Sin datos suficientes" : "Insufficient data",
      meaningText:
        locale === "es"
          ? "Falta alguna variable de estación (p. ej. viento o humedad) en esta unidad territorial."
          : "A required station variable (e.g. wind) is not available in this unit.",
      badgeClass: "border-white/20 bg-white/10 text-muted",
      barColorClass: "bg-slate-500",
    };
  }
  switch (site.advantageStatus) {
    case "GAINING":
      return {
        icon: "▲",
        badgeText: locale === "es" ? "Condición muy favorable" : "Highly favorable",
        meaningText:
          locale === "es"
            ? "Las variables cruzadas muestran un balance muy positivo en comparación con el resto de España."
            : "Crossed variables show a very strong balance compared with the rest of Spain.",
        badgeClass: "border-emerald-400/45 bg-emerald-500/15 text-emerald-200",
        barColorClass: "bg-emerald-400",
      };
    case "STABLE_HIGH":
      return {
        icon: "●",
        badgeText: locale === "es" ? "Condición favorable / estable" : "Favorable & stable",
        meaningText:
          locale === "es"
            ? "Buen comportamiento general sin deterioro severo en las series observadas."
            : "Good overall profile without severe degradation in the observed series.",
        badgeClass: "border-sky-400/45 bg-sky-500/15 text-sky-200",
        barColorClass: "bg-sky-400",
      };
    case "WATCH":
      return {
        icon: "◆",
        badgeText: locale === "es" ? "En vigilancia / Moderado" : "Watch / Moderate",
        meaningText:
          locale === "es"
            ? "Condición intermedia: requiere vigilar la evolución estacional de agua o temperatura."
            : "Intermediate condition: requires monitoring seasonal water or heat shifts.",
        badgeClass: "border-amber-400/45 bg-amber-500/15 text-amber-200",
        barColorClass: "bg-amber-400",
      };
    case "LOSING":
      return {
        icon: "▼",
        badgeText: locale === "es" ? "Alto estrés / En retroceso" : "High stress / Declining",
        meaningText:
          locale === "es"
            ? "Las observaciones muestran estrés térmico o hídrico importante para esta tecnología."
            : "Observations show significant thermal or hydrological stress for this technology.",
        badgeClass: "border-rose-400/45 bg-rose-500/15 text-rose-200",
        barColorClass: "bg-rose-400",
      };
  }
}

const METRIC_LABEL_ES: Record<string, string> = {
  "Runoff Q (GLDAS)": "Escorrentía en ríos Q (GLDAS)",
  "Evap Loss ET (GLDAS)": "Evaporación ET (GLDAS)",
  "Runoff / Rain Ratio": "Fracción lluvia → río (Q/P)",
  "Floating PV Score": "Índice solar flotante",
  "SWOT Water Area": "Estabilidad en embalses SWOT",
  "Summer JJA Temp": "Temperatura media en verano",
  "Extreme Days > 35 °C": "Días de calor > 35 °C",
  "Tropical Nights ≥ 20 °C": "Noches tropicales ≥ 20 °C",
  "Clear-Sky Proxy (ΔT)": "Cielo despejado (ΔT día-noche)",
  "Derating Days > 35 °C": "Días de calor extremo > 35 °C",
  "Soiling Dry Spell": "Racha seca sin lluvia",
  "Wind + Solar Index": "Índice renovable (viento + sol)",
  "Dry Spell / ET": "Sequía máxima y evaporación",
  "Topsoil 0–10 cm (GLDAS)": "Humedad del suelo 0–10 cm",
  "Crop Heat > 35 °C (NOAA)": "Días de calor > 35 °C",
  "MODIS Greenness": "Verdor de vegetación (NDVI)",
  "Surface Wind Speed": "Velocidad media del viento",
  "Clear-Sky Solar (ΔT)": "Cielo despejado (ΔT día-noche)",
  "Annual Rain (GPM)": "Lluvia anual (NASA GPM)",
  "Basin Runoff Q (GLDAS)": "Escorrentía de la cuenca Q",
  "Basin Evap ET (GLDAS)": "Evaporación de la cuenca ET",
  "Basin Water Balance": "Balance hídrico de la cuenca",
  "SWOT Surface Stability": "Estabilidad de lámina SWOT",
  "Evaporation Saved (ET)": "Evaporación potencial (ET)",
  "SWOT Area & WSE": "Área y cota de agua SWOT",
};

const SERIES_LABEL_ES: Record<string, string> = {
  "River Runoff Q (GLDAS)": "Escorrentía en ríos Q (GLDAS)",
  "Evapotranspiration ET (GLDAS)": "Evapotranspiración ET (GLDAS)",
  "Summer JJA Temperature (MERRA-2)": "Temperatura de verano JJA (MERRA-2)",
  "Extreme Heat Days >35 °C (NOAA)": "Días de calor > 35 °C (NOAA)",
  "Clear-Sky Solar Proxy ΔT (NOAA)": "Cielo despejado ΔT (NOAA)",
  "Thermal Derating Days >35 °C (NOAA)": "Días de calor > 35 °C (NOAA)",
  "Available River Runoff Q (GLDAS)": "Escorrentía en ríos Q (GLDAS)",
  "Max Consecutive Dry Days (NOAA)": "Días seguidos sin lluvia (NOAA)",
  "Topsoil Moisture 0–10 cm (GLDAS)": "Humedad del suelo 0–10 cm (GLDAS)",
  "Crop Heat-Stress Days >35 °C (NOAA)": "Días de calor > 35 °C (NOAA)",
  "Cloud/Precipitation Regime (GPM)": "Precipitación anual (NASA GPM)",
  "Basin River Runoff Q (GLDAS)": "Escorrentía de la cuenca Q (GLDAS)",
  "Basin Precipitation P (GPM)": "Precipitación en la cuenca P (GPM)",
  "Evaporative Loss ET (GLDAS)": "Pérdida por evaporación ET (GLDAS)",
  "Air Temperature T2M (MERRA-2)": "Temperatura del aire T2M (MERRA-2)",
};

function localizeMetricLabel(label: string, locale: Locale): string {
  if (locale === "en") return label;
  return METRIC_LABEL_ES[label] ?? label;
}

function localizeSeriesLabel(label: string, locale: Locale): string {
  if (locale === "en") return label;
  return SERIES_LABEL_ES[label] ?? label;
}

function localizeUnits(units: string, locale: Locale): string {
  if (locale === "en") return units;
  return units
    .replace("mm/yr", "mm/año")
    .replace("days/yr", "días/año")
    .replace("nights/yr", "noches/año")
    .replace("mm/dec", "mm/déc")
    .replace("days/dec", "días/déc")
    .replace("nights/dec", "noches/déc")
    .replace("°C/dec", "°C/déc")
    .replace("m/s/dec", "m/s/déc")
    .replace("pts/dec", "ptos/déc")
    .replace("pts (0–100)", "puntos (0–100)")
    .replace("pts", "ptos");
}

function localizeSubLabel(subLabel: string, locale: Locale): string {
  if (locale === "en") return subLabel;
  return subLabel
    .replace("basin box (approx.)", "cuenca hidrográfica (aprox.)")
    .replace("SWOT passes", "pasadas satelitales SWOT");
}

function formatTrendBadge(
  metric: MetricReadout,
  locale: Locale,
): {
  arrow: string;
  slopeText: string;
  sigText: string;
  sigClass: string;
} {
  if (!Number.isFinite(metric.slopeDecade)) {
    return {
      arrow: "·",
      slopeText:
        locale === "es"
          ? "Estadístico descriptivo (sin serie multianual)"
          : "Descriptive statistic (no multi-year trend)",
      sigText: "",
      sigClass: "text-faint",
    };
  }
  const sign = metric.slopeDecade > 0 ? "+" : "";
  const units = localizeUnits(metric.trendUnits, locale);
  const arrow = Math.abs(metric.slopeDecade) < 0.01 ? "◆" : metric.slopeDecade > 0 ? "▲" : "▼";
  const dirWord =
    locale === "es"
      ? Math.abs(metric.slopeDecade) < 0.01
        ? "Estable"
        : metric.slopeDecade > 0
          ? "Sube"
          : "Baja"
      : Math.abs(metric.slopeDecade) < 0.01
        ? "Stable"
        : metric.slopeDecade > 0
          ? "Rising"
          : "Falling";

  const slopeText = `${dirWord} ${sign}${metric.slopeDecade} ${units}`;

  if (!Number.isFinite(metric.pValue)) {
    return {
      arrow,
      slopeText,
      sigText: locale === "es" ? "Serie descriptiva" : "Descriptive series",
      sigClass: "text-faint",
    };
  }

  if (metric.significant) {
    return {
      arrow,
      slopeText,
      sigText:
        locale === "es"
          ? `✓ Tendencia confirmada (p = ${metric.pValue < 0.001 ? "<0,001" : metric.pValue.toFixed(3)})`
          : `✓ Confirmed trend (p = ${metric.pValue < 0.001 ? "<0.001" : metric.pValue.toFixed(3)})`,
      sigClass: "text-emerald-300",
    };
  }

  return {
    arrow,
    slopeText,
    sigText:
      locale === "es"
        ? `Variabilidad natural (p = ${metric.pValue.toFixed(2)}, no significativo)`
        : `Natural variability (p = ${metric.pValue.toFixed(2)}, not significant)`,
    sigClass: "text-faint",
  };
}

function buildLocalizedSiteSummary(
  site: EvaluatedEnergySite,
  conceptId: EnergyConceptId,
  locale: Locale,
): { finding: string; implication: string } {
  if (locale === "en") {
    return {
      finding: site.scientificFinding,
      implication: site.industrialOpportunity,
    };
  }

  const pVal = Number.isFinite(site.primaryMetric.value)
    ? `${site.primaryMetric.value} ${localizeUnits(site.primaryMetric.units, "es")}`
    : "sin dato directo en esta unidad";
  const sVal = Number.isFinite(site.secondaryMetric.value)
    ? `${site.secondaryMetric.value} ${localizeUnits(site.secondaryMetric.units, "es")}`
    : "sin dato directo en esta unidad";
  const pSlope = Number.isFinite(site.primaryMetric.slopeDecade)
    ? `${site.primaryMetric.slopeDecade > 0 ? "+" : ""}${site.primaryMetric.slopeDecade} ${localizeUnits(site.primaryMetric.trendUnits, "es")}`
    : null;
  const sSlope = Number.isFinite(site.secondaryMetric.slopeDecade)
    ? `${site.secondaryMetric.slopeDecade > 0 ? "+" : ""}${site.secondaryMetric.slopeDecade} ${localizeUnits(site.secondaryMetric.trendUnits, "es")}`
    : null;

  if (site.scope === "reservoir") {
    const cvText = Number.isFinite(site.primaryMetric.slopeDecade)
      ? `coeficiente de variación CV = ${site.primaryMetric.slopeDecade}`
      : "medición satelital SWOT";
    return {
      finding: `En ${site.name}, el satélite NASA SWOT registra una estabilidad de superficie del ${pVal} (${cvText}, ${site.tertiaryMetric.value}) junto con una evaporación potencial en su entorno de ${sVal}.`,
      implication:
        site.score >= 62
          ? `La lámina de agua se mantiene bastante estable entre pasadas satelitales: es un embalse prometedor para estudiar paneles solares flotantes (sin estimar aquí MW instalables) y reducir pérdidas por evaporación.`
          : `El nivel y área del embalse fluctúan de forma marcada según la época del año: cualquier estudio de solar flotante requeriría sistemas de anclaje adaptados a fuertes variaciones de cota.`,
    };
  }

  if (site.scope === "basin") {
    return {
      finding: `En la ${site.name}, la escorrentía modelada es de ${pVal} (${pSlope ?? "sin tendencia"}) frente a una evaporación de ${sVal} (${sSlope ?? "sin tendencia"}). Balance agua/lluvia: ${site.tertiaryMetric.value}.`,
      implication:
        site.primaryMetric.slopeDecade < -18
          ? `La escorrentía de la cuenca muestra una tendencia descendente: conviene analizar reglas de embalse plurianuales, bombeo reversible y ahorro evaporativo.`
          : `La cuenca mantiene un balance hidrológico más estable en el registro 2000–2025 en comparación con las cuencas del sur peninsular.`,
    };
  }

  switch (conceptId) {
    case "hydropower_stability":
      return {
        finding: `En ${site.name}, la escorrentía media es de ${pVal} (${pSlope ?? "estable"}) mientras que la pérdida por evaporación alcanza ${sVal} (${sSlope ?? "estable"}).`,
        implication:
          site.score >= 60
            ? `Balance hídrico favorable: la escorrentía se sostiene mejor frente a la evaporación que en otras zonas de España.`
            : `Divergencia hídrica: el aumento de la evaporación reduce la fracción de lluvia que llega a los cauces; conviene priorizar el almacenamiento por bombeo en circuito cerrado.`,
      };
    case "floating_solar":
      return {
        finding: `En ${site.name}, el índice medio en embalses SWOT es ${pVal} (${site.secondaryMetric.value || "según cobertura SWOT"}) con una evaporación de ${ site.tertiaryMetric.sub }.`,
        implication:
          site.score >= 60
            ? `Buena combinación de embalses con lámina estable y potencial de ahorro de agua por sombreado flotante. Cambia a "Embalses SWOT (48)" en el Paso 2 para inspeccionar cada embalse individual.`
            : `Menor estabilidad de lámina o menor cobertura de embalses SWOT en esta unidad. Selecciona "Embalses SWOT (48)" en el Paso 2 para ver cada embalse en detalle.`,
      };
    case "industrial_cooling":
      return {
        finding: `En ${site.name}, la temperatura media de verano es de ${pVal} (${pSlope ?? "estable"}) con ${sVal} de calor extremo (>35 °C) y ${site.tertiaryMetric.value} de noches tropicales.`,
        implication:
          site.score >= 62
            ? `Condiciones térmicas favorables para centros de datos e industria: veranos más suaves y amplio margen de refrigeración nocturna gratuita (free-cooling) sin estrés hídrico.`
            : `Alerta térmica para refrigeración: el aumento de días >35 °C y noches ≥20 °C penaliza los enfriadores secos y reduce las horas de free-cooling nocturno.`,
      };
    case "solar_resilience":
      return {
        finding: `En ${site.name}, el indicador de cielo despejado (ΔT) es de ${pVal} junto con ${sVal} de calor extremo (>35 °C) y rachas secas de ${site.tertiaryMetric.value}.`,
        implication:
          site.score >= 62
            ? `Buen compromiso solar: alta claridad de cielo combinada con menos días de sobrecarga térmica (>35 °C), lo que reduce las pérdidas de eficiencia por calor en los paneles.`
            : `Alta insolación pero acompañada de fuerte calor estival (>35 °C) y rachas secas largas: conviene usar módulos de bajo coeficiente térmico y prever limpieza frente al polvo.`,
      };
    case "hydrogen_water":
      return {
        finding: `En ${site.name}, el agua disponible en cauces es de ${pVal} (${pSlope ?? "estable"}) cruzada con un índice renovable (viento + sol) de ${sVal} y ${site.tertiaryMetric.value} sin lluvia.`,
        implication:
          site.score >= 58
            ? `Buena sinergia exploratoria para hidrógeno verde: recurso renovable competitivo junto con mayor disponibilidad de agua en la cuenca.`
            : `El recurso solar/eólico coincide con estrés hídrico o falta de cobertura eólica: proyectos de electrólisis deberían basarse en agua regenerada o desalada para no presionar los acuíferos.`,
      };
    case "energy_agriculture":
      return {
        finding: `En ${site.name}, la humedad superficial del suelo (0–10 cm) promedia ${pVal} (${pSlope ?? "estable"}) con ${sVal} de calor extremo (>35 °C) y verdor ${site.tertiaryMetric.value}.`,
        implication:
          site.score >= 55
            ? `Alto potencial agrovoltaico: el sombreado parcial con paneles elevados ayudaría a conservar la humedad del suelo y proteger los cultivos en episodios de >35 °C.`
            : `Menor sinergia agrovoltaica directa (o presencia de masa forestal densa donde debe evitarse ocupar suelo con plantas en tierra).`,
      };
    case "wind_solar_complementarity":
      return {
        finding: `En ${site.name}, la velocidad media del viento registrada es ${pVal} combinada con un indicador solar de cielo despejado de ${sVal} y lluvia media de ${site.tertiaryMetric.value}.`,
        implication:
          site.score >= 58
            ? `Buena complementariedad eólico-solar: combinar viento (más fuerte en invierno y noche) y fotovoltaica (verano y día) permite aprovechar mejor la capacidad del nudo de red.`
            : `Perfil dominado por una sola fuente (o sin estación de viento cercana): conviene complementar la planta con almacenamiento en baterías (BESS).`,
      };
  }
}

/* -------------------------------------------------------------------------- */
/*  LEFT DOCK: STEP-BY-STEP VISUAL CONTROLS                                   */
/* -------------------------------------------------------------------------- */

export interface EnergyTechControlsDockProps {
  conceptId: EnergyConceptId;
  scope: EnergyTargetScope;
  goal: EnergyOptimizationGoal;
  lens: EnergyVariableLens;
  heatmapDomain: [number, number];
  heatmapPalette: PaletteId;
  heatmapUnits: string;
  onChangeConcept: (id: EnergyConceptId) => void;
  onChangeScope: (scope: EnergyTargetScope) => void;
  onChangeGoal: (goal: EnergyOptimizationGoal) => void;
  onChangeLens: (lens: EnergyVariableLens) => void;
}

export function EnergyTechControlsDock({
  conceptId,
  scope,
  goal,
  lens,
  heatmapDomain,
  heatmapPalette,
  heatmapUnits,
  onChangeConcept,
  onChangeScope,
  onChangeGoal,
  onChangeLens,
}: EnergyTechControlsDockProps) {
  const { locale } = useLocale();
  const conceptMeta = ENERGY_CONCEPTS.find((c) => c.id === conceptId) ?? ENERGY_CONCEPTS[0];
  const txt = CONCEPT_TEXT[locale][conceptId];
  const scopes = SCOPE_META[locale];
  const goals = GOAL_META[locale];

  const lensButtons: Array<{ id: EnergyVariableLens; icon: string; shortTitle: string; desc: string }> = [
    {
      id: "composite",
      icon: "🎯",
      shortTitle: locale === "es" ? "Índice global (0–100)" : "Combined Index (0–100)",
      desc: txt.lensLabels.composite,
    },
    {
      id: "primary",
      icon: "🔵",
      shortTitle: `A · ${txt.varAName}`,
      desc: txt.lensLabels.primary,
    },
    {
      id: "secondary",
      icon: "🟠",
      shortTitle: `B · ${txt.varBName}`,
      desc: txt.lensLabels.secondary,
    },
    {
      id: "trend",
      icon: "📈",
      shortTitle: locale === "es" ? "Tendencia por década" : "Decadal Trend",
      desc: txt.lensLabels.trend,
    },
  ];

  return (
    <section
      aria-label={locale === "es" ? "Controles del Laboratorio de Energía" : "Energy Lab Controls"}
      className="panel pointer-events-auto flex flex-col gap-3 p-3 text-xs"
    >
      {/* Top Explainer Header */}
      <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.07] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
            {locale === "es" ? "⚡ Laboratorio Energético" : "⚡ Energy Lab Explorer"}
          </span>
          <span className="rounded border border-amber-400/35 bg-amber-400/15 px-1.5 py-0.5 font-mono text-[9px] font-medium text-amber-200">
            {locale === "es" ? "EXPLORATORIO" : "EXPLORATORY"}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-ink/90">
          {locale === "es"
            ? "Sigue estos 3 pasos para cruzar datos de satélites NASA y estaciones NOAA y ver dónde las tendencias climáticas ayudan o penalizan a cada tecnología."
            : "Follow these 3 steps to cross NASA satellite & NOAA station series and see where physical trends help or stress each energy technology."}
        </p>
      </div>

      {/* STEP 1: Choose Energy Case */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-ink">
            {locale === "es" ? "Paso 1 · Elige qué caso analizar" : "Step 1 · Pick an energy case"}
          </span>
          <span className="font-mono text-[9px] text-faint">7 {locale === "es" ? "casos" : "cases"}</span>
        </div>
        <div className="flex flex-col gap-1">
          {ENERGY_CONCEPTS.map((c) => {
            const cText = CONCEPT_TEXT[locale][c.id];
            const active = c.id === conceptId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChangeConcept(c.id)}
                className={`focus-ring flex flex-col rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  active
                    ? "border-amber-400/60 bg-amber-400/15 text-ink shadow-[inset_0_0_0_1px_rgb(251_191_36/0.25)]"
                    : "border-white/8 bg-space/50 text-muted hover:border-white/20 hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5 text-[11.5px] font-medium">
                    <span aria-hidden>{cText.icon}</span>
                    <span>{cText.title}</span>
                  </span>
                  {active && (
                    <span className="rounded bg-amber-400/20 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-amber-200">
                      {locale === "es" ? "Activo" : "Active"}
                    </span>
                  )}
                </div>
                {active && (
                  <p className="mt-1 text-[10.5px] leading-snug text-amber-100/85">
                    {cText.oneLiner}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Target Geographic Units */}
      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
        <span className="text-[11px] font-semibold text-ink">
          {locale === "es" ? "Paso 2 · ¿Dónde quieres comparar?" : "Step 2 · Where to compare?"}
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {(["basin", "reservoir", "provincia", "ccaa"] as EnergyTargetScope[]).map((sc) => {
            const allowed = conceptMeta.allowedScopes.includes(sc);
            const recommended = conceptMeta.recommendedScope === sc;
            const active = scope === sc;
            const scMeta = scopes[sc];
            return (
              <button
                key={sc}
                type="button"
                disabled={!allowed}
                onClick={() => onChangeScope(sc)}
                className={`focus-ring relative flex flex-col items-start rounded-lg border px-2 py-1.5 text-left transition-colors ${
                  !allowed
                    ? "cursor-not-allowed border-white/5 bg-space/20 opacity-35"
                    : active
                      ? "border-sky-400/60 bg-sky-400/15 text-ink shadow-[inset_0_0_0_1px_rgb(56_189_248/0.25)]"
                      : "border-white/10 bg-space/50 text-muted hover:border-white/25 hover:text-ink"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span className="text-[11px] font-medium">
                    {scMeta.icon} {scMeta.shortLabel}
                  </span>
                  {recommended && allowed && (
                    <span
                      title={
                        locale === "es"
                          ? "Escala recomendada para esta tecnología"
                          : "Recommended scale for this technology"
                      }
                      className="rounded bg-emerald-400/20 px-1 py-0.2 font-mono text-[8.5px] font-semibold text-emerald-300"
                    >
                      ★ {locale === "es" ? "Ideal" : "Best"}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 font-mono text-[9.5px] text-faint">{scMeta.count}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] leading-snug text-muted">{scopes[scope].hint}</p>
      </div>

      {/* STEP 3: What the 3D Map Colors Show + Filter */}
      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
        <span className="text-[11px] font-semibold text-ink">
          {locale === "es" ? "Paso 3 · ¿Qué colorea el globo 3D?" : "Step 3 · What colors the 3D globe?"}
        </span>
        <div className="grid grid-cols-2 gap-1">
          {lensButtons.map((b) => {
            const active = lens === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onChangeLens(b.id)}
                title={b.desc}
                className={`focus-ring flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[10.5px] transition-colors ${
                  active
                    ? "border-amber-400/60 bg-amber-400/15 font-medium text-amber-100"
                    : "border-white/10 bg-space/50 text-muted hover:border-white/20 hover:text-ink"
                }`}
              >
                <span aria-hidden className="shrink-0">
                  {b.icon}
                </span>
                <span className="truncate">{b.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Clear Map Color Scale Legend */}
        <div className="mt-1 rounded-lg border border-white/10 bg-space/60 p-2">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="truncate font-medium text-ink">{txt.lensLabels[lens]}</span>
            <span className="shrink-0 font-mono text-[9.5px] text-amber-200">
              {localizeUnits(heatmapUnits, locale)}
            </span>
          </div>
          <div
            className="mt-1.5 h-2.5 w-full rounded-full border border-white/15"
            style={{ background: paletteGradientCss(heatmapPalette, "x") }}
          />
          <div className="mt-1 flex justify-between font-mono text-[9.5px] text-ink/90">
            <span>
              {heatmapDomain[0]} {localizeUnits(heatmapUnits, locale)}
            </span>
            <span>
              {heatmapDomain[1]} {localizeUnits(heatmapUnits, locale)}
            </span>
          </div>
          <div className="mt-0.5 flex justify-between text-[9px] text-muted">
            <span>◀ {txt.scaleLowLabel}</span>
            <span className="text-right">{txt.scaleHighLabel} ▶</span>
          </div>
        </div>
      </div>

      {/* Quick Ranking Filter Sync */}
      <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
        <span className="text-[10.5px] font-medium text-muted">
          {locale === "es" ? "Orden del ranking en el panel derecho:" : "Ranking order in right panel:"}
        </span>
        <div className="grid grid-cols-3 gap-1">
          {(["ideal", "at_risk", "significant_only"] as EnergyOptimizationGoal[]).map((g) => {
            const active = goal === g;
            const gMeta = goals[g];
            return (
              <button
                key={g}
                type="button"
                onClick={() => onChangeGoal(g)}
                title={gMeta.desc}
                className={`focus-ring rounded-md border px-1.5 py-1 text-center text-[10px] transition-colors ${
                  active
                    ? "border-amber-400/55 bg-amber-400/15 font-medium text-amber-200"
                    : "border-white/10 bg-space/40 text-muted hover:text-ink"
                }`}
              >
                {gMeta.icon} {gMeta.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  DUAL TIME SERIES CHART WITH HOVER READOUT & CLEAR AXES                    */
/* -------------------------------------------------------------------------- */

function CrossedDualTimeSeriesChart({
  site,
  locale,
}: {
  site: EvaluatedEnergySite;
  locale: Locale;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const series = site.dualSeries;
  if (!series || series.length === 0) return null;

  const width = 460;
  const height = 165;
  const padL = 38;
  const padR = 38;
  const padT = 16;
  const padB = 24;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const years = series.map((d) => d.year);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  const xFor = (yr: number) => padL + ((yr - minY) / Math.max(1, maxY - minY)) * plotW;

  const pVals = series
    .flatMap((d) => [d.primaryObs, d.primaryTrend])
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const sVals = series
    .flatMap((d) => [d.secondaryObs, d.secondaryTrend])
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const pMin = pVals.length ? Math.min(...pVals) : 0;
  const pMax = pVals.length ? Math.max(...pVals) : 1;
  const pSpan = pMax - pMin || 1;
  const yPrimary = (v: number) => padT + plotH - ((v - pMin) / pSpan) * plotH;

  const sMin = sVals.length ? Math.min(...sVals) : 0;
  const sMax = sVals.length ? Math.max(...sVals) : 1;
  const sSpan = sMax - sMin || 1;
  const ySecondary = (v: number) => padT + plotH - ((v - sMin) / sSpan) * plotH;

  const buildPath = (pts: Array<{ x: number; y: number | null }>) => {
    let d = "";
    for (const pt of pts) {
      if (pt.y === null || !Number.isFinite(pt.y)) continue;
      d += `${d === "" ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)} `;
    }
    return d.trim();
  };

  const pObsPath = buildPath(
    series.map((d) => ({ x: xFor(d.year), y: d.primaryObs !== null && d.primaryObs !== undefined ? yPrimary(d.primaryObs) : null })),
  );
  const pTrendPath = buildPath(
    series.map((d) => ({ x: xFor(d.year), y: d.primaryTrend !== null && d.primaryTrend !== undefined ? yPrimary(d.primaryTrend) : null })),
  );
  const sObsPath = buildPath(
    series.map((d) => ({ x: xFor(d.year), y: d.secondaryObs !== null && d.secondaryObs !== undefined ? ySecondary(d.secondaryObs) : null })),
  );
  const sTrendPath = buildPath(
    series.map((d) => ({ x: xFor(d.year), y: d.secondaryTrend !== null && d.secondaryTrend !== undefined ? ySecondary(d.secondaryTrend) : null })),
  );

  const x2026 = xFor(2026);
  const pLabel = localizeSeriesLabel(site.primarySeriesLabel, locale);
  const sLabel = localizeSeriesLabel(site.secondarySeriesLabel, locale);
  const pUnits = localizeUnits(site.primarySeriesUnits, locale);
  const sUnits = localizeUnits(site.secondarySeriesUnits, locale);

  const activePoint = hoverIdx !== null ? series[hoverIdx] : series[series.length - 1];

  return (
    <div className="rounded-lg border border-white/12 bg-space/70 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-[11px] font-semibold text-ink">
          {locale === "es"
            ? "📈 Evolución histórica cruzada (2000–2025) y tendencia"
            : "📈 Crossed Historical Series (2000–2025) & Trend"}
        </span>
        <span className="font-mono text-[9.5px] text-faint">
          {locale === "es" ? "Pasa el ratón para ver cada año" : "Hover to inspect any year"}
        </span>
      </div>

      {/* Clear Color-Coded Legend Pills */}
      <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-1.5 rounded border border-sky-400/25 bg-sky-500/10 px-2 py-1 text-[10px]">
          <span className="flex items-center gap-1.5 truncate font-medium text-sky-200">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-sky-400" />
            <span className="truncate">{pLabel}</span>
          </span>
          <span className="shrink-0 font-mono text-[9.5px] text-sky-300">
            {locale === "es" ? "Eje izq." : "Left axis"} ({pUnits})
          </span>
        </div>
        <div className="flex items-center justify-between gap-1.5 rounded border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px]">
          <span className="flex items-center gap-1.5 truncate font-medium text-amber-200">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <span className="truncate">{sLabel}</span>
          </span>
          <span className="shrink-0 font-mono text-[9.5px] text-amber-300">
            {locale === "es" ? "Eje der." : "Right axis"} ({sUnits})
          </span>
        </div>
      </div>

      {/* Interactive Readout Bar for Hovered or Latest Year */}
      {activePoint && (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded bg-white/[0.04] px-2 py-1 font-mono text-[10px]">
          <span className="font-semibold text-ink">
            {locale === "es" ? "Año" : "Year"} {activePoint.year}
            {activePoint.year >= 2026
              ? locale === "es"
                ? " (extrapolación Sen)"
                : " (Sen extrapolation)"
              : ""}:
          </span>
          <span className="text-sky-300">
            🔵{" "}
            {activePoint.primaryObs !== null && activePoint.primaryObs !== undefined
              ? `${activePoint.primaryObs.toFixed(1)} ${pUnits}`
              : activePoint.primaryTrend !== null && activePoint.primaryTrend !== undefined
                ? `~${activePoint.primaryTrend.toFixed(1)} ${pUnits}`
                : "—"}
          </span>
          <span className="text-amber-300">
            🟠{" "}
            {activePoint.secondaryObs !== null && activePoint.secondaryObs !== undefined
              ? `${activePoint.secondaryObs.toFixed(1)} ${sUnits}`
              : activePoint.secondaryTrend !== null && activePoint.secondaryTrend !== undefined
                ? `~${activePoint.secondaryTrend.toFixed(1)} ${sUnits}`
                : "—"}
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 h-40 w-full select-none overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((t) => {
          const y = padT + t * plotH;
          return (
            <line
              key={t}
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeDasharray="2,3"
            />
          );
        })}

        {/* 2026-2030 extrapolation shaded zone */}
        {maxY >= 2026 && (
          <g>
            <rect
              x={x2026}
              y={padT}
              width={Math.max(0, width - padR - x2026)}
              height={plotH}
              fill="rgba(251, 191, 36, 0.06)"
            />
            <line
              x1={x2026}
              x2={x2026}
              y1={padT}
              y2={padT + plotH}
              stroke="rgba(251, 191, 36, 0.4)"
              strokeDasharray="3,3"
            />
          </g>
        )}

        {/* Dashed Trend Lines */}
        {pTrendPath && (
          <path d={pTrendPath} fill="none" stroke="rgba(56, 189, 248, 0.55)" strokeWidth={1.5} strokeDasharray="4,3" />
        )}
        {sTrendPath && (
          <path d={sTrendPath} fill="none" stroke="rgba(251, 191, 36, 0.55)" strokeWidth={1.5} strokeDasharray="4,3" />
        )}

        {/* Solid Observed Series Lines */}
        {pObsPath && <path d={pObsPath} fill="none" stroke="#38bdf8" strokeWidth={2.2} />}
        {sObsPath && <path d={sObsPath} fill="none" stroke="#fbbf24" strokeWidth={2} />}

        {/* Hover vertical cursor line */}
        {hoverIdx !== null && series[hoverIdx] && (
          <line
            x1={xFor(series[hoverIdx].year)}
            x2={xFor(series[hoverIdx].year)}
            y1={padT}
            y2={padT + plotH}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1}
          />
        )}

        {/* Left Y-axis labels (Primary - Blue) */}
        <text x={padL - 5} y={padT + 4} textAnchor="end" className="fill-sky-300 font-mono text-[9px]">
          {pMax.toFixed(0)}
        </text>
        <text x={padL - 5} y={padT + plotH / 2 + 3} textAnchor="end" className="fill-sky-300/70 font-mono text-[8.5px]">
          {((pMax + pMin) / 2).toFixed(0)}
        </text>
        <text x={padL - 5} y={padT + plotH} textAnchor="end" className="fill-sky-300 font-mono text-[9px]">
          {pMin.toFixed(0)}
        </text>

        {/* Right Y-axis labels (Secondary - Amber) */}
        <text x={width - padR + 5} y={padT + 4} textAnchor="start" className="fill-amber-300 font-mono text-[9px]">
          {sMax.toFixed(0)}
        </text>
        <text
          x={width - padR + 5}
          y={padT + plotH / 2 + 3}
          textAnchor="start"
          className="fill-amber-300/70 font-mono text-[8.5px]"
        >
          {((sMax + sMin) / 2).toFixed(0)}
        </text>
        <text x={width - padR + 5} y={padT + plotH} textAnchor="start" className="fill-amber-300 font-mono text-[9px]">
          {sMin.toFixed(0)}
        </text>

        {/* X-axis year ticks */}
        {[2000, 2005, 2010, 2015, 2020, 2025, 2030]
          .filter((y) => y >= minY && y <= maxY)
          .map((yr) => (
            <text
              key={yr}
              x={xFor(yr)}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-400 font-mono text-[9px]"
            >
              {yr}
            </text>
          ))}

        {/* Invisible interactive hover columns */}
        {series.map((d, idx) => {
          const x = xFor(d.year);
          const colW = plotW / Math.max(1, series.length);
          return (
            <rect
              key={d.year}
              x={x - colW / 2}
              y={padT}
              width={colW}
              height={plotH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIdx(idx)}
            />
          );
        })}
      </svg>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-muted">
        <span>
          {locale === "es"
            ? "── Línea continua: dato observado · - - Línea punteada: tendencia de Sen"
            : "── Solid line: observed · - - Dashed line: Sen trend"}
        </span>
        {maxY >= 2026 && (
          <span className="text-amber-300/80">
            {locale === "es"
              ? "Zona 2026–2030: proyección lineal de la tendencia (no es predicción)"
              : "2026–2030 band: linear trend projection (not a forecast)"}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SWOT RESERVOIR PASS CHART (2023–2026)                                     */
/* -------------------------------------------------------------------------- */

function SwotPassMiniChart({
  swotSeries,
  locale,
}: {
  swotSeries: NonNullable<EvaluatedEnergySite["swotSeries"]>;
  locale: Locale;
}) {
  if (swotSeries.length < 2) return null;
  const width = 440;
  const height = 105;
  const padL = 36;
  const padR = 36;
  const padT = 12;
  const padB = 20;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const areas = swotSeries.map((d) => d.area_km2);
  const wses = swotSeries.map((d) => d.wse_m);
  const aMin = Math.min(...areas);
  const aMax = Math.max(...areas);
  const aSpan = aMax - aMin || 1;
  const wMin = Math.min(...wses);
  const wMax = Math.max(...wses);
  const wSpan = wMax - wMin || 1;

  const xFor = (i: number) => padL + (i / Math.max(1, swotSeries.length - 1)) * plotW;
  const yArea = (v: number) => padT + plotH - ((v - aMin) / aSpan) * plotH;
  const yWse = (v: number) => padT + plotH - ((v - wMin) / wSpan) * plotH;

  const areaPath = swotSeries
    .map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yArea(d.area_km2).toFixed(1)}`)
    .join(" ");
  const wsePath = swotSeries
    .map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yWse(d.wse_m).toFixed(1)}`)
    .join(" ");

  return (
    <div className="rounded-lg border border-sky-400/25 bg-sky-950/20 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
        <span className="font-semibold text-sky-200">
          🛰️{" "}
          {locale === "es"
            ? `Mediciones directas del satélite NASA/CNES SWOT (${swotSeries.length} pasadas, 2023–2026)`
            : `Direct NASA/CNES SWOT Satellite Passes (${swotSeries.length} passes, 2023–2026)`}
        </span>
        <div className="flex items-center gap-3 font-mono text-[9.5px]">
          <span className="text-sky-300">
            ● {locale === "es" ? "Superficie (km²)" : "Surface area (km²)"}
          </span>
          <span className="text-emerald-300">
            ● {locale === "es" ? "Cota de agua WSE (m)" : "Water elevation WSE (m)"}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 h-24 w-full overflow-visible">
        <path d={areaPath} fill="none" stroke="#38bdf8" strokeWidth={2} />
        <path d={wsePath} fill="none" stroke="#34d399" strokeWidth={1.6} strokeDasharray="3,2" />
        <text x={padL - 4} y={padT + 4} textAnchor="end" className="fill-sky-300 font-mono text-[8.5px]">
          {aMax.toFixed(1)} km²
        </text>
        <text x={padL - 4} y={padT + plotH} textAnchor="end" className="fill-sky-300 font-mono text-[8.5px]">
          {aMin.toFixed(1)} km²
        </text>
        <text x={width - padR + 4} y={padT + 4} textAnchor="start" className="fill-emerald-300 font-mono text-[8.5px]">
          {wMax.toFixed(1)} m
        </text>
        <text
          x={width - padR + 4}
          y={padT + plotH}
          textAnchor="start"
          className="fill-emerald-300 font-mono text-[8.5px]"
        >
          {wMin.toFixed(1)} m
        </text>
        <text x={padL} y={height - 3} textAnchor="start" className="fill-slate-400 font-mono text-[8.5px]">
          {swotSeries[0]?.ym}
        </text>
        <text x={width - padR} y={height - 3} textAnchor="end" className="fill-slate-400 font-mono text-[8.5px]">
          {swotSeries[swotSeries.length - 1]?.ym}
        </text>
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  RIGHT INSPECTOR PANEL: SELF-EXPLANATORY ANALYSIS & RANKING                */
/* -------------------------------------------------------------------------- */

export interface EnergyTechInspectorPanelProps {
  conceptId: EnergyConceptId;
  scope: EnergyTargetScope;
  goal: EnergyOptimizationGoal;
  sites: EvaluatedEnergySite[];
  selectedSiteId: string | null;
  onSelectSite: (site: EvaluatedEnergySite) => void;
  onChangeGoal?: (goal: EnergyOptimizationGoal) => void;
  onChangeScope?: (scope: EnergyTargetScope) => void;
  onClose: () => void;
}

export function EnergyTechInspectorPanel({
  conceptId,
  scope,
  goal,
  sites,
  selectedSiteId,
  onSelectSite,
  onChangeGoal,
  onChangeScope,
  onClose,
}: EnergyTechInspectorPanelProps) {
  const { locale } = useLocale();
  const [showMethodDrawer, setShowMethodDrawer] = useState(false);

  const conceptMeta = ENERGY_CONCEPTS.find((c) => c.id === conceptId) ?? ENERGY_CONCEPTS[0];
  const txt = CONCEPT_TEXT[locale][conceptId];
  const scopes = SCOPE_META[locale];
  const goals = GOAL_META[locale];

  const activeSite = sites.find((s) => s.id === selectedSiteId) ?? sites[0] ?? null;
  const activeRank = activeSite ? sites.findIndex((s) => s.id === activeSite.id) + 1 : 0;

  return (
    <aside
      aria-label={locale === "es" ? "Análisis del Laboratorio Energético" : "Energy Lab Analysis"}
      className="panel pointer-events-auto flex h-full min-h-0 flex-col overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-amber-200">
              {locale === "es" ? "ANÁLISIS MULTIVARIABLE (EXPLORATORIO)" : "MULTI-VARIABLE ANALYSIS (EXPLORATORY)"}
            </span>
            <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 font-mono text-[9.5px] text-sky-200">
              {txt.coverageBadge}
            </span>
          </div>
          <h2 className="mt-1.5 flex items-center gap-1.5 text-base font-semibold text-ink">
            <span aria-hidden>{txt.icon}</span>
            <span>{txt.title}</span>
          </h2>
          <p className="mt-0.5 text-xs font-medium text-amber-200/95">{txt.question}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={locale === "es" ? "Cerrar panel" : "Close panel"}
          className="focus-ring shrink-0 rounded-md px-2 py-1 text-xs text-muted hover:bg-white/8 hover:text-ink"
        >
          ✕
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-3 text-xs">
        {/* BLOCK 1: Visual Explanation of What We Are Crossing */}
        <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
              {locale === "es" ? "🔍 ¿Qué estamos cruzando y por qué?" : "🔍 What are we crossing & why?"}
            </span>
            <button
              type="button"
              onClick={() => setShowMethodDrawer((v) => !v)}
              className="focus-ring rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-sky-200 hover:bg-white/10"
            >
              {showMethodDrawer
                ? locale === "es"
                  ? "Ocultar fuentes ▲"
                  : "Hide sources ▲"
                : locale === "es"
                  ? "Ver fuentes NASA/NOAA ▼"
                  : "View NASA/NOAA sources ▼"}
            </button>
          </div>

          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink/90">{txt.whyCross}</p>

          {/* Visual Crossing Formula Pills */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-space/60 p-2 text-[10.5px]">
            <span className="rounded border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 font-medium text-sky-200">
              🔵 {txt.varAName}
            </span>
            <span className="font-mono font-bold text-muted">×</span>
            <span className="rounded border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 font-medium text-amber-200">
              🟠 {txt.varBName}
            </span>
            <span className="font-mono font-bold text-muted">→</span>
            <span className="rounded border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-200">
              🎯 {locale === "es" ? "Índice 0–100" : "0–100 Index"}
            </span>
          </div>

          {/* Collapsible Methodology & Dataset Provenance Drawer */}
          {showMethodDrawer && (
            <div className="mt-2.5 space-y-2 border-t border-white/10 pt-2.5">
              <p className="text-[10.5px] leading-relaxed text-muted">{txt.methodologyNote}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {txt.variables.map((v, idx) => (
                  <div key={idx} className="rounded border border-white/8 bg-space/70 px-2.5 py-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-medium text-ink">
                        {v.label}
                        {v.isProxy && (
                          <span className="ml-1.5 rounded bg-amber-400/20 px-1 py-0.2 font-mono text-[9px] text-amber-200">
                            PROXY
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[9.5px] text-sky-300">{v.dataset}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted">{v.role}</p>
                  </div>
                ))}
              </div>
              <p className="rounded border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[10px] text-amber-100/90">
                {locale === "es"
                  ? "Nota científica: El índice 0–100 es una combinación heurística exploratoria para comparar regiones con las mismas reglas físicas; no sustituye a un estudio de ingeniería de detalle ni de conexión a red."
                  : "Scientific note: The 0–100 index is an exploratory heuristic crossing to compare regions on a consistent physical basis; it does not replace site-level engineering or grid permitting."}
              </p>
            </div>
          )}
        </div>

        {/* BLOCK 2: Interactive Ranking Selector */}
        <div className="rounded-xl border border-white/12 bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-ink">
                {locale === "es"
                  ? `1. Comparativa de ${scopes[scope].fullLabel} (${sites.length})`
                  : `1. Comparison across ${scopes[scope].fullLabel} (${sites.length})`}
              </h3>
              <p className="text-[10.5px] text-muted">
                {locale === "es"
                  ? "Haz clic en cualquier lugar de la lista (o del mapa 3D) para ver su ficha detallada abajo."
                  : "Click any place in the list (or on the 3D globe) to inspect its detailed breakdown below."}
              </p>
            </div>

            {/* Scope quick switcher if recommended scope differs */}
            {onChangeScope && conceptMeta.recommendedScope !== scope && (
              <button
                type="button"
                onClick={() => onChangeScope(conceptMeta.recommendedScope)}
                className="focus-ring rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/25"
              >
                ★{" "}
                {locale === "es"
                  ? `Cambiar a ${scopes[conceptMeta.recommendedScope].shortLabel} (recomendado)`
                  : `Switch to ${scopes[conceptMeta.recommendedScope].shortLabel} (recommended)`}
              </button>
            )}
          </div>

          {/* 3 Interactive Filter Pills */}
          {onChangeGoal && (
            <div className="mt-2 grid grid-cols-3 gap-1">
              {(["ideal", "at_risk", "significant_only"] as EnergyOptimizationGoal[]).map((g) => {
                const active = goal === g;
                const gMeta = goals[g];
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onChangeGoal(g)}
                    title={gMeta.desc}
                    className={`focus-ring flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10.5px] transition-colors ${
                      active
                        ? "border-amber-400/60 bg-amber-400/15 font-semibold text-amber-200"
                        : "border-white/10 bg-space/50 text-muted hover:border-white/25 hover:text-ink"
                    }`}
                  >
                    <span aria-hidden>{gMeta.icon}</span>
                    <span className="truncate">{gMeta.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Ranked List with Visual Progress Bars */}
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
            {sites.map((site, idx) => {
              const isSelected = activeSite?.id === site.id;
              const st = getStatusPresentation(site, locale);
              const scoreFin = Number.isFinite(site.score);
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onSelectSite(site)}
                  className={`focus-ring flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                    isSelected
                      ? "border-amber-400/65 bg-amber-400/15 text-ink shadow-[inset_0_0_0_1px_rgb(251_191_36/0.25)]"
                      : "border-white/8 bg-space/45 text-muted hover:border-white/20 hover:bg-white/[0.04] hover:text-ink"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={`flex h-5 w-6 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold ${
                        idx < 3
                          ? "bg-amber-400/25 text-amber-200"
                          : "bg-white/8 text-faint"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[11.5px] font-medium text-ink">{site.name}</span>
                        {site.significant && (
                          <span
                            title={
                              locale === "es"
                                ? "Tendencia estadísticamente significativa (Mann-Kendall p < 0,05)"
                                : "Statistically significant trend (Mann-Kendall p < 0.05)"
                            }
                            className="shrink-0 rounded bg-emerald-500/20 px-1 py-0.2 font-mono text-[8.5px] text-emerald-300"
                          >
                            p&lt;0,05
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[9.5px] text-faint">
                        {localizeSubLabel(site.subLabel, locale)}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Status + Visual Score Bar */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`hidden rounded border px-1.5 py-0.5 text-[9px] sm:inline-block ${st.badgeClass}`}>
                      {st.icon} {st.badgeText}
                    </span>
                    <div className="w-16 text-right">
                      <div className="font-mono text-[11px] font-semibold text-ink">
                        {scoreFin ? `${site.score}/100` : "—"}
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${st.barColorClass}`}
                          style={{ width: `${scoreFin ? Math.max(6, Math.min(100, site.score)) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BLOCK 3: Selected Site Deep-Dive */}
        {activeSite && (() => {
          const st = getStatusPresentation(activeSite, locale);
          const pTrend = formatTrendBadge(activeSite.primaryMetric, locale);
          const sTrend = formatTrendBadge(activeSite.secondaryMetric, locale);
          const summary = buildLocalizedSiteSummary(activeSite, conceptId, locale);
          const scoreFin = Number.isFinite(activeSite.score);

          return (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-400/35 bg-gradient-to-b from-amber-500/[0.07] to-space/90 p-3.5">
              {/* Site Header + Overall Score Bar */}
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-200">
                      {locale === "es" ? `Puesto #${activeRank} de ${sites.length}` : `Rank #${activeRank} of ${sites.length}`}
                    </span>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${st.badgeClass}`}>
                      {st.icon} {st.badgeText}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-ink">{activeSite.name}</h3>
                  <p className="text-[11px] text-muted">{localizeSubLabel(activeSite.subLabel, locale)}</p>
                </div>

                {/* Big Clear Score Box */}
                <div className="rounded-lg border border-white/15 bg-space/70 px-3 py-2 text-right">
                  <span className="block font-mono text-[9.5px] text-muted uppercase">
                    {locale === "es" ? "Índice exploratorio" : "Exploratory index"}
                  </span>
                  <div className="mt-0.5 flex items-baseline justify-end gap-1">
                    <span className="font-mono text-xl font-bold text-amber-300">
                      {scoreFin ? activeSite.score : "—"}
                    </span>
                    <span className="font-mono text-xs text-faint">/ 100</span>
                  </div>
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${st.barColorClass}`}
                      style={{ width: `${scoreFin ? Math.max(6, Math.min(100, activeSite.score)) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-ink/85">{st.meaningText}</p>

              {/* 3 Clear Variable Cards (Primary Blue, Secondary Amber, Context Slate) */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {/* Primary Variable Card (Blue) */}
                <div className="rounded-lg border border-sky-400/30 bg-sky-950/20 p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[9px] font-semibold text-sky-300 uppercase">
                      🔵 {locale === "es" ? "Variable A" : "Variable A"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-ink">
                    {localizeMetricLabel(activeSite.primaryMetric.label, locale)}
                  </p>
                  <p className="mt-1 font-mono text-base font-bold text-sky-200">
                    {Number.isFinite(activeSite.primaryMetric.value) ? (
                      <>
                        {activeSite.primaryMetric.value}{" "}
                        <span className="text-[11px] font-normal text-sky-300/80">
                          {localizeUnits(activeSite.primaryMetric.units, locale)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-normal text-muted">
                        {locale === "es" ? "Sin estación en esta unidad" : "No station in this unit"}
                      </span>
                    )}
                  </p>
                  <div className="mt-1.5 border-t border-white/10 pt-1 text-[10px]">
                    <p className="font-mono text-ink/90">
                      {pTrend.arrow} {pTrend.slopeText}
                    </p>
                    {pTrend.sigText && <p className={`mt-0.5 text-[9.5px] ${pTrend.sigClass}`}>{pTrend.sigText}</p>}
                  </div>
                </div>

                {/* Secondary Variable Card (Amber) */}
                <div className="rounded-lg border border-amber-400/30 bg-amber-950/20 p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[9px] font-semibold text-amber-300 uppercase">
                      🟠 {locale === "es" ? "Variable B" : "Variable B"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-ink">
                    {localizeMetricLabel(activeSite.secondaryMetric.label, locale)}
                  </p>
                  <p className="mt-1 font-mono text-base font-bold text-amber-200">
                    {Number.isFinite(activeSite.secondaryMetric.value) ? (
                      <>
                        {activeSite.secondaryMetric.value}{" "}
                        <span className="text-[11px] font-normal text-amber-300/80">
                          {localizeUnits(activeSite.secondaryMetric.units, locale)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-normal text-muted">
                        {locale === "es" ? "Cambia a Embalses SWOT" : "Switch to SWOT Reservoirs"}
                      </span>
                    )}
                  </p>
                  <div className="mt-1.5 border-t border-white/10 pt-1 text-[10px]">
                    <p className="font-mono text-ink/90">
                      {sTrend.arrow} {sTrend.slopeText}
                    </p>
                    {sTrend.sigText && <p className={`mt-0.5 text-[9.5px] ${sTrend.sigClass}`}>{sTrend.sigText}</p>}
                  </div>
                </div>

                {/* Tertiary Context Card */}
                <div className="rounded-lg border border-white/15 bg-space/65 p-2.5">
                  <span className="font-mono text-[9px] font-semibold text-muted uppercase">
                    ⚪ {locale === "es" ? "Contexto físico" : "Physical Context"}
                  </span>
                  <p className="mt-0.5 text-[11px] font-medium text-ink">
                    {localizeMetricLabel(activeSite.tertiaryMetric.label, locale)}
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-ink">
                    {localizeUnits(activeSite.tertiaryMetric.value, locale)}
                  </p>
                  <div className="mt-1.5 border-t border-white/10 pt-1 text-[10px] text-muted">
                    {localizeUnits(activeSite.tertiaryMetric.sub, locale)}
                  </div>
                </div>
              </div>

              {/* Dual Time-Series Chart */}
              <CrossedDualTimeSeriesChart site={activeSite} locale={locale} />

              {/* SWOT Satellite Pass Chart (when a reservoir is selected) */}
              {activeSite.swotSeries && activeSite.swotSeries.length > 1 && (
                <SwotPassMiniChart swotSeries={activeSite.swotSeries} locale={locale} />
              )}

              {/* Plain-Language Takeaways */}
              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-lg border border-white/12 bg-space/70 p-2.5">
                  <span className="block font-mono text-[9.5px] font-semibold tracking-wider text-sky-300 uppercase">
                    📊 {locale === "es" ? "Qué muestran los datos en este lugar" : "What the data shows here"}
                  </span>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink/95">{summary.finding}</p>
                </div>
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-950/25 p-2.5">
                  <span className="block font-mono text-[9.5px] font-semibold tracking-wider text-emerald-300 uppercase">
                    💡{" "}
                    {locale === "es"
                      ? "Lectura energética (exploratoria)"
                      : "Energy takeaway (exploratory)"}
                  </span>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-emerald-100/95">{summary.implication}</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </aside>
  );
}
