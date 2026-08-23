from lms import *
res = sql("sannalms_course", "SELECT id, course_id, title, file_name, visibility, tenant_id FROM \"CourseResource\" WHERE tenant_id='zenith'")
print("Zenith Course Resources:", len(res))
for r in res:
    print(r)
