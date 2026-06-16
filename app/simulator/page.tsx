'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Copyright from '@/components/Copyright';

const SCENARIOS = [
  {
    id: 1,
    situation: "The director calls action but you didn't hear where to walk. What do you do?",
    options: [
      "Start walking anyway and hope for the best.",
      "Freeze in place and wait for cut.",
      "Quietly ask the nearest AD for direction before action is called next time.",
    ],
    correct: 2,
    explanation: "Always clarify direction from ADs between takes, never during. Freezing is better than guessing wrong.",
  },
  {
    id: 2,
    situation: "You spot the lead actor between takes and they make eye contact with you. What do you do?",
    options: [
      "Go introduce yourself — they seem friendly.",
      "Give a polite nod and look away. Do not approach unless they initiate.",
      "Take a quick photo for social media.",
    ],
    correct: 1,
    explanation: "Never approach principal actors. If they initiate conversation that is fine, but let them lead. Never photograph anyone on set without explicit permission.",
  },
  {
    id: 3,
    situation: "You are 10 minutes away and realize you will be 5 minutes late for call time.",
    options: [
      "Just show up and apologize when you arrive.",
      "Call or text your agent and the set PA immediately to notify them.",
      "Rush and hopefully make it on time without telling anyone.",
    ],
    correct: 1,
    explanation: "Always notify your agent and the production as soon as you know you may be late. Being late without notice can get you removed from the agency roster.",
  },
  {
    id: 4,
    situation: "Craft services has amazing food. You are hungry between takes. What do you do?",
    options: [
      "Help yourself whenever you want — it is there for everyone.",
      "Wait until the AD announces a meal break or craft services break.",
      "Sneak a snack quickly when no one is looking.",
    ],
    correct: 1,
    explanation: "Background performers eat at designated break times. Taking food without permission disrupts production and marks you as unprofessional.",
  },
  {
    id: 5,
    situation: "You overhear a major plot twist while on set. Your friend is a big fan of the show. What do you do?",
    options: [
      "Tell your friend privately — it stays between you.",
      "Post a vague hint on social media without naming the show.",
      "Say nothing to anyone. Confidentiality is a professional obligation.",
    ],
    correct: 2,
    explanation: "NDAs and professional confidentiality are serious. Leaking spoilers can result in legal action and end your career as a background performer permanently.",
  },
  {
    id: 6,
    situation: "Another background performer is loudly complaining about the director to other extras in holding. What do you do?",
    options: [
      "Join in — it feels good to vent together.",
      "Record it in case it is useful later.",
      "Quietly distance yourself. Stay professional and do not engage with negativity on set.",
    ],
    correct: 2,
    explanation: "Sets are small communities. Negativity spreads and gets noticed. Maintaining professionalism even in holding will build your reputation.",
  },
  {
    id: 7,
    situation: "You are asked to do the same background action repeatedly for 4 hours. You are bored and your feet hurt. What do you do?",
    options: [
      "Ask the AD if you can take a longer break.",
      "Sit down between takes to rest your feet.",
      "Stay in position, stay alert, and maintain your energy. This is the job.",
    ],
    correct: 2,
    explanation: "Endurance and professionalism under repetitive conditions is exactly what makes background performers worth hiring again. The camera can roll at any moment.",
  },
  {
    id: 8,
    situation: "You notice your phone accidentally went off on set during filming. What do you do?",
    options: [
      "Quickly silence it and hope no one noticed.",
      "Immediately silence it and apologize quietly to the nearest crew member.",
      "Leave the set to deal with it.",
    ],
    correct: 1,
    explanation: "Phones should be silenced before entering set. If it goes off, silence immediately and briefly acknowledge it to nearby crew. Own the mistake professionally.",
  },
  {
    id: 9,
    situation: "Wardrobe asks you to wear something that makes you uncomfortable but is not inappropriate. What do you do?",
    options: [
      "Refuse and offer no explanation.",
      "Wear it without saying anything even though you are very uncomfortable.",
      "Politely explain your concern to the wardrobe department and find a compromise.",
    ],
    correct: 2,
    explanation: "Wardrobe teams are professionals and want performers to be comfortable within reason. Communicate respectfully and they will usually find a solution.",
  },
  {
    id: 10,
    situation: "The shoot runs 2 hours over schedule. You have plans tonight. What do you do?",
    options: [
      "Leave at your original wrap time and let them deal with it.",
      "Stay and inform your agent you are working overtime.",
      "Complain loudly to other extras about the delay.",
    ],
    correct: 1,
    explanation: "You are contracted to work and overtime is part of the job. Always notify your agent and anyone waiting for you. Leaving early breaks your contract.",
  },
];

export default function SimulatorPage() {
  useEffect(() => { localStorage.setItem('sr-simulator-visited', '1') }, [])

  const [currentQ, setCurrentQ] = useState(0);
  const [picks, setPicks]       = useState<(number | null)[]>(new Array(10).fill(null));
  const [revealed, setRevealed] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const scenario  = SCENARIOS[currentQ];
  const pick      = picks[currentQ];
  const isCorrect = pick === scenario.correct;

  function selectAnswer(idx: number) {
    if (revealed) return;
    const next = [...picks];
    next[currentQ] = idx;
    setPicks(next);
    setRevealed(true);
  }

  function next() {
    setRevealed(false);
    if (currentQ === 9) {
      setGameOver(true);
    } else {
      setCurrentQ(q => q + 1);
    }
  }

  function tryAgain() {
    setCurrentQ(0);
    setPicks(new Array(10).fill(null));
    setRevealed(false);
    setGameOver(false);
  }

  const score = SCENARIOS.reduce((acc, s, i) => acc + (picks[i] === s.correct ? 1 : 0), 0);

  const NavBar = () => (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎭</span>
          <span className="font-bold text-gray-900">Scenario Simulator</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition">← Dashboard</Link>
      </div>
    </div>
  );

  /* ── Results Screen ─────────────────────────────────────── */
  if (gameOver) {
    const pct   = Math.round((score / 10) * 100);
    const grade = score === 10 ? '🏆 Perfect Score!'
                : score >= 8  ? '🌟 Excellent!'
                : score >= 6  ? '👍 Good work!'
                : '📚 Keep practising!';
    const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';

    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-2xl mx-auto px-4 py-10">

          {/* Score card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mb-6">
            <div className="text-5xl mb-3">🎬</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{grade}</h1>
            <p className="text-6xl font-bold text-gray-900 my-4">
              {score}<span className="text-2xl font-normal text-gray-400">/10</span>
            </p>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
              <div className={`h-3 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-gray-500">{pct}% correct</p>
          </div>

          {/* Perfect score message */}
          {score === 10 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center mb-6">
              <p className="font-bold text-green-800 mb-1">You answered all 10 scenarios correctly!</p>
              <p className="text-sm text-green-700">You know how to conduct yourself professionally on any set.</p>
            </div>
          )}

          {/* Wrong answers review */}
          {SCENARIOS.some((s, i) => picks[i] !== s.correct) && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Review — Incorrect Answers</h2>
              <div className="space-y-4">
                {SCENARIOS.map((s, i) => {
                  if (picks[i] === s.correct) return null;
                  return (
                    <div key={s.id} className="bg-white rounded-2xl border border-red-100 p-5">
                      <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">Question {i + 1}</p>
                      <p className="font-semibold text-gray-800 mb-3 leading-snug text-sm">{s.situation}</p>
                      <div className="space-y-2 mb-3 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-red-500 font-bold shrink-0 mt-0.5">✗</span>
                          <span className="text-red-700">Your answer: {picks[i] !== null ? s.options[picks[i]!] : 'No answer'}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 font-bold shrink-0 mt-0.5">✓</span>
                          <span className="text-green-800 font-medium">Correct: {s.options[s.correct]}</span>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                        💡 {s.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={tryAgain}
            className="w-full py-3.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition text-base"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ── Quiz Screen ────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200">
        <div
          className="h-1.5 bg-amber-500 transition-all duration-300"
          style={{ width: `${((currentQ + (revealed ? 1 : 0)) / 10) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Question number */}
        <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-4">
          Scenario {currentQ + 1} of 10
        </p>

        {/* Situation card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <p className="text-lg font-semibold text-gray-900 leading-snug">{scenario.situation}</p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-5">
          {scenario.options.map((option, idx) => {
            let cls = 'bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50 cursor-pointer';
            if (revealed) {
              if (idx === scenario.correct) {
                cls = 'bg-green-50 border-green-400 text-green-900 cursor-default';
              } else if (idx === pick) {
                cls = 'bg-red-50 border-red-400 text-red-900 cursor-default';
              } else {
                cls = 'bg-gray-50 border-gray-100 text-gray-400 cursor-default';
              }
            }
            return (
              <button
                key={idx}
                onClick={() => selectAnswer(idx)}
                disabled={revealed}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${cls}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`font-bold text-sm shrink-0 w-5 mt-0.5 ${revealed && idx === scenario.correct ? 'text-green-600' : revealed && idx === pick ? 'text-red-500' : 'text-gray-400'}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm leading-snug flex-1">{option}</span>
                  {revealed && idx === scenario.correct && <span className="text-green-600 font-bold shrink-0">✓</span>}
                  {revealed && idx === pick && idx !== scenario.correct && <span className="text-red-500 font-bold shrink-0">✗</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && (
          <div className={`rounded-2xl p-5 mb-5 border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`font-bold mb-1.5 ${isCorrect ? 'text-green-800' : 'text-blue-800'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Not quite — here is why:'}
            </p>
            <p className={`text-sm leading-relaxed ${isCorrect ? 'text-green-700' : 'text-blue-700'}`}>
              {scenario.explanation}
            </p>
          </div>
        )}

        {revealed && (
          <button
            onClick={next}
            className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 transition"
          >
            {currentQ === 9 ? 'See My Score →' : 'Next Scenario →'}
          </button>
        )}
      </div>
      <Copyright />
    </div>
  );
}
