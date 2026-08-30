import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_required_files_exist():
    required = [
        ROOT / "gee" / "libya_lgp_mapping.js",
        ROOT / "python" / "lgp_engine.py",
        ROOT / "python" / "01_test_gee_connection.py",
        ROOT / "python" / "02_full_lgp_colab.ipynb",
        ROOT / "python" / "requirements.txt",
        ROOT / "README.md",
    ]
    for path in required:
        assert path.exists(), f"Missing required file: {path}"


def test_python_syntax():
    for path in [ROOT / "python" / "lgp_engine.py", ROOT / "python" / "01_test_gee_connection.py"]:
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def test_engine_has_core_functions():
    text = (ROOT / "python" / "lgp_engine.py").read_text(encoding="utf-8")
    for name in [
        "validate_config", "monthly_rainfall", "monthly_et", "monthly_temperature",
        "annual_lgp", "annual_collection", "classify_lgp", "build_result",
        "area_statistics", "start_drive_export",
    ]:
        assert f"def {name}(" in text


def test_notebook_json_and_cells():
    nb = json.loads((ROOT / "python" / "02_full_lgp_colab.ipynb").read_text(encoding="utf-8"))
    assert nb["nbformat"] == 4
    assert len(nb["cells"]) >= 5
    sources = "\n".join("".join(c.get("source", [])) for c in nb["cells"])
    assert "ee.Initialize" in sources
    assert "GENERATE MAP" in sources
    assert "start_drive_export" in sources


def test_personal_author_branding_only():
    js = (ROOT / "gee" / "libya_lgp_mapping.js").read_text(encoding="utf-8")
    assert "By: Hamed Sabzchi Dehkharghani" in js
    assert "NSL Geospatial Unit" not in js
