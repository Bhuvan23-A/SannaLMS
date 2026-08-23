from lms import *

courses = sql("sannalms_course", "SELECT id, title, tenant_id, branch_id, semester_id FROM \"Course\" WHERE tenant_id='zenith'")
print(f"Total courses for zenith: {len(courses)}")

ai_course = next((c for c in courses if "Introduction to AI" in c["title"]), None)
if ai_course:
    cid = ai_course["id"]
    print(f"Introduction to AI Course ID: {cid}")
    mods = sql("sannalms_course", f"SELECT id, title, course_id, tenant_id FROM \"Module\" WHERE course_id='{cid}'")
    print(f"Modules: {len(mods)}")
    for m in mods:
        print("  - Module:", m["title"], m["id"])
        less = sql("sannalms_course", f"SELECT id, title, module_id, tenant_id FROM \"Lesson\" WHERE module_id='{m['id']}'")
        print("    Lessons:", len(less))
        for l in less:
            print("      - Lesson:", l["title"], l["id"])
            tops = sql("sannalms_course", f"SELECT id, title, lesson_id, type, tenant_id FROM \"Topic\" WHERE lesson_id='{l['id']}'")
            print("        Topics:", len(tops))
            for t in tops:
                print("          * Topic:", t["title"])
    
    # Check resources
    res = sql("sannalms_course", f"SELECT id, title, visibility, tenant_id, file_url FROM \"Resource\" WHERE course_id='{cid}'")
    print(f"Resources: {len(res)}")
    for r in res:
        print("  - Resource:", r["title"], "visibility:", r["visibility"])
else:
    print("AI Course not found!")
