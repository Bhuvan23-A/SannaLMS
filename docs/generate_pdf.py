import sys
from fpdf import FPDF

class PDFGuide(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(15, 23, 42)
        self.cell(0, 10, "SannaLMS - Team Onboarding & Git Workflow Guide", border=False, new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(100, 116, 139)
        self.cell(0, 6, "Repository: https://github.com/Bhuvan23-A/SannaLMS", border=False, new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(5)
        self.set_draw_color(226, 232, 240)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"SannaLMS SaaS Developer Guide | Page {self.page_no()}", align="C")

def create_guide_pdf(filename):
    pdf = PDFGuide(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Section 1: Clone & Fetch
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(14, 116, 144)
    pdf.cell(0, 8, "1. Clone & Fetch All Branches", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(51, 65, 85)
    pdf.multi_cell(0, 5, "Open your terminal, navigate to your workspace folder, and run:")
    pdf.ln(2)

    pdf.set_font("Courier", "", 9)
    pdf.set_fill_color(241, 245, 249)
    pdf.set_text_color(15, 23, 42)
    code1 = "git clone https://github.com/Bhuvan23-A/SannaLMS.git\ncd SannaLMS\ngit fetch --all"
    pdf.multi_cell(0, 6, code1, fill=True, border=True)
    pdf.ln(5)

    # Section 2: Checkout Assigned Branch
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(14, 116, 144)
    pdf.cell(0, 8, "2. Checkout Assigned Branch", new_x="LMARGIN", new_y="NEXT")

    members = [
        ("Member 1 (DevOps, Auth & Identity)", "part1/infra-auth-identity", "services/part1-infra-auth/ & infrastructure/"),
        ("Member 2 (LMS Core, Content & Realtime)", "part2/core-lms-content-chat", "services/part2-core-lms/ & frontend/saas-web-app/"),
        ("Member 3 (Assessment & Coding Sandbox)", "part3/assessment-coding-sandbox", "services/part3-assessment-sandbox/"),
        ("Member 4 (AI, Analytics & Placements)", "part4/ai-analytics-placements", "services/part4-ai-analytics/")
    ]

    for title, branch, scope in members:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 6, f"- {title}", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Courier", "", 9)
        pdf.set_fill_color(248, 250, 252)
        pdf.multi_cell(0, 5, f"  git checkout {branch}", fill=True)
        
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(0, 5, f"  Primary Directory: {scope}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    pdf.ln(3)

    # Section 3: Daily Workflow
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(14, 116, 144)
    pdf.cell(0, 8, "3. Daily Workflow (Syncing & Pushing)", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(51, 65, 85)
    pdf.multi_cell(0, 5, "Before starting work each day, pull the latest changes from 'develop' into your branch, then push strictly to your assigned branch:")
    pdf.ln(2)

    pdf.set_font("Courier", "", 9)
    pdf.set_fill_color(241, 245, 249)
    pdf.set_text_color(15, 23, 42)
    code3 = "# 1. Sync shared updates from develop into your working branch\ngit pull origin develop\n\n# 2. Make changes strictly inside your assigned directory...\n\n# 3. Stage, commit, and push ONLY to your assigned branch\ngit add .\ngit commit -m \"feat(service-name): add new feature\"\ngit push origin <YOUR_ASSIGNED_BRANCH>"
    pdf.multi_cell(0, 5.5, code3, fill=True, border=True)
    pdf.ln(5)

    # Section 4: Merging Code
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(14, 116, 144)
    pdf.cell(0, 8, "4. Merging Code & Pull Requests", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(51, 65, 85)
    pdf.multi_cell(0, 5, "When a part milestone or feature is complete:\n"
                         "1. Go to GitHub (https://github.com/Bhuvan23-A/SannaLMS).\n"
                         "2. Create a Pull Request (PR) with target branch set to 'develop'.\n"
                         "3. CI/CD GitHub Actions workflows will automatically test your changes.\n"
                         "4. Once reviewed and approved by a teammate, merge your PR into 'develop'.")

    pdf.output(filename)
    print(f"PDF successfully created: {filename}")

if __name__ == "__main__":
    create_guide_pdf("f:/SannaLMS/SannaLMS_Team_Git_Workflow_Guide.pdf")
