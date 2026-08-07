import uuid
from sqlalchemy.orm import Session
from app.models.certification import Certification, CertificationSkill
from app.models.question import Question, QuestionOption


def seed_database(db: Session):
    if db.query(Certification).count() > 0:
        return

    certs = [
        {"code": "AZ-900", "name": "Microsoft Azure Fundamentals", "description": "Foundational knowledge of cloud services and Azure.", "level": "Fundamentals", "exam_url": "https://learn.microsoft.com/en-us/certifications/exams/az-900"},
        {"code": "AZ-104", "name": "Microsoft Azure Administrator", "description": "Implement, manage and monitor Azure environments.", "level": "Associate", "exam_url": "https://learn.microsoft.com/en-us/certifications/exams/az-104"},
        {"code": "AI-102", "name": "Designing and Implementing Azure AI Solutions", "description": "Build AI apps and agents using Azure AI services.", "level": "Associate", "exam_url": "https://learn.microsoft.com/en-us/certifications/exams/ai-102"},
    ]

    skills_map = {
        "AZ-900": ["Cloud Concepts", "Azure Architecture", "Azure Services", "Security & Compliance", "Pricing & Support"],
        "AZ-104": ["Identity & Governance", "Storage", "Compute", "Networking", "Monitoring"],
        "AI-102": ["AI Workloads", "Computer Vision", "NLP", "Conversational AI", "Knowledge Mining"],
    }

    questions_seed = [
        {
            "cert_code": "AZ-900",
            "text": "What is the primary benefit of cloud computing's economies of scale?",
            "explanation": "Cloud providers like Microsoft operate at massive scale, reducing per-unit costs and passing savings to customers.",
            "difficulty": "Easy",
            "skill_area": "Cloud Concepts",
            "options": [
                {"text": "Lower variable costs compared to on-premises", "is_correct": True},
                {"text": "Guaranteed 100% uptime for all services", "is_correct": False},
                {"text": "Unlimited free storage for all customers", "is_correct": False},
                {"text": "Automatic code deployment pipelines", "is_correct": False},
            ],
        },
        {
            "cert_code": "AZ-900",
            "text": "Which Azure service provides a fully managed relational database with automatic scaling?",
            "explanation": "Azure SQL Database is a PaaS offering that handles patching, backups, and scaling automatically.",
            "difficulty": "Easy",
            "skill_area": "Azure Services",
            "options": [
                {"text": "Azure SQL Database", "is_correct": True},
                {"text": "Azure Blob Storage", "is_correct": False},
                {"text": "Azure Table Storage", "is_correct": False},
                {"text": "Azure Cosmos DB (Core SQL)", "is_correct": False},
            ],
        },
        {
            "cert_code": "AZ-900",
            "text": "What does the Azure SLA guarantee for a single-instance Virtual Machine using Premium SSD?",
            "explanation": "Microsoft guarantees 99.9% uptime for single VMs on Premium SSD storage, rising to 99.99% for Availability Sets.",
            "difficulty": "Medium",
            "skill_area": "Pricing & Support",
            "options": [
                {"text": "99.9%", "is_correct": True},
                {"text": "99.99%", "is_correct": False},
                {"text": "99.5%", "is_correct": False},
                {"text": "100%", "is_correct": False},
            ],
        },
        {
            "cert_code": "AZ-900",
            "text": "Which Azure tool helps estimate the monthly cost before deploying resources?",
            "explanation": "The Azure Pricing Calculator lets you configure expected resources and see estimated monthly costs before any deployment.",
            "difficulty": "Easy",
            "skill_area": "Pricing & Support",
            "options": [
                {"text": "Azure Pricing Calculator", "is_correct": True},
                {"text": "Azure Cost Management", "is_correct": False},
                {"text": "Azure Advisor", "is_correct": False},
                {"text": "Azure Monitor", "is_correct": False},
            ],
        },
    ]

    cert_objects = {}
    for c in certs:
        cert = Certification(id=str(uuid.uuid4()), **c)
        db.add(cert)
        cert_objects[c["code"]] = cert

    db.flush()

    for code, skills in skills_map.items():
        cert = cert_objects[code]
        for i, skill in enumerate(skills):
            db.add(CertificationSkill(id=str(uuid.uuid4()), certification_id=cert.id, skill_name=skill, display_order=i))

    for q in questions_seed:
        cert = cert_objects[q["cert_code"]]
        question = Question(
            id=str(uuid.uuid4()),
            certification_id=cert.id,
            question_text=q["text"],
            explanation=q["explanation"],
            difficulty=q["difficulty"],
            skill_area=q["skill_area"],
            question_type="single",
        )
        db.add(question)
        db.flush()
        for i, opt in enumerate(q["options"]):
            db.add(QuestionOption(id=str(uuid.uuid4()), question_id=question.id, option_text=opt["text"], is_correct=opt["is_correct"], display_order=i))

    db.commit()
