import type { Lang } from './types'

/**
 * Owner details shown in the Terms, the Privacy Notice and the footer.
 * The owner chose not to publish a contact email; questions go to the game host.
 */
export const LEGAL = {
  owner: 'Moinuddeen',
  ownerAr: 'Moinuddeen',
  effective: '11 November 2026',
  effectiveAr: '11 نوفمبر 2026',
  year: 2026,
  /** Change this whenever the Terms or Privacy Notice change: everyone is asked to accept again. */
  termsVersion: '1.1',
}

export interface Clause {
  title: string
  body: string[]
  list?: string[]
  after?: string[]
}

export interface LegalDoc {
  title: string
  meta: string
  clauses: Clause[]
}

const O = LEGAL.owner
const OA = LEGAL.ownerAr

const termsEn: LegalDoc = {
  title: 'Get Grilled Terms and Conditions',
  meta: `Version ${LEGAL.termsVersion} · Effective ${LEGAL.effective}`,
  clauses: [
    { title: '1. Who we are.', body: [`Get Grilled ("the Game") is operated by ${O} ("we", "us").`] },
    { title: '2. Accepting these Terms.', body: ["By ticking the box and pressing Accept, or by using the Game, you agree to these Terms and the Privacy Notice. If you don't agree, don't use the Game. If you are under 18, a parent, guardian, or your instructor must agree on your behalf."] },
    { title: '3. What the Game is.', body: ['The Game is a free trivia game for entertainment, practice, and friendly competition. It is not an examination, grading, or assessment tool, and results produced in it have no official standing.'] },
    { title: '4. Questions and answers.', body: ["Built-in questions are provided for general interest and may contain errors, outdated facts, or more than one acceptable answer. We don't guarantee that any question, answer, score, or result is accurate or complete. In any game or competition, the host's ruling is final."] },
    { title: '5. Use in classes and competitions.', body: ['If you use the Game for marks, grades, prizes, or any official result, you do so at your own risk. You are responsible for reviewing the questions, deciding the rules, settling disputes, and checking results. We are not responsible for any grade, mark, ranking, prize, or academic outcome.'] },
    {
      title: '6. Your content.',
      body: ['You are responsible for the categories, questions, and files you create, import, export, or share ("Your Content"). You must not create or share content that:'],
      list: [
        'is illegal under the laws of the Kingdom of Saudi Arabia or where you live;',
        'is offensive to religion, public morals, or public order, or is hateful, abusive, or defamatory;',
        "copies material you don't have the right to use, such as questions from television shows, books, or other games;",
        "contains anyone's personal information without their permission.",
      ],
      after: ["You keep ownership of Your Content. We don't review it and aren't responsible for it."],
    },
    { title: '7. Saved data.', body: ['Games and categories are saved only in your browser. Clearing your browser, using private mode, or switching devices can erase them. Export anything you want to keep. We are not responsible for lost data.'] },
    { title: '8. Health and safety.', body: ["The Game uses bright, moving, and sparkling visual effects. If you or anyone watching has epilepsy or sensitivity to light, use Reduce effects or don't play. Stop playing immediately if you feel unwell."] },
    { title: '9. No warranty.', body: ['The Game is provided "as is" and "as available", without warranties of any kind, whether express or implied, including fitness for a particular purpose, accuracy, or uninterrupted availability. We may change, suspend, or stop the Game at any time.'] },
    { title: '10. Limitation of liability.', body: ['To the fullest extent permitted by law, we, our collaborators, and any institution hosting or using the Game are not liable for any loss or damage of any kind arising from your use of, or inability to use, the Game. This includes direct, indirect, incidental, or consequential loss, and loss of grades, marks, academic standing, prizes, data, time, or opportunity. Nothing in these Terms excludes liability that cannot be excluded by law, including liability for fraud, intentional harm, or gross negligence.'] },
    { title: '11. Indemnity.', body: ['You agree to cover any claims, losses, or costs brought against us because of Your Content or your breach of these Terms.'] },
    { title: '12. Ownership.', body: [`The Game's name, logo, design, code, animations, and built-in questions belong to ${O}, © ${LEGAL.year}. You may use the Game and share exported files for non-commercial purposes. You may not copy, sell, or republish the Game or its built-in question sets without written permission.`] },
    { title: '13. Independence.', body: ['Get Grilled is an independent game. It is not affiliated with, endorsed by, or connected to any television show, broadcaster, or game company. Any university or event using the Game does so independently unless stated otherwise in writing.'] },
    { title: '14. No gambling.', body: ['Points in the Game have no money value. You must not use the Game for betting or for any contest where people pay to enter for a prize decided by the game.'] },
    { title: '15. Changes.', body: ['We may update these Terms. When we do, we will change the version number and ask you to accept again.'] },
    { title: '16. Governing law.', body: ['These Terms are governed by the laws of the Kingdom of Saudi Arabia. Disputes go to the competent courts in the Eastern Province, unless the law where you live gives you a right to bring a claim there.'] },
    { title: '17. Severability and language.', body: ["If any part of these Terms can't be enforced, the rest stays in effect. These Terms are provided in Arabic and English. If they differ, the Arabic version prevails."] },
    { title: '18. Questions about content.', body: ['Questions about a question or content? Tell your game host.'] },
  ],
}

const termsAr: LegalDoc = {
  title: 'شروط وأحكام Get Grilled',
  meta: `الإصدار ${LEGAL.termsVersion} · يسري اعتبارًا من ${LEGAL.effectiveAr}`,
  clauses: [
    { title: '1. من نحن.', body: [`يدير لعبة Get Grilled («اللعبة») ${OA} («نحن»).`] },
    { title: '2. قبول هذه الشروط.', body: ['بوضع علامة في المربع والضغط على «موافق»، أو باستخدام اللعبة، فإنك توافق على هذه الشروط وعلى إشعار الخصوصية. إن لم توافق فلا تستخدم اللعبة. إن كان عمرك أقل من 18 عامًا، فيجب أن يوافق عنك أحد والديك أو وليّ أمرك أو مدرّسك.'] },
    { title: '3. ما هي اللعبة.', body: ['اللعبة لعبة أسئلة ومعلومات مجانية للترفيه والتدريب والمنافسة الودية. وهي ليست أداة اختبار أو تقييم أو رصد درجات، وليس للنتائج التي تظهر فيها أي صفة رسمية.'] },
    { title: '4. الأسئلة والأجوبة.', body: ['الأسئلة المضمّنة مقدّمة للفائدة العامة، وقد تحتوي على أخطاء أو معلومات قديمة أو أكثر من إجابة مقبولة. ولا نضمن دقة أو اكتمال أي سؤال أو إجابة أو نتيجة أو مجموع نقاط. وفي أي لعبة أو مسابقة، يكون قرار المقدّم نهائيًا.'] },
    { title: '5. الاستخدام في الفصول والمسابقات.', body: ['إن استخدمت اللعبة لرصد درجات أو علامات أو جوائز أو أي نتيجة رسمية، فإنك تفعل ذلك على مسؤوليتك. وأنت مسؤول عن مراجعة الأسئلة وتحديد القواعد وحسم الخلافات والتحقق من النتائج. ولسنا مسؤولين عن أي درجة أو علامة أو ترتيب أو جائزة أو نتيجة أكاديمية.'] },
    {
      title: '6. محتواك.',
      body: ['أنت مسؤول عن الفئات والأسئلة والملفات التي تنشئها أو تستوردها أو تصدّرها أو تشاركها («محتواك»). ويجب ألا تنشئ أو تشارك محتوى:'],
      list: [
        'مخالفًا لأنظمة المملكة العربية السعودية أو أنظمة البلد الذي تقيم فيه؛',
        'مسيئًا للدين أو الآداب العامة أو النظام العام، أو يحض على الكراهية، أو مسيئًا، أو تشهيريًا؛',
        'منسوخًا من مواد لا يحق لك استخدامها، مثل أسئلة البرامج التلفزيونية أو الكتب أو الألعاب الأخرى؛',
        'يتضمن معلومات شخصية لأي شخص دون إذنه.',
      ],
      after: ['تبقى ملكية محتواك لك. ونحن لا نراجعه ولسنا مسؤولين عنه.'],
    },
    { title: '7. البيانات المحفوظة.', body: ['تحفظ الألعاب والفئات في متصفحك فقط. وقد يؤدي مسح بيانات المتصفح أو استخدام التصفح الخاص أو تغيير الجهاز إلى حذفها. صدّر كل ما تريد الاحتفاظ به. ولسنا مسؤولين عن البيانات المفقودة.'] },
    { title: '8. الصحة والسلامة.', body: ['تستخدم اللعبة مؤثرات بصرية ساطعة ومتحركة ولامعة. إن كنت أنت أو أحد المشاهدين مصابًا بالصرع أو حساسًا للضوء، فشغّل خيار «تخفيف المؤثرات» أو لا تلعب. وتوقف عن اللعب فورًا إن شعرت بتوعك.'] },
    { title: '9. إخلاء الضمان.', body: ['تقدّم اللعبة «كما هي» و«حسب توفرها» دون أي ضمانات صريحة أو ضمنية، بما في ذلك ملاءمتها لغرض معين أو دقتها أو توفرها دون انقطاع. ويجوز لنا تغيير اللعبة أو إيقافها مؤقتًا أو نهائيًا في أي وقت.'] },
    { title: '10. حدود المسؤولية.', body: ['إلى أقصى حد يسمح به النظام، لا نتحمل نحن ولا المتعاونون معنا ولا أي جهة تستضيف اللعبة أو تستخدمها أي مسؤولية عن أي خسارة أو ضرر من أي نوع ينشأ عن استخدامك للعبة أو عجزك عن استخدامها. ويشمل ذلك الخسائر المباشرة وغير المباشرة والعرضية والتبعية، وخسارة الدرجات أو العلامات أو المكانة الأكاديمية أو الجوائز أو البيانات أو الوقت أو الفرص. ولا يستبعد أي شيء في هذه الشروط المسؤولية التي لا يجوز استبعادها نظامًا، بما فيها المسؤولية عن الاحتيال أو الضرر المتعمد أو الإهمال الجسيم.'] },
    { title: '11. التعويض.', body: ['توافق على تحمّل أي مطالبات أو خسائر أو تكاليف تُوجَّه إلينا بسبب محتواك أو بسبب مخالفتك لهذه الشروط.'] },
    { title: '12. الملكية.', body: [`اسم اللعبة وشعارها وتصميمها وشيفرتها ومؤثراتها الحركية وأسئلتها المضمّنة مملوكة لـ ${OA}، © ${LEGAL.year}. ويجوز لك استخدام اللعبة ومشاركة الملفات المصدّرة لأغراض غير تجارية. ولا يجوز لك نسخ اللعبة أو أسئلتها المضمّنة أو بيعها أو إعادة نشرها دون إذن كتابي.`] },
    { title: '13. الاستقلالية.', body: ['Get Grilled لعبة مستقلة. وهي غير تابعة لأي برنامج تلفزيوني أو جهة بث أو شركة ألعاب، وغير معتمدة منها، ولا ترتبط بها. وأي جامعة أو فعالية تستخدم اللعبة تفعل ذلك بصورة مستقلة ما لم يُذكر خلاف ذلك كتابةً.'] },
    { title: '14. منع المقامرة.', body: ['ليس للنقاط في اللعبة أي قيمة مالية. ولا يجوز استخدام اللعبة في المراهنة أو في أي مسابقة يدفع فيها المشاركون رسومًا مقابل جائزة تحددها اللعبة.'] },
    { title: '15. التعديلات.', body: ['قد نحدّث هذه الشروط. وعندئذ سنغيّر رقم الإصدار ونطلب منك الموافقة من جديد.'] },
    { title: '16. النظام الواجب التطبيق.', body: ['تخضع هذه الشروط لأنظمة المملكة العربية السعودية. وتختص بالنظر في النزاعات المحاكم المختصة في المنطقة الشرقية، ما لم يمنحك نظام البلد الذي تقيم فيه حق رفع الدعوى هناك.'] },
    { title: '17. قابلية الفصل واللغة.', body: ['إذا تعذّر تطبيق أي جزء من هذه الشروط، يبقى الباقي ساريًا. وتقدَّم هذه الشروط باللغتين العربية والإنجليزية، وعند الاختلاف يُعتمد النص العربي.'] },
    { title: '18. الاستفسار عن المحتوى.', body: ['هل لديك استفسار عن سؤال أو محتوى؟ أخبر مقدّم اللعبة.'] },
  ],
}

const privacyEn: LegalDoc = {
  title: 'Get Grilled Privacy Notice',
  meta: `Version ${LEGAL.termsVersion} · Effective ${LEGAL.effective}`,
  clauses: [
    { title: 'What we collect.', body: ["Nothing. Get Grilled has no accounts and doesn't send your games, team names, scores, or categories to us."] },
    { title: 'What is stored on your device.', body: ["Your settings, your categories, your saved game, and the date you accepted the Terms are stored in your browser's local storage. They stay on your device until you clear them. Avoid putting personal information, such as student ID numbers or phone numbers, in team names or questions."] },
    { title: 'Third parties.', body: ["The website that hosts the Game may log basic technical information, such as your IP address, under its own privacy policy. The Game's fonts are served by the Game itself, so no font service receives your details."] },
    { title: 'Your rights.', body: [`You can delete everything at any time by clearing this site's data in your browser.`] },
    { title: 'Changes.', body: ['If we start collecting any information, for example for online leaderboards, we will update this notice and ask you to accept it before anything is collected.'] },
  ],
}

const privacyAr: LegalDoc = {
  title: 'إشعار الخصوصية في Get Grilled',
  meta: `الإصدار ${LEGAL.termsVersion} · يسري اعتبارًا من ${LEGAL.effectiveAr}`,
  clauses: [
    { title: 'ما الذي نجمعه.', body: ['لا شيء. لا توجد في Get Grilled حسابات، ولا ترسل اللعبة إلينا ألعابك أو أسماء فرقك أو نقاطك أو فئاتك.'] },
    { title: 'ما الذي يُحفظ على جهازك.', body: ['تُحفظ إعداداتك وفئاتك ولعبتك المحفوظة وتاريخ موافقتك على الشروط في التخزين المحلي لمتصفحك، وتبقى على جهازك حتى تمسحها. تجنّب وضع معلومات شخصية، مثل الأرقام الجامعية أو أرقام الهواتف، في أسماء الفرق أو الأسئلة.'] },
    { title: 'الأطراف الأخرى.', body: ['قد يسجّل الموقع الذي يستضيف اللعبة معلومات تقنية أساسية، مثل عنوان IP الخاص بك، وفق سياسة الخصوصية الخاصة به. وتقدّم اللعبة خطوطها بنفسها، فلا تتلقى أي خدمة خطوط بياناتك.'] },
    { title: 'حقوقك.', body: [`يمكنك حذف كل شيء في أي وقت بمسح بيانات هذا الموقع من متصفحك.`] },
    { title: 'التعديلات.', body: ['إن بدأنا جمع أي معلومات، مثل لوحات الصدارة عبر الإنترنت، فسنحدّث هذا الإشعار ونطلب موافقتك عليه قبل جمع أي شيء.'] },
  ],
}

export const TERMS: Record<Lang, LegalDoc> = { en: termsEn, ar: termsAr }
export const PRIVACY: Record<Lang, LegalDoc> = { en: privacyEn, ar: privacyAr }

export const CONSENT_TEXT = {
  en: {
    title: 'Welcome to Get Grilled',
    intro: 'Before you play, please read and accept our Terms.',
    points: [
      'Get Grilled is a trivia game for fun and practice. It is not an exam or an official assessment tool.',
      'Questions and answers may contain mistakes. If the game is used for marks, the host or instructor is responsible for checking questions and results.',
      'To the fullest extent permitted by law, we are not liable for any loss or damage of any kind from using the game, including lost grades, marks, prizes, or saved data.',
      'You are responsible for the categories and questions you create, import, or share.',
      "Your games and categories are saved only in this browser. We don't collect accounts or personal information.",
    ],
    warnTitle: 'Photosensitivity warning:',
    warn: "This game uses bright, moving, and sparkling effects. If you or anyone watching has epilepsy or is sensitive to light, turn on Reduce effects in settings, or don't play.",
    reduceNow: 'Turn on Reduce effects now',
    agreeA: 'I have read and agree to the ',
    terms: 'Terms and Conditions',
    and: ' and ',
    privacy: 'Privacy Notice',
    agreeB: '.',
    decline: 'Decline',
    accept: 'Accept and play',
    declined: 'You need to accept the Terms to play Get Grilled.',
    backToSummary: 'Back',
    arabicPrevails: 'The Terms are provided in Arabic and English. If they differ, the Arabic version prevails.',
    close: 'Close',
    report: "Think an answer is wrong? Tell your host. The host's ruling is final.",
    reduceFx: 'Reduce effects',
  },
  ar: {
    title: 'أهلًا بك في Get Grilled',
    intro: 'قبل أن تبدأ اللعب، يرجى قراءة شروطنا والموافقة عليها.',
    points: [
      'Get Grilled لعبة أسئلة ومعلومات للمتعة والتدريب، وليست اختبارًا ولا أداة تقييم رسمية.',
      'قد تحتوي الأسئلة والأجوبة على أخطاء. وإن استُخدمت اللعبة لرصد الدرجات، فالمقدّم أو المدرّس مسؤول عن التحقق من الأسئلة والنتائج.',
      'إلى أقصى حد يسمح به النظام، لا نتحمل أي مسؤولية عن أي خسارة أو ضرر من أي نوع ينتج عن استخدام اللعبة، بما في ذلك خسارة الدرجات أو العلامات أو الجوائز أو البيانات المحفوظة.',
      'أنت مسؤول عن الفئات والأسئلة التي تنشئها أو تستوردها أو تشاركها.',
      'تحفظ ألعابك وفئاتك في هذا المتصفح فقط. ولا نجمع حسابات ولا معلومات شخصية.',
    ],
    warnTitle: 'تحذير الحساسية للضوء:',
    warn: 'تستخدم هذه اللعبة مؤثرات ساطعة ومتحركة ولامعة. إن كنت أنت أو أحد المشاهدين مصابًا بالصرع أو حساسًا للضوء، فشغّل «تخفيف المؤثرات» من الإعدادات، أو لا تلعب.',
    reduceNow: 'شغّل «تخفيف المؤثرات» الآن',
    agreeA: 'قرأت ',
    terms: 'الشروط والأحكام',
    and: ' و',
    privacy: 'إشعار الخصوصية',
    agreeB: ' وأوافق عليهما.',
    decline: 'رفض',
    accept: 'موافق، لنبدأ',
    declined: 'يجب أن توافق على الشروط لتلعب Get Grilled.',
    backToSummary: 'رجوع',
    arabicPrevails: 'تقدَّم الشروط باللغتين العربية والإنجليزية، وعند الاختلاف يُعتمد النص العربي.',
    close: 'إغلاق',
    report: 'هل تظن أن الإجابة خاطئة؟ أخبر مقدّم اللعبة، وقراره نهائي.',
    reduceFx: 'تخفيف المؤثرات',
  },
}
