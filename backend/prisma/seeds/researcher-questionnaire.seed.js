/**
 * Seed: Researcher Questionnaire (March 2026)
 * Creates a FormConfig for "שאלון למגיש הבקשה" with 18 fields.
 * Status: Draft (isPublished=false, isActive=false) for admin review before publishing.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedResearcherQuestionnaire() {
  // Check if already exists
  const existing = await prisma.formConfig.findFirst({
    where: { name: { contains: 'שאלון למגיש בקשה' } },
  })
  if (existing) {
    console.log('✓ Researcher questionnaire already exists')
    return
  }

  // Instructions in Hebrew
  const instructionsHe = `# שאלון למגיש הבקשה

יקר/ה חוקר/ת,

לצורך הגשת בקשה לוועדת אתיקה יש למלא את הטופס המצורף.

## קבצים נדרשים

בנוסף יש לצרף לבקשה את הקבצים הבאים:

- **פרוטוקול מחקר** (עד 2 עמודים): המכיל את הסעיפים — נושא המחקר, רקע מדעי, מטרת המחקר, הליך המחקר, קריטריונים להכללה ולאי הכללה, ניתוח נתונים, מסקנות, ביבליוגרפיה
- **שאלון המחקר**: כולל פתיח לשאלון
- **מדריך למראיין** (במחקר איכותני בלבד)
- **נוסח טופס הסכמה מדעת**
- **מסמך מפורט** לגבי אופן אבטחת הנתונים`

  // Instructions in English
  const instructionsEn = `# Researcher Questionnaire

Dear Researcher,

To submit a request to the ethics committee, please complete the form below.

## Required Attachments

In addition, please attach the following documents to your submission:

- **Research Protocol** (up to 2 pages): containing sections — research subject, scientific background, research objectives, research procedure, inclusion and exclusion criteria, data analysis, conclusions, bibliography
- **Research Questionnaire**: including questionnaire introduction
- **Interviewer Guide** (for qualitative research only)
- **Informed Consent Form**
- **Data Security Document**`

  // Attachments list
  const attachmentsList = [
    {
      id: 'protocol',
      name: 'פרוטוקול מחקר',
      nameEn: 'Research Protocol',
      required: true,
      acceptedTypes: ['pdf', 'doc', 'docx'],
      note: 'עד 2 עמודים — נושא, רקע, מטרה, הליך, קריטריונים, ניתוח, מסקנות, ביבליוגרפיה',
    },
    {
      id: 'questionnaire',
      name: 'שאלון המחקר',
      nameEn: 'Research Questionnaire',
      required: true,
      acceptedTypes: ['pdf', 'doc', 'docx'],
      note: 'כולל פתיח לשאלון',
    },
    {
      id: 'interviewer-guide',
      name: 'מדריך למראיין',
      nameEn: 'Interviewer Guide',
      required: false,
      acceptedTypes: ['pdf', 'doc', 'docx'],
      note: 'במחקר איכותני',
    },
    {
      id: 'consent-form',
      name: 'נוסח טופס הסכמה מדעת',
      nameEn: 'Informed Consent Form',
      required: true,
      acceptedTypes: ['pdf', 'doc', 'docx'],
      note: '',
    },
    {
      id: 'data-security',
      name: 'מסמך אבטחת נתונים',
      nameEn: 'Data Security Document',
      required: true,
      acceptedTypes: ['pdf', 'doc', 'docx'],
      note: 'מפורט לגבי אופן אבטחת הנתונים',
    },
  ]

  // Form schema with 18 fields
  const schemaJson = {
    sections: [
      {
        id: 'section-1',
        title: 'פרטי המחקר',
        titleEn: 'Research Details',
        fields: [
          {
            id: 'research-subject-he',
            type: 'text',
            label: 'נושא המחקר',
            labelEn: 'Research Subject',
            required: true,
            hint: 'יש להקפיד שנושא המחקר בעברית תואמת לאנגלית ומנוסחת בהתאם בטופס ההסכמה',
            hintEn: 'Ensure the Hebrew subject matches the English version and is consistent with the consent form',
            maxLength: 500,
          },
          {
            id: 'research-subject-en',
            type: 'text',
            label: 'נושא המחקר באנגלית',
            labelEn: 'Research Subject in English',
            required: true,
            maxLength: 500,
          },
          {
            id: 'principal-researcher',
            type: 'text',
            label: 'חוקר ראשי',
            labelEn: 'Principal Researcher',
            required: true,
            maxLength: 200,
          },
          {
            id: 'initiator',
            type: 'text',
            label: 'יזם',
            labelEn: 'Initiator',
            required: true,
            maxLength: 200,
          },
          {
            id: 'research-partners',
            type: 'textarea',
            label: 'שותפי המחקר',
            labelEn: 'Research Partners',
            required: false,
            maxLength: 1000,
          },
        ],
      },
      {
        id: 'section-2',
        title: 'תיאור המחקר',
        titleEn: 'Research Description',
        fields: [
          {
            id: 'participant-time-investment',
            type: 'number',
            label: 'כמה זמן לדעתך הנחקר צפוי להשקיע במחקר? (בדקות)',
            labelEn: 'How much time is the participant expected to invest? (in minutes)',
            required: true,
            min: 0,
            max: 10000,
          },
          {
            id: 'multi-center',
            type: 'radio',
            label: 'האם המחקר רב מרכזי?',
            labelEn: 'Is the research multi-center?',
            required: true,
            options: [
              { value: 'yes', label: 'כן', labelEn: 'Yes' },
              { value: 'no', label: 'לא', labelEn: 'No' },
            ],
          },
          {
            id: 'multi-center-details',
            type: 'textarea',
            label: 'אם כן, האם הוגשה בקשה לוועדת אתיקה במרכז נוסף? האם היא אושרה?',
            labelEn: 'If yes, has an ethics request been submitted to another center? Was it approved?',
            required: false,
            maxLength: 1000,
            condition: { fieldId: 'multi-center', value: 'yes' },
          },
          {
            id: 'num-participants',
            type: 'number',
            label: 'כמה משתתפים צפויים להתגייס למחקר?',
            labelEn: 'How many participants are expected to enroll?',
            required: true,
            min: 0,
            max: 1000000,
          },
          {
            id: 'age-range',
            type: 'text',
            label: 'מה הוא טווח הגילאים לגיוס במחקר זה?',
            labelEn: 'What is the age range for recruitment in this study?',
            required: true,
            maxLength: 200,
            placeholder: 'למשל: 18-65 שנים',
            placeholderEn: 'e.g., 18-65 years',
          },
        ],
      },
      {
        id: 'section-3',
        title: 'אוכלוסיות מיוחדות וסיכונים',
        titleEn: 'Special Populations & Risks',
        fields: [
          {
            id: 'special-population',
            type: 'radio',
            label: 'האם המחקר נערך על אוכלוסייה מיוחדת?',
            labelEn: 'Is the research conducted on a special population?',
            required: true,
            hint: 'ילדים / נשים בהריון / אסירים / חיילים / קשישים / חולים פסיכיאטריים',
            hintEn: 'Children / Pregnant women / Prisoners / Military personnel / Elderly / Psychiatric patients',
            options: [
              { value: 'yes', label: 'כן', labelEn: 'Yes' },
              { value: 'no', label: 'לא', labelEn: 'No' },
            ],
          },
          {
            id: 'special-population-details',
            type: 'textarea',
            label: 'אם כן, פרט:',
            labelEn: 'If yes, please specify:',
            required: false,
            maxLength: 1000,
            condition: { fieldId: 'special-population', value: 'yes' },
          },
          {
            id: 'risks-benefits',
            type: 'textarea',
            label: 'פרט מה הם הסיכונים, הנזקים והתועלות הצפויות לנחקר.',
            labelEn: 'Please describe the expected risks, harms, and benefits to the participant.',
            required: true,
            maxLength: 2000,
          },
        ],
      },
      {
        id: 'section-4',
        title: 'הסכמה מדעת וזכויות משתתפים',
        titleEn: 'Informed Consent & Participant Rights',
        fields: [
          {
            id: 'waive-consent',
            type: 'radio',
            label: 'האם החוקרים מבקשים פטור מהחתמה על טופס הסכמה מדעת?',
            labelEn: 'Are researchers requesting a waiver of informed consent?',
            required: true,
            options: [
              { value: 'yes', label: 'כן', labelEn: 'Yes' },
              { value: 'no', label: 'לא', labelEn: 'No' },
            ],
          },
          {
            id: 'waive-consent-justification',
            type: 'textarea',
            label: 'במידה וכן יש לפרט את ההצדקה לבקשה:',
            labelEn: 'If yes, please provide justification:',
            required: false,
            maxLength: 1000,
            condition: { fieldId: 'waive-consent', value: 'yes' },
          },
          {
            id: 'minor-dual-consent',
            type: 'radio',
            label: 'במקרה שהמחקר נערך על קטינים עד גיל 18, האם החוקרים מבקשים פטור מקבלת הסכמה של שני ההורים?',
            labelEn: 'For research with minors (up to 18 years), are researchers requesting waiver of dual parental consent?',
            required: false,
            options: [
              { value: 'yes', label: 'כן', labelEn: 'Yes' },
              { value: 'no', label: 'לא', labelEn: 'No' },
              { value: 'not-applicable', label: 'לא רלוונטי', labelEn: 'Not applicable' },
            ],
          },
          {
            id: 'minor-dual-consent-justification',
            type: 'textarea',
            label: 'במידה וכן יש לפרט את ההצדקה לבקשה:',
            labelEn: 'If yes, please provide justification:',
            required: false,
            maxLength: 1000,
            condition: { fieldId: 'minor-dual-consent', value: 'yes' },
          },
          {
            id: 'minor-assent-form',
            type: 'radio',
            label: 'במקרה שהמחקר נערך על קטינים עד גיל 18, האם קיים גם טופס הצהרה שעליו חותם הקטין בנוסף לטופס ההסכמה לחתימת ההורים?',
            labelEn: 'For research with minors (up to 18 years), is there an assent form signed by the minor in addition to parental consent?',
            required: false,
            options: [
              { value: 'yes', label: 'כן', labelEn: 'Yes' },
              { value: 'no', label: 'לא', labelEn: 'No' },
              { value: 'not-applicable', label: 'לא רלוונטי', labelEn: 'Not applicable' },
            ],
          },
        ],
      },
      {
        id: 'section-5',
        title: 'מימון ותגמול',
        titleEn: 'Funding & Compensation',
        fields: [
          {
            id: 'external-funding',
            type: 'radio',
            label: 'האם המחקר ממומן על ידי גורם חיצוני?',
            labelEn: 'Is the research funded by an external entity?',
            required: true,
            options: [
              { value: 'yes', label: 'כן', labelEn: 'Yes' },
              { value: 'no', label: 'לא', labelEn: 'No' },
            ],
          },
          {
            id: 'external-funding-details',
            type: 'text',
            label: 'אם כן, פרט מי הוא הגורם הממן:',
            labelEn: 'If yes, please specify the funding entity:',
            required: false,
            maxLength: 500,
            condition: { fieldId: 'external-funding', value: 'yes' },
          },
          {
            id: 'participant-compensation',
            type: 'radio',
            label: 'האם הנחקרים מתוגמלים באופן כלשהו?',
            labelEn: 'Are participants compensated in any way?',
            required: true,
            options: [
              { value: 'no', label: 'לא', labelEn: 'No' },
              { value: 'yes', label: 'כן', labelEn: 'Yes' },
              { value: 'not-applicable', label: 'לא רלוונטי', labelEn: 'Not applicable' },
            ],
          },
          {
            id: 'participant-compensation-details',
            type: 'textarea',
            label: 'במידה וכן פרט — מי הם הנחקרים המתוגמלים, באיזה תגמול מדובר, מה מקור התגמול?',
            labelEn: 'If yes, please describe — which participants are compensated, what is the compensation, and what is the source of funds?',
            required: false,
            maxLength: 1000,
            condition: { fieldId: 'participant-compensation', value: 'yes' },
          },
          {
            id: 'insurance-needed',
            type: 'radio',
            label: 'האם לדעתך יש צורך להוסיף סעיף אודות ביטוח מטעם מרכז אקדמי לב?',
            labelEn: 'Do you believe there is a need to add a section regarding insurance from Lev Academic Center?',
            required: true,
            options: [
              { value: 'yes', label: 'כן', labelEn: 'Yes' },
              { value: 'no', label: 'לא', labelEn: 'No' },
            ],
          },
          {
            id: 'insurance-details',
            type: 'text',
            label: 'אם כן, פרט:',
            labelEn: 'If yes, please specify:',
            required: false,
            maxLength: 500,
            condition: { fieldId: 'insurance-needed', value: 'yes' },
          },
        ],
      },
      {
        id: 'section-6',
        title: 'אבטחת נתונים',
        titleEn: 'Data Security',
        fields: [
          {
            id: 'data-security-measures',
            type: 'checkbox',
            label: 'בפרוטוקול המחקר קיימת התייחסות לאבטחת הנתונים שייאספו:',
            labelEn: 'The research protocol addresses data security measures:',
            required: true,
            options: [
              {
                value: 'coded-data',
                label: 'קידוד המידע הנאסף במחקר (מזוהה ומקודד או לא מזוהה)',
                labelEn: 'Data coding (identified and coded or non-identified)',
              },
              {
                value: 'no-identifying-info',
                label: 'אין פרטים מזהים על השאלונים',
                labelEn: 'No identifying information on questionnaires',
              },
              {
                value: 'coding-key-storage',
                label: 'הסבר על שמירת מפתח הקידוד',
                labelEn: 'Explanation of coding key storage',
              },
              {
                value: 'no-external-sharing',
                label: 'מצוין בפרוטוקול שאין למסור מידע לחברה מחוץ למרכז אקדמי לב כמידע מזוהה',
                labelEn: 'Protocol specifies that identified data cannot be shared with external companies',
              },
            ],
          },
        ],
      },
    ],
  }

  // Create the form config
  const form = await prisma.formConfig.create({
    data: {
      name: 'שאלון למגיש בקשה — מרץ 2026',
      nameEn: 'Researcher Questionnaire — March 2026',
      version: 1,
      schemaJson,
      instructionsHe,
      instructionsEn,
      attachmentsList,
      isActive: false,
      isPublished: false,
    },
  })

  console.log('✓ Created researcher questionnaire form:', form.id)
}
