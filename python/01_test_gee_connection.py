import ee

PROJECT_ID = "practical-proxy-441422-n6"

ee.Authenticate(auth_mode="notebook")
ee.Initialize(project=PROJECT_ID)

libya = ee.FeatureCollection("FAO/GAUL/2015/level0").filter(ee.Filter.eq("ADM0_NAME", "Libya"))
count = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterDate("2020-01-01", "2021-01-01").size().getInfo()
print("SUCCESS: Earth Engine initialized.")
print("SUCCESS: Libya boundary features:", libya.size().getInfo())
print("SUCCESS: CHIRPS daily images in 2020:", count)
