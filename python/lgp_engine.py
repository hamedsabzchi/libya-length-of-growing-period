"""Core Earth Engine analysis engine for Libya Length of Growing Period (LGP) mapping.

This module is a notebook-oriented Python port of the reference Google Earth Engine
JavaScript application in ``gee/libya_lgp_mapping.js``. Heavy raster computation is
performed by Google Earth Engine; Python acts as the workflow controller.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import ee


DEFAULT_START_YEAR = 2020
DEFAULT_END_YEAR = 2024
FIRST_VALID_YEAR = 1982
TEMPERATURE_THRESHOLD_C = 5.0
WR_MIN_MM = 5.0
WR_MAX_MM = 150.0
DEFAULT_REFERENCE_WR_MM = 100.0

CLASS_PALETTE = ["e31a23", "fd8d3c", "fed976", "addd8e", "31a354"]
CLASS_NAMES = [
    "Class 1: 0 days - Permanently not suitable",
    "Class 2: about 30 days - Marginally not suitable",
    "Class 3: about 60 days - Marginally suitable",
    "Class 4: about 90-120 days - Moderately suitable",
    "Class 5: about 150 days - Highly suitable",
]

RAINFALL_SOURCES = (
    "CHIRPS v2 Daily",
    "TerraClimate precipitation",
    "ERA5-Land precipitation",
)
ET_SOURCES = (
    "TerraClimate PET",
    "ERA5-Land potential evaporation",
)
TEMPERATURE_SOURCES = (
    "TerraClimate temperature",
    "ERA5-Land 2-m temperature",
)
METHODS = (
    "FAO reference LGP",
    "Gintzburger and Saidi method",
)
STORAGE_SOURCES = (
    "Reference storage 100 mm",
    "Custom uniform reference storage",
    "SoilGrids spatial WR 0-60 cm",
)

RAIN_SCALE = {
    "CHIRPS v2 Daily": 5566,
    "TerraClimate precipitation": 4638,
    "ERA5-Land precipitation": 11132,
}
ET_SCALE = {
    "TerraClimate PET": 4638,
    "ERA5-Land potential evaporation": 11132,
}
TEMPERATURE_SCALE = {
    "TerraClimate temperature": 4638,
    "ERA5-Land 2-m temperature": 11132,
}


@dataclass(frozen=True)
class LGPConfig:
    start_year: int = DEFAULT_START_YEAR
    end_year: int = DEFAULT_END_YEAR
    rainfall: str = "CHIRPS v2 Daily"
    et: str = "TerraClimate PET"
    temperature: str = "TerraClimate temperature"
    method: str = "Gintzburger and Saidi method"
    storage: str = "SoilGrids spatial WR 0-60 cm"
    reference_storage_mm: float = DEFAULT_REFERENCE_WR_MM


def libya_boundary() -> ee.FeatureCollection:
    """Return the Libya national boundary used by the reference application."""
    return ee.FeatureCollection("FAO/GAUL/2015/level0").filter(
        ee.Filter.eq("ADM0_NAME", "Libya")
    )


def effective_scale(rainfall: str, et: str, temperature: str) -> int:
    """Return the coarsest nominal scale among selected climate inputs, in metres."""
    return max(RAIN_SCALE[rainfall], ET_SCALE[et], TEMPERATURE_SCALE[temperature])


def scenario_maximum_year(rainfall: str, et: str, temperature: str) -> int:
    """Return latest complete growing year under the source limits encoded in the app."""
    uses_terraclimate = (
        rainfall == "TerraClimate precipitation"
        or et == "TerraClimate PET"
        or temperature == "TerraClimate temperature"
    )
    return 2024 if uses_terraclimate else 2025


def scenario_recent_period(rainfall: str, et: str, temperature: str) -> str:
    return "2021-2025" if scenario_maximum_year(rainfall, et, temperature) == 2025 else "2020-2024"


def validate_config(config: LGPConfig) -> None:
    """Validate a configuration before constructing Earth Engine objects."""
    if config.rainfall not in RAINFALL_SOURCES:
        raise ValueError(f"Unsupported rainfall source: {config.rainfall}")
    if config.et not in ET_SOURCES:
        raise ValueError(f"Unsupported ET source: {config.et}")
    if config.temperature not in TEMPERATURE_SOURCES:
        raise ValueError(f"Unsupported temperature source: {config.temperature}")
    if config.method not in METHODS:
        raise ValueError(f"Unsupported method: {config.method}")
    if config.storage not in STORAGE_SOURCES:
        raise ValueError(f"Unsupported storage source: {config.storage}")

    maximum_year = scenario_maximum_year(config.rainfall, config.et, config.temperature)
    if config.start_year < FIRST_VALID_YEAR or config.end_year > maximum_year:
        raise ValueError(
            f"Selected source combination supports complete growing years from "
            f"{FIRST_VALID_YEAR} through {maximum_year}."
        )
    if config.start_year > config.end_year:
        raise ValueError("Start year cannot be later than end year.")
    if config.end_year - config.start_year + 1 < 3:
        raise ValueError("Select at least three complete growing years.")
    if config.method == "FAO reference LGP" and config.et != "TerraClimate PET":
        raise ValueError("FAO reference LGP requires TerraClimate PET in this implementation.")
    if config.storage == "Custom uniform reference storage":
        if not (WR_MIN_MM <= float(config.reference_storage_mm) <= WR_MAX_MM):
            raise ValueError(f"Custom reference storage must be between {WR_MIN_MM:g} and {WR_MAX_MM:g} mm.")


def _soilgrids_spatial_wr(region: Optional[ee.Geometry] = None) -> ee.Image:
    """Build the reference application's SoilGrids-derived 0-60 cm water reserve image."""
    boundary = libya_boundary()
    wv0033 = ee.Image("ISRIC/SoilGrids250m/v2_0/wv0033")
    wv1500 = ee.Image("ISRIC/SoilGrids250m/v2_0/wv1500")

    def layer_wr(band: str, thickness_m: float) -> ee.Image:
        return (
            wv0033.select(band)
            .subtract(wv1500.select(band))
            .max(0)
            .multiply(thickness_m)
        )

    wr = (
        layer_wr("val_0_5cm_mean", 0.05)
        .add(layer_wr("val_5_15cm_mean", 0.10))
        .add(layer_wr("val_15_30cm_mean", 0.15))
        .add(layer_wr("val_30_60cm_mean", 0.30))
        .max(WR_MIN_MM)
        .min(WR_MAX_MM)
        .rename("WR_mm")
    )
    clip_region = region if region is not None else boundary.geometry()
    return wr.clip(clip_region)


def storage_capacity(config: LGPConfig, region: Optional[ee.Geometry] = None) -> ee.Image:
    boundary = libya_boundary()
    clip_region = region if region is not None else boundary.geometry()
    if config.storage == "SoilGrids spatial WR 0-60 cm":
        return _soilgrids_spatial_wr(clip_region)
    if config.storage == "Custom uniform reference storage":
        value = float(config.reference_storage_mm)
    else:
        value = DEFAULT_REFERENCE_WR_MM
    return ee.Image.constant(value).rename("WR_mm").clip(clip_region)


def monthly_rainfall(year: int, month: int, source: str) -> ee.Image:
    start = ee.Date.fromYMD(year, month, 1)
    end = start.advance(1, "month")
    if source == "TerraClimate precipitation":
        return (
            ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE")
            .filterDate(start, end)
            .select("pr")
            .first()
            .toFloat()
            .max(0)
            .rename("P_mm")
        )
    if source == "ERA5-Land precipitation":
        return (
            ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
            .filterDate(start, end)
            .select("total_precipitation_sum")
            .sum()
            .multiply(1000)
            .max(0)
            .toFloat()
            .rename("P_mm")
        )
    if source == "CHIRPS v2 Daily":
        return (
            ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
            .filterDate(start, end)
            .select("precipitation")
            .sum()
            .toFloat()
            .max(0)
            .rename("P_mm")
        )
    raise ValueError(f"Unsupported rainfall source: {source}")


def monthly_et(year: int, month: int, source: str) -> ee.Image:
    start = ee.Date.fromYMD(year, month, 1)
    end = start.advance(1, "month")
    if source == "TerraClimate PET":
        return (
            ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE")
            .filterDate(start, end)
            .select("pet")
            .first()
            .multiply(0.1)
            .max(0)
            .toFloat()
            .rename("ET_mm")
        )
    if source == "ERA5-Land potential evaporation":
        return (
            ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
            .filterDate(start, end)
            .select("potential_evaporation_sum")
            .sum()
            .multiply(-1000)
            .max(0)
            .toFloat()
            .rename("ET_mm")
        )
    raise ValueError(f"Unsupported ET source: {source}")


def monthly_temperature(year: int, month: int, source: str) -> ee.Image:
    start = ee.Date.fromYMD(year, month, 1)
    end = start.advance(1, "month")
    if source == "ERA5-Land 2-m temperature":
        return (
            ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
            .filterDate(start, end)
            .select("temperature_2m")
            .mean()
            .subtract(273.15)
            .toFloat()
            .rename("Tavg_C")
        )
    if source == "TerraClimate temperature":
        image = ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE").filterDate(start, end).first()
        return (
            image.select("tmmn")
            .add(image.select("tmmx"))
            .multiply(0.05)
            .toFloat()
            .rename("Tavg_C")
        )
    raise ValueError(f"Unsupported temperature source: {source}")


def monthly_climate(year: int, month: int, config: LGPConfig) -> ee.Image:
    return ee.Image.cat(
        [
            monthly_rainfall(year, month, config.rainfall),
            monthly_et(year, month, config.et),
            monthly_temperature(year, month, config.temperature),
        ]
    ).set(
        {
            "year": year,
            "month": month,
            "rainfall_source": config.rainfall,
            "et_source": config.et,
            "temperature_source": config.temperature,
            "system:time_start": ee.Date.fromYMD(year, month, 1).millis(),
        }
    )


def growing_year_month_pairs(year: int) -> List[tuple[int, int]]:
    """Return Nov(previous year) through Oct(named year)."""
    return [(year - 1, 11), (year - 1, 12)] + [(year, month) for month in range(1, 11)]


def annual_lgp(year: int, config: LGPConfig) -> ee.Image:
    """Calculate one annual LGP image as number of qualifying months (0-12)."""
    validate_config(config)
    boundary = libya_boundary()
    capacity = storage_capacity(config, boundary.geometry())
    previous_uwr = capacity
    previous_lgp = ee.Image.constant(0)

    for climate_year, month in growing_year_month_pairs(year):
        climate = monthly_climate(climate_year, month, config)
        p = climate.select("P_mm")
        et = climate.select("ET_mm")
        t = climate.select("Tavg_C")

        full_balance = p.add(previous_uwr).subtract(et).rename("Mwb_mm")
        next_uwr = full_balance.max(0).min(capacity).rename("UWR_mm")

        if config.method == "FAO reference LGP":
            moisture_condition = p.add(previous_uwr).gt(et.multiply(0.5))
        else:
            moisture_condition = full_balance.gt(0)

        growing_month = t.gt(TEMPERATURE_THRESHOLD_C).And(moisture_condition).rename("GP")
        previous_lgp = previous_lgp.add(growing_month)
        previous_uwr = next_uwr

    return (
        previous_lgp.rename("LGP_months")
        .clip(boundary.geometry())
        .set(
            {
                "growing_year": year,
                "system:time_start": ee.Date.fromYMD(year, 10, 31).millis(),
            }
        )
    )


def annual_collection(config: LGPConfig) -> ee.ImageCollection:
    validate_config(config)
    images = [annual_lgp(year, config) for year in range(config.start_year, config.end_year + 1)]
    return ee.ImageCollection.fromImages(images).sort("system:time_start")


def classify_lgp(days: ee.Image) -> ee.Image:
    result = ee.Image(1).clip(libya_boundary().geometry())
    result = result.where(days.gte(30), 2)
    result = result.where(days.gte(60), 3)
    result = result.where(days.gte(90), 4)
    result = result.where(days.gte(150), 5)
    return result.rename("LGP_Class").toByte()


def build_result(config: LGPConfig) -> Dict[str, ee.ComputedObject]:
    """Build annual collection, median LGP months, approximate days and final classes."""
    validate_config(config)
    annual = annual_collection(config)
    median_months = annual.select("LGP_months").median().clip(libya_boundary().geometry())
    days = median_months.multiply(30).rename("LGP_days")
    classes = classify_lgp(days)
    return {
        "annual": annual,
        "median_months": median_months,
        "days": days,
        "classes": classes,
    }


def area_statistics(classes: ee.Image, scale: int) -> ee.FeatureCollection:
    """Return grouped class areas in square kilometres as a FeatureCollection."""
    grouped = (
        ee.Image.pixelArea()
        .divide(1e6)
        .rename("area_km2")
        .addBands(classes)
        .reduceRegion(
            reducer=ee.Reducer.sum().group(groupField=1, groupName="class"),
            geometry=libya_boundary().geometry(),
            scale=scale,
            maxPixels=1e13,
            tileScale=8,
        )
    )
    groups = ee.List(ee.Dictionary(grouped).get("groups", ee.List([])))

    def to_feature(item):
        item = ee.Dictionary(item)
        class_number = ee.Number(item.get("class")).toInt()
        return ee.Feature(
            None,
            {
                "class": class_number,
                "class_name": ee.List(CLASS_NAMES).get(class_number.subtract(1)),
                "area_km2": item.get("sum"),
            },
        )

    return ee.FeatureCollection(groups.map(to_feature))


def start_drive_export(
    classes: ee.Image,
    config: LGPConfig,
    folder: str = "GEE_Exports",
    description: Optional[str] = None,
) -> ee.batch.Task:
    """Create and start a Google Drive GeoTIFF export of the LGP classification."""
    validate_config(config)
    prefix = description or f"Libya_LGP_Classification_{config.start_year}_{config.end_year}"
    task = ee.batch.Export.image.toDrive(
        image=classes,
        description=prefix,
        folder=folder,
        fileNamePrefix=prefix,
        region=libya_boundary().geometry(),
        scale=effective_scale(config.rainfall, config.et, config.temperature),
        crs="EPSG:4326",
        maxPixels=1e13,
        fileFormat="GeoTIFF",
    )
    task.start()
    return task


def configuration_summary(config: LGPConfig) -> Dict[str, object]:
    validate_config(config)
    return {
        "period": f"{config.start_year}-{config.end_year}",
        "rainfall": config.rainfall,
        "et": config.et,
        "temperature": config.temperature,
        "method": config.method,
        "storage": config.storage,
        "reference_storage_mm": config.reference_storage_mm,
        "maximum_year": scenario_maximum_year(config.rainfall, config.et, config.temperature),
        "recent_period": scenario_recent_period(config.rainfall, config.et, config.temperature),
        "effective_scale_m": effective_scale(config.rainfall, config.et, config.temperature),
        "final_statistic": "Pixel-wise median annual LGP",
        "displayed_output": "LGP Classification",
    }
