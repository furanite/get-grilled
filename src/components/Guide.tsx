import { useRef } from 'react'
import { useDialog } from './Legal'

/**
 * Two in-page pop-ups, English only by the owner's choice:
 * study tips (shown once to first-time visitors, after the Terms pop-up) and the rules of the game
 * (from the Rules button at the top of the title screen).
 */

interface Section {
  title: string
  items: string[]
}

const TIPS: { title: string; intro: string; sections: Section[] } = {
  title: 'Turn revision into a game',
  intro: 'Get Grilled works as a study group game. Here is how to use it to revise your course with friends.',
  sections: [
    {
      title: 'Get the questions from your instructor',
      items: [
        'Ask your instructor for the Get Grilled question file for your course. It is one small file you can share by email, WhatsApp or your course page.',
        'On the title screen, press Question files, then Open a file, and choose it. Its topics show up at the top when you set up a game.',
        'When your instructor sends a newer copy of the same file, open it the same way. It replaces the old one.',
        'Instructors: press Question files, then Make a file. You can paste questions straight from a spreadsheet.',
      ],
    },
    {
      title: 'Make it fun (and make it stick)',
      items: [
        'Play in small teams and take turns answering, so everyone gets a go.',
        'After each answer, have someone explain why it is right. Explaining is the best way to remember.',
        'Start a session with the 100 and 200 tiles to warm up. Save the 500s for when the group is in the zone.',
        'Write down the questions your group missed and play them again next time.',
        'Turn the timer off while you are learning a topic, and turn it on to practise for the exam.',
        'Each member writes five questions on a chapter in the Category builder. Writing good questions is revision too.',
        'Keep sessions short: one board, then a break.',
        'Points are just for fun. If the group disagrees about an answer, check your course notes, and tell your instructor about any question that looks wrong.',
      ],
    },
  ],
}

const RULES: Section[] = [
  {
    title: 'The board',
    items: [
      'Pick up to 6 categories and 2 to 4 teams. Each category has five tiles, from 100 (warm-up) to 500 (expert). Harder tiles are worth more.',
      'A random team picks first, then the turn passes round the teams one at a time.',
      'With Comeback on, the team in last place picks the next tile instead.',
    ],
  },
  {
    title: 'Answering',
    items: [
      'The host reads the question out. Answers do not need to be in the form of a question, and English or Arabic is fine.',
      'Right answer: the team wins the tile’s points.',
      'Wrong answer: if “Take points away” is on, the team loses the tile’s points. Other teams can still try.',
      'If nobody gets it, the host shows the answer and nobody scores.',
      'With a timer on, the clock starts only once the question is on screen.',
    ],
  },
  {
    title: 'Special tiles',
    items: [
      'Each special tile shows its name first. The question comes when the host presses Next.',
      'Golden tile: double points.',
      'Steal: the team that answers right takes the points from another team.',
      'Audience: someone in the audience answers for the team that picked the tile.',
      'Streak bonus: three right answers in a row earn a team 100 extra points.',
    ],
  },
  {
    title: 'After the board',
    items: [
      'Special round: picture round, true or false, case file, translate it or odd one out. 200 points for each right answer. In clue by clue, the fewer clues a team needs, the more points it gets.',
      'Lightning round: 60 seconds of quick questions. 100 points for each right answer, and nothing is taken away.',
      'Final question: every team writes its answer in secret. 500 points for each team that gets it right.',
      'Tournament: several rounds one after another, such as a double-points board. Scores carry over from round to round.',
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

function GuideDialog({ id, title, children, actions, onClose }: { id: string; title: string; children: React.ReactNode; actions: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialog(ref, onClose)
  return (
    <div className="legal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-panel guide" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} ref={ref} data-testid={id} dir="ltr" lang="en">
        <div className="legal-head">
          <h1 id={`${id}-title`}>{title}</h1>
          <button className="ghost" onClick={onClose} aria-label="Close">
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
export function TipsDialog({ onClose, onOpenFiles }: { onClose: () => void; onOpenFiles: () => void }) {
  return (
    <GuideDialog
      id="tips"
      title={TIPS.title}
      onClose={onClose}
      actions={
        <>
          <button className="btn alt" onClick={onOpenFiles} data-testid="tips-files">
            Open question files
          </button>
          <button className="btn" onClick={onClose} data-autofocus data-testid="tips-close">
            Got it, let’s play
          </button>
        </>
      }
    >
      <p>{TIPS.intro}</p>
      <Sections list={TIPS.sections} />
    </GuideDialog>
  )
}

/** The rules of the game, from the Rules button at the top of the title screen. */
export function RulesDialog({ onClose, onTips }: { onClose: () => void; onTips: () => void }) {
  return (
    <GuideDialog
      id="rules"
      title="How to play"
      onClose={onClose}
      actions={
        <>
          <button className="btn alt" onClick={onTips} data-testid="rules-tips">
            Study group tips
          </button>
          <button className="btn" onClick={onClose} data-autofocus data-testid="rules-close">
            Close
          </button>
        </>
      }
    >
      <Sections list={RULES} />
      <section>
        <h2>Buzzers</h2>
        <p>
          Using a buzzer box or the Raspberry Pi?{' '}
          <a href="buzzer-guide.html" target="_blank" rel="noopener" data-testid="rules-buzzer-guide">
            Open the setup guide with pictures
          </a>{' '}
          (it prints too).
        </p>
      </section>
    </GuideDialog>
  )
}
