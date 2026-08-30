# Libya Length of Growing Period (LGP) Mapping

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22181790.svg)](https://doi.org/10.5281/zenodo.22181790)

A reproducible geospatial workflow for mapping Length of Growing Period (LGP) in Libya using Google Earth Engine and Python. The workflow combines rainfall, evaporative demand, temperature, and soil-water storage in a sequential monthly water balance.

## Project status

The repository contains:

- the complete reference Google Earth Engine JavaScript application;
- a Python Earth Engine analysis engine reproducing the core LGP calculations;
- an interactive Google Colab notebook;
- a minimal Earth Engine connection test;
- credential-free static repository tests and GitHub Actions.

## Main inputs

**Rainfall**
- CHIRPS v2 Daily
- TerraClimate precipitation
- ERA5-Land precipitation

**Evaporative demand / ET**
- TerraClimate PET
- ERA5-Land potential evaporation (sign-corrected open-water potential evaporation; not described as FAO-56 ET0)

**Temperature**
- TerraClimate monthly temperature
- ERA5-Land 2-m temperature

**Soil-water storage**
- fixed reference storage of 100 mm
- user-defined uniform storage from 5 to 150 mm
- SoilGrids-derived spatial water reserve for 0-60 cm

## LGP methods

The application implements two selectable calculation paths:

1. **FAO reference LGP** — a temperature condition above 5 °C and a moisture condition based on `P + previous UWR > 0.5 × ET`, with TerraClimate PET required in this implementation.
2. **Gintzburger and Saidi method** — a sequential monthly water balance `Mwb = P - ET + previous UWR`, with a growing month requiring temperature above 5 °C and `Mwb > 0`.

Each named growing year runs from **November of the previous calendar year through October of the named year**. Annual qualifying months are calculated independently; the final multi-year product is the **pixel-wise median annual LGP**. Median months are multiplied by 30 to obtain approximate LGP days before classification.

## LGP classes

| Class | Working interpretation |
|---|---|
| 1 | 0 days — Permanently not suitable |
| 2 | about 30 days — Marginally not suitable |
| 3 | about 60 days — Marginally suitable |
| 4 | about 90–120 days — Moderately suitable |
| 5 | about 150 days — Highly suitable |

## Repository structure

```text
libya-length-of-growing-period/
├── README.md
├── .gitignore
├── gee/
│   └── libya_lgp_mapping.js
├── python/
│   ├── 01_test_gee_connection.py
│   ├── 02_full_lgp_colab.ipynb
│   ├── lgp_engine.py
│   └── requirements.txt
├── tests/
│   └── test_repository_structure.py
└── .github/
    └── workflows/
        └── static-tests.yml
```

## Google Colab

Open the complete notebook:

https://colab.research.google.com/github/hamedsabzchi/libya-length-of-growing-period/blob/main/python/02_full_lgp_colab.ipynb

The notebook authenticates Earth Engine, loads the Python engine from GitHub, exposes interactive configuration controls, renders the final LGP map, optionally calculates class-area statistics, and can start a GeoTIFF export to Google Drive.

## Scientific interpretation and limitations

This repository produces a **climatic Length of Growing Period indicator**. It is **not a complete crop-suitability assessment or a national agro-ecological zoning map**. Results depend directly on the selected rainfall, evaporative-demand, temperature, storage, period, and method configuration.

ERA5-Land potential evaporation is treated as sign-corrected open-water potential evaporation in the Gintzburger and Saidi scenario. A sign correction and unit conversion do not make it equivalent to reference-crop ET0.

The SoilGrids option is a spatial water-storage scenario derived from static soil predictions; it is not observed November soil moisture.

## References represented in the implementation

- Funk et al. (2015), CHIRPS, *Scientific Data*. DOI: 10.1038/sdata.2015.66
- Abatzoglou et al. (2018), TerraClimate, *Scientific Data*. DOI: 10.1038/sdata.2017.191
- Muñoz-Sabater et al. (2021), ERA5-Land, *Earth System Science Data*. DOI: 10.5194/essd-13-4349-2021
- Turek et al. (2023), global soil-water retention mapping, *International Soil and Water Conservation Research*. DOI: 10.1016/j.iswcr.2022.08.001
- Food and Agriculture Organization of the United Nations (1996), *Agro-ecological zoning: Guidelines*, FAO Soils Bulletin 73.
- Gintzburger, G. and Saidi, S. (2025), *Agro-ecological Zoning of Libya: The Case of Barley and the Olive Tree*. DOI: 10.1079/9781800627154.0017

## Citation

Zenodo DOI: **10.5281/zenodo.22181790**

## Author

Hamed Sabzchi Dehkharghani

## Independent personal-project notice

This repository is an **independent personal technical portfolio and research-development project by Hamed Sabzchi Dehkharghani**. It is not published on behalf of any employer, organization, or institution. No institutional affiliation, sponsorship, approval, endorsement, or official status is claimed or implied.

Names appearing in dataset identifiers, method names, or scientific references identify sources only and do not imply institutional authorship or endorsement of this repository.

## Licensing note

No open-source license is asserted by this repository at this stage. The repository is made publicly viewable for technical portfolio, reproducibility, and citation purposes; no broader reuse permission is granted by an explicit software license here.
