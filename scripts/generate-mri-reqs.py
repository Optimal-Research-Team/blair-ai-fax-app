"""
Generate filled KMH MRI requisition PDFs using the blank template.
Overlays patient data onto the form using reportlab.
"""
import os
import sys
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO

TEMPLATE_PATH = os.path.expanduser("~/Downloads/Req-MRI-Nov-20-1.pdf")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "faxes")

# Page dimensions: 630 x 810 points
# reportlab uses bottom-left origin, pdfplumber uses top-left
# Convert: y_reportlab = 810 - y_pdfplumber
PAGE_HEIGHT = 810
PAGE_WIDTH = 630


def create_overlay(data: dict) -> BytesIO:
    """Create a transparent PDF overlay with form field data."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    # Font setup
    c.setFont("Helvetica", 9)

    def y(top):
        """Convert pdfplumber top coordinate to reportlab y."""
        return PAGE_HEIGHT - top

    # Patient Last Name
    c.drawString(108, y(91), data.get("last_name", ""))
    # First Name
    c.drawString(252, y(91), data.get("first_name", ""))
    # DOB
    c.drawString(367, y(91), data.get("dob", ""))
    # Address
    c.drawString(72, y(109), data.get("address", ""))
    # Reason (right side)
    c.setFont("Helvetica", 8)
    c.drawString(525, y(111), data.get("reason_line1", ""))
    c.drawString(492, y(122), data.get("reason_line2", ""))
    c.setFont("Helvetica", 9)
    # Day Phone
    c.drawString(89, y(145), data.get("day_phone", ""))
    # Home Phone
    c.drawString(263, y(145), data.get("home_phone", ""))
    # Weight
    c.drawString(386, y(145), data.get("weight", ""))
    # OHIP
    c.drawString(63, y(163), data.get("ohip", ""))
    # Gender
    c.drawString(361, y(163), data.get("gender", ""))

    # AREA TO BE SCANNED (in the box area ~y=260-290)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(55, y(275), data.get("area_scanned", ""))
    c.setFont("Helvetica", 9)

    # CLINICAL INFORMATION (in the box area)
    clinical = data.get("clinical_info", "")
    lines = clinical.split("\n")
    for i, line in enumerate(lines[:4]):
        c.drawString(335, y(265 + i * 12), line)

    # PATIENT SCREENING checkboxes - mark all NO for simplicity
    # We'll add small "X" marks in the NO column
    # Most screening answers are NO for typical patients
    screening = data.get("screening", {})
    # Skip detailed checkbox marking for now - the text overlay is sufficient

    # REFERRING PHYSICIAN INFORMATION
    c.drawString(89, y(665), data.get("ref_surname", ""))
    c.drawString(252, y(665), data.get("ref_first_name", ""))
    c.drawString(86, y(703), data.get("ref_billing", ""))
    c.drawString(67, y(721), data.get("ref_tel", ""))
    c.drawString(230, y(721), data.get("ref_fax", ""))
    c.drawString(115, y(759), data.get("cc_physician", ""))

    c.showPage()

    # Page 2 is instructions - leave blank
    c.showPage()

    c.save()
    buf.seek(0)
    return buf


def merge_overlay(template_path: str, overlay_buf: BytesIO, output_path: str):
    """Merge the overlay onto the template PDF."""
    template = PdfReader(template_path)
    overlay = PdfReader(overlay_buf)
    writer = PdfWriter()

    for i, page in enumerate(template.pages):
        if i < len(overlay.pages):
            page.merge_page(overlay.pages[i])
        writer.add_page(page)

    with open(output_path, "wb") as f:
        writer.write(f)


# Sample MRI requisition data - realistic Canadian cardiology patients
PATIENTS = [
    {
        "filename": "mri_req_cardiac_001.pdf",
        "last_name": "Anderson",
        "first_name": "Robert",
        "dob": "03/15/1958",
        "address": "142 Bloor Street West, Unit 5, Toronto, ON M5S 1M8",
        "reason_line1": "Cardiac",
        "reason_line2": "assessment",
        "day_phone": "(416) 555-2341",
        "home_phone": "(416) 555-8872",
        "weight": "195 lbs",
        "ohip": "1234-567-890-AB",
        "gender": "Male",
        "area_scanned": "Cardiac MRI",
        "clinical_info": "Known CAD, post-PCI to LAD.\nAssess myocardial viability.\nEF 35% on recent echo.\nR/O ischemic cardiomyopathy.",
        "ref_surname": "Chen",
        "ref_first_name": "Sarah",
        "ref_billing": "34567",
        "ref_tel": "(416) 555-0101",
        "ref_fax": "(416) 555-0102",
        "cc_physician": "Dr. Michael Patel, Cardiology",
    },
    {
        "filename": "mri_req_cardiac_002.pdf",
        "last_name": "Gonzalez",
        "first_name": "Maria",
        "dob": "07/22/1972",
        "address": "88 Queen Street East, Brampton, ON L6V 1A3",
        "reason_line1": "Cardiac",
        "reason_line2": "viability study",
        "day_phone": "(905) 555-3412",
        "home_phone": "(905) 555-7721",
        "weight": "152 lbs",
        "ohip": "2345-678-901-CD",
        "gender": "Female",
        "area_scanned": "Cardiac MRI with gadolinium",
        "clinical_info": "New onset CHF, EF 30%.\nNo prior cardiac history.\nR/O non-ischemic cardiomyopathy.\nRecent troponin negative.",
        "ref_surname": "Kapoor",
        "ref_first_name": "Raj",
        "ref_billing": "45678",
        "ref_tel": "(416) 555-0901",
        "ref_fax": "(416) 555-0902",
        "cc_physician": "Dr. John Kim, Heart Failure",
    },
    {
        "filename": "mri_req_cardiac_003.pdf",
        "last_name": "Wilson",
        "first_name": "James",
        "dob": "11/08/1965",
        "address": "301 Yonge Street, Apt 12B, Toronto, ON M5B 1S1",
        "reason_line1": "Myocarditis",
        "reason_line2": "rule out",
        "day_phone": "(416) 555-4523",
        "home_phone": "(416) 555-9934",
        "weight": "210 lbs",
        "ohip": "3456-789-012-EF",
        "gender": "Male",
        "area_scanned": "Cardiac MRI",
        "clinical_info": "Acute chest pain, troponin 0.45.\nNormal coronary angiogram.\nR/O myocarditis vs takotsubo.\nST elevation on ECG.",
        "ref_surname": "Patel",
        "ref_first_name": "Michael",
        "ref_billing": "56789",
        "ref_tel": "(416) 555-0301",
        "ref_fax": "(416) 555-0302",
        "cc_physician": "Dr. Lisa Wang, Cardiology",
    },
    {
        "filename": "mri_req_cardiac_004.pdf",
        "last_name": "Lee",
        "first_name": "Patricia",
        "dob": "01/30/1980",
        "address": "45 Sheppard Avenue East, Unit 2201, North York, ON M2N 5W9",
        "reason_line1": "Aortic",
        "reason_line2": "assessment",
        "day_phone": "(416) 555-5634",
        "home_phone": "(416) 555-1156",
        "weight": "138 lbs",
        "ohip": "4567-890-123-GH",
        "gender": "Female",
        "area_scanned": "Cardiac MRI - Aorta",
        "clinical_info": "Bicuspid aortic valve.\nAortic root dilation 4.2cm.\nAnnual surveillance MRI.\nAsymptomatic, stable.",
        "ref_surname": "Sharma",
        "ref_first_name": "Anita",
        "ref_billing": "67890",
        "ref_tel": "(905) 555-0401",
        "ref_fax": "(905) 555-0402",
        "cc_physician": "Dr. Emma Foster, CT Surgery",
    },
    {
        "filename": "mri_req_cardiac_005.pdf",
        "last_name": "Thompson",
        "first_name": "David",
        "dob": "09/12/1953",
        "address": "17 Dundas Street West, Mississauga, ON L5B 1H7",
        "reason_line1": "Pre-op",
        "reason_line2": "cardiac workup",
        "day_phone": "(905) 555-6745",
        "home_phone": "(905) 555-2267",
        "weight": "225 lbs",
        "ohip": "5678-901-234-IJ",
        "gender": "Male",
        "area_scanned": "Cardiac MRI with stress",
        "clinical_info": "Pre-CABG viability assessment.\nTriple vessel disease on cath.\nEF 40%, inferior hypokinesis.\nDM type 2, CKD stage 3.",
        "ref_surname": "Kim",
        "ref_first_name": "John",
        "ref_billing": "78901",
        "ref_tel": "(416) 555-0501",
        "ref_fax": "(416) 555-0502",
        "cc_physician": "Dr. Robert James, CT Surgery",
    },
    {
        "filename": "mri_req_cardiac_006.pdf",
        "last_name": "Brown",
        "first_name": "William",
        "dob": "12/20/1960",
        "address": "562 King Street West, Hamilton, ON L8P 1C2",
        "reason_line1": "ARVC",
        "reason_line2": "screening",
        "day_phone": "(905) 555-7856",
        "home_phone": "(905) 555-3378",
        "weight": "185 lbs",
        "ohip": "7890-123-456-MN",
        "gender": "Male",
        "area_scanned": "Cardiac MRI - RV assessment",
        "clinical_info": "Syncope, family hx sudden death.\nECG: epsilon waves, T-inv V1-V3.\nR/O ARVC.\nHolter: frequent PVCs, RV morphology.",
        "ref_surname": "Wang",
        "ref_first_name": "Lisa",
        "ref_billing": "89012",
        "ref_tel": "(905) 555-0701",
        "ref_fax": "(905) 555-0702",
        "cc_physician": "Dr. Michael Patel, Electrophysiology",
    },
    {
        "filename": "mri_req_cardiac_007.pdf",
        "last_name": "Taylor",
        "first_name": "Elizabeth",
        "dob": "06/18/1975",
        "address": "89 Avenue Road, Suite 301, Toronto, ON M5R 2G3",
        "reason_line1": "HCM",
        "reason_line2": "evaluation",
        "day_phone": "(416) 555-8967",
        "home_phone": "(416) 555-4489",
        "weight": "145 lbs",
        "ohip": "8901-234-567-OP",
        "gender": "Female",
        "area_scanned": "Cardiac MRI",
        "clinical_info": "Known HCM, IVS 18mm on echo.\nExertional dyspnea worsening.\nR/O LVOT obstruction.\nFamily screening positive.",
        "ref_surname": "Foster",
        "ref_first_name": "Emma",
        "ref_billing": "90123",
        "ref_tel": "(416) 555-0801",
        "ref_fax": "(416) 555-0802",
        "cc_physician": "Dr. Raj Kapoor, Cardiology",
    },
    {
        "filename": "mri_req_cardiac_008.pdf",
        "last_name": "White",
        "first_name": "Margaret",
        "dob": "08/25/1948",
        "address": "234 Lakeshore Blvd East, Oakville, ON L6J 1J4",
        "reason_line1": "Pericardial",
        "reason_line2": "disease",
        "day_phone": "(905) 555-9078",
        "home_phone": "(905) 555-5590",
        "weight": "160 lbs",
        "ohip": "9012-345-678-QR",
        "gender": "Female",
        "area_scanned": "Cardiac MRI with gadolinium",
        "clinical_info": "Recurrent pericarditis x3.\nConstrictive physiology on echo.\nR/O constrictive pericarditis.\nColchicine refractory.",
        "ref_surname": "Ross",
        "ref_first_name": "Amanda",
        "ref_billing": "01234",
        "ref_tel": "(905) 555-0901",
        "ref_fax": "(905) 555-0902",
        "cc_physician": "Dr. Sarah Chen, Cardiology",
    },
]


def main():
    if not os.path.exists(TEMPLATE_PATH):
        print(f"Error: Template not found at {TEMPLATE_PATH}")
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for patient in PATIENTS:
        filename = patient.pop("filename")
        output_path = os.path.join(OUTPUT_DIR, filename)
        overlay_buf = create_overlay(patient)
        merge_overlay(TEMPLATE_PATH, overlay_buf, output_path)
        print(f"Generated: {filename}")

    print(f"\nDone! Generated {len(PATIENTS)} MRI requisition PDFs in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
