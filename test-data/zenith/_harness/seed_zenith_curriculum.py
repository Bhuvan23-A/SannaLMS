"""Seed modules, lessons, and topics for all Zenith courses."""
from lms import *
import json

adm_tok = get_token("admin@zenith.edu", "Test@1234")
courses = sql("sannalms_course", "SELECT id, title, tenant_id FROM \"Course\" WHERE tenant_id='zenith'")

print(f"Found {len(courses)} courses for Zenith.")

curricula = {
    "Introduction to AI & Python": [
        ("Module 1: Vectorized Computing with NumPy", [
            ("Lesson 1: Multidimensional Arrays & Slicing", [
                ("1.1 Array Contiguity & Strides", "THEORY", "# NumPy Array Layout\nNumPy arrays store elements contiguously in memory for vectorized O(1) stride access.", 20),
                ("1.2 Broadcasting Rules & Elementwise Arithmetic", "VIDEO", "https://www.youtube.com/watch?v=IHZwWFHWa-w", 30),
            ]),
            ("Lesson 2: Linear Algebra & Matrix Decompositions", [
                ("2.1 Matrix Multiplication & Dot Products", "THEORY", "# Matrix Operations\nnp.dot and @ operators invoke optimized BLAS/LAPACK subroutines.", 25),
            ])
        ]),
        ("Module 2: Neural Networks & Backpropagation", [
            ("Lesson 3: Feedforward Perceptrons", [
                ("3.1 Activation Functions: ReLU, Sigmoid, GELU", "THEORY", "# Non-linear Activation\nNon-linearities enable neural networks to approximate arbitrary functions.", 30),
            ]),
        ])
    ],
    "Calculus & Linear Algebra": [
        ("Module 1: Multivariable Calculus", [
            ("Lesson 1: Partial Derivatives & Gradients", [
                ("1.1 Vector Calculus Foundations", "THEORY", "# Gradients\nThe gradient points in the direction of greatest rate of increase of the scalar field.", 25),
            ])
        ])
    ],
    "Data Structures & Algorithms": [
        ("Module 1: Algorithmic Complexity & Arrays", [
            ("Lesson 1: Asymptotic Analysis", [
                ("1.1 Big-O, Big-Omega, Big-Theta", "THEORY", "# Time Complexity\nUnderstanding upper and lower computational bounds.", 25),
            ])
        ])
    ],
    "Design Thinking & Innovation": [
        ("Module 1: Human-Centered Design", [
            ("Lesson 1: Empathy Mapping & User Interviews", [
                ("1.1 Qualitative User Research", "THEORY", "# User Empathy\nSynthesizing behavioral observations into actionable journey maps.", 25),
            ])
        ])
    ]
}

total_mods = 0
total_less = 0
total_tops = 0

for c in courses:
    c_title = c["title"].split(" (Sem")[0].strip()
    c_id = c["id"]
    curr = curricula.get(c_title)
    if not curr:
        # Default starter curriculum for any other course
        curr = [
            ("Module 1: Core Fundamentals", [
                ("Lesson 1: Introduction & Overview", [
                    ("1.1 Course Overview & Syllabus", "THEORY", f"# {c['title']}\nWelcome to the official syllabus and curriculum.", 15)
                ])
            ])
        ]
    
    # Check if already has modules
    existing_mods = sql("sannalms_course", f"SELECT id FROM \"Module\" WHERE course_id='{c_id}'")
    if existing_mods and len(existing_mods) > 0:
        continue

    for mod_title, lessons in curr:
        code, m_body = api("POST", "/modules", token=adm_tok, json_body={
            "course_id": c_id, "title": mod_title, "order": 1, "tenant_id": "zenith"
        })
        mid = m_body.get("id") if isinstance(m_body, dict) else None
        if not mid:
            continue
        total_mods += 1
        for les_title, topics in lessons:
            code, l_body = api("POST", "/lessons", token=adm_tok, json_body={
                "module_id": mid, "title": les_title, "order": 1, "tenant_id": "zenith"
            })
            lid = l_body.get("id") if isinstance(l_body, dict) else None
            if not lid:
                continue
            total_less += 1
            for top_title, top_type, top_content, dur in topics:
                api("POST", "/topics", token=adm_tok, json_body={
                    "lesson_id": lid, "title": top_title, "type": top_type, "content": top_content,
                    "duration_mins": dur, "order": 1, "tenant_id": "zenith"
                })
                total_tops += 1

print(f"✅ Successfully created {total_mods} modules, {total_less} lessons, {total_tops} topics for Zenith courses!")
