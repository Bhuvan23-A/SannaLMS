# Sunrise University — User Mapping

**Default password for all imported users:** `Test@1234` (set on the Bulk Import page; users should change it at first login).

Emails are **stable roll numbers** (`su2026.<branch>.<NNN>@sunrise.edu`). They do **not** encode semester or year of study — when a student is promoted (Sem 1 → Sem 2 → …), the same account moves to the next section and the email never changes. The current year/semester always lives in the Section, not the login.

## Students (32)

| Email | Name | Department | Branch | Year (at import) |
|---|---|---|---|---|
| su2026.it.001@sunrise.edu | Rahul Desai | School of Technology | B.Tech IT | 1 |
| su2026.it.002@sunrise.edu | Sneha Kulkarni | School of Technology | B.Tech IT | 1 |
| su2026.it.003@sunrise.edu | Arjun Nair | School of Technology | B.Tech IT | 2 |
| su2026.it.004@sunrise.edu | Pooja Joshi | School of Technology | B.Tech IT | 2 |
| su2026.aiml.001@sunrise.edu | Vikram Rao | School of Technology | B.Tech AI & ML | 1 |
| su2026.aiml.002@sunrise.edu | Ananya Iyer | School of Technology | B.Tech AI & ML | 1 |
| su2026.aiml.003@sunrise.edu | Karan Mehta | School of Technology | B.Tech AI & ML | 2 |
| su2026.aiml.004@sunrise.edu | Divya Shah | School of Technology | B.Tech AI & ML | 2 |
| su2026.bba.001@sunrise.edu | Aditya Menon | School of Business | BBA | 1 |
| su2026.bba.002@sunrise.edu | Riya Chopra | School of Business | BBA | 1 |
| su2026.bba.003@sunrise.edu | Siddharth Jain | School of Business | BBA | 2 |
| su2026.bba.004@sunrise.edu | Meera Verma | School of Business | BBA | 2 |
| su2026.com.001@sunrise.edu | Nikhil Patel | School of Business | B.Com | 1 |
| su2026.com.002@sunrise.edu | Kavya Raman | School of Business | B.Com | 1 |
| su2026.com.003@sunrise.edu | Tanvi Saxena | School of Business | B.Com | 2 |
| su2026.com.004@sunrise.edu | Yash Agarwal | School of Business | B.Com | 2 |
| su2026.des.001@sunrise.edu | Zara Sheikh | School of Design | B.Des | 1 |
| su2026.des.002@sunrise.edu | Omar Farooq | School of Design | B.Des | 1 |
| su2026.des.003@sunrise.edu | Lakshmi Venkat | School of Design | B.Des | 2 |
| su2026.des.004@sunrise.edu | Neil Dsouza | School of Design | B.Des | 2 |
| su2026.arc.001@sunrise.edu | Maya Kulkarni | School of Design | B.Arch | 1 |
| su2026.arc.002@sunrise.edu | Arnav Chowdhury | School of Design | B.Arch | 1 |
| su2026.arc.003@sunrise.edu | Simran Kaur | School of Design | B.Arch | 2 |
| su2026.arc.004@sunrise.edu | Ibrahim Malik | School of Design | B.Arch | 2 |
| su2026.nur.001@sunrise.edu | Dev Patil | School of Health Sciences | B.Sc Nursing | 1 |
| su2026.nur.002@sunrise.edu | Nisha Bose | School of Health Sciences | B.Sc Nursing | 1 |
| su2026.nur.003@sunrise.edu | Rehan Ansari | School of Health Sciences | B.Sc Nursing | 2 |
| su2026.nur.004@sunrise.edu | Shreya Thakur | School of Health Sciences | B.Sc Nursing | 2 |
| su2026.pharm.001@sunrise.edu | Harsh Bhatia | School of Health Sciences | B.Pharm | 1 |
| su2026.pharm.002@sunrise.edu | Priya Banerjee | School of Health Sciences | B.Pharm | 1 |
| su2026.pharm.003@sunrise.edu | Kabir Singh | School of Health Sciences | B.Pharm | 2 |
| su2026.pharm.004@sunrise.edu | Ishita Das | School of Health Sciences | B.Pharm | 2 |

## Trainers (4 professors)

| Email | Name | Department | Branch |
|---|---|---|---|
| su.technology.trainer@sunrise.edu | Dr. Karthik Iyer | School of Technology | B.Tech IT |
| su.business.trainer@sunrise.edu | Dr. Neha Gupta | School of Business | BBA |
| su.design.trainer@sunrise.edu | Dr. Arjun Nair | School of Design | B.Des |
| su.health.trainer@sunrise.edu | Dr. Priya Deshmukh | School of Health Sciences | B.Sc Nursing |

## Teaching Assistants (4)

| Email | Name | Department | Branch |
|---|---|---|---|
| su.technology.ta@sunrise.edu | Rohan Menon | School of Technology | B.Tech AI & ML |
| su.business.ta@sunrise.edu | Kritika Sharma | School of Business | B.Com |
| su.design.ta@sunrise.edu | Vivek Shetty | School of Design | B.Arch |
| su.health.ta@sunrise.edu | Ananya Rao | School of Health Sciences | B.Pharm |

## Notes

- The `year` column in the CSV is the **starting year of study** used to place each student into the right Section on day one. After import, promotions move the account forward — never edit the email.
- This kit mirrors the Green Valley kit exactly, so you can run the same test checklist on a second college and confirm **data isolation** (Sunrise users see only Sunrise data, Green Valley users see only Green Valley data).
