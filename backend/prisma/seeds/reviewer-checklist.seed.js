/**
 * Seed: Standard Ethics Checklist 2026
 * Creates the default active reviewer checklist template with all 3 sections
 * and 30 items translated from the official committee checklist form.
 * Safe to re-run: skips if a template with name "Standard 2026" already exists.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** @type {import('@prisma/client').ChecklistAnswerType} */
const ADEQUACY = 'ADEQUACY';
/** @type {import('@prisma/client').ChecklistAnswerType} */
const YES_NO_PROBLEM = 'YES_NO_PROBLEM';
/** @type {import('@prisma/client').ChecklistAnswerType} */
const YES_NO = 'YES_NO';

const SECTIONS = [
  {
    code: 'DOCS',
    title: 'אישור המסמכים והפרטים שצורפו',
    titleEn: 'Document and Details Approval',
    answerType: ADEQUACY,
    yesIsProblem: false,
    orderIndex: 1,
    items: [
      {
        code: 'STUDY_NAME',
        label: 'שם המחקר בעברית ובאנגלית',
        labelEn: 'Study name in Hebrew and English',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 1,
      },
      {
        code: 'RESEARCH_PROTOCOL',
        label: 'פרוטוקול המחקר',
        labelEn: 'Research protocol',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 2,
      },
      {
        code: 'QUESTIONNAIRE',
        label: 'שאלון המחקר',
        labelEn: 'Research questionnaire',
        helpText: 'יש לוודא כי השאלון כולל פתיח, שאלות רגישות מסומנות, וזכויות המרואיין מוגדרות בבירור',
        helpTextEn: 'Verify the questionnaire includes an introduction, marked sensitive questions, and clearly stated interviewee rights',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 3,
      },
      {
        code: 'QUESTIONNAIRE_PREFACE',
        label: 'פתיח לשאלון — הצגת המחקר',
        labelEn: 'Questionnaire preface — study introduction',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 4,
      },
      {
        code: 'QUESTIONNAIRE_SENSITIVE',
        label: 'שאלות רגישות מסומנות בשאלון',
        labelEn: 'Sensitive questions marked in questionnaire',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 5,
      },
      {
        code: 'QUESTIONNAIRE_RIGHTS',
        label: 'זכויות המרואיין מופיעות בשאלון',
        labelEn: 'Interviewee rights appear in questionnaire',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 6,
      },
      {
        code: 'CONSENT_FORM',
        label: 'נוסח טופס הסכמה מדעת',
        labelEn: 'Informed consent form text',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 7,
      },
      {
        code: 'CONSENT_HEBREW_STANDARD',
        label: 'טופס ההסכמה כתוב בעברית תקנית',
        labelEn: 'Consent form written in standard Hebrew',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 8,
      },
      {
        code: 'CONSENT_AGE_APPROPRIATE',
        label: 'התאמת טופס ההסכמה לגיל המשתתפים',
        labelEn: 'Consent form adapted to participants\' age group',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 9,
      },
      {
        code: 'CONSENT_RESEARCH_STAGES',
        label: 'שלבי המחקר מוסברים בטופס ההסכמה',
        labelEn: 'Research stages explained in consent form',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 10,
      },
      {
        code: 'CONSENT_CLEAR_LANGUAGE',
        label: 'שפה ברורה ומובנת בטופס ההסכמה',
        labelEn: 'Clear and understandable language in consent form',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 11,
      },
      {
        code: 'PARTICIPATION_DURATION',
        label: 'משך ההשתתפות מצוין',
        labelEn: 'Participation duration stated',
        isRequired: true,
        requiresDetails: false,
        orderIndex: 12,
      },
      {
        code: 'PARTICIPANT_BENEFITS',
        label: 'היתרונות לנחקר מפורטים',
        labelEn: 'Benefits to participant are detailed',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 13,
      },
      {
        code: 'WITHDRAWAL_OPTION',
        label: 'אפשרות יציאה מהמחקר ללא סנקציה',
        labelEn: 'Option to withdraw without penalty',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 14,
      },
      {
        code: 'QUESTIONS_OPTIONAL',
        label: 'אופציונליות שאלות רגישות מוסברת',
        labelEn: 'Optionality of sensitive questions is explained',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 15,
      },
      {
        code: 'FUTURE_RESEARCH_SEPARATION',
        label: 'הפרדה ממחקר עתידי מוסברת',
        labelEn: 'Separation from future research is explained',
        isRequired: false,
        requiresDetails: false,
        orderIndex: 16,
      },
      {
        code: 'COMPENSATION',
        label: 'תמורה למשתתף (אם ישנה) מפורטת',
        labelEn: 'Compensation for participant (if any) is detailed',
        isRequired: false,
        requiresDetails: false,
        orderIndex: 17,
      },
      {
        code: 'RESEARCHER_CONTACT',
        label: 'מספר טלפון של החוקר זמין 24/7',
        labelEn: 'Researcher phone number available 24/7',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 18,
      },
      {
        code: 'DATA_SECURITY',
        label: 'אבטחת נתונים מוסברת',
        labelEn: 'Data security explained',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 19,
      },
      {
        code: 'DATA_ENCODING',
        label: 'קידוד מידע מתואר',
        labelEn: 'Data encoding / pseudonymization described',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 20,
      },
      {
        code: 'NO_IDENTIFIERS',
        label: 'היעדר פרטים מזהים בנתונים',
        labelEn: 'No identifying details in data',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 21,
      },
      {
        code: 'ENCODING_KEY',
        label: 'מפתח הקידוד מאובטח בנפרד',
        labelEn: 'Encoding key stored securely and separately',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 22,
      },
      {
        code: 'NO_DATA_TRANSFER',
        label: 'איסור העברת מידע מחוץ למוסד',
        labelEn: 'Prohibition on data transfer outside institution',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 23,
      },
    ],
  },
  {
    code: 'ETHICS',
    title: 'בעיות אתיות פוטנציאליות',
    titleEn: 'Potential Ethical Issues',
    answerType: YES_NO_PROBLEM,
    yesIsProblem: true,
    orderIndex: 2,
    description: 'סמן "כן" אם קיימת בעיה אתית. "כן" = בעיה — יש לפרט.',
    items: [
      {
        code: 'ETHICS_AUTHORITY',
        label: 'יחסי מרות או ניגוד אינטרסים בין חוקר למשתתפים',
        labelEn: 'Authority relations or conflict of interest between researcher and participants',
        helpText: 'לדוגמה: מורה חוקר את תלמידיו, מעסיק חוקר את עובדיו',
        helpTextEn: 'E.g. teacher researching own students, employer researching employees',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 1,
      },
      {
        code: 'ETHICS_FUNDING',
        label: 'מימון המחקר ואינטרסים של גורם ממן',
        labelEn: 'Research funding and funder\'s interests',
        helpText: 'האם קיים חשש שהממן מעוניין בתוצאה מסוימת?',
        helpTextEn: 'Is there concern that the funder has an interest in a specific outcome?',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 2,
      },
      {
        code: 'ETHICS_COMPENSATION_COERCION',
        label: 'תגמול כלחץ להשתתפות',
        labelEn: 'Compensation as coercion to participate',
        helpText: 'האם גובה התגמול עלול להפעיל לחץ על משתתפים פגיעים?',
        helpTextEn: 'Is the compensation level likely to coerce vulnerable participants?',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 3,
      },
      {
        code: 'ETHICS_HARM',
        label: 'חשיפה לנזק גופני, נפשי או כלכלי',
        labelEn: 'Exposure to physical, psychological or financial harm',
        isRequired: true,
        requiresDetails: true,
        orderIndex: 4,
      },
      {
        code: 'ETHICS_OTHER',
        label: 'בעיות אתיות אחרות',
        labelEn: 'Other ethical issues',
        isRequired: false,
        requiresDetails: true,
        orderIndex: 5,
      },
    ],
  },
  {
    code: 'SUMMARY',
    title: 'סיכום ואישור — שאלות מותנות',
    titleEn: 'Summary and Approval — Conditional Questions',
    answerType: YES_NO,
    yesIsProblem: false,
    orderIndex: 3,
    description: 'השאלות בסקציה זו מותנות. יש לענות בהתאם לרלוונטיות למחקר.',
    items: [
      {
        code: 'EXEMPT_CONSENT_REQUESTED',
        label: 'הוגשה בקשה לפטור מחתימה על טופס הסכמה?',
        labelEn: 'Was a waiver of written informed consent requested?',
        helpText: 'אם כן — יש לסמן את עמדת הסוקר על הבקשה',
        helpTextEn: 'If yes — mark reviewer\'s position on the request',
        isRequired: false,
        requiresDetails: false,
        orderIndex: 1,
      },
      {
        code: 'MINORS_BOTH_PARENTS_EXEMPT',
        label: 'במחקר הכולל קטינים — בקשה לפטור מהסכמת שני ההורים?',
        labelEn: 'For research involving minors — waiver of consent from both parents requested?',
        helpText: 'רלוונטי רק אם המחקר כולל קטינים',
        helpTextEn: 'Relevant only if research involves minors',
        isRequired: false,
        requiresDetails: false,
        orderIndex: 2,
      },
    ],
  },
];

/**
 * @returns {Promise<void>}
 */
async function seedReviewerChecklist() {
  const existingTemplate = await prisma.reviewerChecklistTemplate.findFirst({
    where: { name: 'Standard 2026' },
  });

  if (existingTemplate) {
    console.log('⏭  Reviewer checklist seed: Standard 2026 already exists — skipping.');
    return;
  }

  const template = await prisma.reviewerChecklistTemplate.create({
    data: {
      name: 'Standard 2026',
      nameEn: 'Standard Ethics Checklist 2026',
      version: 1,
      track: null,
      isActive: true,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  for (const sectionData of SECTIONS) {
    const { items, ...sectionFields } = sectionData;

    const section = await prisma.reviewerChecklistSection.create({
      data: {
        ...sectionFields,
        templateId: template.id,
      },
    });

    for (const itemData of items) {
      await prisma.reviewerChecklistItem.create({
        data: {
          ...itemData,
          sectionId: section.id,
        },
      });
    }
  }

  console.log(
    `✅ Reviewer checklist seed: created "Standard 2026" — ` +
    `${SECTIONS.length} sections, ${SECTIONS.reduce((s, sec) => s + sec.items.length, 0)} items.`
  );
}

export default seedReviewerChecklist;
