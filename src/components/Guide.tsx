import { useRef } from 'react'
import { useDialog } from './Legal'
import { APP_NAME, APP_NAME_AR } from '../lib/edition'
import type { Lang } from '../lib/types'

/**
 * Two in-page pop-ups, in English, Arabic and Urdu:
 * study tips (shown once to first-time visitors, after the Terms pop-up) and the rules of the game
 * (from the Rules button at the top of the title screen).
 */

interface Section {
  title: string
  items: string[]
}

const TIPS: { title: string; intro: string; sections: Section[] } = {
  title: 'Learn together, the fun way',
  intro: `${APP_NAME} works well for a study circle, a class or a family. Here is how to use it to revise together.`,
  sections: [
    {
      title: 'Get the questions from your teacher',
      items: [
        'Ask your teacher or instructor for the question file for your class. It is one small file you can share by email, WhatsApp or your class page.',
        'On the title screen, press Question files, then Open a file, and choose it. Its topics show up at the top when you set up a game.',
        'When your teacher sends a newer copy of the same file, open it the same way. It replaces the old one.',
        'Teachers and parents: press Question files, then Make a file. You can paste questions straight from a spreadsheet.',
      ],
    },
    {
      title: 'Make it fun (and make it stick)',
      items: [
        'Play in small teams and take turns answering, so everyone gets a go, the youngest included.',
        'After each answer, have someone explain it in their own words. Explaining is the best way to remember.',
        'Start with the 100 and 200 tiles to warm up. Save the 500s for when the group is in the zone.',
        'Write down the questions your group missed and play them again next time.',
        'Turn the timer off while you are learning a topic, and turn it on to practise for a test.',
        'Each member writes five questions on a lesson in the Category builder. Writing good questions is revision too.',
        'Keep sessions short: one board, then a break.',
        'For fiqh questions, choose your school of fiqh in setup. If something is unclear, ask a qualified teacher.',
        'Points are just for fun. Keep the game kind and respectful, and tell your teacher about any question that looks wrong.',
      ],
    },
  ],
}

const RULES: Section[] = [
  {
    title: 'The board',
    items: [
      'Pick up to 6 categories and 2 to 4 teams. Each category has five tiles, from 100 (warm-up) to 500 (expert). Harder tiles are worth more.',
      'Teams take turns picking a tile.',
      'With Comeback on, the team in last place picks the next tile.',
    ],
  },
  {
    title: 'Answering',
    items: [
      'The host reads the question out. Answers do not need to be in the form of a question, and English or Arabic is fine.',
      'Right answer: the team wins the tile’s points.',
      'Wrong answer: if “Take points away” is on, the team loses the tile’s points. Other teams can still try.',
      'If nobody gets it, the host shows the answer and nobody scores.',
    ],
  },
  {
    title: 'Special tiles',
    items: [
      'Golden tile: double points.',
      'Steal: the team that answers right takes the points from another team.',
      'Audience: someone in the audience answers for the team that picked the tile.',
      'Streak bonus: three right answers in a row earn a team 100 extra points.',
    ],
  },
  {
    title: 'After the board',
    items: [
      'Lightning round: 60 seconds of quick questions. 100 points for each right answer, and nothing is taken away.',
      'Final question: every team writes its answer in secret. 500 points for each team that gets it right.',
    ],
  },
  {
    title: 'Winning',
    items: [
      'The team with the most points at the end wins.',
      'If teams are level at the top, the host can play a tie-breaker: one question at a time for the tied teams only, and the first right answer wins 100 points. A wrong answer costs nothing. If the questions run out, the teams share first place.',
      'The host’s ruling is final. The host can fix a score by hand, for example after a ruling is overturned. Every point won and lost is in the game log, so a challenge can be checked at the end of a round.',
    ],
  },
]

const TIPS_UR: typeof TIPS = {
  title: 'مل کر سیکھیں، مزے کے ساتھ',
  intro: `${APP_NAME_AR} مطالعہ کے حلقے، کلاس یا گھر والوں کے لیے بہت موزوں ہے۔ مل کر دہرائی کے لیے اسے یوں استعمال کریں۔`,
  sections: [
    {
      title: 'سوالات اپنے استاد سے لیں',
      items: [
        'اپنے استاد سے اپنی کلاس کی سوالات کی فائل مانگیں۔ یہ ایک چھوٹی سی فائل ہے جو ای میل، واٹس ایپ یا کلاس کے صفحے پر بھیجی جا سکتی ہے۔',
        'شروع کی اسکرین پر "سوالات کی فائلیں" دبائیں، پھر "فائل کھولیں" اور اسے چنیں۔ کھیل ترتیب دیتے وقت اس کے موضوعات سب سے اوپر نظر آئیں گے۔',
        'جب استاد اسی فائل کی نئی نقل بھیجیں تو اسے اسی طرح کھولیں۔ وہ پرانی کی جگہ لے لے گی۔',
        'اساتذہ اور والدین: "سوالات کی فائلیں" دبائیں، پھر "فائل بنائیں"۔ آپ سوالات سیدھے اسپریڈشیٹ سے چسپاں کر سکتے ہیں۔',
      ],
    },
    {
      title: 'اسے دلچسپ بنائیں (اور یاد بھی رہے)',
      items: [
        'چھوٹی ٹیموں میں کھیلیں اور باری باری جواب دیں، تاکہ سب کو موقع ملے، سب سے چھوٹوں کو بھی۔',
        'ہر جواب کے بعد کوئی اسے اپنے الفاظ میں سمجھائے۔ سمجھانا یاد رکھنے کا بہترین طریقہ ہے۔',
        'شروع میں 100 اور 200 کے خانے کھیلیں۔ 500 والے تب کے لیے رکھیں جب سب پوری طرح تیار ہوں۔',
        'جو سوالات آپ کے گروپ سے رہ گئے انہیں لکھ لیں اور اگلی بار دوبارہ کھیلیں۔',
        'کوئی موضوع سیکھتے وقت ٹائمر بند رکھیں، اور امتحان کی مشق کے لیے چلا دیں۔',
        'ہر رکن زمرہ ساز میں کسی سبق پر پانچ سوال لکھے۔ اچھے سوال لکھنا بھی دہرائی ہے۔',
        'نشستیں مختصر رکھیں: ایک بورڈ، پھر وقفہ۔',
        'فقہ کے سوالات کے لیے ترتیب میں اپنا فقہی مسلک چنیں۔ کوئی بات واضح نہ ہو تو کسی مستند استاد سے پوچھیں۔',
        'نمبر صرف تفریح کے لیے ہیں۔ کھیل میں نرمی اور ادب رکھیں، اور جو سوال غلط لگے اس کے بارے میں استاد کو بتائیں۔',
      ],
    },
  ],
}

const RULES_UR: Section[] = [
  {
    title: 'بورڈ',
    items: [
      'زیادہ سے زیادہ 6 زمرے اور 2 سے 4 ٹیمیں چنیں۔ ہر زمرے میں پانچ خانے ہیں، 100 (ابتدائی) سے 500 (ماہر) تک۔ مشکل خانوں کے نمبر زیادہ ہیں۔',
      'ٹیمیں باری باری خانہ چنتی ہیں۔',
      '"واپسی" چلی ہو تو آخری نمبر والی ٹیم اگلا خانہ چنتی ہے۔',
    ],
  },
  {
    title: 'جواب دینا',
    items: [
      'میزبان سوال پڑھ کر سناتا ہے۔ جواب سوال کی صورت میں دینا ضروری نہیں، اور انگریزی، عربی یا اردو سب ٹھیک ہیں۔',
      'درست جواب: ٹیم کو خانے کے نمبر ملتے ہیں۔',
      'غلط جواب: اگر "غلط جواب پر نمبر کاٹیں" چلا ہو تو ٹیم کے خانے جتنے نمبر کٹتے ہیں۔ دوسری ٹیمیں پھر بھی کوشش کر سکتی ہیں۔',
      'اگر کوئی نہ بتا سکے تو میزبان جواب دکھاتا ہے اور کسی کو نمبر نہیں ملتے۔',
    ],
  },
  {
    title: 'خاص خانے',
    items: [
      'سنہری خانہ: دگنے نمبر۔',
      'چھیننا: درست جواب دینے والی ٹیم یہ نمبر کسی دوسری ٹیم سے لے لیتی ہے۔',
      'ناظرین: ناظرین میں سے کوئی اس ٹیم کی طرف سے جواب دیتا ہے جس نے خانہ چنا۔',
      'لگاتار انعام: لگاتار تین درست جواب پر ٹیم کو 100 اضافی نمبر ملتے ہیں۔',
    ],
  },
  {
    title: 'بورڈ کے بعد',
    items: [
      'تیز راؤنڈ: 60 سیکنڈ کے فوری سوالات۔ ہر درست جواب پر 100 نمبر، اور کچھ نہیں کٹتا۔',
      'آخری سوال: ہر ٹیم چھپ کر اپنا جواب لکھتی ہے۔ درست جواب والی ہر ٹیم کو 500 نمبر۔',
    ],
  },
  {
    title: 'جیت',
    items: [
      'آخر میں سب سے زیادہ نمبر والی ٹیم جیتتی ہے۔',
      'اگر سب سے اوپر ٹیمیں برابر ہوں تو میزبان فیصلہ کن سوال کھیل سکتا ہے: صرف برابر ٹیموں کے لیے ایک ایک سوال، اور پہلا درست جواب 100 نمبر جیتتا ہے۔ غلط جواب پر کچھ نہیں کٹتا۔ سوال ختم ہو جائیں تو ٹیمیں پہلی پوزیشن میں شریک رہتی ہیں۔',
      'میزبان کا فیصلہ حتمی ہے۔ میزبان ہاتھ سے نمبر درست کر سکتا ہے، مثلاً کسی فیصلے کے بدلنے پر۔ ہر جیتا اور کھویا نمبر کھیل کے ریکارڈ میں ہے، اس لیے راؤنڈ کے آخر میں اعتراض جانچا جا سکتا ہے۔',
    ],
  },
]

const TIPS_AR: typeof TIPS = {
  title: 'نتعلّم معًا بطريقة ممتعة',
  intro: `تصلح ${APP_NAME_AR} لحلقة العلم والفصل والأسرة. إليك طريقة استعمالها للمراجعة معًا.`,
  sections: [
    {
      title: 'خذ الأسئلة من معلّمك',
      items: [
        'اطلب من معلّمك ملف الأسئلة الخاص بفصلك. هو ملف صغير واحد يُرسل بالبريد أو واتساب أو صفحة الفصل.',
        'في شاشة البداية اضغط «ملفات الأسئلة» ثم «افتح ملفًا» واختره. تظهر موضوعاته في أعلى شاشة إعداد اللعبة.',
        'إذا أرسل المعلّم نسخة أحدث من الملف نفسه فافتحها بالطريقة نفسها، فتحلّ محلّ القديمة.',
        'للمعلّمين والآباء: اضغط «ملفات الأسئلة» ثم «أنشئ ملفًا». يمكنك لصق الأسئلة مباشرة من جدول بيانات.',
      ],
    },
    {
      title: 'اجعلها ممتعة (وراسخة في الذهن)',
      items: [
        'العبوا في فرق صغيرة وتناوبوا على الإجابة ليشارك الجميع، ومنهم الأصغر سنًّا.',
        'بعد كل إجابة ليشرحها أحدكم بكلماته. الشرح أفضل طريق للحفظ.',
        'ابدؤوا بمربعات ١٠٠ و٢٠٠ للإحماء، واتركوا مربعات ٥٠٠ لوقت التركيز.',
        'اكتبوا الأسئلة التي أخطأتم فيها والعبوها مرة أخرى في المرة القادمة.',
        'أوقفوا المؤقت وأنتم تتعلّمون موضوعًا، وشغّلوه للتدرّب على اختبار.',
        'يكتب كل عضو خمسة أسئلة عن درس في منشئ الفئات. كتابة الأسئلة الجيدة مراجعة أيضًا.',
        'اجعلوا الجلسات قصيرة: لوحة واحدة ثم استراحة.',
        'في أسئلة الفقه اختر مذهبك الفقهي في الإعداد. وإذا أشكل شيء فاسأل معلّمًا مؤهّلًا.',
        'النقاط للمتعة فقط. حافظوا على اللطف والأدب في اللعب، وأخبروا المعلّم بأي سؤال يبدو خطأً.',
      ],
    },
  ],
}

const RULES_AR: Section[] = [
  {
    title: 'اللوحة',
    items: [
      'اختر حتى ٦ فئات ومن فريقين إلى ٤ فرق. لكل فئة خمسة مربعات، من ١٠٠ (إحماء) إلى ٥٠٠ (للمتمكّنين). المربعات الأصعب نقاطها أكثر.',
      'تتناوب الفرق على اختيار المربعات.',
      'إذا كان خيار «العودة» مفعّلًا، يختار الفريق الأخير المربع التالي.',
    ],
  },
  {
    title: 'الإجابة',
    items: [
      'يقرأ المقدّم السؤال. لا يلزم أن تكون الإجابة على صيغة سؤال، وتُقبل بالعربية أو الإنجليزية أو الأردية.',
      'الإجابة الصحيحة: يربح الفريق نقاط المربع.',
      'الإجابة الخاطئة: إذا كان خيار «خصم النقاط» مفعّلًا يخسر الفريق نقاط المربع، ويمكن للفرق الأخرى أن تحاول.',
      'إذا لم يعرفها أحد يكشف المقدّم الإجابة ولا يسجّل أحد.',
    ],
  },
  {
    title: 'المربعات الخاصة',
    items: [
      'المربع الذهبي: نقاط مضاعفة.',
      'الاستيلاء: الفريق الذي يجيب صحيحًا يأخذ النقاط من فريق آخر.',
      'الجمهور: يجيب أحد الحضور عن الفريق الذي اختار المربع.',
      'مكافأة التتابع: ثلاث إجابات صحيحة متتالية تمنح الفريق ١٠٠ نقطة إضافية.',
    ],
  },
  {
    title: 'بعد اللوحة',
    items: [
      'الجولة السريعة: ٦٠ ثانية من الأسئلة السريعة. ١٠٠ نقطة لكل إجابة صحيحة، ولا خصم.',
      'السؤال الأخير: يكتب كل فريق إجابته سرًّا. ٥٠٠ نقطة لكل فريق يصيب.',
    ],
  },
  {
    title: 'الفوز',
    items: [
      'يفوز الفريق صاحب أكثر النقاط في النهاية.',
      'إذا تعادلت الفرق في الصدارة يمكن للمقدّم أن يلعب جولة فاصلة: سؤال تلو سؤال للفرق المتعادلة فقط، وأول إجابة صحيحة تربح ١٠٠ نقطة. الإجابة الخاطئة لا تكلّف شيئًا. وإذا نفدت الأسئلة تقاسمت الفرق المركز الأول.',
      'حكم المقدّم نهائي. ويمكنه تعديل النقاط يدويًّا، مثلًا بعد نقض حكم. كل نقطة رُبحت أو خُسرت مسجّلة في سجلّ اللعبة، فيمكن التحقق من أي اعتراض في نهاية الجولة.',
    ],
  },
]

const WORDS = {
  en: { close: 'Close', openFiles: 'Open question files', gotIt: 'Got it, let’s play', howTo: 'How to play', studyTips: 'Study group tips', buzzers: 'Buzzers', buzzQ: 'Using a buzzer box or the Raspberry Pi?', buzzLink: 'Open the setup guide with pictures', buzzPrint: '(it prints too).' },
  ar: { close: 'إغلاق', openFiles: 'افتح ملفات الأسئلة', gotIt: 'فهمت، لنلعب', howTo: 'طريقة اللعب', studyTips: 'نصائح لحلقة الدراسة', buzzers: 'الأجراس', buzzQ: 'تستخدم صندوق الأجراس أو جهاز راسبيري باي؟', buzzLink: 'افتح دليل التركيب المصوّر (بالإنجليزية)', buzzPrint: '(ويمكن طباعته).' },
  ur: { close: 'بند کریں', openFiles: 'سوالات کی فائلیں کھولیں', gotIt: 'سمجھ گئے، کھیلتے ہیں', howTo: 'کھیلنے کا طریقہ', studyTips: 'مطالعہ کے حلقے کے لیے مشورے', buzzers: 'بزر', buzzQ: 'بزر باکس یا راسبیری پائی استعمال کر رہے ہیں؟', buzzLink: 'تصویروں والی ترتیب کی گائیڈ کھولیں (انگریزی میں)', buzzPrint: '(اسے پرنٹ بھی کیا جا سکتا ہے)۔' },
}
const pick = (lang?: Lang): Lang => (lang === 'ur' || lang === 'ar' ? lang : 'en')
const rtl = (lang?: Lang) => pick(lang) !== 'en'

function Sections({ list }: { list: Section[] }) {
  return (
    <>
      {list.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <ul>
            {s.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function GuideDialog({ id, title, children, actions, onClose, lang }: { id: string; title: string; children: React.ReactNode; actions: React.ReactNode; onClose: () => void; lang?: Lang }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialog(ref, onClose)
  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel guide" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} ref={ref} data-testid={id} dir={rtl(lang) ? 'rtl' : 'ltr'} lang={pick(lang)}>
        <div className="legal-head">
          <h1 id={`${id}-title`}>{title}</h1>
          <button className="ghost" onClick={onClose} aria-label={WORDS[pick(lang)].close}>
            ✕
          </button>
        </div>
        <div className="legal-body">{children}</div>
        <div className="legal-actions">{actions}</div>
      </div>
    </div>
  )
}

/** First-visit tips for studying together. Closing it in any way counts as seen. */
export function TipsDialog({ onClose, onOpenFiles, lang }: { onClose: () => void; onOpenFiles: () => void; lang?: Lang }) {
  const tips = { en: TIPS, ar: TIPS_AR, ur: TIPS_UR }[pick(lang)]
  const w = WORDS[pick(lang)]
  return (
    <GuideDialog
      id="tips"
      title={tips.title}
      lang={lang}
      onClose={onClose}
      actions={
        <>
          <button className="btn alt" onClick={onOpenFiles} data-testid="tips-files">
            {w.openFiles}
          </button>
          <button className="btn" onClick={onClose} data-autofocus data-testid="tips-close">
            {w.gotIt}
          </button>
        </>
      }
    >
      <p>{tips.intro}</p>
      <Sections list={tips.sections} />
    </GuideDialog>
  )
}

/** The rules of the game, from the Rules button at the top of the title screen. */
export function RulesDialog({ onClose, onTips, lang }: { onClose: () => void; onTips: () => void; lang?: Lang }) {
  const w = WORDS[pick(lang)]
  return (
    <GuideDialog
      id="rules"
      title={w.howTo}
      lang={lang}
      onClose={onClose}
      actions={
        <>
          <button className="btn alt" onClick={onTips} data-testid="rules-tips">
            {w.studyTips}
          </button>
          <button className="btn" onClick={onClose} data-autofocus data-testid="rules-close">
            {w.close}
          </button>
        </>
      }
    >
      <Sections list={{ en: RULES, ar: RULES_AR, ur: RULES_UR }[pick(lang)]} />
      <section>
        <h2>{w.buzzers}</h2>
        <p>
          {w.buzzQ}{' '}
          <a href="buzzer-guide.html" target="_blank" rel="noopener" data-testid="rules-buzzer-guide">
            {w.buzzLink}
          </a>{' '}
          {w.buzzPrint}
        </p>
      </section>
    </GuideDialog>
  )
}
