import { DataSource } from 'typeorm';
import { Lesson } from '../../modules/lessons/entities/lesson.entity';
import { Chapter } from '../../modules/lessons/entities/chapter.entity';
import { Hotspot } from '../../modules/lessons/entities/hotspot.entity';
import { QuizQuestion } from '../../modules/quiz/entities/quiz-question.entity';

// Base URL for 3D model assets served by the NestJS static-files middleware.
// Models must be placed in  backend/public/models/
const MODEL_BASE = 'http://localhost:4000/static/models';

interface HotspotSeed {
  number: number;
  title: string;
  localizedTitle: Record<string, string>;
  description: string;
  localizedDescription: Record<string, string>;
}

interface ChapterSeed {
  orderIndex: number;
  title: string;
  localizedTitle: Record<string, string>;
  narrationText: string;
  localizedNarration: Record<string, string>;
  modelUrl?: string;
  hotspots: HotspotSeed[];
}

interface QuestionSeed {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface LessonSeed {
  slug: string;
  title: string;
  localizedTitle: Record<string, string>;
  category: 'menstrual_health' | 'hiv_sti' | 'anatomy' | 'mental_health' | 'relationships';
  durationMinutes: number;
  chapters: ChapterSeed[];
  questions: QuestionSeed[];
}

const SUPPORTED_LOCALES = ['en', 'fr', 'rw'] as const;

function normalizeLocalized(
  localized: Record<string, string>,
  fallback: string,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const value = localized[locale]?.trim();
    normalized[locale] = value && value.length > 0 ? value : fallback;
  }
  return normalized;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson 1 — Menstrual Health: Your Cycle, Explained
// ─────────────────────────────────────────────────────────────────────────────
const YOUR_CYCLE: LessonSeed = {
  slug: 'your_cycle',
  title: 'Your cycle, explained',
  localizedTitle: {
    en: 'Your cycle, explained',
    fr: 'Votre cycle, expliqué',
    rw: 'Incurane yawe, isobanurwa',
  },
  category: 'menstrual_health',
  durationMinutes: 8,
  chapters: [
    {
      orderIndex: 0,
      title: 'What is menstruation?',
      localizedTitle: {
        en: 'What is menstruation?',
        fr: "Qu'est-ce que la menstruation ?",
        rw: 'Incurane ni iki?',
      },
      narrationText:
        'The menstrual cycle is a monthly biological process in bodies with a uterus. It prepares the body for a possible pregnancy. A cycle usually lasts 21 to 35 days, with an average of 28 days. During each cycle the uterus lining the endometrium builds up and then sheds if no pregnancy occurs. This shedding is your period. Bleeding typically lasts 3 to 7 days. Hormones — including oestrogen, progesterone, LH, and FSH — control every phase of the cycle.',
      localizedNarration: {
        en: 'The menstrual cycle is a monthly biological process in bodies with a uterus. It prepares the body for a possible pregnancy. A cycle usually lasts 21 to 35 days, with an average of 28 days. During each cycle the uterus lining the endometrium builds up and then sheds if no pregnancy occurs. This shedding is your period. Bleeding typically lasts 3 to 7 days. Hormones — including oestrogen, progesterone, LH, and FSH — control every phase of the cycle.',
        fr: "Le cycle menstruel est un processus biologique mensuel dans les corps possédant un utérus. Il prépare le corps à une éventuelle grossesse. Un cycle dure généralement de 21 à 35 jours, avec une moyenne de 28 jours. Au cours de chaque cycle, la muqueuse utérine — l'endomètre s'épaissit puis se déverse si aucune grossesse ne survient. Cette desquamation est vos règles. Les saignements durent généralement 3 à 7 jours. Des hormones — notamment les œstrogènes, la progestérone, la LH et la FSH contrôlent chaque phase du cycle.",
        rw: "Incurane ni imikorere ya buri kwezi. Itegura umubiri kwakira inda. Imara iminsi 21-35. Umwenda wa nyababyeyi urasohoka niba nta nda. Imisemburo igenzura byose.",
      },
      hotspots: [],
    },
    {
      orderIndex: 1,
      title: 'The uterus and ovaries',
      localizedTitle: {
        en: 'The uterus and ovaries',
        fr: "L'utérus et les ovaires",
        rw: 'Imbeho n\'amagi',
      },
      narrationText:
        'The uterus is a pear-shaped muscular organ about the size of your fist. It sits in the lower abdomen between the bladder and rectum. Two ovaries each about the size of an almond sit on either side and produce eggs and hormones. Fallopian tubes connect the ovaries to the uterus. During ovulation, one ovary releases a single egg. The egg travels along the fallopian tube toward the uterus. If sperm fertilises the egg, it implants in the uterine lining and grows into a baby.',
      localizedNarration: {
        en: 'The uterus is a pear-shaped muscular organ about the size of your fist. It sits in the lower abdomen between the bladder and rectum. Two ovaries each about the size of an almond sit on either side and produce eggs and hormones. Fallopian tubes connect the ovaries to the uterus. During ovulation, one ovary releases a single egg. The egg travels along the fallopian tube toward the uterus. If sperm fertilises the egg, it implants in the uterine lining and grows into a baby.',
        fr: "L'utérus est un organe musculaire en forme de poire, de la taille d'un poing environ. Il se situe dans l'abdomen inférieur, entre la vessie et le rectum. Deux ovaires chacun de la taille d'une amande se trouvent de chaque côté et produisent des ovules et des hormones. Les trompes de Fallope relient les ovaires à l'utérus. Lors de l'ovulation, un ovaire libère un seul ovule. L'ovule se déplace le long de la trompe de Fallope vers l'utérus. Si un spermatozoïde féconde l'ovule, il s'implante dans la muqueuse utérine et se développe en bébé.",
        rw: "Nyababyeyi ni urugingo rw'imikaya. Intangangore ebyiri zitanga intanga n'imisemburo. Imiyoboro ihuza intangangore na nyababyeyi. Mu ovulation, intanga irekurwa. Niba ihuye n'intanga ngabo, ishobora gusama.",
      },
      modelUrl: `${MODEL_BASE}/uterus.glb`,
      hotspots: [
        {
          number: 1,
          title: 'Left ovary',
          localizedTitle: { en: 'Left ovary', fr: 'Ovaire gauche', rw: 'Reri ryo ibumoso' },
          description:
            'Each ovary contains hundreds of thousands of egg follicles from birth. During each cycle, hormones stimulate several follicles to grow. Usually only one matures fully and releases its egg at ovulation.',
          localizedDescription: {
            en: 'Each ovary contains hundreds of thousands of egg follicles from birth. During each cycle, hormones stimulate several follicles to grow. Usually only one matures fully and releases its egg at ovulation.',
            fr: "Chaque ovaire contient des centaines de milliers de follicules ovulaires dès la naissance. À chaque cycle, les hormones stimulent la croissance de plusieurs follicules. Généralement, un seul arrive à maturité complète et libère son ovule lors de l'ovulation.",
            rw: "Reri rimwe na rimwe rifite ibihumbi n'ibihumbi bya follicules z'amagi kuva kuvuka. Mu muzingo wose, horimone zitera follicules nyinshi gukura. Akenshi rimwe rukumbi rinogereza kandi risohora iryo jira mu gihe cy'ovulation.",
          },
        },
        {
          number: 2,
          title: 'Fallopian tube',
          localizedTitle: {
            en: 'Fallopian tube',
            fr: 'Trompe de Fallope',
            rw: 'Indangashuri',
          },
          description:
            'The fallopian tube is about 10 cm long and transports the egg from the ovary to the uterus. Tiny hair-like cilia lining the tube sweep the egg along. Fertilisation by sperm most often occurs in the outer third of the tube.',
          localizedDescription: {
            en: 'The fallopian tube is about 10 cm long and transports the egg from the ovary to the uterus. Tiny hair-like cilia lining the tube sweep the egg along. Fertilisation by sperm most often occurs in the outer third of the tube.',
            fr: "La trompe de Fallope mesure environ 10 cm de long et transporte l'ovule de l'ovaire vers l'utérus. De minuscules cils tapissant la trompe poussent l'ovule vers l'avant. La fécondation par le spermatozoïde se produit le plus souvent dans le tiers externe de la trompe.",
            rw: "Indangashuri ni sentimetri 10 ngo hafi kandi itwara iryo jira kuva ku reri kugera ku mbeho. Ibimera bito nk'ububyimbe bishukanya iryo jira imberi. Guhurira kw'indegimana n'iryo jira kenshi bihoraho mu gice cya gatatu cy'inyuma cy'indangashuri.",
          },
        },
        {
          number: 3,
          title: 'Uterine lining',
          localizedTitle: {
            en: 'Uterine lining',
            fr: 'Muqueuse utérine',
            rw: 'Umwenda w\'imbeho',
          },
          description:
            'The endometrium is the inner lining of the uterus. It thickens each cycle under the influence of oestrogen and progesterone. If a fertilised egg does not implant, progesterone drops and the lining sheds as a period.',
          localizedDescription: {
            en: 'The endometrium is the inner lining of the uterus. It thickens each cycle under the influence of oestrogen and progesterone. If a fertilised egg does not implant, progesterone drops and the lining sheds as a period.',
            fr: "L'endomètre est la muqueuse interne de l'utérus. Elle s'épaissit à chaque cycle sous l'influence des œstrogènes et de la progestérone. Si un ovule fécondé ne s'implante pas, la progestérone chute et la muqueuse se détache sous forme de règles.",
            rw: "Endometri ni umwenda wo mu nkomanzi y'imbeho. Wiyongera buri muzingo munsi y'ingaruka ya estrogene na progesiteron. Niba iryo jira rifashe ritihomba, progesiteron igabanuka kandi umwenda ugwa nk'imihango.",
          },
        },
        {
          number: 4,
          title: 'Cervix',
          localizedTitle: { en: 'Cervix', fr: 'Col de l\'utérus', rw: 'Umuhanda w\'imbeho' },
          description:
            'The cervix is the lower narrowing of the uterus that connects to the vagina. It produces mucus that changes texture through the cycle: thick and dry near menstruation, clear and stretchy at ovulation to help sperm travel.',
          localizedDescription: {
            en: 'The cervix is the lower narrowing of the uterus that connects to the vagina. It produces mucus that changes texture through the cycle: thick and dry near menstruation, clear and stretchy at ovulation to help sperm travel.',
            fr: "Le col de l'utérus est la partie inférieure rétrécie de l'utérus qui se relie au vagin. Il produit du mucus dont la texture change au cours du cycle : épais et sec près des règles, transparent et élastique à l'ovulation pour aider les spermatozoïdes à progresser.",
            rw: "Umuhanda w'imbeho ni igice cy'imbeho cyo hasi gifunganye gihuza inzira y'imbeho n'inzira y'amazi. Usohoz'imihendo hamwe n'ubushobozi bwayo buhinduka mu muzingo: gakomeye kandi gahwa hafi y'imihango, gasukuye kandi gashuguma mu gihe cy'ovulation kugira ngo indegimana zizenguruke.",
          },
        },
      ],
    },
    {
      orderIndex: 2,
      title: 'The 4 phases',
      localizedTitle: {
        en: 'The 4 phases',
        fr: 'Les 4 phases',
        rw: 'Ingingo 4',
      },
      narrationText:
        'Phase one: Menstruation days one to five. The endometrium sheds. Hormone levels are at their lowest. Phase two: Follicular days one to thirteen. FSH stimulates follicles in the ovaries to grow and produce oestrogen. The endometrium rebuilds. Phase three: Ovulation around day fourteen. A surge of LH triggers the release of a mature egg. This is the most fertile time. Phase four: Luteal — days fifteen to twenty-eight. The empty follicle becomes the corpus luteum and produces progesterone. If no fertilisation occurs, progesterone falls and menstruation begins again.',
      localizedNarration: {
        en: 'Phase one: Menstruation days one to five. The endometrium sheds. Hormone levels are at their lowest. Phase two: Follicular days one to thirteen. FSH stimulates follicles in the ovaries to grow and produce oestrogen. The endometrium rebuilds. Phase three: Ovulation around day fourteen. A surge of LH triggers the release of a mature egg. This is the most fertile time. Phase four: Luteal — days fifteen to twenty-eight. The empty follicle becomes the corpus luteum and produces progesterone. If no fertilisation occurs, progesterone falls and menstruation begins again.',
        fr: "Phase un : Menstruation jours un à cinq. L'endomètre se détache. Les taux hormonaux sont au plus bas. Phase deux : Folliculaire jours un à treize. La FSH stimule la croissance des follicules ovariens et la production d'œstrogènes. L'endomètre se reconstruit. Phase trois : Ovulation vers le quatorzième jour. Une montée de LH déclenche la libération d'un ovule mature. C'est la période la plus fertile. Phase quatre : Lutéale — jours quinze à vingt-huit. Le follicule vide devient le corps jaune et produit de la progestérone. Si aucune fécondation ne se produit, la progestérone chute et les règles recommencent.",
        rw: "Icyiciro 1: Imihango (iminsi 1-5). Umwenda usohoka. Icyiciro 2: Follicule. FSH itera gukura. Icyiciro 3: Ovulation (umunsi 14). Intanga irekurwa. Icyiciro 4: Luteale (iminsi 15-28). Progesterone iragabanyuka.",
      },
      hotspots: [],
    },
    {
      orderIndex: 3,
      title: 'Cramps & pain management',
      localizedTitle: {
        en: 'Cramps & pain management',
        fr: 'Crampes et gestion de la douleur',
        rw: 'Ububabare n\'uburyo bwo kubuvura',
      },
      narrationText:
        'Period cramps called dysmenorrhea are caused by prostaglandins, chemicals produced by the uterine lining. Prostaglandins trigger muscle contractions that help shed the endometrium. Effective relief options include: applying heat to the lower abdomen, taking ibuprofen or naproxen before pain peaks, gentle exercise such as walking or yoga, and staying hydrated. If cramps are severe enough to interfere with daily life or do not respond to these measures, see a health worker. Conditions like endometriosis can cause more intense pain and benefit from treatment.',
      localizedNarration: {
        en: 'Period cramps called dysmenorrhea are caused by prostaglandins, chemicals produced by the uterine lining. Prostaglandins trigger muscle contractions that help shed the endometrium. Effective relief options include: applying heat to the lower abdomen, taking ibuprofen or naproxen before pain peaks, gentle exercise such as walking or yoga, and staying hydrated. If cramps are severe enough to interfere with daily life or do not respond to these measures, see a health worker. Conditions like endometriosis can cause more intense pain and benefit from treatment.',
        fr: "Les crampes menstruelles appelées dysménorrhée sont causées par les prostaglandines, des substances chimiques produites par la muqueuse utérine. Les prostaglandines déclenchent des contractions musculaires qui facilitent la desquamation de l'endomètre. Les options de soulagement efficaces comprennent : l'application de chaleur sur le bas-ventre, la prise d'ibuprofène ou de naproxène avant que la douleur n'atteigne son pic, une activité physique douce comme la marche ou le yoga, et une bonne hydratation. Si les crampes sont assez sévères pour perturber la vie quotidienne ou ne répondent pas à ces mesures, consultez un professionnel de santé.",
        rw: "Ububabare buterwa na prostaglandins. Uburyo bwo kubugabanya: shyira ubushyuhe ku nda, fata ibuprofen, ukore siporo yoroshye, unywe amazi.",
      },
      hotspots: [],
    },
    {
      orderIndex: 4,
      title: 'Tracking your cycle',
      localizedTitle: {
        en: 'Tracking your cycle',
        fr: 'Suivre votre cycle',
        rw: 'Gukurikirana incurane yawe',
      },
      narrationText:
        'Tracking your cycle helps you understand your own body and predict when your next period will come. You can track using a simple calendar, a notebook, or a smartphone app. Record the first day of each period, how long it lasts, and any symptoms. Over three to six months, patterns emerge that show your typical cycle length and fertile window. Normal cycles range from 21 to 35 days. Cycles that are consistently shorter or longer, or very irregular, are worth discussing with a health worker. Tracking also helps you notice changes that may signal a health concern.',
      localizedNarration: {
        en: 'Tracking your cycle helps you understand your own body and predict when your next period will come. You can track using a simple calendar, a notebook, or a smartphone app. Record the first day of each period, how long it lasts, and any symptoms. Over three to six months, patterns emerge that show your typical cycle length and fertile window. Normal cycles range from 21 to 35 days. Cycles that are consistently shorter or longer, or very irregular, are worth discussing with a health worker.',
        fr: "Suivre votre cycle vous aide à comprendre votre propre corps et à prévoir quand vos prochaines règles arriveront. Vous pouvez le faire avec un simple calendrier, un cahier ou une application sur smartphone. Notez le premier jour de chaque période, sa durée et tout symptôme. Au bout de trois à six mois, des schémas apparaissent qui montrent la durée typique de votre cycle et votre fenêtre de fertilité. Les cycles normaux durent de 21 à 35 jours.",
        rw: "Gukurikirana ukwezi bigufasha kumenya umubiri wawe. Andika umunsi wa mbere, iminsi imara, n'ibimenyetso. Mu mezi 3-6, uzabona imiterere. Ukwezi gusanzwe kumara iminsi 21-35.",
      },
      hotspots: [],
    },
    {
      orderIndex: 5,
      title: 'Common myths',
      localizedTitle: {
        en: 'Common myths',
        fr: 'Mythes courants',
        rw: 'Ibintu bitinya byinshi',
      },
      narrationText:
        'Myth: You cannot swim or exercise during your period. Fact: Exercise can reduce cramp pain by increasing blood flow. Swimming is safe. Myth: Period blood is dirty or impure. Fact: Menstrual fluid is a normal mix of blood, endometrial tissue, and mucus. Myth: You cannot get pregnant during your period. Fact: Sperm can survive up to 5 days. If you have a short cycle, ovulation may happen shortly after bleeding ends. Myth: Irregular periods always mean something is wrong. Fact: Stress, travel, significant weight change, or illness can temporarily alter your cycle without indicating disease.',
      localizedNarration: {
        en: 'Myth: You cannot swim or exercise during your period. Fact: Exercise can reduce cramp pain by increasing blood flow. Swimming is safe. Myth: Period blood is dirty or impure. Fact: Menstrual fluid is a normal mix of blood, endometrial tissue, and mucus. Myth: You cannot get pregnant during your period. Fact: Sperm can survive up to 5 days.',
        fr: "Mythe : On ne peut pas nager ni faire d'exercice pendant ses règles. Réalité : l'exercice peut réduire les crampes en augmentant le flux sanguin. La natation est sans danger. Mythe : Le sang des règles est sale ou impur. Réalité : le flux menstruel est un mélange normal de sang, de tissu endométrial et de mucus. Mythe : On ne peut pas tomber enceinte pendant ses règles. Réalité : les spermatozoïdes peuvent survivre jusqu'à 5 jours.",
        rw: "Imyumvire itari yo: Ntubarwa koga mu mihango. Ukuri: Siporo igabanya ububabare. Imyumvire itari yo: Amaraso y'imihango ni amahambwe. Ukuri: Ni integanyo isanzwe.",
      },
      hotspots: [],
    },
  ],
  questions: [
    {
      questionText: 'How often does ovulation usually happen?',
      options: ['Every day', 'Once per menstrual cycle', 'Twice per month', 'Only during periods'],
      correctIndex: 1,
      explanation: 'Ovulation happens once per cycle, typically around day 14 of a 28-day cycle. It is triggered by a surge in LH (luteinizing hormone).',
    },
    {
      questionText: 'What causes period cramps?',
      options: ['Drinking cold water', 'Uterine contractions caused by prostaglandins', 'Not exercising enough', 'Eating spicy food'],
      correctIndex: 1,
      explanation: 'Prostaglandins trigger uterine muscle contractions that help shed the endometrial lining. Higher prostaglandin levels cause stronger cramps.',
    },
    {
      questionText: 'Which organ produces eggs?',
      options: ['Uterus', 'Cervix', 'Ovary', 'Fallopian tube'],
      correctIndex: 2,
      explanation: 'The ovaries produce and store eggs (ova). At ovulation, usually one egg is released each cycle.',
    },
    {
      questionText: 'How many phases does the menstrual cycle have?',
      options: ['2', '3', '4', '5'],
      correctIndex: 2,
      explanation: 'The four phases are: menstruation, follicular, ovulation, and luteal. Each is controlled by changing hormone levels.',
    },
    {
      questionText: 'What is the endometrium?',
      options: ['Outer layer of the ovary', 'Inner lining of the uterus', 'A type of hormone', 'The cervical canal'],
      correctIndex: 1,
      explanation: 'The endometrium is the inner lining of the uterus. It thickens each cycle and sheds if no pregnancy occurs, producing the menstrual flow.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Lesson 2 — HIV & STI: How HIV Works & Prevention
// ─────────────────────────────────────────────────────────────────────────────
const HIV_PREVENTION: LessonSeed = {
  slug: 'hiv_prevention',
  title: 'How HIV works & prevention',
  localizedTitle: {
    en: 'How HIV works & prevention',
    fr: 'Comment fonctionne le VIH et la prévention',
    rw: 'Uko VIH ikora n\'uburyo bwo kwirinda',
  },
  category: 'hiv_sti',
  durationMinutes: 12,
  chapters: [
    {
      orderIndex: 0,
      title: 'What is HIV?',
      localizedTitle: {
        en: 'What is HIV?',
        fr: 'Qu\'est-ce que le VIH ?',
        rw: 'SIDA ni iki?',
      },
      narrationText:
        'HIV stands for Human Immunodeficiency Virus. It is a virus that attacks the immune system, specifically CD4 T-cells — the white blood cells that lead the body\'s defence against infection. Without treatment, HIV slowly destroys these cells. Over many years, the immune system becomes too weak to fight common infections. This advanced stage is called AIDS — Acquired Immunodeficiency Syndrome. Importantly, modern antiretroviral therapy, called ART, can reduce the amount of HIV in the blood to an undetectable level. People on effective ART live long, healthy lives and cannot transmit the virus sexually.',
      localizedNarration: {
        en: 'HIV stands for Human Immunodeficiency Virus. It attacks the immune system, specifically CD4 T-cells. Without treatment, HIV slowly destroys the immune system. Modern antiretroviral therapy, ART, can reduce HIV to an undetectable level. People on effective ART live long, healthy lives and cannot transmit the virus sexually.',
        fr: "Le VIH signifie Virus de l'Immunodéficience Humaine. Il attaque le système immunitaire, en particulier les cellules CD4. Sans traitement, le VIH détruit lentement le système immunitaire. Le traitement antirétroviral moderne, ARV, peut réduire le VIH à un niveau indétectable. Les personnes sous ARV efficace vivent longtemps en bonne santé et ne peuvent pas transmettre le virus par voie sexuelle.",
        rw: "SIDA bivuga 'Human Immunodeficiency Virus', ni virusi iterana sisitemu yo kwirinda indwara, ikwamira inzobere za CD4. Nta bwirinzi, SIDA ica buhooro sisitemu yo kwirinda. Imiti ihuza ya antiretroviraux, ART, irashobora kugabanya SIDA kugeza ku rwego rudashobora kumenyekana. Abantu bafata ART neza babaho igihe kirekire nta ngwara kandi ntibasha gutera virusi ibyaha by'imibonano.",
      },
      hotspots: [],
    },
    {
      orderIndex: 1,
      title: 'How HIV spreads',
      localizedTitle: {
        en: 'How HIV spreads',
        fr: 'Comment le VIH se propage',
        rw: 'Uburyo SIDA ikwirakwira',
      },
      narrationText:
        'HIV is only transmitted through specific body fluids from a person who has HIV: blood, semen, vaginal and rectal fluids, and breast milk. The most common routes are unprotected sexual intercourse, sharing needles or syringes, and transmission from mother to child during pregnancy, birth, or breastfeeding. HIV is NOT transmitted through saliva, tears, sweat, urine, or by sharing food, hugging, handshaking, or insect bites. Understanding these routes helps remove fear and stigma.',
      localizedNarration: {
        en: 'HIV is only transmitted through specific body fluids: blood, semen, vaginal and rectal fluids, and breast milk. The most common routes are unprotected sex, sharing needles, and mother-to-child transmission. HIV is NOT spread by saliva, sweat, sharing food, hugging, or insect bites.',
        fr: "Le VIH ne se transmet que par des fluides corporels spécifiques : le sang, le sperme, les sécrétions vaginales et rectales, et le lait maternel. Les voies les plus courantes sont les rapports sexuels non protégés, le partage de seringues et la transmission de la mère à l'enfant. Le VIH ne se transmet PAS par la salive, la sueur, le partage de nourriture, les câlins ou les piqûres d'insectes.",
        rw: "SIDA ikwirakwizwa gusa binyuze mu mahindagurika y'umubiri mwihariye: amaraso, insiboro, amazi y'inzira y'imibonano, n'amata y'inda. Inzira zisanzwe ni imibonano itunganye nta firika, gutwana urushinge, no gutangirira no ku mwana. SIDA ntikwirakwizwa binyuze mu mararira, ubunabu, kurya hamwe, gusunika, cyangwa gufatwa n'inzoka.",
      },
      modelUrl: `${MODEL_BASE}/cd4-cell.glb`,
      hotspots: [
        {
          number: 1,
          title: 'Blood transmission',
          localizedTitle: {
            en: 'Blood transmission',
            fr: 'Transmission par le sang',
            rw: 'Gutera binyuze mu amaraso',
          },
          description:
            'Sharing needles, syringes, or other drug-use equipment with someone who has HIV can directly introduce the virus into your bloodstream. This is a high-risk route because HIV is present in high concentrations in blood.',
          localizedDescription: {
            en: 'Sharing needles or syringes with someone who has HIV introduces the virus directly into the bloodstream. Blood contains high HIV concentrations, making this a high-risk route.',
            fr: "Le partage d'aiguilles ou de seringues avec une personne vivant avec le VIH introduit directement le virus dans la circulation sanguine. Le sang contient de fortes concentrations de VIH, ce qui en fait une voie à haut risque.",
            rw: "Gutwana urushinge n'umuntu wufite SIDA yinjiza virusi mu maraso yawe. Amaraso afite imipaka myinshi ya SIDA, bityo iyi nzira iri mu nzira zifite ingaruka nini.",
          },
        },
        {
          number: 2,
          title: 'Sexual transmission',
          localizedTitle: {
            en: 'Sexual transmission',
            fr: 'Transmission sexuelle',
            rw: 'Gutera binyuze mu imibonano',
          },
          description:
            'Unprotected sexual contact is the most common HIV transmission route worldwide. HIV is present in semen and vaginal secretions. Condoms, when used correctly every time, reduce transmission risk by over 98%. Anal sex carries a higher risk than vaginal sex because the rectal lining is more fragile.',
          localizedDescription: {
            en: 'Unprotected sex is the most common HIV transmission route. HIV is in semen and vaginal fluids. Condoms used correctly every time reduce risk by over 98%. Anal sex has higher risk because the rectal lining is more fragile.',
            fr: "Les rapports sexuels non protégés sont la voie de transmission du VIH la plus courante dans le monde. Le VIH est présent dans le sperme et les sécrétions vaginales. Les préservatifs, utilisés correctement à chaque fois, réduisent le risque de transmission de plus de 98%.",
            rw: "Imibonano itunganye nta firika ni inzira isanzwe cyane yo gukwirakwiza SIDA ku isi. SIDA ibonetse mu insiboro n'amazi y'inzira y'imibonano. Firika ifashwe neza buri gihe igabanya ingaruka z'ibihumbi birenze 98%.",
          },
        },
        {
          number: 3,
          title: 'Mother-to-child',
          localizedTitle: {
            en: 'Mother-to-child',
            fr: 'De la mère à l\'enfant',
            rw: 'Kuva ku mubyeyi ngo ku mwana',
          },
          description:
            'A person with HIV can pass the virus to their baby during pregnancy, labour, or breastfeeding. However, with ART started early in pregnancy, the risk of transmission falls below 1%. Rwanda has near-zero rates of mother-to-child HIV transmission thanks to its Prevention of Mother-to-Child Transmission (PMTCT) programme.',
          localizedDescription: {
            en: 'HIV can pass from mother to baby during pregnancy, birth, or breastfeeding. With ART started early in pregnancy, the risk falls below 1%. Rwanda has near-zero mother-to-child transmission rates thanks to its PMTCT programme.',
            fr: "Le VIH peut passer de la mère à son bébé pendant la grossesse, l'accouchement ou l'allaitement. Avec un traitement ARV commencé tôt pendant la grossesse, le risque tombe en dessous de 1%. Le Rwanda a un taux de transmission de la mère à l'enfant quasi nul grâce à son programme PTME.",
            rw: "SIDA irashobora guturuka ku mubyeyi ngo kugera ku mwana mu gihe cyo gutwita, kuvuka, cyangwa konsa. Nta ART itangirwa hakiri kare mu gutwita, ingaruka zigwa munsi ya 1%. U Rwanda rufite imipaka iri hafi ya zero yo gutera inzira ya nyina kugeza ku mwana kubera porogaramu ya PMTCT.",
          },
        },
      ],
    },
    {
      orderIndex: 2,
      title: 'Prevention methods',
      localizedTitle: {
        en: 'Prevention methods',
        fr: 'Méthodes de prévention',
        rw: 'Uburyo bwo kwirinda',
      },
      narrationText:
        'The most effective prevention strategies are: One — use condoms correctly every time. Male and female condoms both work. Two — know your status and your partner\'s status through regular HIV testing. Three — if you are HIV-negative and at substantial risk, talk to a health worker about PrEP. PrEP is a daily pill that prevents HIV infection by over 99% when taken consistently. Four — if you think you were recently exposed to HIV, seek PEP within 72 hours. PEP is a course of ART that can prevent infection if started quickly. Five — if you inject drugs, only use sterile equipment. All these services are free at Rwanda\'s public health centres.',
      localizedNarration: {
        en: 'Use condoms correctly every time. Know your status through regular testing. If at high risk, ask about PrEP — a daily pill that prevents HIV by over 99%. If recently exposed, seek PEP within 72 hours. Avoid sharing needles. All these services are free at Rwanda public health centres.',
        fr: "Utilisez des préservatifs correctement à chaque fois. Connaissez votre statut grâce à des tests réguliers. Si vous êtes à haut risque, renseignez-vous sur le PrEP — une pilule quotidienne qui prévient le VIH à plus de 99%. En cas d'exposition récente, demandez le PEP dans les 72 heures. Évitez le partage d'aiguilles. Tous ces services sont gratuits dans les centres de santé publics du Rwanda.",
        rw: "Koresha firika neza buri gihe. Menya inkomoko yawe binyuze mu kwipimisha buri gihe. Niba uri hafi y'ingaruka nini, baza ku PrEP — inkingi yo buri munsi irinda SIDA birenze 99%. Niba wabashye guterwa vuba, shaka PEP mu masaha 72. Wirinde gutwana urushinge. Serivisi zose ziri ku buntu mu buvuzi bwa leta bw'u Rwanda.",
      },
      hotspots: [],
    },
    {
      orderIndex: 3,
      title: 'ART & living with HIV',
      localizedTitle: {
        en: 'ART & living with HIV',
        fr: 'ARV et vivre avec le VIH',
        rw: 'ART no kubana na SIDA',
      },
      narrationText:
        'Antiretroviral therapy, ART, is a combination of medications that stop HIV from reproducing in the body. When taken daily as prescribed, ART reduces the viral load — the amount of HIV in the blood — to an undetectable level. An undetectable viral load means the immune system can recover and function normally. It also means that HIV cannot be sexually transmitted: this is known as Undetectable Equals Untransmittable, or U equals U. In Rwanda, ART is free for all people living with HIV and is available at all health centres and district hospitals. Regular CD4 count and viral load tests monitor treatment effectiveness.',
      localizedNarration: {
        en: 'ART medications stop HIV from reproducing. When taken daily, ART makes viral load undetectable. Undetectable = Untransmittable (U=U). In Rwanda, ART is free at all health centres. Regular CD4 and viral load tests monitor treatment.',
        fr: "Les médicaments ARV empêchent le VIH de se reproduire. Pris quotidiennement, les ARV rendent la charge virale indétectable. Indétectable = Intransmissible (I=I). Au Rwanda, les ARV sont gratuits dans tous les centres de santé.",
        rw: "Imiti ya ART ihagarika SIDA gukoza. Ifatwa buri munsi, ART itera virusi kudashobora kumenyekana. Kudashobora kumenyekana = Kudashobora gutera (U=U). Mu Rwanda, ART iratangirwa Ubuntu mu buvuzi bwose.",
      },
      hotspots: [],
    },
    {
      orderIndex: 4,
      title: 'Testing & stigma',
      localizedTitle: {
        en: 'Testing & reducing stigma',
        fr: 'Dépistage et réduction de la stigmatisation',
        rw: 'Kwipimisha no kugabanya isoni',
      },
      narrationText:
        'HIV testing is the only way to know your status. In Rwanda, testing is free, confidential, and available at all health centres. Community testing reaches schools, markets, and workplaces. Home self-test kits are also available at pharmacies. Knowing your status whether positive or negative empowers you to protect your health and the health of others. HIV-related stigma — negative attitudes towards people living with HIV is one of the biggest barriers to testing and treatment. Stigma is based on misinformation. HIV is a manageable medical condition, not a moral failing.',
      localizedNarration: {
        en: 'HIV testing is free and confidential in Rwanda. Community testing reaches schools and markets. Knowing your status protects you and others. HIV stigma is based on misinformation  HIV is a manageable condition, not a moral failing.',
        fr: "Le dépistage du VIH est gratuit et confidentiel au Rwanda. Le dépistage communautaire atteint les écoles et les marchés. Connaître votre statut vous protège, vous et les autres. La stigmatisation liée au VIH repose sur des informations erronées le VIH est une maladie gérable, pas un échec moral.",
        rw: "Kwipimisha SIDA biratangirwa Ubuntu kandi ni ibanga mu Rwanda. Kwipimisha kw'umudugudu kugeraho amashuri n'imirimo. Kumenya inkomoko yawe kukurinda nawe n'abandi. Isoni y'ibyerekeranye na SIDA bishingiye ku makosa SIDA ni indwara ishobora gufatwa neza, si ikosa ry'imico.",
      },
      hotspots: [],
    },
  ],
  questions: [
    {
      questionText: 'What does HIV stand for?',
      options: ['Human Immunodeficiency Virus', 'High Infection Viral', 'Health Impact Virus', 'Human Intestinal Virus'],
      correctIndex: 0,
      explanation: 'HIV = Human Immunodeficiency Virus. It attacks CD4 T-cells, which are essential for the immune system.',
    },
    {
      questionText: 'HIV can be spread by:',
      options: ['Sharing food', 'Mosquito bites', 'Hugging', 'Unprotected sexual intercourse'],
      correctIndex: 3,
      explanation: 'HIV spreads through specific body fluids. Sharing food, insect bites, and hugging do NOT transmit HIV.',
    },
    {
      questionText: 'Which daily medication prevents HIV in HIV-negative people?',
      options: ['Aspirin', 'PrEP', 'Antihistamine', 'Paracetamol'],
      correctIndex: 1,
      explanation: 'PrEP (Pre-Exposure Prophylaxis) is a daily medication that reduces HIV risk by over 99% when taken consistently.',
    },
    {
      questionText: 'Which cells does HIV primarily attack?',
      options: ['Red blood cells', 'Platelets', 'CD4 T-cells', 'Bone marrow cells'],
      correctIndex: 2,
      explanation: 'HIV targets CD4 T-cells, essential for directing the immune response against infections.',
    },
    {
      questionText: 'What does U=U mean in HIV care?',
      options: [
        'Untested equals unsafe',
        'Undetectable viral load means the virus cannot be sexually transmitted',
        'Universal treatment equals universal cure',
        'Undetectable means uninfected',
      ],
      correctIndex: 1,
      explanation: 'U=U (Undetectable = Untransmittable) means a person on effective ART with an undetectable viral load cannot sexually transmit HIV.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Lesson 3 — Anatomy: Reproductive Anatomy 101
// ─────────────────────────────────────────────────────────────────────────────
const ANATOMY_101: LessonSeed = {
  slug: 'anatomy_101',
  title: 'Reproductive anatomy 101',
  localizedTitle: {
    en: 'Reproductive anatomy 101',
    fr: 'Anatomie reproductive 101',
    rw: 'Imiterere y’imyanya myibarukiro 101',
  },
  category: 'anatomy',
  durationMinutes: 10,
  chapters: [
    {
      orderIndex: 0,
      title: 'Introduction',
      localizedTitle: {
        en: 'Introduction',
        fr: 'Introduction',
        rw: 'Intangiriro',
      },
      narrationText:
        'Reproductive anatomy refers to the organs involved in sexual reproduction. Understanding your own anatomy — and basic anatomy of others — is fundamental to sexual health literacy. It helps you make informed decisions, recognise when something feels wrong, and communicate with healthcare providers. All bodies deserve respect and understanding. Anatomy varies between individuals, and there is no single "normal." In this lesson we explore the female and male reproductive systems and how fertilisation occurs.',
      localizedNarration: {
        en: 'Reproductive anatomy refers to the organs involved in sexual reproduction. Understanding anatomy is fundamental to sexual health literacy and helps you make informed decisions and communicate with healthcare providers.',
        fr: "L'anatomie reproductive désigne les organes impliqués dans la reproduction sexuelle. Comprendre l'anatomie est fondamental pour la littératie en matière de santé sexuelle et vous aide à prendre des décisions éclairées et à communiquer avec les professionnels de santé.",
        rw: "Ubwuzuzanye bwo kubyara bivuga ingingo zikoreshwa mu kubyara. Gusobanukirwa ubwuzuzanye ni ingenzi mu iterambere ry'ubuzima bw'imibonano kandi bigufasha gufata ibyemezo byihesha kandi gutumanahana n'inzobere mu buzima.",
      },
      hotspots: [],
    },
    {
      orderIndex: 1,
      title: 'Female reproductive system',
      localizedTitle: {
        en: 'Female reproductive system',
        fr: 'Système reproducteur féminin',
        rw: 'Sisitemu yo kubyara y\'abagore',
      },
      narrationText:
        'The female reproductive system includes internal and external structures. Internally: the ovaries produce eggs and the hormones oestrogen and progesterone. The fallopian tubes transport eggs from the ovaries to the uterus. The uterus is where a baby develops during pregnancy. The cervix is the lower, narrow end of the uterus, opening into the vagina. Externally: the vulva includes the labia majora, labia minora, clitoris, and the vaginal opening. The clitoris is a highly sensitive structure with the primary function of sexual pleasure. The vagina is a muscular canal that connects the uterus to the outside, serves as the birth canal, and receives the penis during sexual intercourse.',
      localizedNarration: {
        en: 'The female reproductive system includes ovaries, fallopian tubes, uterus, cervix, and vagina. Ovaries produce eggs and hormones. The fallopian tubes carry eggs to the uterus. The uterus is where a baby develops. The cervix connects the uterus to the vagina. The external vulva includes labia, clitoris, and vaginal opening.',
        fr: "Le système reproducteur féminin comprend les ovaires, les trompes de Fallope, l'utérus, le col de l'utérus et le vagin. Les ovaires produisent des ovules et des hormones. Les trompes transportent les ovules vers l'utérus. L'utérus est l'endroit où un bébé se développe. Le col relie l'utérus au vagin. La vulve externe comprend les lèvres, le clitoris et l'ouverture vaginale.",
        rw: "Sisitemu yo kubyara y'abagore irimo amagi, indangashuri, imbeho, umuhanda w'imbeho, n'inzira y'amazi. Amagi asohora amagi n'horimone. Indangashuri zitwarira amagi ku mbeho. Imbeho ni aho umwana akura. Umuhanda w'imbeho uhuza imbeho n'inzira y'amazi. Inyuma harimo ibibabi, clitoris, n'urubramo rw'inzira y'amazi.",
      },
      modelUrl: `${MODEL_BASE}/female-anatomy.glb`,
      hotspots: [
        {
          number: 1,
          title: 'Ovaries',
          localizedTitle: { en: 'Ovaries', fr: 'Ovaires', rw: 'Amagi' },
          description:
            'The two ovaries are each about the size of an almond. They contain all the eggs a person will ever have — about one million at birth, declining to 300,000–400,000 at puberty. Each month, hormones stimulate several follicles; usually one releases a mature egg at ovulation.',
          localizedDescription: {
            en: 'Two almond-sized ovaries contain all lifetime eggs — about 1 million at birth, 300,000–400,000 at puberty. Monthly hormones stimulate follicles; one releases a mature egg at ovulation.',
            fr: "Les deux ovaires de la taille d'une amande contiennent tous les ovules de toute une vie — environ 1 million à la naissance, 300 000 à 400 000 à la puberté. Les hormones mensuelles stimulent les follicules ; l'un libère un ovule mature à l'ovulation.",
            rw: "Amagi abiri angana n'inzugi y'umunyu yuzuyemo amagi yose y'ubuzima — nko miliyoni 1 ku ivuka, ibihumbi 300,000–400,000 ku bukurikiro. Horimone z'ukwezi zitera follicules; rimwe risohora iryo jira rinozaho mu gihe cy'ovulation.",
          },
        },
        {
          number: 2,
          title: 'Uterus',
          localizedTitle: { en: 'Uterus', fr: 'Utérus', rw: 'Imbeho' },
          description:
            'The uterus is a hollow, muscular organ roughly the size of a pear about 7.5 cm tall and 5 cm wide — that expands dramatically during pregnancy. Its thick muscular walls are responsible for labour contractions. The inner lining, the endometrium, sheds monthly if no pregnancy occurs.',
          localizedDescription: {
            en: 'A pear-sized hollow muscular organ (7.5 cm tall, 5 cm wide) that expands greatly during pregnancy. Its walls contract during labour. The endometrium lining sheds monthly without pregnancy.',
            fr: "Un organe musculaire creux de la taille d'une poire (7,5 cm de hauteur, 5 cm de largeur) qui s'agrandit considérablement pendant la grossesse. Ses parois se contractent pendant le travail. La muqueuse endométriale se détache chaque mois sans grossesse.",
            rw: "Urubundo rufite ishusho y'ikinafu rufite ubusa rungana n'ikinafu (7.5 cm uburebure, 5 cm ubugari) rukaziga bikomeye mu gutwita. Inziga z'inyuma zazo zikora mu gihe cy'accouchement. Endometri igwa buri kwezi nta gutwita.",
          },
        },
        {
          number: 3,
          title: 'Cervix',
          localizedTitle: { en: 'Cervix', fr: 'Col de l\'utérus', rw: 'Umuhanda w\'imbeho' },
          description:
            'The cervix is the lower, narrow passage between the uterus and vagina. It produces cervical mucus that varies with the cycle. During labour, the cervix dilates to allow the baby to pass through. Regular cervical cancer screening (Pap smear) is recommended every 3–5 years for people with a cervix over age 25.',
          localizedDescription: {
            en: 'The narrow passage between uterus and vagina. Produces cycle-varying mucus. Dilates during labour. Pap smear screening every 3–5 years (after age 25) is recommended.',
            fr: "Le passage étroit entre l'utérus et le vagin. Produit un mucus variable selon le cycle. Se dilate pendant le travail. Le dépistage par frottis tous les 3 à 5 ans (après 25 ans) est recommandé.",
            rw: "Inzira yoroshye hagati y'imbeho n'inzira y'amazi. Isohora imihendo ihinduka ukurikije incurane. Ifunguka mu gihe cy'accouchement. Kwipimisha cancer ya col tous les 3–5 ans (nyuma y'imyaka 25) birasabwa.",
          },
        },
        {
          number: 4,
          title: 'Vagina',
          localizedTitle: { en: 'Vagina', fr: 'Vagin', rw: 'Inzira y\'amazi' },
          description:
            'The vagina is a flexible, muscular tube about 8–12 cm long that connects the cervix to the outside of the body. It has a naturally acidic environment (pH 3.8–4.5) that helps protect against infection. During sexual arousal, the walls produce lubrication. The vagina serves as the birth canal and the passage for menstrual flow.',
          localizedDescription: {
            en: 'A flexible 8–12 cm muscular tube connecting cervix to the outside. Naturally acidic (pH 3.8–4.5) to protect against infection. Lubricates during arousal. Serves as birth canal and menstrual passage.',
            fr: "Un tube musculaire flexible de 8 à 12 cm reliant le col à l'extérieur. Naturellement acide (pH 3,8–4,5) pour se protéger des infections. Se lubrifie lors de l'excitation. Sert de canal de naissance et de passage menstruel.",
            rw: "Inzira y'imitsi yoroshye ya 8–12 cm ihuza umuhanda w'imbeho n'inyuma. Acidic (pH 3.8–4.5) ku kamere kugirango irinde indwara. Isohora amazi mu gihe cy'impuhwe. Ikoreshwa mu kuvuka no ku nzira y'imihango.",
          },
        },
      ],
    },
    {
      orderIndex: 2,
      title: 'Male reproductive system',
      localizedTitle: {
        en: 'Male reproductive system',
        fr: 'Système reproducteur masculin',
        rw: 'Sisitemu yo kubyara y\'abagabo',
      },
      narrationText:
        'The male reproductive system produces, stores, and delivers sperm. The testes — two oval glands in the scrotum — produce sperm and testosterone. Sperm mature in the epididymis, which sits behind each testis, taking about two weeks. During ejaculation, sperm travel through the vas deferens to the urethra. The seminal vesicles and prostate gland add fluid that nourishes sperm and gives semen its characteristic composition. A healthy ejaculation contains 40 million to 1.2 billion sperm. The penis delivers semen during sexual intercourse. The urethra passes through the penis and carries both urine and semen — but not simultaneously.',
      localizedNarration: {
        en: 'The male reproductive system produces sperm and testosterone. Testes produce sperm in the scrotum. Sperm mature in the epididymis (2 weeks). During ejaculation, sperm travel through vas deferens to the urethra. Prostate and seminal vesicles add fluid. 40 million to 1.2 billion sperm per ejaculation.',
        fr: "Le système reproducteur masculin produit des spermatozoïdes et de la testostérone. Les testicules produisent les spermatozoïdes dans le scrotum. Les spermatozoïdes mûrissent dans l'épididyme (2 semaines). Lors de l'éjaculation, les spermatozoïdes passent par le canal déférent jusqu'à l'urètre. La prostate et les vésicules séminales ajoutent du liquide.",
        rw: "Sisitemu yo kubyara y'abagabo isohora indegimana na testosteron. Uburo busohora indegimana mu nkota. Indegimana zinozaho mu epididyme (ibyumweru 2). Mu gihe cy'isohora, indegimana zinyuramo vas deferens kugeza mu nzira y'amazi. Prostate n'ibigo bya seminal vesicles bibubuza amazi.",
      },
      modelUrl: `${MODEL_BASE}/male-anatomy.glb`,
      hotspots: [
        {
          number: 1,
          title: 'Testes',
          localizedTitle: { en: 'Testes', fr: 'Testicules', rw: 'Uburo' },
          description:
            'The testes are two oval glands housed in the scrotum. They produce about 200–300 million sperm per day and the hormone testosterone. The scrotum keeps the testes 2–3°C cooler than core body temperature, which is necessary for normal sperm production.',
          localizedDescription: {
            en: 'Two oval glands in the scrotum producing 200–300 million sperm/day and testosterone. The scrotum keeps testes 2–3°C cooler than body temperature for optimal sperm production.',
            fr: "Deux glandes ovales dans le scrotum produisant 200 à 300 millions de spermatozoïdes par jour et de la testostérone. Le scrotum maintient les testicules 2 à 3°C plus frais que la température corporelle pour une production optimale de spermatozoïdes.",
            rw: "Ibigo bibiri by'indege byose mu nkota bisohora indegimana ibihumbi 200–300 miliyoni buri munsi na testosteron. Inkota iguma uburo bwohesha igihe 2–3°C ikonje kurenza ubushyuhe bw'umubiri kugira ngo indegimana zisohore neza.",
          },
        },
        {
          number: 2,
          title: 'Epididymis',
          localizedTitle: { en: 'Epididymis', fr: 'Épididyme', rw: 'Indangashuri y\'uburo' },
          description:
            'The epididymis is a long coiled tube that sits on the back of each testis. Sperm spend about 2–3 weeks here, gaining the ability to move and fertilise an egg. Mature sperm are stored here until ejaculation.',
          localizedDescription: {
            en: 'A coiled tube on the back of each testis where sperm mature over 2–3 weeks and gain the ability to move and fertilise. Mature sperm are stored here until ejaculation.',
            fr: "Un tube enroulé à l'arrière de chaque testicule où les spermatozoïdes mûrissent pendant 2 à 3 semaines et acquièrent la capacité de se déplacer et de féconder. Les spermatozoïdes matures y sont stockés jusqu'à l'éjaculation.",
            rw: "Inzobere yandaguye inyuma y'uburo bukajya aho indegimana zinozaho mu byumweru 2–3 kandi zihabwa ubushobozi bwo guturutsa no guhurira. Indegimana zinozaho zibaniriwe aho kugeza isohoka.",
          },
        },
        {
          number: 3,
          title: 'Prostate gland',
          localizedTitle: { en: 'Prostate gland', fr: 'Glande prostatique', rw: 'Umutima w\'indegimana' },
          description:
            'The prostate gland is a walnut-sized organ that surrounds the urethra below the bladder. It produces a slightly alkaline fluid that makes up about 20–30% of semen and helps neutralise the acidic environment of the vagina. Regular prostate health checks are recommended after age 50.',
          localizedDescription: {
            en: 'Walnut-sized organ around the urethra below the bladder. Produces alkaline fluid (20–30% of semen) that neutralises vaginal acidity. Health checks recommended after age 50.',
            fr: "Organe de la taille d'une noix entourant l'urètre sous la vessie. Produit un liquide alcalin (20 à 30% du sperme) qui neutralise l'acidité vaginale. Contrôles de santé recommandés après 50 ans.",
            rw: "Ingingo ingana n'ikirahure cy'ibinure izengurutse inzira y'amazi munsi ya bagiteri. Isohora amazi atomere (20–30% y'insiboro) itera kugabanya acidique ya vaginal. Kwipimisha gusabwa nyuma y'imyaka 50.",
          },
        },
      ],
    },
    {
      orderIndex: 3,
      title: 'Fertilisation & conception',
      localizedTitle: {
        en: 'Fertilisation & conception',
        fr: 'Fécondation et conception',
        rw: 'Guhurira no gutwita',
      },
      narrationText:
        'Fertilisation occurs when a sperm cell successfully penetrates and fuses with an egg. During sexual intercourse, millions of sperm are released and begin swimming toward the egg. Only a few hundred reach the fallopian tube, and usually only one successfully fertilises the egg. The fertilised egg — now called a zygote — begins dividing as it travels down the fallopian tube. After about 6–10 days, it reaches the uterus and implants into the endometrium. Implantation triggers the production of human chorionic gonadotropin, or hCG — the hormone detected by pregnancy tests.',
      localizedNarration: {
        en: 'Fertilisation occurs when one sperm penetrates an egg, usually in the fallopian tube. The fertilised egg (zygote) divides as it travels to the uterus, implanting in the endometrium 6–10 days later. Implantation triggers hCG production — the hormone detected by pregnancy tests.',
        fr: "La fécondation se produit lorsqu'un spermatozoïde pénètre dans un ovule, généralement dans la trompe de Fallope. L'ovule fécondé (zygote) se divise en se déplaçant vers l'utérus et s'implante dans l'endomètre 6 à 10 jours plus tard. L'implantation déclenche la production d'hCG l'hormone détectée par les tests de grossesse.",
        rw: "Guhurira bituruka igihe indegimana imwe yinjira mu jira, akenshi mu indangashuri. Iryo jira rifashe (zygote) rigabanyagabanyaho irigendera ku mbeho kandi rihomba mu endometri nyuma y'iminsi 6–10. Ihomba ryateza isohoka rya hCG — horimone imenywa n'ibipimisho bya gestation.",
      },
      hotspots: [],
    },
    {
      orderIndex: 4,
      title: 'Hormones & puberty',
      localizedTitle: {
        en: 'Hormones & puberty',
        fr: 'Hormones et puberté',
        rw: 'Horimone n\'ubukurikiro',
      },
      narrationText:
        'Puberty is the period of physical change when a child\'s body develops reproductive capacity, driven by hormones. The hypothalamus in the brain begins secreting GnRH, which triggers the pituitary gland to release FSH and LH. In bodies with ovaries, these hormones stimulate oestrogen production, triggering breast development, widening of the hips, pubic hair growth, and eventually the first menstrual period. In bodies with testes, LH stimulates testosterone production, causing testicular growth, deepening of the voice, body and facial hair, growth of the penis, and the ability to ejaculate. Puberty typically begins between ages 8 and 13 for females and 9 and 14 for males.',
      localizedNarration: {
        en: 'Puberty is driven by GnRH from the hypothalamus, triggering FSH and LH from the pituitary. In females, oestrogen causes breast development, hip widening, pubic hair, and first period. In males, testosterone causes testicular growth, voice deepening, body hair, and ejaculation ability. Puberty begins 8 to 13 (females) or 9 to 14 (males).',
        fr: "La puberté est déclenchée par la GnRH de l'hypothalamus, stimulant la FSH et la LH de l'hypophyse. Chez les femmes, les œstrogènes provoquent le développement des seins, l'élargissement des hanches, la pilosité pubienne et les premières règles. Chez les hommes, la testostérone entraîne la croissance testiculaire, l'approfondissement de la voix, la pilosité corporelle.",
        rw: "Ubukurikiro bushimangwa na GnRH y'hypothalamus, itera FSH na LH z'umuzinga. Mu bagore, estrogene itera gukura kw'amabere, kwaguka kw'amahanda, imisatsi y'amahana, n'imihango ya mbere. Mu bagabo, testosteron itera gukura kw'uburo, guterura k'ijwi, imisatsi y'umubiri. Ubukurikiro butangira imyaka 8 to 13 (abagore) cyangwa 9 to 14 (abagabo).",
      },
      hotspots: [],
    },
  ],
  questions: [
    {
      questionText: 'Where does fertilisation usually occur?',
      options: ['In the uterus', 'In the fallopian tube', 'In the ovary', 'In the cervix'],
      correctIndex: 1,
      explanation: 'Fertilisation typically takes place in the outer third of the fallopian tube, where the egg and sperm meet shortly after ovulation.',
    },
    {
      questionText: 'Which hormone is primarily produced by the testes?',
      options: ['Oestrogen', 'Progesterone', 'Testosterone', 'Oxytocin'],
      correctIndex: 2,
      explanation: 'The testes produce testosterone, the primary male sex hormone responsible for sperm production, muscle development, and secondary sex characteristics.',
    },
    {
      questionText: 'What is the function of the endometrium?',
      options: [
        'Produces eggs',
        'Produces cervical mucus',
        'Thickens each cycle to receive a fertilised egg',
        'Carries sperm to the egg',
      ],
      correctIndex: 2,
      explanation: 'The endometrium (uterine lining) thickens each cycle under hormonal influence to receive a fertilised egg. If no egg implants, it sheds as a period.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Lesson 4 — Menstrual Health: Flow & Cramps Tracker
// ─────────────────────────────────────────────────────────────────────────────
const CRAMPS_FLOW: LessonSeed = {
  slug: 'cramps_flow',
  title: 'Tracking cramps & flow',
  localizedTitle: {
    en: 'Tracking cramps & flow',
    fr: 'Suivre les crampes et les flux',
    rw: 'Gukurikirana ububabare n\'ubwinshi bw\'imihango',
  },
  category: 'menstrual_health',
  durationMinutes: 6,
  chapters: [
    {
      orderIndex: 0,
      title: 'Why track?',
      localizedTitle: { en: 'Why track?', fr: 'Pourquoi suivre ?', rw: 'Kuki gukurikirana?' },
      narrationText:
        'Tracking your menstrual flow and cramp intensity helps you identify your personal patterns. Many people notice that flow heaviness and pain levels vary predictably across cycles. With a few months of tracking, you can anticipate heavier days, plan activities accordingly, and recognise changes that might indicate a health issue. Tracking is also valuable when speaking with a healthcare provider — it gives them accurate information about your cycle.',
      localizedNarration: {
        en: 'Tracking flow and cramps helps identify personal patterns. After a few months, you can anticipate heavier days and notice changes signalling health issues. It also helps healthcare providers understand your cycle.',
        fr: "Suivre les flux et les crampes aide à identifier les schémas personnels. Après quelques mois, vous pouvez anticiper les jours plus importants et remarquer des changements signalant des problèmes de santé.",
        rw: "Gukurikirana umubare n'ububabare bigufasha kumenya imiterere y'umuntu ku giti cye. Nyuma y'amezi make, ushobora guhanura iminsi mibi kandi ukamenya impinduka zerekana ibibazo by'ubuzima.",
      },
      hotspots: [],
    },
    {
      orderIndex: 1,
      title: 'Types of flow',
      localizedTitle: {
        en: 'Types of flow',
        fr: 'Types de flux',
        rw: 'Ubwoko bw\'umubare',
      },
      narrationText:
        'Menstrual flow varies from person to person and cycle to cycle. Light flow typically requires one pad or tampon per day. Moderate flow requires a change every 3–4 hours. Heavy flow requires changing every 1–2 hours or using a menstrual cup. Losing more than 80 millilitres of blood per cycle roughly equivalent to soaking through a pad or tampon more often than every hour — is considered heavy menstrual bleeding. This can cause anaemia and warrants medical evaluation. Colour varies normally from bright red to dark brown throughout the period; dark brown blood at the start or end is older blood — perfectly normal.',
      localizedNarration: {
        en: 'Light flow: one pad/tampon per day. Moderate: change every 3 to 4 hours. Heavy: change every 1–2 hours. More than 80 mL per cycle is heavy bleeding can cause anaemia and needs evaluation. Dark brown blood at start or end is normal older blood.',
        fr: "Flux léger : un protège-slip par jour. Modéré : changement toutes les 3 à 4 heures. Abondant : changement toutes les 1 à 2 heures. Plus de 80 ml par cycle est un saignement abondant pouvant causer une anémie. Le sang brun foncé en début ou en fin de cycle est normal.",
        rw: "Umubare muto: serivite imwe ku munsi. Umubare usanzwe: guhindura saa 3 to 4. Umubare munini: guhindura saa 1–2. Hejuru ya 80 mL buri muzingo ni amaraso menshi irashobora gutera anemie kandi igomba gusuzumwa. Amaraso y'ibara ry'ibibabi ku ntangiriro cyangwa ku mpera ni amaraso asanzwe mashaje.",
      },
      hotspots: [],
    },
    {
      orderIndex: 2,
      title: 'Managing cramps',
      localizedTitle: {
        en: 'Managing cramps',
        fr: 'Gérer les crampes',
        rw: 'Gucunga ububabare',
      },
      narrationText:
        'Heat therapy is one of the most effective non-medication approaches to period pain. A hot water bottle or heating pad applied to the lower abdomen for 15–20 minutes relaxes uterine muscles. Ibuprofen and naproxen sodium are anti-inflammatory drugs that reduce prostaglandin production. Starting them one to two days before your period or at the first sign of pain is more effective than waiting. Gentle exercise yoga, walking, swimming releases endorphins and reduces prostaglandin levels. Magnesium-rich foods like leafy greens, nuts, and seeds may also reduce cramping. If over-the-counter medication and home remedies are not sufficient, a doctor can discuss hormonal options or investigate underlying conditions.',
      localizedNarration: {
        en: 'Heat therapy (hot water bottle 15 to 20 minutes) relaxes uterine muscles. Ibuprofen or naproxen taken before pain peaks is most effective. Gentle exercise releases endorphins. Magnesium-rich foods may reduce cramping. If home remedies fail, see a doctor for hormonal options or further investigation.',
        fr: "La thermothérapie (bouillotte 15 à 20 minutes) détend les muscles utérins. L'ibuprofène ou le naproxène pris avant le pic de douleur est plus efficace. L'exercice doux libère des endorphines. Les aliments riches en magnésium peuvent réduire les crampes.",
        rw: "Ubushyuhe bwo gufasha (karima y'amazi ashyuha iminota 15 to 20) biranyuranya imitsi y'imbeho. Ibuprofen cyangwa naproxen gafatwa mbere y'ibibazo biremereye ni byiza. Siporo nziza isohora endorphines. Ibiryo bifite magnesium birashobora kugabanya ububabare.",
      },
      hotspots: [],
    },
  ],
  questions: [
    {
      questionText: 'What is the recommended approach to manage period cramps before pain peaks?',
      options: ['Wait until the pain is severe', 'Take ibuprofen or naproxen early', 'Drink cold water', 'Avoid all exercise'],
      correctIndex: 1,
      explanation: 'Starting anti-inflammatory medication like ibuprofen 1 to 2 days before the period or at first sign of pain is most effective, as it reduces prostaglandin production before it builds up.',
    },
    {
      questionText: 'What amount of blood loss per cycle is considered heavy menstrual bleeding?',
      options: ['More than 10 mL', 'More than 80 mL', 'More than 200 mL', 'More than 500 mL'],
      correctIndex: 1,
      explanation: 'Losing more than 80 mL per cycle roughly soaking a pad or tampon more often than every hour — is considered heavy menstrual bleeding and may indicate a condition worth investigating.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Lesson 5 — HIV & STI: Getting Tested
// ─────────────────────────────────────────────────────────────────────────────
const GETTING_TESTED: LessonSeed = {
  slug: 'getting_tested',
  title: 'Getting tested: what happens',
  localizedTitle: {
    en: 'Getting tested: what happens',
    fr: 'Se faire dépister : que se passe-t-il ?',
    rw: 'Kwipimisha: uko bikorwa',
  },
  category: 'hiv_sti',
  durationMinutes: 5,
  chapters: [
    {
      orderIndex: 0,
      title: 'Why get tested?',
      localizedTitle: {
        en: 'Why get tested?',
        fr: 'Pourquoi se faire dépister ?',
        rw: 'Kuki kwipimisha?',
      },
      narrationText:
        'HIV often has no symptoms for years. Many STIs also show no signs. Testing is the only reliable way to know your status. In Rwanda, HIV testing is free, confidential, and available at every health centre. The Rwanda Biomedical Centre recommends that all people aged 15 and above test for HIV at least once, and more frequently if at higher risk. Knowing you are HIV-negative allows you to take preventive steps. Knowing you are HIV-positive enables you to start treatment immediately, protect your health, and prevent transmission.',
      localizedNarration: {
        en: 'HIV often has no symptoms for years. Testing is the only way to know your status. In Rwanda, free, confidential HIV testing is available at every health centre for all people 15+. Whether positive or negative, knowing empowers you to act.',
        fr: "Le VIH ne présente souvent aucun symptôme pendant des années. Le dépistage est le seul moyen de connaître votre statut. Au Rwanda, le dépistage VIH est gratuit et confidentiel dans tous les centres de santé pour toute personne de 15 ans et plus.",
        rw: "SIDA kenshi ntabimenyetso biri mu myaka myinshi. Kwipimisha ni inzira yonyine yo kumenya inkomoko yawe. Mu Rwanda, kwipimisha SIDA biratangirwa Ubuntu kandi ni ibanga mu buvuzi bwose ku bantu bose b'imyaka 15 na ho hejuru.",
      },
      hotspots: [],
    },
    {
      orderIndex: 1,
      title: 'What to expect',
      localizedTitle: {
        en: 'What to expect',
        fr: 'À quoi s\'attendre',
        rw: 'Ibizabaho',
      },
      narrationText:
        'At a Rwanda health centre, HIV testing follows three steps: counselling, testing, and post-test support. Pre-test counselling explains the process and answers your questions. The test itself uses a rapid antigen and antibody test. A small sample of blood is taken from your fingertip. Results are ready in about 20 minutes. A second confirmatory test is done if the first is reactive. Post-test counselling explains your result, next steps, and how to protect yourself and others. The entire process usually takes less than one hour. No fasting is needed. You can go alone or bring a trusted person for support.',
      localizedNarration: {
        en: 'Rwanda HIV testing follows 3 steps: counselling, test, post-test support. A fingertip blood sample gives results in 20 minutes. A confirmatory test follows a reactive first result. The whole process takes under an hour. No fasting needed.',
        fr: "Le test VIH au Rwanda suit 3 étapes : counseling, test, soutien post-test. Un échantillon sanguin du bout du doigt donne des résultats en 20 minutes. Un test confirmatoire suit un premier résultat réactif. L'ensemble du processus prend moins d'une heure.",
        rw: "Kwipimisha SIDA mu Rwanda bikurikiza inzira 3: inama, ikizamini, na serivisi nyuma y'ikizamini. Agakangara k'amaraso k'urutoki kaduha ibisubizo mu minota 20. Ikizamini cy'inyongera gikurikiraho niba icya mbere cyerekanye ibimenyetso. Inzira yose imara munsi y'isaha imwe.",
      },
      hotspots: [],
    },
    {
      orderIndex: 2,
      title: 'Understanding your results',
      localizedTitle: {
        en: 'Understanding your results',
        fr: 'Comprendre vos résultats',
        rw: 'Gusobanukirwa ibisubizo byawe',
      },
      narrationText:
        'A non-reactive result means no HIV antibodies or antigens were detected. If your last potential exposure was within 23 to 90 days — the window period — you should retest in 3 months to be certain. A reactive result on a rapid test is not a final diagnosis. A second confirmatory test is always done. If confirmed positive, you will be enrolled in Rwanda\'s national ART programme the same day. Starting treatment early keeps you healthy and your viral load undetectable. Remember: a positive result is not a death sentence. With ART, people with HIV live full, healthy lives.',
      localizedNarration: {
        en: 'Non-reactive: no HIV detected. Retest in 3 months if last exposure was within 90 days (window period). Reactive: confirmatory test needed — not a final diagnosis yet. If confirmed, same-day ART enrolment is possible in Rwanda. ART means living fully and healthily.',
        fr: "Non réactif : pas de VIH détecté. Retester dans 3 mois si la dernière exposition remonte à moins de 90 jours. Réactif : test confirmatoire nécessaire — pas encore un diagnostic définitif. Si confirmé, l'inscription au programme ARV le jour même est possible au Rwanda.",
        rw: "Ntaho ibimenyetso: nta SIDA yabonywe. Ongera kwipimisha mu mezi 3 niba ibiganiro bya vuba by'ingaruka byabaye munsi y'iminsi 90. Ibimenyetso byabonywe: ikizamini cy'inyongera girakenewe — si diagnoze ya nyuma. Niba byemejwe, kwinjira muri ART uyu munsi birashoboka mu Rwanda.",
      },
      hotspots: [],
    },
  ],
  questions: [
    {
      questionText: 'Why is HIV testing recommended even without symptoms?',
      options: [
        'It is required by law',
        'HIV often has no symptoms for years testing is the only way to know your status',
        'Symptoms always appear within weeks',
        'Testing is only for people who feel sick',
      ],
      correctIndex: 1,
      explanation: 'HIV can remain asymptomatic for many years. Testing is the only reliable method to know your status and access treatment or prevention.',
    },
    {
      questionText: 'What is the window period for HIV testing?',
      options: ['1–5 days', '5–10 days', '23–90 days', 'More than 6 months'],
      correctIndex: 2,
      explanation: 'The window period is the time after HIV infection when a test may not yet detect the virus — typically 23 to 90 days depending on the test type used.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Lesson 6 — Anatomy: Puberty & Body Changes
// ─────────────────────────────────────────────────────────────────────────────
const PUBERTY_CHANGES: LessonSeed = {
  slug: 'puberty_changes',
  title: 'Puberty & body changes',
  localizedTitle: {
    en: 'Puberty & body changes',
    fr: 'Puberté et changements corporels',
    rw: 'Ubugimbi n’ubwangavu: impinduka z\'umubiri',
  },
  category: 'anatomy',
  durationMinutes: 9,
  chapters: [
    {
      orderIndex: 0,
      title: 'What is puberty?',
      localizedTitle: {
        en: 'What is puberty?',
        fr: 'Qu\'est-ce que la puberté ?',
        rw: 'Ubukurikiro ni iki?',
      },
      narrationText:
        'Puberty is the stage of life when a child\'s body develops into an adult body capable of reproduction. It is a completely natural biological process triggered by hormonal changes that begin in the brain. The hypothalamus secretes GnRH, which signals the pituitary gland to release FSH and LH. These hormones tell the ovaries to produce oestrogen and the testes to produce testosterone. Puberty typically starts between ages 8 and 13 for females and between 9 and 14 for males. Timing varies widely and is influenced by genetics, nutrition, body weight, and overall health.',
      localizedNarration: {
        en: 'Puberty is the biological transition from child to adult reproductive capacity, triggered by the hypothalamus signalling the pituitary gland to release FSH and LH. These hormones activate oestrogen in ovaries and testosterone in testes. It typically starts age 8–13 for females and 9–14 for males.',
        fr: "La puberté est la transition biologique d'un corps d'enfant vers un corps adulte capable de reproduction, déclenchée par l'hypothalamus signalant à l'hypophyse de libérer FSH et LH. Ces hormones activent les œstrogènes dans les ovaires et la testostérone dans les testicules.",
        rw: "Ubukurikiro ni ihinduka ry'imibiri riva ku mwana rugera ku mwenegihugu ushobora gubyara, butangizwa na hypothalamus itera umuzinga wa pituitary gusohora FSH na LH. Iyi horimone itera estrogene mu reri na testosteron mu buro. Ibintu bitangira imyaka 8–13 ku bagore na 9–14 ku bagabo.",
      },
      hotspots: [],
    },
    {
      orderIndex: 1,
      title: 'Changes in female bodies',
      localizedTitle: {
        en: 'Changes in female bodies',
        fr: 'Changements dans les corps féminins',
        rw: 'Impinduka mu mibiri y\'abagore',
      },
      narrationText:
        'The first sign of puberty in females is usually breast development, called thelarche, beginning between ages 8 and 13. Pubic and underarm hair then grows. A growth spurt of up to 8 centimetres per year occurs. The hips widen, and body fat redistributes to the hips, thighs, and breasts. Vaginal discharge — clear or white, with a mild smell — begins as a natural part of the menstrual cycle maturing. The first menstrual period, menarche, usually occurs about 2 years after breast development begins. In Rwanda, the average age of menarche is around 13. Skin may become oilier and acne may develop due to increased sebaceous gland activity.',
      localizedNarration: {
        en: 'Female puberty typically starts with breast development (thelarche) at 8–13 years. Pubic and underarm hair grows. Growth spurt up to 8 cm/year. Hips widen. Vaginal discharge begins. First period (menarche) comes about 2 years after breast development — average age 13 in Rwanda. Oilier skin and acne may appear.',
        fr: "La puberté féminine commence généralement par le développement des seins (thélarche) à 8–13 ans. Les poils pubiens et axillaires poussent. Poussée de croissance jusqu'à 8 cm/an. Les hanches s'élargissent. Les pertes vaginales commencent. Les premières règles (ménarche) surviennent environ 2 ans après le début du développement mammaire — âge moyen 13 ans au Rwanda.",
        rw: "Ubukurikiro bw'abagore butangira akenshi n'amabere (thelarche) imyaka 8–13. Imisatsi y'amahana no mu mbura ikura. Gukura vite kugeza 8 cm/umwaka. Amahanda araguka. Amazi meza atangira. Imihango ya mbere (ménarche) iza nko myaka 2 nyuma y'amabere — imyaka isanzwe 13 mu Rwanda.",
      },
      hotspots: [],
    },
    {
      orderIndex: 2,
      title: 'Changes in male bodies',
      localizedTitle: {
        en: 'Changes in male bodies',
        fr: 'Changements dans les corps masculins',
        rw: 'Impinduka mu mibiri y\'abagabo',
      },
      narrationText:
        'The first sign of puberty in males is usually testicular growth, beginning between ages 9 and 14. Pubic and underarm hair then grows, followed by facial hair. A growth spurt of up to 10 centimetres per year occurs. The voice deepens — called voice breaking — as the larynx enlarges. The penis grows in length and width. Muscle mass increases. Spontaneous erections and first ejaculation, called spermarche, occur. Sperm production begins around age 11 to 13 but sexual maturity is usually reached by 14 to 17. Oilier skin and acne are common. Body odour increases due to sweat gland development.',
      localizedNarration: {
        en: 'Male puberty starts with testicular growth (9–14 years). Pubic and facial hair grow. Growth spurt up to 10 cm/year. Voice deepens (larynx grows). Penis grows. Muscles increase. Spermarche (first ejaculation) and sperm production begin. Oilier skin, acne, and increased body odour are common.',
        fr: "La puberté masculine commence par la croissance testiculaire (9–14 ans). Les poils pubiens et du visage poussent. Poussée de croissance jusqu'à 10 cm/an. La voix mue (le larynx s'agrandit). Le pénis se développe. Les muscles augmentent. La spémarche (première éjaculation) et la production de sperme commencent.",
        rw: "Ubukurikiro bw'abagabo butangira n'ukura kw'uburo (imyaka 9–14). Imisatsi y'amahana no ku maso ikura. Gukura vite kugeza 10 cm/umwaka. Ijwi ritera ruriho (larynx ikura). Umuhanda w'amaraso ukura. Imitsi iyongera. Spermarche (isohora rya mbere) n'isohora ry'indegimana bitangira.",
      },
      hotspots: [],
    },
    {
      orderIndex: 3,
      title: 'Emotional changes & self-care',
      localizedTitle: {
        en: 'Emotional changes & self-care',
        fr: 'Changements émotionnels et autosoins',
        rw: 'Impinduka z\'ibyumviro no kwita ku mubiri',
      },
      narrationText:
        'Hormonal changes during puberty affect emotions, mood, and self-image. Intense feelings — excitement, embarrassment, sadness, anger are normal and temporary. The brain itself is still developing throughout adolescence, which is why decision-making can feel more difficult. Peer relationships become more important during this time. Good hygiene is especially important: daily bathing, clean underwear, and proper menstrual hygiene management prevent infection and odour. If you feel overwhelmed, speaking to a trusted adult, school counsellor, or community health worker is a sign of strength. In Rwanda, Isange One Stop Centres provide confidential support for young people.',
      localizedNarration: {
        en: 'Puberty hormones affect emotions intense feelings are normal and temporary. The brain is still developing through adolescence, making some decisions harder. Daily bathing, clean underwear, and period hygiene are important. Talking to a trusted adult or counsellor is a sign of strength. Rwanda\'s Isange One Stop Centres offer confidential support.',
        fr: "Les hormones de la puberté affectent les émotions des sentiments intenses sont normaux et temporaires. Le cerveau se développe encore tout au long de l'adolescence. L'hygiène quotidienne, les sous-vêtements propres et la gestion des règles sont importants. Parler à un adulte de confiance est un signe de force.",
        rw: "Horimone z'ubukurikiro zitera impinduka z'ibyumviro ibyumviro bigoye ni bisanzwe kandi bibyo guhita. Ubwonko burakomeza gukomera mu budogo bwose. Kuoga buri munsi, imyenda isukuye, no gucunga imihango ni ingenzi. Kuvugana n'umukuru w'umwizwe ni ikimenyetso cy'ubushizi. Inzego z'Isange One Stop z'u Rwanda zitanga inkunga y'ibanga ku rubyiruko.",
      },
      hotspots: [],
    },
  ],
  questions: [
    {
      questionText: 'What is the first hormonal trigger of puberty?',
      options: ['Oestrogen from the ovaries', 'Testosterone from the testes', 'GnRH from the hypothalamus', 'LH from the pituitary gland'],
      correctIndex: 2,
      explanation: 'Puberty begins when the hypothalamus secretes GnRH (Gonadotropin-Releasing Hormone), which signals the pituitary gland to release FSH and LH, activating the reproductive glands.',
    },
    {
      questionText: 'What is the typical age of menarche (first period) in Rwanda?',
      options: ['9–10 years', '10–11 years', 'Around 13 years', '15–16 years'],
      correctIndex: 2,
      explanation: 'In Rwanda, menarche typically occurs around age 13, usually about 2 years after breast development begins. Normal range is approximately 10–16 years.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Seed function
// ─────────────────────────────────────────────────────────────────────────────
export async function seedLessons(dataSource: DataSource): Promise<void> {
  const lessonRepo   = dataSource.getRepository(Lesson);
  const chapterRepo  = dataSource.getRepository(Chapter);
  const hotspotRepo  = dataSource.getRepository(Hotspot);
  const questionRepo = dataSource.getRepository(QuizQuestion);

  const existing = await lessonRepo.count();
  if (existing > 0) {
    console.log(`  Lessons already seeded (${existing} found), skipping.`);
    return;
  }

  const allLessons: LessonSeed[] = [
    YOUR_CYCLE,
    HIV_PREVENTION,
    ANATOMY_101,
    CRAMPS_FLOW,
    GETTING_TESTED,
    PUBERTY_CHANGES,
  ];

  for (const ld of allLessons) {
    const lesson = await lessonRepo.save(
      lessonRepo.create({
        slug:            ld.slug,
        title:           ld.title,
        localizedTitle:  normalizeLocalized(ld.localizedTitle, ld.title),
        category:        ld.category,
        durationMinutes: ld.durationMinutes,
      }),
    );

    for (const cd of ld.chapters) {
      const chapter = await chapterRepo.save(
        chapterRepo.create({
          lesson,
          orderIndex:         cd.orderIndex,
          title:              cd.title,
          localizedTitle:     normalizeLocalized(cd.localizedTitle, cd.title),
          narrationText:      cd.narrationText,
          localizedNarration: normalizeLocalized(
            cd.localizedNarration,
            cd.narrationText,
          ),
          modelUrl:           cd.modelUrl ?? null,
          audioUrl:           null,
        }),
      );

      for (const hd of cd.hotspots) {
        await hotspotRepo.save(
          hotspotRepo.create({
            chapter,
            number:               hd.number,
            title:                hd.title,
            localizedTitle:       normalizeLocalized(hd.localizedTitle, hd.title),
            description:          hd.description,
            localizedDescription: normalizeLocalized(
              hd.localizedDescription,
              hd.description,
            ),
          }),
        );
      }
    }

    for (const qd of ld.questions) {
      await questionRepo.save(
        questionRepo.create({
          lesson,
          questionText: qd.questionText,
          options:      qd.options,
          correctIndex: qd.correctIndex,
          explanation:  qd.explanation,
        }),
      );
    }

    console.log(`    ✓ ${ld.slug} — ${ld.chapters.length} chapters, ${ld.questions.length} quiz questions`);
  }

  console.log(`  ✅ Seeded ${allLessons.length} lessons with full trilingual content.`);
}
