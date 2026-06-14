'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Copyright from '@/components/Copyright';

const TERMS = [
  { term: 'Action', def: 'The director\'s command to begin filming a scene. When you hear "Action" you begin your designated activity immediately.' },
  { term: 'Additional Director (AD)', def: 'On-set shorthand for an Assistant Director. Any member of the AD department responsible for coordinating set operations and managing background performers.' },
  { term: 'Apple Box', def: 'A sturdy wooden crate available in full, half, quarter, and pancake sizes. Used to elevate performers, props, or camera equipment to precise heights.' },
  { term: 'Background', def: 'A background performer or extra; someone hired to appear in scenes without scripted dialogue, populating the environment to make scenes feel realistic.' },
  { term: 'Background Action', def: 'The specific cue given to background performers to begin their designated activity within a scene, often called just before or after the main action cue.' },
  { term: 'Base Camp', def: 'The area on location where production vehicles, cast trailers, crew trucks, and support departments are stationed during a shoot day.' },
  { term: 'Blocking', def: 'The planned movement, positioning, and staging of performers and the camera for a scene, determined by the director before filming begins.' },
  { term: 'Call Sheet', def: 'A daily document distributed to all cast and crew the night before, listing the next day\'s schedule, scenes, locations, cast, and special requirements.' },
  { term: 'Call Time', def: 'The specific time a performer or crew member must arrive and report for work. Being late for call time is considered highly unprofessional.' },
  { term: 'Camera Left', def: 'The left side of the frame from the camera\'s perspective. This is the performer\'s right side when they are facing the camera.' },
  { term: 'Camera Right', def: 'The right side of the frame from the camera\'s perspective. This is the performer\'s left side when they are facing the camera.' },
  { term: 'Check the Gate', def: 'A request to inspect the camera aperture and film gate for debris, hair, or scratches before the crew moves on to the next setup.' },
  { term: 'Continuity', def: 'The careful maintenance of consistent wardrobe, props, hair, makeup, and body positions from shot to shot so that edits appear seamless.' },
  { term: 'Copy That', def: 'Radio communication acknowledgment meaning the message was received and understood. The professional response when an AD gives you a radio instruction.' },
  { term: 'Craft Services', def: 'The department providing snacks, beverages, and light refreshments available to cast and crew between scheduled meals. Background performers access craft services during designated breaks only.' },
  { term: 'Cut', def: 'The director\'s command to immediately stop filming. Do not move until instructed — the camera may still be rolling.' },
  { term: 'Dailies', def: 'Raw, unedited footage from the previous day\'s shooting, reviewed by the director and director of photography to assess performances and technical quality.' },
  { term: 'Day Player', def: 'A performer hired for a specific number of days on a production rather than the full duration of the shoot.' },
  { term: 'Dead Cat', def: 'A fluffy windscreen cover placed over a boom microphone to reduce wind noise during outdoor recording. Named for its appearance.' },
  { term: 'Director', def: 'The creative lead of a production responsible for guiding performances, camera placement, pacing, and overall visual storytelling. Never approach the director uninvited.' },
  { term: 'Dolly', def: 'A wheeled platform used to mount the camera and move it smoothly during a shot, either along a track (dolly track) or on the floor with rubber wheels.' },
  { term: 'DOP/DP', def: 'Director of Photography (also called Cinematographer). The department head responsible for all aspects of lighting, camera placement, lens choice, and overall image quality.' },
  { term: 'Double', def: 'A performer who substitutes for a principal actor in scenes requiring a physical match — for stunts, body shots, driving scenes, or appearance matching.' },
  { term: 'Downey', def: 'A type of daily payment voucher used by background performers in British Columbia to document hours worked, rate, and production details.' },
  { term: 'Dry Run', def: 'A full rehearsal of camera movement and performer blocking conducted without actually rolling the camera. Used to fine-tune timing and positions.' },
  { term: 'Extras', def: 'Background performers hired to populate scenes without scripted dialogue. Also called background artists or BG. A core part of every production.' },
  { term: 'Eye Line', def: 'The specific direction a performer looks during a scene. Eye line must remain consistent between shots to maintain visual logic when the editor cuts.' },
  { term: 'Featured Extra', def: 'A background performer assigned a specific, prominent action or visible position that draws noticeable attention in the shot, sometimes receiving additional pay.' },
  { term: 'First Assistant Director (1st AD)', def: 'The director\'s on-set coordinator. Responsible for running the floor, managing the schedule, communicating between departments, and calling roll, action, and cut.' },
  { term: 'First Team', def: 'The principal actors called to set for actual filming, as opposed to the Second Team (stand-ins) who are used during setup.' },
  { term: 'Flipping the Set', def: 'Repositioning all lighting equipment, cameras, and crew to shoot from the opposite direction within the same location — a time-consuming process.' },
  { term: 'General Background', def: 'The standard background performer category requiring no special skills, used to populate crowd scenes, street scenes, and general environments.' },
  { term: 'Holding', def: 'The designated waiting area where background performers remain between takes, typically a tent, trailer, or nearby room separate from the filming set.' },
  { term: 'Hot Set', def: 'A set that is actively being prepared for or used in filming. Nothing may be touched, moved, or disturbed on a hot set without permission.' },
  { term: 'Lock it Up', def: 'A command from the AD department to secure all entrances to the filming area and stop all movement, vehicle traffic, and exterior noise.' },
  { term: 'Martini Shot', def: 'The last shot of the shooting day. Named because after it, the next shot poured will be a martini — meaning the day is done.' },
  { term: 'MOS', def: 'Mit Out Sound — shooting without recording audio. The footage will have sound effects, music, or dialogue dubbed in during post-production.' },
  { term: 'Moving On', def: 'An announcement from the AD that the crew has completed the current camera setup and is moving to the next scene or shot.' },
  { term: 'Non-Deductible Meal', def: 'A meal provided to cast and crew that does not count against the overtime or meal penalty clock. Distinct from the standard meal break.' },
  { term: 'On a Bell', def: 'The period when a bell or buzzer sounds to signal that filming is about to begin. Absolute silence is required from everyone on and near set.' },
  { term: 'Photo Double', def: 'A background performer who closely matches a principal actor\'s physical appearance and is used for over-the-shoulder shots, body inserts, or wide shots.' },
  { term: 'Picture Car', def: 'A vehicle that appears on camera as part of the scene. Picture cars are handled by the transportation department and must not be touched.' },
  { term: 'Picture Up', def: 'The announcement that the camera is about to roll and all performers must be in their starting positions immediately.' },
  { term: 'Playback', def: 'Pre-recorded audio or video played on set during filming. Background performers may be asked to react to playback or lip-sync to it.' },
  { term: 'Principal Performer', def: 'An actor with a speaking or featured role in the production. Background performers should not approach, interrupt, or photograph principal performers.' },
  { term: 'Production', def: 'The company or team responsible for creating the film or television show. Also used to mean the production office or production department.' },
  { term: 'Quiet on Set', def: 'A command requiring absolute silence from all personnel on and near the set. Issued immediately before filming begins.' },
  { term: 'Reload', def: 'A command indicating the camera magazine is being changed or the camera is resetting. A short pause before filming can resume.' },
  { term: 'Roll Camera', def: 'The command for the camera operator to begin recording. Typically followed by the slate announcement and then the action call.' },
  { term: 'SAG/AFTRA', def: 'Screen Actors Guild — American Federation of Television and Radio Artists. The American performers union. SAG-AFTRA productions in Canada typically use ACTRA agreements.' },
  { term: 'Second Assistant Director (2nd AD)', def: 'Assists the 1st AD by managing background performer paperwork, coordinating vouchers, calling background to set, and handling BG logistics.' },
  { term: 'Second Team', def: 'Stand-ins who substitute for principal actors during the time-consuming process of setting up lights and camera angles. First Team rests while Second Team works.' },
  { term: 'Set PA', def: 'A Production Assistant working on the set floor. Usually the primary point of contact for background performers regarding direction, breaks, and vouchers.' },
  { term: 'Sides', def: 'Printed excerpts from the script covering only the scenes being filmed that day. Distributed to cast and crew before or on the shooting day.' },
  { term: 'Slate', def: 'The clapperboard used to identify each scene, shot, and take on camera. Also refers to reading the scene and take information aloud before filming.' },
  { term: 'Special Ability', def: 'A background performer category for those with specific skills — driving, horseback riding, playing an instrument, sports, dancing — that earns a higher rate.' },
  { term: 'Stand-in', def: 'A background performer who physically resembles a principal actor in height and coloring and substitutes for them during lighting and camera setup. Earns a higher rate.' },
  { term: 'UBCP', def: 'Union of British Columbia Performers. The union representing professional performers — including background performers — working on productions in British Columbia. See ubcpactra.ca.' },
  { term: 'Video Village', def: 'The area on set where monitors display the live camera feed, allowing the director, producers, and key creative personnel to view shots in real time.' },
  { term: 'Voucher', def: 'The official daily payment record completed by a background performer documenting hours worked. Accumulating vouchers can count toward UBCP/ACTRA membership eligibility.' },
  { term: 'Walking', def: 'The signal or moment when background performers begin their designated action or movement within a scene, usually initiated by the AD or Set PA.' },
  { term: 'Wrap', def: 'The conclusion of filming for the day, for a specific scene, or for the entire production. Do not leave set until you have been officially wrapped by the AD.' },
  { term: 'Wrangler', def: 'A crew member responsible for managing and coordinating a specific group — background performers, animals, vehicles, or specialty props — on set.' },
];

const QUESTIONS_PER_ROUND = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound(terms: typeof TERMS) {
  const shuffled = shuffle(terms);
  const selected = shuffled.slice(0, QUESTIONS_PER_ROUND);
  return selected.map((item, idx) => {
    const wrong = shuffle(terms.filter(t => t.term !== item.term)).slice(0, 3);
    const options = shuffle([item, ...wrong]);
    return { ...item, options, index: idx };
  });
}

type Question = ReturnType<typeof buildRound>[0];
type GameState = 'start' | 'playing' | 'ended';
type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function FilmTrivia() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<Array<{ term: string; def: string; chosen: string; correct: boolean }>>([]);

  const startGame = useCallback(() => {
    const round = buildRound(TERMS);
    setQuestions(round);
    setCurrent(0);
    setSelected(null);
    setAnswerState('unanswered');
    setScore(0);
    setResults([]);
    setGameState('playing');
  }, []);

  const handleAnswer = useCallback((chosenTerm: string) => {
    if (answerState !== 'unanswered') return;
    const q = questions[current];
    const isCorrect = chosenTerm === q.term;
    setSelected(chosenTerm);
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setScore(s => s + 1);
    setResults(r => [...r, { term: q.term, def: q.def, chosen: chosenTerm, correct: isCorrect }]);

    const delay = isCorrect ? 1200 : 1800;
    setTimeout(() => {
      if (current + 1 >= QUESTIONS_PER_ROUND) {
        setGameState('ended');
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
        setAnswerState('unanswered');
      }
    }, delay);
  }, [answerState, questions, current]);

  const pct = Math.round((score / QUESTIONS_PER_ROUND) * 100);

  if (gameState === 'start') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, Arial, sans-serif' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>🎬</div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Film Set Trivia</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 28px', lineHeight: '1.6' }}>
            You'll see a definition. Pick the correct film set term from four options.
            10 questions per round — all from the SetReady glossary.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
            {[['📖', `${TERMS.length} terms`], ['❓', '10 questions'], ['⏱', '~3 minutes']].map(([icon, label]) => (
              <span key={label as string} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '12px', padding: '5px 12px', borderRadius: '20px' }}>
                {icon} {label}
              </span>
            ))}
          </div>
          <button
            onClick={startGame}
            style={{ width: '100%', padding: '16px', backgroundColor: '#F59E0B', color: '#1a1a2e', fontWeight: '800', fontSize: '17px', border: 'none', borderRadius: '14px', cursor: 'pointer', letterSpacing: '0.02em' }}
          >
            Start Game
          </button>
          <div style={{ marginTop: '20px' }}>
            <Link href="/games" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Back to Games</Link>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'ended') {
    const grade = pct >= 90 ? '🏆 Excellent!' : pct >= 70 ? '🎭 Well done!' : pct >= 50 ? '📖 Keep studying!' : '🎬 Keep practising!';
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif' }}>
        <div style={{ backgroundColor: '#1a1a2e', padding: '20px 16px' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '52px', marginBottom: '8px' }}>{pct >= 70 ? '🏆' : '🎬'}</div>
            <h1 style={{ fontWeight: '800', fontSize: '22px', color: 'white', margin: '0 0 4px' }}>Round Complete!</h1>
            <p style={{ fontSize: '36px', fontWeight: '900', color: '#F59E0B', margin: '8px 0 4px' }}>{score}/{QUESTIONS_PER_ROUND}</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>{pct}% — {grade}</p>
          </div>
        </div>

        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px 48px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>Question Breakdown</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
            {results.map((r, i) => (
              <div key={i} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px', border: `1px solid ${r.correct ? '#bbf7d0' : '#fecaca'}`, borderLeft: `4px solid ${r.correct ? '#22c55e' : '#ef4444'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: r.correct ? '#16a34a' : '#dc2626', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {r.correct ? '✓ Correct' : `✗ You said: ${r.chosen}`}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' }}>{r.term}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>{r.def}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={startGame}
              style={{ width: '100%', padding: '14px', backgroundColor: '#1a1a2e', color: 'white', fontWeight: '700', fontSize: '15px', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
            >
              Play Again
            </button>
            <Link href="/games" style={{ display: 'block', textAlign: 'center', padding: '14px', backgroundColor: 'white', color: '#374151', fontWeight: '600', fontSize: '15px', border: '1px solid #e5e7eb', borderRadius: '12px', textDecoration: 'none' }}>
              ← Back to Games
            </Link>
            <Link href="/glossary" style={{ display: 'block', textAlign: 'center', padding: '12px', color: '#6b7280', fontSize: '13px', textDecoration: 'none' }}>
              📖 Study the glossary
            </Link>
          </div>
          <Copyright />
        </div>
      </div>
    );
  }

  // Playing
  const q = questions[current];
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, Arial, sans-serif' }}>

      {/* Progress bar header */}
      <div style={{ backgroundColor: '#1a1a2e', padding: '14px 16px 0' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Question {current + 1} of {QUESTIONS_PER_ROUND}</span>
            <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '700' }}>Score: {score}</span>
          </div>
          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px', marginBottom: '0' }}>
            <div style={{ height: '100%', width: `${((current) / QUESTIONS_PER_ROUND) * 100}%`, backgroundColor: '#F59E0B', borderRadius: '2px', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Definition card */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>What term matches this definition?</p>
          <p style={{ fontSize: '16px', color: '#1a1a2e', lineHeight: '1.65', margin: 0, fontWeight: '500' }}>{q.def}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {q.options.map((opt) => {
            const isSelected = selected === opt.term;
            const isCorrectAnswer = opt.term === q.term;
            let bg = 'white';
            let border = '1px solid #e5e7eb';
            let textColor = '#1a1a2e';
            let icon = '';

            if (answerState !== 'unanswered') {
              if (isCorrectAnswer) {
                bg = '#f0fdf4'; border = '2px solid #22c55e'; textColor = '#15803d'; icon = ' ✓';
              } else if (isSelected) {
                bg = '#fef2f2'; border = '2px solid #ef4444'; textColor = '#dc2626'; icon = ' ✗';
              } else {
                bg = '#f9fafb'; border = '1px solid #e5e7eb'; textColor = '#9ca3af';
              }
            }

            return (
              <button
                key={opt.term}
                onClick={() => handleAnswer(opt.term)}
                disabled={answerState !== 'unanswered'}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 18px',
                  backgroundColor: bg,
                  border,
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: textColor,
                  cursor: answerState === 'unanswered' ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {opt.term}{icon}
              </button>
            );
          })}
        </div>

        {answerState !== 'unanswered' && (
          <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: answerState === 'correct' ? '#f0fdf4' : '#fef2f2', borderRadius: '10px', fontSize: '13px', color: answerState === 'correct' ? '#15803d' : '#dc2626', textAlign: 'center' }}>
            {answerState === 'correct' ? '🎉 Correct! Moving on...' : `The correct answer was: ${q.term}`}
          </div>
        )}
      </div>
    </div>
  );
}
