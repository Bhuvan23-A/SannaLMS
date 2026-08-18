#!/usr/bin/env python3
"""
Generate question-bank PDFs for Sunrise University in the same minimal PDF
format as the Green Valley kit (which the backend parses with pdf-parse-new).

Each per-subject PDF contains 10 MCQs + 2 essay questions. The combined PDF
holds a labeled sample across subjects for quick import testing.

Run from this folder:  python generate_question_banks.py
Outputs:
  question-banks/sunrise-<slug>.pdf   (16 files)
  sunrise-question-bank.pdf           (combined sample)
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "question-banks")


def esc(s: str) -> str:
    """Escape a string for use inside a PDF ( ... ) literal string."""
    s = s.replace("\\", "\\\\")
    s = s.replace("(", "\\(")
    s = s.replace(")", "\\)")
    return s


# ---------------------------------------------------------------------------
# Question data: (question, [options] | None, answer | None)
#   options None  -> essay question
# ---------------------------------------------------------------------------
QUESTIONS = {
    "Computer Networks": [
        ("Which OSI layer is responsible for routing packets between networks?", ["Data Link", "Network", "Transport", "Session"], "b"),
        ("Which protocol provides reliable, connection-oriented delivery?", ["UDP", "IP", "TCP", "ARP"], "c"),
        ("What is the default port number for HTTP?", ["21", "25", "80", "443"], "c"),
        ("Which device connects two different networks and forwards packets based on IP?", ["Hub", "Switch", "Router", "Repeater"], "c"),
        ("IPv4 addresses are how many bits long?", ["16", "32", "64", "128"], "b"),
        ("Which protocol translates domain names to IP addresses?", ["DHCP", "DNS", "FTP", "SNMP"], "b"),
        ("Which topology connects every node to a single central cable?", ["Star", "Bus", "Ring", "Mesh"], "b"),
        ("Which protocol is used to send email?", ["SMTP", "POP3", "IMAP", "HTTP"], "a"),
        ("What does MAC stand for in networking?", ["Media Access Control", "Memory Access Control", "Managed Address Control", "Media Address Code"], "a"),
        ("Which layer of the TCP/IP model corresponds to the OSI Transport layer?", ["Application", "Internet", "Transport", "Link"], "c"),
        ("Explain the difference between TCP and UDP with one example use case for each.", None, None),
        ("Describe how a packet travels from a source host to a destination host on another network.", None, None),
    ],
    "Machine Learning": [
        ("Which type of learning uses labeled data with known outputs?", ["Supervised", "Unsupervised", "Reinforcement", "Self-supervised"], "a"),
        ("Which algorithm is commonly used for binary classification?", ["Linear Regression", "Logistic Regression", "K-Means", "Apriori"], "b"),
        ("What does overfitting mean in model training?", ["Model fails to learn training data", "Model performs well on training data but poorly on unseen data", "Model is too simple", "Model has no parameters"], "b"),
        ("Which metric is used to evaluate classification models?", ["R-squared", "F1 score", "Mean Absolute Error", "RMSE"], "b"),
        ("Which dataset is commonly used to learn classification?", ["Iris", "Titanic", "MNIST", "All of the above"], "d"),
        ("What is the output of a linear regression model?", ["A class label", "A continuous value", "A probability", "A cluster id"], "b"),
        ("Which technique splits data into training and testing sets?", ["Cross-validation", "Gradient descent", "Normalization", "Feature scaling"], "a"),
        ("Which of the following is an unsupervised learning algorithm?", ["K-Means", "Linear Regression", "Decision Tree", "Logistic Regression"], "a"),
        ("What is the purpose of the learning rate in gradient descent?", ["Controls step size", "Controls dataset size", "Controls number of features", "Controls model depth"], "a"),
        ("Which library is most popular for machine learning in Python?", ["NumPy", "Pandas", "Scikit-learn", "Requests"], "c"),
        ("Explain the bias-variance tradeoff in machine learning models.", None, None),
        ("Describe the steps you would take to build a spam email classifier from scratch.", None, None),
    ],
    "Web Development": [
        ("Which HTML tag creates a hyperlink?", ["<link>", "<a>", "<href>", "<url>"], "b"),
        ("Which CSS property changes the text color?", ["font-style", "text-color", "color", "background"], "c"),
        ("Which JavaScript keyword declares a block-scoped variable?", ["var", "let", "const", "static"], "c"),
        ("Which HTTP method is used to update an existing resource?", ["GET", "POST", "PUT", "DELETE"], "c"),
        ("What does API stand for?", ["Application Programming Interface", "Automated Process Integration", "Application Process Interface", "Automated Programming Instruction"], "a"),
        ("Which markup language is used to structure web content?", ["HTML", "CSS", "JavaScript", "SQL"], "a"),
        ("Which JavaScript framework is maintained by Facebook?", ["Angular", "Vue", "React", "Svelte"], "c"),
        ("What is the default port for HTTPS?", ["80", "443", "8080", "3000"], "b"),
        ("Which command installs packages in Node.js?", ["npm install", "node install", "npx install", "yarn add all"], "a"),
        ("Which of these is a valid JSON value type?", ["String", "Number", "Boolean", "All of the above"], "d"),
        ("Explain the difference between client-side and server-side rendering.", None, None),
        ("Describe how a RESTful API request-response cycle works.", None, None),
    ],
    "Data Science": [
        ("Which of these is NOT a data type in Python?", ["int", "float", "char", "list"], "c"),
        ("Which library is used for data manipulation in Python?", ["Pandas", "Flask", "Django", "Matplotlib"], "a"),
        ("What does EDA stand for?", ["Exploratory Data Analysis", "Extended Data Analysis", "External Data Access", "Estimated Data Accuracy"], "a"),
        ("Which of the following is a measure of central tendency?", ["Mean", "Variance", "Standard deviation", "Range"], "a"),
        ("What is the purpose of data cleaning?", ["Remove errors and inconsistencies", "Increase dataset size", "Visualize data", "Train models"], "a"),
        ("Which plot is best for showing the distribution of a single variable?", ["Scatter plot", "Histogram", "Bar chart", "Line chart"], "b"),
        ("Which SQL clause filters rows based on a condition?", ["ORDER BY", "GROUP BY", "WHERE", "HAVING"], "c"),
        ("What is the median of the numbers 3, 5, 7, 9, 11?", ["5", "7", "8", "9"], "b"),
        ("Which of these is a supervised learning task?", ["Regression", "Clustering", "Dimensionality reduction", "Association"], "a"),
        ("What does a correlation coefficient of 1 indicate?", ["No relationship", "Perfect positive correlation", "Perfect negative correlation", "Weak relationship"], "b"),
        ("Explain the difference between correlation and causation.", None, None),
        ("Describe the steps in a typical data science project lifecycle.", None, None),
    ],
    "Business Analytics": [
        ("Which tool is widely used for data visualization?", ["Excel", "Power BI", "Tableau", "All of the above"], "d"),
        ("What does KPI stand for?", ["Key Performance Indicator", "Key Process Index", "Known Performance Indicator", "Key Product Input"], "a"),
        ("Which analysis answers 'what happened in the past?'", ["Descriptive", "Diagnostic", "Predictive", "Prescriptive"], "a"),
        ("Which chart is best for comparing parts of a whole?", ["Pie chart", "Line chart", "Scatter plot", "Histogram"], "a"),
        ("What is the primary purpose of a dashboard?", ["Summarize metrics at a glance", "Store raw data", "Run machine learning", "Send emails"], "a"),
        ("Which function in Excel finds the average of a range?", ["SUM", "AVERAGE", "COUNT", "MEDIAN"], "b"),
        ("Which type of analytics forecasts future outcomes?", ["Descriptive", "Diagnostic", "Predictive", "Prescriptive"], "c"),
        ("What does ROI stand for?", ["Return on Investment", "Rate of Income", "Return of Inventory", "Revenue on Investment"], "a"),
        ("Which of these is a leading indicator?", ["Customer satisfaction score", "Revenue", "Profit", "Total sales"], "a"),
        ("Which visualization is best to show a trend over time?", ["Line chart", "Pie chart", "Donut chart", "Treemap"], "a"),
        ("Explain the difference between leading and lagging indicators with examples.", None, None),
        ("Describe how you would build a sales performance dashboard for a retail company.", None, None),
    ],
    "Marketing Management": [
        ("Which of the 4 Ps refers to price, product, place and?", ["People", "Promotion", "Process", "Profit"], "b"),
        ("Which strategy segments the market and targets a specific group?", ["Mass marketing", "Target marketing", "Guerrilla marketing", "Viral marketing"], "b"),
        ("What is a SWOT analysis?", ["Analysis of strengths, weaknesses, opportunities and threats", "Sales and workforce optimization tool", "Social media workflow tracker", "Statistical weighting of targets"], "a"),
        ("Which channel is an example of digital marketing?", ["Social media", "Billboard", "Newspaper ad", "Radio spot"], "a"),
        ("What does AIDA stand for in advertising?", ["Attention, Interest, Desire, Action", "Analysis, Idea, Design, Assessment", "Awareness, Interest, Decision, Action", "Attention, Identity, Desire, Attitude"], "a"),
        ("Which pricing strategy sets a low initial price to gain market share?", ["Skimming", "Penetration", "Premium", "Psychological"], "b"),
        ("What is brand equity?", ["The value a brand adds beyond its functional benefits", "The cost of producing a brand", "The number of brand employees", "The brand logo design"], "a"),
        ("Which of these is a market research method?", ["Survey", "Focus group", "Interview", "All of the above"], "d"),
        ("What does CRM stand for?", ["Customer Relationship Management", "Consumer Revenue Management", "Customer Response Model", "Client Rating Mechanism"], "a"),
        ("Which stage of the product life cycle sees the highest sales growth?", ["Introduction", "Growth", "Maturity", "Decline"], "b"),
        ("Explain the difference between market segmentation and market targeting.", None, None),
        ("Describe the 4 Ps of marketing for a new smartphone launch.", None, None),
    ],
    "Financial Accounting": [
        ("Which financial statement shows a company's assets and liabilities?", ["Income statement", "Balance sheet", "Cash flow statement", "Statement of equity"], "b"),
        ("What does the accounting equation state?", ["Assets = Liabilities + Equity", "Assets = Revenue - Expenses", "Liabilities = Assets + Equity", "Equity = Assets + Liabilities"], "a"),
        ("Which of these is a current asset?", ["Inventory", "Building", "Patent", "Equipment"], "a"),
        ("What is depreciation?", ["Allocation of an asset's cost over its useful life", "Increase in asset value", "Cash paid for an asset", "A type of liability"], "a"),
        ("Which accounting principle records revenue when earned, not when cash is received?", ["Accrual basis", "Cash basis", "Matching principle", "Going concern"], "a"),
        ("What does GAAP stand for?", ["Generally Accepted Accounting Principles", "General Accounting and Audit Practices", "Global Accounting Application Protocol", "Generally Audited Accounting Procedures"], "a"),
        ("Which of these is a liability?", ["Accounts payable", "Accounts receivable", "Cash", "Inventory"], "a"),
        ("What is the formula for net income?", ["Revenue - Expenses", "Assets - Liabilities", "Revenue + Expenses", "Equity - Liabilities"], "a"),
        ("Which book records all financial transactions chronologically?", ["Ledger", "Journal", "Trial balance", "Balance sheet"], "b"),
        ("What is a trial balance used for?", ["Verify debits equal credits", "Calculate taxes", "Prepare budgets", "Track inventory"], "a"),
        ("Explain the difference between the accrual basis and cash basis of accounting.", None, None),
        ("Describe how a double-entry bookkeeping system works with an example.", None, None),
    ],
    "Cost Accounting": [
        ("Which cost varies with the level of production?", ["Fixed cost", "Variable cost", "Sunk cost", "Opportunity cost"], "b"),
        ("What is the formula for break-even point in units?", ["Fixed costs / Contribution per unit", "Variable costs / Selling price", "Total costs / Units", "Fixed costs x Selling price"], "a"),
        ("Which of these is a direct cost?", ["Raw materials", "Factory rent", "Supervisor salary", "Office electricity"], "a"),
        ("What is a standard cost?", ["A predetermined cost for a product", "The actual cost incurred", "The lowest market price", "A cost that never changes"], "a"),
        ("Which method allocates overhead costs to products?", ["Cost allocation", "Cost reduction", "Cost avoidance", "Cost control"], "a"),
        ("What is contribution margin?", ["Sales minus variable costs", "Sales minus fixed costs", "Revenue plus costs", "Total cost divided by units"], "a"),
        ("Which costing method assigns costs to each unit of output?", ["Job costing", "Process costing", "Absorption costing", "Marginal costing"], "b"),
        ("What does variance analysis compare?", ["Actual costs vs standard costs", "Sales vs profit", "Assets vs liabilities", "Budget vs expenses only"], "a"),
        ("Which of these is an overhead cost?", ["Factory electricity", "Direct labor", "Direct material", "Raw material"], "a"),
        ("What is the purpose of a cost sheet?", ["Summarize the cost of production", "Record sales", "Track cash flow", "Calculate taxes"], "a"),
        ("Explain the difference between fixed and variable costs with examples.", None, None),
        ("Describe how marginal costing helps in pricing decisions.", None, None),
    ],
    "Design Fundamentals": [
        ("Which principle refers to the visual weight distribution in a design?", ["Balance", "Rhythm", "Emphasis", "Proportion"], "a"),
        ("Which color model is used for digital screens?", ["RGB", "CMYK", "PMS", "HSB only"], "a"),
        ("Which of these is a primary color in additive color mixing?", ["Red", "Yellow", "Magenta", "Cyan"], "a"),
        ("What is the golden ratio approximately equal to?", ["1.618", "2.718", "3.141", "0.618"], "a"),
        ("Which design element refers to the surface quality of an object?", ["Texture", "Line", "Shape", "Space"], "a"),
        ("Which typeface category has no serifs at the ends of strokes?", ["Sans-serif", "Serif", "Script", "Display"], "a"),
        ("Which principle creates a focal point in a design?", ["Emphasis", "Unity", "Contrast", "Alignment"], "a"),
        ("What does negative space refer to?", ["Empty space around elements", "Space used by images", "Space used by text", "Background color only"], "a"),
        ("Which of these is a design software by Adobe?", ["Illustrator", "Photoshop", "InDesign", "All of the above"], "d"),
        ("What is the rule of thirds used for?", ["Composing visual elements", "Choosing colors", "Selecting fonts", "Measuring print size"], "a"),
        ("Explain the difference between symmetrical and asymmetrical balance.", None, None),
        ("Describe how color theory influences user perception in a poster design.", None, None),
    ],
    "Typography": [
        ("What is the space between lines of text called?", ["Leading", "Tracking", "Kerning", "Baseline"], "a"),
        ("What is the space between individual characters called?", ["Kerning", "Leading", "Tracking", "Margins"], "a"),
        ("Which unit is commonly used to measure font size?", ["Points", "Pixels", "Inches", "Picas only"], "a"),
        ("Which typeface is best suited for long body text in print?", ["Serif", "Sans-serif", "Script", "Decorative"], "a"),
        ("What is a baseline in typography?", ["The line on which letters sit", "The top of capital letters", "The middle of x-height", "The line below descenders"], "a"),
        ("Which of these describes the x-height?", ["Height of lowercase letters", "Height of uppercase letters", "Width of the letter x", "Total font height"], "a"),
        ("What does hierarchy in typography refer to?", ["Ordering text by importance", "Using one font only", "Aligning text to center", "Increasing font size of all text"], "a"),
        ("Which pairing is generally recommended for headings and body?", ["A bold heading with a readable body font", "Two script fonts", "All capital letters", "Only one font size"], "a"),
        ("Which alignment is easiest to read for long paragraphs?", ["Left-aligned", "Center-aligned", "Right-aligned", "Justified only"], "a"),
        ("What is a font family?", ["A set of related typefaces", "A single character", "A font size", "A type of printer"], "a"),
        ("Explain the difference between serif and sans-serif typefaces with examples.", None, None),
        ("Describe how you would set up a typographic hierarchy for a magazine article.", None, None),
    ],
    "Anatomy and Physiology": [
        ("Which organ pumps blood throughout the body?", ["Heart", "Lungs", "Liver", "Kidney"], "a"),
        ("Which system is responsible for gas exchange?", ["Respiratory system", "Digestive system", "Circulatory system", "Endocrine system"], "a"),
        ("Which cells carry oxygen in the blood?", ["Red blood cells", "White blood cells", "Platelets", "Plasma cells"], "a"),
        ("Which bone protects the brain?", ["Skull", "Spine", "Rib cage", "Pelvis"], "a"),
        ("Which organ filters waste from the blood?", ["Kidney", "Stomach", "Pancreas", "Spleen"], "a"),
        ("What is the normal resting heart rate for adults?", ["60-100 beats per minute", "20-40 bpm", "120-160 bpm", "10-20 bpm"], "a"),
        ("Which gland regulates metabolism?", ["Thyroid", "Pituitary", "Adrenal", "Thymus"], "a"),
        ("Which part of the neuron receives signals?", ["Dendrites", "Axon", "Myelin sheath", "Synapse"], "a"),
        ("Which muscle is responsible for breathing?", ["Diaphragm", "Biceps", "Quadriceps", "Deltoid"], "a"),
        ("Which system produces hormones?", ["Endocrine system", "Skeletal system", "Muscular system", "Lymphatic system"], "a"),
        ("Explain the pathway of blood through the heart and lungs.", None, None),
        ("Describe the structure and function of the nephron.", None, None),
    ],
    "Pharmacology": [
        ("What is pharmacology?", ["The study of drugs and their effects", "The study of viruses", "The study of plants", "The study of genetics"], "a"),
        ("Which route of drug administration has the fastest onset?", ["Intravenous", "Oral", "Topical", "Subcutaneous"], "a"),
        ("What is a side effect?", ["An unintended effect of a drug", "The desired therapeutic effect", "A drug interaction", "A placebo response"], "a"),
        ("Which term means the study of how the body affects a drug?", ["Pharmacokinetics", "Pharmacodynamics", "Pharmacognosy", "Pharmacy"], "a"),
        ("Which term means the study of how a drug affects the body?", ["Pharmacodynamics", "Pharmacokinetics", "Toxicology", "Posology"], "a"),
        ("What is the half-life of a drug?", ["Time for its concentration to halve", "Time to full effect", "Time it stays in the stomach", "Time until expiry"], "a"),
        ("Which is a common analgesic?", ["Paracetamol", "Insulin", "Warfarin", "Omeprazole"], "a"),
        ("What does ADME stand for?", ["Absorption, Distribution, Metabolism, Excretion", "Analysis, Dosage, Metabolism, Effect", "Absorption, Dose, Mode, Excretion", "Administration, Distribution, Metabolism, Evaluation"], "a"),
        ("Which drug class treats hypertension?", ["ACE inhibitors", "Antacids", "Laxatives", "Expectorants"], "a"),
        ("What is an adverse drug reaction?", ["A harmful unintended response to a drug", "A beneficial response", "A placebo effect", "A withdrawal symptom"], "a"),
        ("Explain the difference between pharmacokinetics and pharmacodynamics.", None, None),
        ("Describe the factors that affect drug absorption after oral administration.", None, None),
    ],
    "Architectural Drawing": [
        ("Which view shows a building as seen from directly above?", ["Plan view", "Elevation view", "Section view", "Perspective view"], "a"),
        ("Which line type represents hidden edges in a drawing?", ["Dashed line", "Solid line", "Dotted line", "Wavy line"], "a"),
        ("What does a scale of 1:100 mean?", ["1 unit on paper equals 100 units in reality", "100 units on paper equals 1 unit", "1 unit equals 1 meter", "A 100 percent enlargement"], "a"),
        ("Which software is commonly used for architectural drafting?", ["AutoCAD", "Photoshop", "Excel", "PowerPoint"], "a"),
        ("Which drawing shows the interior cut through a building?", ["Section", "Plan", "Site plan", "Perspective"], "a"),
        ("What is an elevation drawing?", ["A vertical view of a building facade", "A view from above", "A cut through the building", "A 3D model"], "a"),
        ("Which symbol indicates the direction of north on a site plan?", ["North arrow", "Scale bar", "Section line", "Dimension line"], "a"),
        ("What are construction lines used for?", ["Guides for accurate drafting", "Final outlines", "Shading", "Dimensioning only"], "a"),
        ("Which unit is standard for architectural drawings?", ["Millimeters", "Kilometers", "Liters", "Grams"], "a"),
        ("What is a datum in architectural drawing?", ["A reference point or level", "A type of roof", "A building material", "A window style"], "a"),
        ("Explain the difference between a plan view and an elevation view.", None, None),
        ("Describe the standard layers you would set up in an AutoCAD drawing for a building.", None, None),
    ],
    "Building Materials": [
        ("Which material is the most common binder in concrete?", ["Cement", "Sand", "Water", "Aggregate"], "a"),
        ("Which of these is a natural building stone?", ["Granite", "Brick", "Glass", "Steel"], "a"),
        ("Which material is produced by heating limestone and clay?", ["Cement", "Timber", "Aluminum", "Plastic"], "a"),
        ("Which of these is a sustainable building material?", ["Bamboo", "PVC", "Asphalt", "Lead"], "a"),
        ("What is the function of reinforcement in concrete?", ["Resist tensile forces", "Increase weight", "Reduce cost", "Change color"], "a"),
        ("Which material has the highest thermal insulation value?", ["Fiberglass", "Steel", "Concrete", "Aluminum"], "a"),
        ("Which of these is a ferrous metal?", ["Steel", "Copper", "Aluminum", "Zinc"], "a"),
        ("What is mortar used for?", ["Binding bricks or blocks", "Roofing", "Insulation", "Painting"], "a"),
        ("Which material is used to make glass?", ["Silica sand", "Clay", "Lime only", "Gypsum"], "a"),
        ("What is the curing of concrete?", ["Keeping it moist to gain strength", "Drying it quickly", "Painting it", "Adding more water"], "a"),
        ("Explain the difference between cement and concrete.", None, None),
        ("Describe the properties that make timber a good building material and its limitations.", None, None),
    ],
    "Pharmaceutical Chemistry": [
        ("Which functional group is present in alcohols?", ["Hydroxyl", "Carbonyl", "Carboxyl", "Amino"], "a"),
        ("What is the pH of a neutral solution?", ["7", "0", "14", "1"], "a"),
        ("Which bond joins atoms in an organic molecule?", ["Covalent bond", "Ionic bond", "Metallic bond", "Hydrogen bond"], "a"),
        ("Which element is the backbone of organic chemistry?", ["Carbon", "Oxygen", "Nitrogen", "Sulfur"], "a"),
        ("Which of these is a strong acid?", ["Hydrochloric acid", "Acetic acid", "Citric acid", "Carbonic acid"], "a"),
        ("What is a mole?", ["Amount of substance containing Avogadro's number of particles", "A unit of mass", "A unit of volume", "A type of bond"], "a"),
        ("Which gas is produced when an acid reacts with a metal?", ["Hydrogen", "Oxygen", "Nitrogen", "Carbon dioxide"], "a"),
        ("Which isomerism arises from different spatial arrangements?", ["Stereoisomerism", "Structural isomerism", "Tautomerism", "Metamerism"], "a"),
        ("Which process involves a substance losing electrons?", ["Oxidation", "Reduction", "Neutralization", "Precipitation"], "a"),
        ("Which of these is an example of a buffer solution?", ["Acetic acid and sodium acetate", "Pure water", "Sodium chloride solution", "Dilute hydrochloric acid"], "a"),
        ("Explain the difference between an acid and a base with examples.", None, None),
        ("Describe the structure of the benzene ring and its significance in drug chemistry.", None, None),
    ],
    "Pharmaceutics": [
        ("What is a tablet?", ["A solid dosage form containing drug and excipients", "A liquid medicine", "An injection", "A cream"], "a"),
        ("Which route avoids first-pass metabolism?", ["Sublingual", "Oral", "Rectal", "Topical"], "a"),
        ("What is an excipient?", ["An inactive substance in a dosage form", "The active drug", "A type of disease", "A laboratory instrument"], "a"),
        ("Which dosage form is applied to the skin?", ["Ointment", "Capsule", "Syrup", "Tablet"], "a"),
        ("What does USP stand for in pharmaceutical standards?", ["United States Pharmacopeia", "Universal Safety Protocol", "United Standard of Pharmacy", "Uniform Sterile Process"], "a"),
        ("Which of these is a parenteral route of administration?", ["Intravenous", "Oral", "Sublingual", "Buccal"], "a"),
        ("What is bioavailability?", ["The fraction of drug reaching systemic circulation", "The potency of a drug", "The shelf life of a drug", "The toxicity of a drug"], "a"),
        ("Which process removes water from a liquid to make a powder?", ["Lyophilization", "Distillation", "Filtration", "Centrifugation"], "a"),
        ("What is the purpose of a coating on a tablet?", ["Mask taste and control release", "Increase weight", "Make it colored", "Reduce cost"], "a"),
        ("Which of these is a quality control test for tablets?", ["Disintegration test", "Taste test", "Smell test", "Color test"], "a"),
        ("Explain the difference between a syrup and a suspension.", None, None),
        ("Describe the steps in the manufacturing of a tablet dosage form.", None, None),
    ],
}

SUBJECT_META = {
    "Computer Networks": ("IT101", "B.Tech IT", 2, 1),
    "Machine Learning": ("AIML101", "B.Tech AI & ML", 2, 1),
    "Web Development": ("IT201", "B.Tech IT", 4, 2),
    "Data Science": ("AIML201", "B.Tech AI & ML", 4, 2),
    "Business Analytics": ("BBA101", "BBA", 2, 1),
    "Marketing Management": ("BBA201", "BBA", 4, 2),
    "Financial Accounting": ("COM101", "B.Com", 2, 1),
    "Cost Accounting": ("COM201", "B.Com", 4, 2),
    "Design Fundamentals": ("DES101", "B.Des", 2, 1),
    "Typography": ("DES201", "B.Des", 4, 2),
    "Anatomy and Physiology": ("NUR101", "B.Sc Nursing", 2, 1),
    "Pharmacology": ("NUR201", "B.Sc Nursing", 4, 2),
    "Architectural Drawing": ("ARC101", "B.Arch", 2, 1),
    "Building Materials": ("ARC201", "B.Arch", 4, 2),
    "Pharmaceutical Chemistry": ("PHR101", "B.Pharm", 2, 1),
    "Pharmaceutics": ("PHR201", "B.Pharm", 4, 2),
}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def build_lines(title: str, course_line: str, qs) -> list:
    """Build the text lines for a page content stream."""
    lines = [title, course_line, ""]
    n = 0
    for q, opts, ans in qs:
        n += 1
        if opts:
            lines.append(f"{n}. {q}")
            for i, o in enumerate(opts):
                lines.append(f"{chr(97 + i)}) {o}")
            lines.append(f"Answer: {ans}")
        else:
            lines.append(f"{n}. {q}")
            lines.append("(Write your answer in the space provided.)")
        lines.append("")
    return lines


def build_pdf(title: str, course_line: str, qs, max_lines_per_page: int = 46) -> bytes:
    """Build a minimal multi-page PDF with a correct xref table."""
    lines = build_lines(title, course_line, qs)
    pages = []
    cur = []
    for ln in lines:
        cur.append(ln)
        if len(cur) >= max_lines_per_page:
            pages.append(cur)
            cur = []
    if cur or not pages:
        pages.append(cur)

    # Build object byte strings in order and record their start offsets.
    chunks = []
    offsets = []
    pos = 0

    def emit(data: bytes) -> None:
        nonlocal pos
        offsets.append(pos)
        chunks.append(data)
        pos += len(data)

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    emit(header)

    emit(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    kids = " ".join(f"{4 + i} 0 R" for i in range(len(pages)))
    emit(f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>\nendobj\n".encode())
    emit(b"3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    n_pages = len(pages)
    stream_start = 4 + n_pages
    for i in range(n_pages):
        emit(
            f"{4 + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {stream_start + i} 0 R >>\nendobj\n".encode()
        )
    for i, pg in enumerate(pages):
        stream = "BT\n/F1 12 Tf\n"
        first = True
        for ln in pg:
            if first:
                stream += f"10 770 Td ({esc(ln)}) Tj\n"
                first = False
            else:
                stream += f"0 -15 Td ({esc(ln)}) Tj\n"
        stream += "ET\n"
        emit(
            f"{stream_start + i} 0 obj\n<< /Length {len(stream.encode('latin1'))} >>\nstream\n".encode()
        )
        chunks.append(stream.encode("latin1"))
        pos += len(stream.encode("latin1"))
        chunks.append(b"endstream\nendobj\n")
        pos += len(b"endstream\nendobj\n")
    # xref
    xref_pos = pos
    n_objs = 4 + 2 * n_pages
    xref = f"xref\n0 {n_objs}\n".encode()
    xref += b"0000000000 65535 f \n"
    for i in range(1, n_objs):
        xref += b"%010d 00000 n \n" % offsets[i]
    trailer = f"trailer\n<< /Size {n_objs} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    out = b"".join(chunks) + xref + trailer
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for subject, qs in QUESTIONS.items():
        code, branch, sem, year = SUBJECT_META[subject]
        title = f"{subject} - Question Bank"
        course_line = f"Course: {subject} ({code}) | {branch} | Semester {sem} | Year {year}"
        pdf = build_pdf(title, course_line, qs)
        path = os.path.join(OUT_DIR, f"sunrise-{slugify(subject)}.pdf")
        with open(path, "wb") as f:
            f.write(pdf)
        print(f"wrote {os.path.relpath(path, HERE)} ({len(pdf)} bytes)")

    # Combined sample PDF (first 3 questions of each subject, labeled)
    combined_lines = ["Sunrise University - Combined Question Bank Sample",
                      "Course: Sample questions from multiple subjects", ""]
    for subject, qs in QUESTIONS.items():
        code, branch, sem, year = SUBJECT_META[subject]
        combined_lines.append(f"--- {subject} ({code}) ---")
        n = 0
        for q, opts, ans in qs[:3]:
            n += 1
            if opts:
                combined_lines.append(f"{n}. {q}")
                for i, o in enumerate(opts):
                    combined_lines.append(f"{chr(97 + i)}) {o}")
                combined_lines.append(f"Answer: {ans}")
            else:
                combined_lines.append(f"{n}. {q}")
            combined_lines.append("")
    # reassemble as a question list for build_pdf
    pdf = build_pdf("Sunrise University - Combined Question Bank Sample",
                    "Course: Sample from multiple subjects", QUESTIONS[list(QUESTIONS.keys())[0]], 0)
    # simpler: build custom via lines
    pdf = build_custom_lines(combined_lines)
    path = os.path.join(HERE, "sunrise-question-bank.pdf")
    with open(path, "wb") as f:
        f.write(pdf)
    print(f"wrote sunrise-question-bank.pdf ({len(pdf)} bytes)")


def build_custom_lines(lines: list, max_lines_per_page: int = 46) -> bytes:
    pages = []
    cur = []
    for ln in lines:
        cur.append(ln)
        if len(cur) >= max_lines_per_page:
            pages.append(cur)
            cur = []
    if cur or not pages:
        pages.append(cur)

    chunks = []
    offsets = []
    pos = 0

    def emit(data: bytes) -> None:
        nonlocal pos
        offsets.append(pos)
        chunks.append(data)
        pos += len(data)

    emit(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    emit(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    kids = " ".join(f"{4 + i} 0 R" for i in range(len(pages)))
    emit(f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>\nendobj\n".encode())
    emit(b"3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    n_pages = len(pages)
    stream_start = 4 + n_pages
    for i in range(n_pages):
        emit(
            f"{4 + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {stream_start + i} 0 R >>\nendobj\n".encode()
        )
    for i, pg in enumerate(pages):
        stream = "BT\n/F1 12 Tf\n"
        first = True
        for ln in pg:
            if first:
                stream += f"10 770 Td ({esc(ln)}) Tj\n"
                first = False
            else:
                stream += f"0 -15 Td ({esc(ln)}) Tj\n"
        stream += "ET\n"
        emit(
            f"{stream_start + i} 0 obj\n<< /Length {len(stream.encode('latin1'))} >>\nstream\n".encode()
        )
        chunks.append(stream.encode("latin1"))
        pos += len(stream.encode("latin1"))
        chunks.append(b"endstream\nendobj\n")
        pos += len(b"endstream\nendobj\n")
    xref_pos = pos
    n_objs = 4 + 2 * n_pages
    xref = f"xref\n0 {n_objs}\n".encode()
    xref += b"0000000000 65535 f \n"
    for i in range(1, n_objs):
        xref += b"%010d 00000 n \n" % offsets[i]
    trailer = f"trailer\n<< /Size {n_objs} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    return b"".join(chunks) + xref + trailer


if __name__ == "__main__":
    main()
