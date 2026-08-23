from lms import *
mods = sql("sannalms_course", "SELECT count(*) FROM \"Module\" WHERE tenant_id='zenith'")
print("Zenith Modules count:", mods)
