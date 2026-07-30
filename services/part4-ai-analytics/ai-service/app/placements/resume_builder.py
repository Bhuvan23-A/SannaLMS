import io
import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Response
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.db.schemas import StudentProfileResume

router = APIRouter(prefix="/api/placements", tags=["Dynamic Resume Builder"])

logger = logging.getLogger("lms.resume")

def generate_pdf_resume_from_profile(profile_data: StudentProfileResume) -> bytes:
    """
    Day 5 Engine:
    Takes a student JSON profile payload and renders a beautiful, cleanly formatted PDF document using ReportLab.
    Includes robust defensive checks for missing fields or irregular arrays.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Modern Styles
    title_style = ParagraphStyle(
        'ResumeTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=4
    )
    
    contact_style = ParagraphStyle(
        'ResumeContact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=12
    )
    
    section_heading_style = ParagraphStyle(
        'ResumeSection',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'ResumeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )

    story = []
    
    # 1. Header Details (Defensive Defaults)
    name = profile_data.name if profile_data.name else "Student Name"
    email = profile_data.email if profile_data.email else "N/A"
    phone = profile_data.phone if profile_data.phone else "N/A"
    
    story.append(Paragraph(f"<b>{name.upper()}</b>", title_style))
    story.append(Paragraph(f"Email: {email} | Phone: {phone}", contact_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=10))
    
    # 2. Executive Summary
    if profile_data.summary:
        story.append(Paragraph("EXECUTIVE SUMMARY", section_heading_style))
        story.append(Paragraph(profile_data.summary, body_style))
        story.append(Spacer(1, 8))

    # 3. Technical Skills
    if profile_data.skills:
        story.append(Paragraph("TECHNICAL SKILLS", section_heading_style))
        skills_text = ", ".join(profile_data.skills)
        story.append(Paragraph(f"<b>Core Competencies:</b> {skills_text}", body_style))
        story.append(Spacer(1, 8))

    # 4. Education History
    if profile_data.education:
        story.append(Paragraph("EDUCATION", section_heading_style))
        edu_table_data = []
        for edu in profile_data.education:
            degree = edu.get("degree", "Degree Program")
            institution = edu.get("institution", "University")
            year = edu.get("year", "N/A")
            grade = edu.get("grade", "N/A")
            
            p_left = Paragraph(f"<b>{degree}</b> - {institution}", body_style)
            p_right = Paragraph(f"{year} | Grade: {grade}", body_style)
            edu_table_data.append([p_left, p_right])
            
        t = Table(edu_table_data, colWidths=[380, 150])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    # 5. Key Projects
    if profile_data.projects:
        story.append(Paragraph("PROJECTS & ACHIEVEMENTS", section_heading_style))
        for proj in profile_data.projects:
            title = proj.get("title", "Project Title")
            tech = proj.get("tech_stack", "Technologies Used")
            desc = proj.get("description", "Project details.")
            
            story.append(Paragraph(f"• <b>{title}</b> <i>({tech})</i>", body_style))
            story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;{desc}", body_style))
            story.append(Spacer(1, 4))
            
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

@router.post("/generate-resume")
async def build_student_resume(profile: StudentProfileResume):
    """
    Day 5 Endpoint:
    Accepts student JSON profile payload and returns a cleanly formatted PDF document.
    """
    try:
        pdf_bytes = generate_pdf_resume_from_profile(profile)
        filename = f"Resume_{profile.name.replace(' ', '_')}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Resume build failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF resume: {str(e)}")
