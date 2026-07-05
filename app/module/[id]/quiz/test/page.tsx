'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient()

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface TestPageProps {
  params: Promise<{ id: string }>;
}

// =====================================================
// MODULE 1: Film Set Terminology (15 questions)
// =====================================================
const MODULE_1_QUESTIONS: Question[] = [
  {
    id: 'm1-q1',
    text: "Why does the film industry operate on a 24-hour clock?",
    options: [
      "To confuse new performers",
      "To eliminate AM/PM confusion during overnight shoots",
      "To follow military tradition",
      "To make calculations harder"
    ],
    correctAnswer: 1,
    explanation: "Lesson 1.1: The film industry operates on a 24-hour clock to eliminate AM/PM confusion during overnight shoots."
  },
  {
    id: 'm1-q2',
    text: "How long do productions routinely run?",
    options: [
      "8-10 hour days",
      "10-12 hour days",
      "14-16 hour days",
      "24 hour days"
    ],
    correctAnswer: 2,
    explanation: "Lesson 1.1: Productions routinely run 14-16 hour days."
  },
  {
    id: 'm1-q3',
    text: "What is the minimum legal turnaround requirement under ACTRA/UBCP?",
    options: [
      "8 hours",
      "10 hours",
      "12 hours",
      "14 hours"
    ],
    correctAnswer: 2,
    explanation: "Lesson 1.1: A 12-hour turnaround is the minimum legal requirement under ACTRA/UBCP collective agreements."
  },
  {
    id: 'm1-q4',
    text: "What is 'call time'?",
    options: [
      "When you arrive at the parking lot",
      "When you must be ready to work in wardrobe and makeup",
      "When you start driving to set",
      "When you sign your voucher"
    ],
    correctAnswer: 1,
    explanation: "Lesson 1.1: 'Call time' is when you must be ready to work in wardrobe and makeup, not when you arrive."
  },
  {
    id: 'm1-q5',
    text: "How early should professional performers arrive before call time?",
    options: [
      "Exactly at call time",
      "5 minutes before call time",
      "15-20 minutes before call time",
      "30 minutes after call time"
    ],
    correctAnswer: 2,
    explanation: "Lesson 1.1: Professional performers arrive 15-20 minutes before call time to account for parking, wardrobe checks, and sign-in procedures."
  },
  {
    id: 'm1-q6',
    text: "How is time tracked for payroll accuracy?",
    options: [
      "15-minute increments",
      "30-minute increments",
      "6-minute increments (0.1 hours)",
      "1-hour increments"
    ],
    correctAnswer: 2,
    explanation: "Lesson 1.1: Time is tracked in 6-minute increments (0.1 hours) for payroll accuracy."
  },
  {
    id: 'm1-q7',
    text: "What is the overtime rate for hours 8-12?",
    options: [
      "Straight time",
      "1.5x (time and a half)",
      "2.0x (double time)",
      "2.5x"
    ],
    correctAnswer: 1,
    explanation: "Lesson 1.1: Hours 8-12: 1.5x (time and a half)"
  },
  {
    id: 'm1-q8',
    text: "What is the overtime rate for hours 12+?",
    options: [
      "Straight time",
      "1.5x (time and a half)",
      "2.0x (double time)",
      "2.5x"
    ],
    correctAnswer: 2,
    explanation: "Lesson 1.1: Hours 12+: 2x (double time)"
  },
  {
    id: 'm1-q9',
    text: "What triggers a meal penalty?",
    options: [
      "If meal is served before 4 hours",
      "If meal is delayed beyond 6 hours",
      "If meal is skipped entirely",
      "If meal is served after 8 hours"
    ],
    correctAnswer: 1,
    explanation: "Lesson 1.1: Meal Penalty: If meal is delayed beyond 6 hours, production pays penalties"
  },
  {
    id: 'm1-q10',
    text: "What is the role of the 1st Assistant Director (1st AD)?",
    options: [
      "Handles costumes and wardrobe",
      "Sets the pace, manages the schedule, ensures safety",
      "Operates the camera",
      "Manages craft services"
    ],
    correctAnswer: 1,
    explanation: "Lesson 1.2: 1st AD sets the pace, manages the schedule, ensures safety"
  },
  {
    id: 'm1-q11',
    text: "Who is your primary contact for vouchers?",
    options: [
      "The Director",
      "The 1st AD",
      "The 2nd AD",
      "3rd AD or The Background Wrangler"
    ],
    correctAnswer: 2,
    explanation: "Lesson 1.2: The 2nd AD is your primary contact and handles vouchers."
  },
  {
    id: 'm1-q12',
    text: "Who should you never approach directly on set?",
    options: [
      "The 2nd AD",
      "The Background Wrangler",
      "The Director",
      "The 3rd AD"
    ],
    correctAnswer: 2,
    explanation: "Lesson 1.2: Never approach the Director directly – all communication flows through the AD department"
  },
  {
    id: 'm1-q13',
    text: "What does the command 'Background action' mean?",
    options: [
      "Principal actors begin speaking",
      "Start background movement",
      "Stop all movement",
      "Return to starting position"
    ],
    correctAnswer: 1,
    explanation: "Lesson 1.3: 'Background action' means start background movement."
  },
  {
    id: 'm1-q14',
    text: "What does 'That's a wrap' mean?",
    options: [
      "Start filming",
      "Take a break",
      "End of day - you are dismissed after signing out",
      "Reset the scene"
    ],
    correctAnswer: 2,
    explanation: "Lesson 1.3: 'That's a wrap' means end of day - you are dismissed after signing out."
  },
  {
    id: 'm1-q15',
    text: "What is a 'Hot Set'?",
    options: [
      "A set that is too warm",
      "A set actively being filmed - DO NOT ENTER",
      "A set with hot lights",
      "A set with principal actors"
    ],
    correctAnswer: 1,
    explanation: "Lesson 1.4: A 'Hot Set' means cameras are active. DO NOT ENTER. Never touch anything."
  }
];

// =====================================================
// MODULE 2: Background Acting Terms & Performance (15 questions)
// =====================================================
const MODULE_2_QUESTIONS: Question[] = [
  {
    id: 'm2-q1',
    text: "What is a 'mark' on a film set?",
    options: [
      "A signature on a voucher",
      "A piece of colored spike tape on the floor indicating your exact position",
      "A type of camera lens",
      "A lighting cue"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.1: A mark is a piece of colored spike tape on the floor indicating your exact position for camera focus and lighting."
  },
  {
    id: 'm2-q2',
    text: "What are the three types of marks mentioned in Lesson 2.1?",
    options: [
      "Red, blue, and green dots",
      "T-shaped tape, cross-shaped tape, colored tape",
      "Square, circle, triangle tape",
      "Numbered stickers only"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.1: Types of Marks: T-shaped tape, cross-shaped tape, colored tape"
  },
  {
    id: 'm2-q3',
    text: "What is continuity?",
    options: [
      "The script supervisor's notes",
      "Keeping consistent positioning, wardrobe, and actions between takes",
      "The editing process",
      "The director's vision"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.2: Continuity ensures consistent positioning, wardrobe, and actions."
  },
  {
    id: 'm2-q4',
    text: "What must match across every take?",
    options: [
      "Only dialogue",
      "Physical positioning, prop handling, walking path, facial expression, clothing",
      "Only camera angles",
      "Only lighting"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.2: Physical positioning, prop handling, walking path, facial expression, clothing"
  },
  {
    id: 'm2-q5',
    text: "What is the critical rule about looking at the camera?",
    options: [
      "Always look directly at the camera",
      "Never look directly at the camera unless specifically instructed",
      "Look at the camera only during close-ups",
      "Look at the camera between takes"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.3: Never look directly at the camera unless specifically instructed."
  },
  {
    id: 'm2-q6',
    text: "What does 'eyeline' refer to?",
    options: [
      "The camera angle",
      "Where the actor is looking",
      "The lighting direction",
      "The character's costume"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.3: Eyeline is where the actor directs their gaze."
  },
  {
    id: 'm2-q7',
    text: "What is the 'furniture' mindset?",
    options: [
      "Arranging props",
      "Blending into the environment without drawing attention",
      "Moving furniture",
      "Working in props"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.4: The furniture mindset means being present but not drawing focus."
  },
  {
    id: 'm2-q8',
    text: "What is pantomime?",
    options: [
      "Dance routines",
      "Silent acting without props",
      "Singing on camera",
      "Reading lines"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.5: Pantomime is silent acting without props."
  },
  {
    id: 'm2-q9',
    text: "What is 'business' in background acting?",
    options: [
      "Talking to principals",
      "Your activity (reading, typing, etc.)",
      "Paperwork",
      "Union meetings"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.5: Business is your activity (reading, typing)."
  },
  {
    id: 'm2-q10',
    text: "What is a 'cross' in acting?",
    options: [
      "Crossing out lines",
      "Walking across frame",
      "A camera angle",
      "A lighting technique"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.5: A cross is walking across frame."
  },
  {
    id: 'm2-q11',
    text: "What does 'deep background' mean?",
    options: [
      "Close to camera",
      "Far from camera, focus on group movement",
      "Principal acting",
      "Stand-in work"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.5: Deep background means far from camera, focus on group movement."
  },
  {
    id: 'm2-q12',
    text: "When should background actors begin moving after 'Action'?",
    options: [
      "Immediately on 'Action'",
      "Wait for 'Background Action'",
      "Look at the camera first",
      "Stop moving"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.5: Background actors move on 'Background Action,' not on 'Action'."
  },
  {
    id: 'm2-q13',
    text: "What is the rule about touching equipment?",
    options: [
      "Handle freely",
      "Never touch camera, lighting, or sound equipment",
      "Only touch if interested",
      "Ask permission first"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.6: Never touch camera, lighting, or sound equipment."
  },
  {
    id: 'm2-q14',
    text: "What should you do about cables on the floor?",
    options: [
      "Step over them",
      "Ask for cable covers",
      "Move them yourself",
      "Ignore them"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.6: Never step over cables – ask for cable covers."
  },
  {
    id: 'm2-q15',
    text: "What is the professional insight about hitting marks?",
    options: [
      "It is not important",
      "Actors who consistently miss their marks are often not rehired",
      "Only principals need to hit marks",
      "Marks are optional"
    ],
    correctAnswer: 1,
    explanation: "Lesson 2.1: Actors who consistently miss their marks are often not rehired."
  }
];

// =====================================================
// MODULE 3: Set Etiquette & Professional Conduct (15 questions)
// =====================================================
const MODULE_3_QUESTIONS: Question[] = [
  {
    id: 'm3-q1',
    text: "What is the #1 reason background performers are not rehired?",
    options: [
      "Poor acting",
      "Being late",
      "Wrong wardrobe",
      "Talking too much"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.1: Being late is the #1 reason background performers are not rehired."
  },
  {
    id: 'm3-q2',
    text: "What should you do if running late?",
    options: [
      "Don't show up",
      "Call your Agent or the 3rd AD or production office immediately",
      "Show up late and apologize",
      "Send a text"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.1: Call your Agent or the 3rd AD or production office immediately"
  },
  {
    id: 'm3-q3',
    text: "What is the cell phone protocol on set?",
    options: [
      "Use freely between takes",
      "Phones on silent or off at all times",
      "Use only in the bathroom",
      "Keep loud for emergencies"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.2: Phones on silent or off at all times"
  },
  {
    id: 'm3-q4',
    text: "Are NDAs legally binding?",
    options: [
      "No, they are optional",
      "Yes, they are legally binding",
      "Only for principals",
      "Only for union members"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.2: NDAs are legally binding"
  },
  {
    id: 'm3-q5',
    text: "What should you do immediately upon arrival?",
    options: [
      "Find craft services",
      "Sign in immediately with the 3rd AD or Background Wrangler",
      "Call your agent",
      "Find the director"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.3: Sign in immediately upon arrival – starts your pay clock"
  },
  {
    id: 'm3-q6',
    text: "What should you do with your voucher after signing?",
    options: [
      "Throw it away",
      "Take a photo for your records",
      "Give it to the director",
      "Mail it to ACTRA"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.3: Take a photo of your voucher for your records"
  },
  {
    id: 'm3-q7',
    text: "When should you sign out?",
    options: [
      "As soon as you finish your last scene",
      "When dismissed – never before",
      "At exactly 12 hours",
      "Whenever you want"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.3: Sign out when dismissed – never before"
  },
  {
    id: 'm3-q8',
    text: "Who eats first at craft services?",
    options: [
      "Background performers",
      "First team (principals) and Crew",
      "Crew",
      "Anyone can eat first"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.5: First team (principals) and Crew eat first"
  },
  {
    id: 'm3-q9',
    text: "What should you never do with production wardrobe?",
    options: [
      "Return it",
      "Take it home",
      "Report damage",
      "Ask for repairs"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.6: Never take wardrobe home – this is theft"
  },
  {
    id: 'm3-q10',
    text: "What should you never do with props?",
    options: [
      "Return them",
      "Take them home",
      "Report damage",
      "Handle with care"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.6: Do not take props home – this is theft"
  },
  {
    id: 'm3-q11',
    text: "How should you handle hero props?",
    options: [
      "Carelessly",
      "With extreme care",
      "Take them home",
      "Ignore them"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.6: Hero props are valuable – handle with extreme care"
  },
  {
    id: 'm3-q12',
    text: "Who should you report harassment to?",
    options: [
      "The Director",
      "3rd AD or Background Wrangler",
      "Other background actors",
      "Social media"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.7: Report to 3rd AD or Background Wrangler"
  },
  {
    id: 'm3-q13',
    text: "Can you be fired for reporting harassment in good faith?",
    options: [
      "Yes, production can fire anyone",
      "No, you cannot be fired or punished for reporting in good faith",
      "Only if you are non-union",
      "Only if you are wrong"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.7: You cannot be fired or punished for reporting in good faith"
  },
  {
    id: 'm3-q14',
    text: "What should you do if you need to leave holding?",
    options: [
      "Just leave",
      "Tell the Background Wrangler or 3rd AD",
      "Send a text",
      "Wait for lunch"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.2: Signal if leaving holding - inform the AD"
  },
  {
    id: 'm3-q15',
    text: "What is proper conduct with principal actors?",
    options: [
      "Ask for autographs",
      "Treat them as colleagues and be respectful of their space",
      "Stare at them",
      "Approach them first"
    ],
    correctAnswer: 1,
    explanation: "Lesson 3.4: Treat them as colleagues, make brief professional eye contact, respond if they speak to you, be respectful of their space"
  }
];

// =====================================================
// MODULE 4: Safety on Set (15 questions)
// =====================================================
const MODULE_4_QUESTIONS: Question[] = [
  {
    id: 'm4-q1',
    text: "What is your legal right regarding unsafe work?",
    options: [
      "Must do it anyway",
      "Right to refuse unsafe work",
      "Only union can refuse",
      "Only principals can refuse"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.1: No performer shall be dismissed or disciplined for refusing to work in conditions they reasonably believe to be unsafe."
  },
  {
    id: 'm4-q2',
    text: "What should you do if you see a safety hazard?",
    options: [
      "Ignore it",
      "Report to 3rd AD or Background Wrangler",
      "Wait until wrap",
      "Tell other actors"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.1: Report unsafe work immediately"
  },
  {
    id: 'm4-q3',
    text: "What is the first step in injury reporting?",
    options: [
      "Go home",
      "Advise Background Wrangler",
      "Call a lawyer",
      "Post on social media"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.1: Advise Background Wrangler immediately"
  },
  {
    id: 'm4-q4',
    text: "What should you do after reporting an injury to First Aid?",
    options: [
      "Go home and rest",
      "Complete an Accident Report and get a copy",
      "Ignore it",
      "Tell other actors"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.1: Complete an Accident Report – get a copy"
  },
  {
    id: 'm4-q5',
    text: "What is the rule about propane heater tent flaps?",
    options: [
      "Close them completely to keep heat in",
      "Never close tent flaps completely – ventilation prevents carbon monoxide poisoning",
      "Keep half closed",
      "Remove all flaps"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.3: Never close tent flaps completely – ventilation prevents carbon monoxide poisoning"
  },
  {
    id: 'm4-q6',
    text: "What is the minimum distance from propane heaters to combustibles?",
    options: [
      "1 foot",
      "2 feet",
      "4 feet 6 inches",
      "6 feet"
    ],
    correctAnswer: 2,
    explanation: "Lesson 4.3: Keep combustibles at least 4 feet 6 inches away"
  },
  {
    id: 'm4-q7',
    text: "What are symptoms of carbon monoxide poisoning?",
    options: [
      "Hunger and thirst",
      "Headache, nausea, dizziness, confusion",
      "Fever and chills",
      "Muscle pain"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.3: CO poisoning: headache, nausea, dizziness, confusion"
  },
  {
    id: 'm4-q8',
    text: "What are symptoms of heat exhaustion?",
    options: [
      "Shivering and numbness",
      "Dizziness, nausea, heavy sweating",
      "Confusion, no sweating",
      "Frostbite"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.4: Heat Exhaustion: Dizziness, nausea, heavy sweating"
  },
  {
    id: 'm4-q9',
    text: "What action should you take for heat stroke?",
    options: [
      "Rest and hydrate",
      "Seek shade",
      "Call 911",
      "Keep working"
    ],
    correctAnswer: 2,
    explanation: "Lesson 4.4: Heat Stroke: Call 911"
  },
  {
    id: 'm4-q10',
    text: "What is the critical rule about prop guns?",
    options: [
      "Handle freely",
      "Never touch a prop gun, even if you think it's not real",
      "Practice with them",
      "Take photos"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.5: Never touch a prop gun, even if you think it's not real."
  },
  {
    id: 'm4-q11',
    text: "What is the speed limit for vehicles in staging areas?",
    options: [
      "20 km/h",
      "15 km/h",
      "5-10 km/h",
      "30 km/h"
    ],
    correctAnswer: 2,
    explanation: "Lesson 4.6: Drive slowly (5-10 km/h in staging areas)"
  },
  {
    id: 'm4-q12',
    text: "Can you be forced to perform intimate scenes?",
    options: [
      "Yes, if it's in the script",
      "No, you cannot be forced to perform intimate scenes",
      "Only if you are union",
      "Only if you signed a waiver"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.7: You cannot be forced to perform intimate scenes"
  },
  {
    id: 'm4-q13',
    text: "What should you do if you smell gas on set?",
    options: [
      "Ignore it",
      "Report immediately",
      "Open a window",
      "Leave quietly"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.3: Report any smell of gas immediately"
  },
  {
    id: 'm4-q14',
    text: "What is required for child performers?",
    options: [
      "Nothing special",
      "Parental accompaniment required",
      "They can work alone",
      "No rest periods needed"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.8: Parental accompaniment required"
  },
  {
    id: 'm4-q15',
    text: "What should you do if you feel faint or dizzy?",
    options: [
      "Keep working",
      "Sit down immediately and tell AD",
      "Go to craft services",
      "Ignore it"
    ],
    correctAnswer: 1,
    explanation: "Lesson 4.4: Heat exhaustion requires seeking shade and hydrating"
  }
];

// =====================================================
// MODULE 5: Industry Standards, Pay & Career Advancement (15 questions)
// =====================================================
const MODULE_5_QUESTIONS: Question[] = [
  {
    id: 'm5-q1',
    text: "What is the Special Ability bump rate?",
    options: [
      "+$10/day",
      "+$20-50/day",
      "+$100/day",
      "+$200/day"
    ],
    correctAnswer: 1,
    explanation: "Lesson 5.1: Special Ability: +$20-50/day"
  },
  {
    id: 'm5-q2',
    text: "What is the Stand-in bump rate?",
    options: [
      "+$10/day",
      "+$25-50/day",
      "+$100/day",
      "+$200/day"
    ],
    correctAnswer: 1,
    explanation: "Lesson 5.1: Stand-in: +$25-50/day"
  },
  {
    id: 'm5-q3',
    text: "What is the Photo Double bump rate?",
    options: [
      "+$10/day",
      "+$25-50/day",
      "+$100/day",
      "+$200/day"
    ],
    correctAnswer: 1,
    explanation: "Lesson 5.1: Photo Double: +$25-50/day"
  },
  {
    id: 'm5-q4',
    text: "What pension contribution rate do ACTRA/UBCP members receive?",
    options: [
      "5%",
      "7%",
      "10%",
      "12%"
    ],
    correctAnswer: 1,
    explanation: "Lesson 5.2: Pension contributions (7%)"
  },
  {
    id: 'm5-q5',
    text: "How many qualifying credits are required for full ACTRA membership?",
    options: [
      "1",
      "2",
      "3",
      "5"
    ],
    correctAnswer: 2,
    explanation: "Lesson 5.2: 3 qualifying credits required for full membership"
  },
  {
    id: 'm5-q6',
    text: "Do background permits count toward ACTRA/UBCP full membership?",
    options: [
      "Yes, they count",
      "No, background permits do NOT count – only speaking/featured roles",
      "Only if you have 10 permits",
      "Only union permits count"
    ],
    correctAnswer: 1,
    explanation: "Lesson 5.2: Background permits do NOT count – only speaking/featured roles"
  },
  {
    id: 'm5-q7',
    text: "What is the ACTRA/UBCP initiation fee?",
    options: [
      "$800",
      "$1,200",
      "$1,600",
      "$2,000"
    ],
    correctAnswer: 2,
    explanation: "Lesson 5.2: Initiation fee: $1,600 CAD"
  },
  {
    id: 'm5-q8',
    text: "What triggers an upgrade to Principal Actor rates?",
    options: [
      "Working 8 hours",
      "Speaking any line of dialogue",
      "Getting a voucher",
      "Joining ACTRA"
    ],
    correctAnswer: 1,
    explanation: "Lesson 5.4: Speaking line triggers immediate upgrade to Principal Actor rates"
  },
  {
    id: 'm5-q9',
    text: "Upon upgrade to Principal Actor rates, when is the new rate applied?",
    options: [
      "Starting the next day",
      "Retroactive to call time",
      "Only for future scenes",
      "After signing a new contract"
    ],
    correctAnswer: 1,
    explanation: "Lesson 5.4: Paid principal actor rates retroactive to call time"
  },
  {
    id: 'm5-q10',
    text: "What is the 2026 BC background rate for an 8-hour day?",
    options: [
      "$244.04",
      "$259.90",
      "$270.30",
      "$285.00"
    ],
    correctAnswer: 2,
    explanation: "Lesson 5.5: Background (8 hours): $270.30"
  },
  {
    id: 'm5-q11',
    text: "What is the permit fee for background in BC?",
    options: [
      "$7.50",
      "$10.00",
      "$12.50",
      "$15.00"
    ],
    correctAnswer: 3,
    explanation: "Lesson 5.5: Permit fee: $15.00/day"
  },
  {
    id: 'm5-q12',
    text: "What is the Union night premium rate in BC?",
    options: [
      "$20.00",
      "$25.00",
      "$30.00",
      "$35.00"
    ],
    correctAnswer: 2,
    explanation: "Lesson 5.5: Night premium: $30.00"
  },
  {
    id: 'm5-q13',
    text: "How does one become a Union Member",
    options: [
      "Ask a friend",
      "Pay 1 million dollars",
      "Start as a non-union background performer",
      "Move to the moon"
    ],
    correctAnswer: 2,
    explanation: "Lesson 5.5: How to Become a Member: Start as a non-union background performer"
  },
  {
    id: 'm5-q14',
    text: "Which is not a Professional Classification of Background Performers?",
    options: [
      "Stunts",
      "Special Ability",
      "Stand-in",
      "General Background"
    ],
    correctAnswer: 0,
    explanation: "Lesson 5.1: Professional Classification of Background Performers"
  },
  {
    id: 'm5-q15',
    text: "What is the minimum call-out pay for Union background?",
    options: [
      "4 hours",
      "6 hours",
      "8 hours",
      "10 hours"
    ],
    correctAnswer: 2,
    explanation: "Lesson 5.5: Background (8 hours) indicates 8-hour minimum"
  }
];

// =====================================================
// MODULE 6: Foundation (Stanislavski) - 15 questions
// =====================================================
const MODULE_6_QUESTIONS: Question[] = [
  {
    id: 'm6-q1',
    text: "What are 'given circumstances'?",
    options: [
      "The set design",
      "All conditions of the character's life the actor accepts as true",
      "The director's notes",
      "The script pages"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.1: Given circumstances are all conditions of the character's life the actor must accept as true."
  },
  {
    id: 'm6-q2',
    text: "What categories are included in given circumstances?",
    options: [
      "Only the character's name",
      "Who you are, where you are, when it is, what you want, what just happened, your relationships",
      "Only the costume",
      "Only the dialogue"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.1: Who you are, where you are, when it is, what you want, what just happened, your relationships"
  },
  {
    id: 'm6-q3',
    text: "What does Stanislavski say about specific given circumstances?",
    options: [
      "They don't matter",
      "The more specific your given circumstances, the more truthful your performance",
      "Only broad circumstances matter",
      "They are optional"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.1: The more specific your given circumstances, the more truthful your performance."
  },
  {
    id: 'm6-q4',
    text: "What is the 'Magic If'?",
    options: [
      "A superstition",
      "Asking 'What would I do IF I were in this situation?'",
      "A lighting cue",
      "A rehearsal warm-up"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.2: Ask yourself: What would I do IF I were in this character's situation?"
  },
  {
    id: 'm6-q5',
    text: "What is an 'objective' in acting?",
    options: [
      "The camera angle",
      "What the character wants or needs in a scene",
      "The director's goal",
      "The playwright's intention"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.3: An objective is what the character wants in a scene."
  },
  {
    id: 'm6-q6',
    text: "What are the criteria for strong objectives?",
    options: [
      "Vague and general",
      "Active, specific, personal, urgent, playable",
      "Passive and weak",
      "Only emotional"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.3: Active, specific, personal, urgent, playable"
  },
  {
    id: 'm6-q7',
    text: "What is a 'super objective'?",
    options: [
      "The scene objective",
      "The character's overall life goal that drives all scene objectives",
      "The director's vision",
      "The playwright's message"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.4: The super objective is the character's overall life goal that drives all scene objectives."
  },
  {
    id: 'm6-q8',
    text: "What is the 'through-line of action'?",
    options: [
      "The stage blocking",
      "The continuous line of objectives from beginning to end",
      "The script structure",
      "The director's plan"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.4: The through-line connects all character objectives from beginning to end."
  },
  {
    id: 'm6-q9',
    text: "What is 'subtext'?",
    options: [
      "The written dialogue",
      "The meaning beneath the words",
      "Stage directions",
      "The title"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.3: Subtext is the meaning beneath the words."
  },
  {
    id: 'm6-q10',
    text: "What is the danger of playing emotions directly?",
    options: [
      "Vocal strain",
      "Leads to clichéd, generalized performances",
      "Forgetting lines",
      "Confusing other actors"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.3: Playing emotions directly leads to clichéd performances."
  },
  {
    id: 'm6-q11',
    text: "What is 'emotional memory'?",
    options: [
      "Memorizing lines",
      "Recalling your own past experiences to generate authentic emotion",
      "Remembering blocking",
      "Learning songs"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.5: Emotional memory recalls past experiences to generate authentic emotion."
  },
  {
    id: 'm6-q12',
    text: "What is 'method of physical actions'?",
    options: [
      "Stage combat",
      "Using physical actions to access emotional truth",
      "Dance",
      "Movement training"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.5: Method of physical actions uses physical actions to access emotional truth."
  },
  {
    id: 'm6-q13',
    text: "What is 'public solitude'?",
    options: [
      "Acting alone",
      "Maintaining private concentration while performing publicly",
      "Rehearsing alone",
      "No audience"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.1: Public solitude is maintaining private concentration while performing for an audience."
  },
  {
    id: 'm6-q14',
    text: "What is 'tempo-rhythm'?",
    options: [
      "Speed of play",
      "Inner and outer pace that reveals emotional state",
      "Musical score",
      "Rhythm of dialogue"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.5: Tempo-rhythm is inner and outer pace that reveals emotional state."
  },
  {
    id: 'm6-q15',
    text: "What is the purpose of relaxation?",
    options: [
      "Rest between takes",
      "Release physical tension that blocks truthful expression",
      "Sleep before performance",
      "Calm nerves"
    ],
    correctAnswer: 1,
    explanation: "Lesson 6.1: Relaxation releases physical tension that blocks truthful expression."
  }
];

// =====================================================
// MODULE 7: Audition Technique (Shurtleff) - 15 questions
// =====================================================
const MODULE_7_QUESTIONS: Question[] = [
  {
    id: 'm7-q1',
    text: "What is the most important guidepost according to Shurtleff?",
    options: ["Conflict", "Relationship", "The Moment Before", "Discoveries"],
    correctAnswer: 1,
    explanation: "Lesson 7.2: Relationship is the most important guidepost."
  },
  {
    id: 'm7-q2',
    text: "What is conflict according to Shurtleff?",
    options: [
      "Fighting",
      "Opposing wants between characters",
      "Loud delivery",
      "Physical altercations"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.3: Conflict is not fighting – it's opposing wants between characters."
  },
  {
    id: 'm7-q3',
    text: "What is 'The Moment Before'?",
    options: [
      "Previous scene",
      "What just happened before the scene started",
      "Script pages",
      "Rehearsal"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.4: The Moment Before gives you immediate emotional preparation and entry into the scene."
  },
  {
    id: 'm7-q4',
    text: "What is the rule about humor in scenes?",
    options: [
      "Only comedies have humor",
      "Find what is funny in every scene, even dramas",
      "Ignore humor entirely",
      "Only play for laughs"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.5: Find what is funny in every scene, even dramas."
  },
  {
    id: 'm7-q5',
    text: "What does 'Opposites' mean in audition technique?",
    options: [
      "Stand opposite your partner",
      "Play the opposite of what is expected",
      "Disagree with the director",
      "Find opposite meanings in lines"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.6: Play the opposite of what is expected."
  },
  {
    id: 'm7-q6',
    text: "What are discoveries in a scene?",
    options: [
      "Plot twists",
      "What is new in each moment",
      "The ending",
      "The climax"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.7: Discoveries are what is new in the scene."
  },
  {
    id: 'm7-q7',
    text: "What is the purpose of 'Importance'?",
    options: [
      "Speak louder",
      "Raise the stakes – make it matter more",
      "Slow down pacing",
      "Add more props"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.9: Importance raises the stakes – make it matter more."
  },
  {
    id: 'm7-q8',
    text: "What are 'Events' in a scene?",
    options: [
      "Plot points only",
      "Moments where something changes the direction of the scene",
      "The beginning only",
      "The ending only"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.10: Events are moments where something changes the direction of the scene."
  },
  {
    id: 'm7-q9',
    text: "What does 'Place' require from the actor?",
    options: [
      "Knowing the theatre name",
      "Being specific about where you are and what it means",
      "Knowing the city name",
      "Knowing the set design"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.11: Place requires being specific about location."
  },
  {
    id: 'm7-q10',
    text: "What is 'Mystery and Secret'?",
    options: [
      "The plot",
      "What is unsaid – often more important than what is said",
      "The ending",
      "The twist"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.13: Mystery and Secret focuses on what is unsaid, which is often more important than what is said."
  },
  {
    id: 'm7-q11',
    text: "How should you prepare for a cold reading?",
    options: [
      "Memorize the entire script",
      "Quickly identify relationship, conflict, objective",
      "Ignore the text",
      "Focus only on your lines"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.14: Apply all 12 guideposts quickly before the audition."
  },
  {
    id: 'm7-q12',
    text: "What should you do if the casting director gives an adjustment?",
    options: [
      "Ignore it",
      "Incorporate it immediately",
      "Argue with them",
      "Ask why"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.14: Take direction during audition."
  },
  {
    id: 'm7-q13',
    text: "What is the recommended monologue length?",
    options: ["30 seconds", "60-90 seconds", "3 minutes", "5 minutes"],
    correctAnswer: 1,
    explanation: "Lesson 7.14: Standard monologue length is 60-90 seconds."
  },
  {
    id: 'm7-q14',
    text: "What should you do after an audition?",
    options: [
      "Call the casting director",
      "Let it go and move on",
      "Ask for feedback immediately",
      "Post about it on social media"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.14: Let go of the audition and move on."
  },
  {
    id: 'm7-q15',
    text: "What is the most common audition format today?",
    options: [
      "Live in-person",
      "Self-taped auditions",
      "Group auditions",
      "Written tests"
    ],
    correctAnswer: 1,
    explanation: "Lesson 7.14: Self-taped auditions are common today."
  }
];

// =====================================================
// MODULE 8: Scene Study (Hagen) - 15 questions
// =====================================================
const MODULE_8_QUESTIONS: Question[] = [
  {
    id: 'm8-q1',
    text: "What is substitution in acting?",
    options: [
      "Replacing an actor",
      "Replacing the character's circumstances with your own reality",
      "Changing lines",
      "Switching props"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.1: Substitution replaces the character's circumstances with your own reality to make the situation personally meaningful."
  },
  {
    id: 'm8-q2',
    text: "What is endowment?",
    options: [
      "Giving money",
      "Giving physical objects and places specific meaning and history",
      "Ending a scene",
      "Donating costumes"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.2: Endowment gives physical objects and places specific meaning and history."
  },
  {
    id: 'm8-q3',
    text: "What is the Fourth Side?",
    options: [
      "The audience",
      "The imaginary wall that completes the room",
      "The back wall",
      "The side wall"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.3: The Fourth Side is the imaginary wall that completes the room."
  },
  {
    id: 'm8-q4',
    text: "What are object exercises?",
    options: [
      "Lifting weights",
      "Training the actor's ability to create reality through physical action",
      "Handling props",
      "Set decoration"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.4: Object exercises train the actor's ability to create reality through physical action."
  },
  {
    id: 'm8-q5',
    text: "What are the six W's?",
    options: [
      "Who, What, Where, When, Why, How",
      "Who, What, Where, When, Which, Whose",
      "Where, When, Why, What, Who, Whom",
      "What, Where, When, Why, Who, Whose"
    ],
    correctAnswer: 0,
    explanation: "Lesson 8.1: The six W's are Who, What, Where, When, Why, How."
  },
  {
    id: 'm8-q6',
    text: "What is the purpose of sensory awareness?",
    options: [
      "Sensing the audience",
      "Experiencing the character's world through all five senses",
      "Developing intuition",
      "Feeling other actors"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.4: Use all five senses to make the character's world real."
  },
  {
    id: 'm8-q7',
    text: "What is the difference between indicating and behaving?",
    options: [
      "No difference",
      "Indicating shows emotion; behaving experiences it",
      "Indicating is for film; behaving is for stage",
      "Behaving is for background actors only"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.4: Object exercises eliminate self-consciousness by focusing on the task rather than indicating emotion."
  },
  {
    id: 'm8-q8',
    text: "What is the ultimate goal of Hagen's technique?",
    options: [
      "To perform perfectly",
      "To live truthfully under imaginary circumstances",
      "To get the role",
      "To impress the director"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.5: The goal of Hagen's technique is to live truthfully under imaginary circumstances."
  },
  {
    id: 'm8-q9',
    text: "What is the first step in preparing a role using Hagen's technique?",
    options: [
      "Memorize lines",
      "Answer the six W's",
      "Find costumes",
      "Block the scene"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.1: First answer the six W's."
  },
  {
    id: 'm8-q10',
    text: "What book contains Uta Hagen's complete acting technique?",
    options: [
      "An Actor Prepares",
      "Respect for Acting",
      "Audition",
      "The Actor and the Target"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.5: Respect for Acting by Uta Hagen."
  },
  {
    id: 'm8-q11',
    text: "What is 'destination' in Hagen's technique?",
    options: [
      "The end of the play",
      "What the character wants to achieve in the scene",
      "Final blocking",
      "The character's death"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.3: Destination is what the character wants to achieve in the scene."
  },
  {
    id: 'm8-q12',
    text: "What is the character's identity composed of?",
    options: [
      "Costume and makeup only",
      "The sum of given circumstances, relationships, and objectives",
      "The character's name only",
      "The character's job only"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.1: Identity is the sum of given circumstances, relationships, and objectives."
  },
  {
    id: 'm8-q13',
    text: "How is the character's past used?",
    options: [
      "To fill time",
      "To understand present behavior and motivations",
      "To memorize lines",
      "To impress the director"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.1: Given circumstances include character history, which helps understand present behavior and motivations."
  },
  {
    id: 'm8-q14',
    text: "How often should object exercises be practiced?",
    options: ["Weekly", "Daily for 15-30 minutes", "Monthly", "Only during rehearsals"],
    correctAnswer: 1,
    explanation: "Lesson 8.4: Daily practice of object exercises for 15-30 minutes."
  },
  {
    id: 'm8-q15',
    text: "What does Hagen say about the object?",
    options: [
      "The object is just an object",
      "The object is not the object. It is what it means to the character",
      "Objects are unimportant",
      "Objects should be ignored"
    ],
    correctAnswer: 1,
    explanation: "Lesson 8.2: The object is not the object. It is what it means to the character."
  }
];

// =====================================================
// MODULE 9: Advanced Technique (Meisner, Adler) - 15 questions
// =====================================================
const MODULE_9_QUESTIONS: Question[] = [
  {
    id: 'm9-q1',
    text: "What is the foundation of Meisner technique?",
    options: [
      "Emotional memory",
      "Living truthfully under imaginary circumstances",
      "Script analysis",
      "Voice work"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.1: The foundation is living truthfully under imaginary circumstances."
  },
  {
    id: 'm9-q2',
    text: "What is the Repetition Exercise?",
    options: [
      "Repeating lines",
      "Responding to actual behavior in the moment",
      "Vocal projection",
      "A warm-up exercise"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.2: The Repetition Exercise trains actors to respond to actual behavior in the moment."
  },
  {
    id: 'm9-q3',
    text: "What are the rules of the Repetition Exercise?",
    options: [
      "Plan, anticipate, perform, judge",
      "No planning, no anticipating, no performing, no judging",
      "Only plan ahead",
      "Only judge your partner"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.2: No planning, no anticipating, no performing, no judging"
  },
  {
    id: 'm9-q4',
    text: "What is an Independent Activity in Meisner technique?",
    options: [
      "Working alone",
      "A physical task with meaning and urgency",
      "Solo rehearsal",
      "Individual performance"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.3: An Independent Activity is a physical task with meaning and urgency."
  },
  {
    id: 'm9-q5',
    text: "What are the requirements for an Independent Activity?",
    options: [
      "Easy and relaxing",
      "Difficult, has a clear objective, has a deadline, important, has obstacles",
      "No deadline needed",
      "No obstacles needed"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.3: Must be difficult enough to require concentration, have a clear objective, have a deadline (urgency), be important to you, have obstacles"
  },
  {
    id: 'm9-q6',
    text: "What is Emotional Preparation in Meisner?",
    options: [
      "Rehearsing emotions",
      "Generating the necessary emotional state before entering the scene",
      "Learning emotional lines",
      "Practicing crying"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.4: Emotional Preparation is generating the necessary emotional state before entering the scene."
  },
  {
    id: 'm9-q7',
    text: "What does Stella Adler emphasize?",
    options: [
      "Emotional memory",
      "Imagination and script analysis",
      "Physical movement",
      "Voice work"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.5: Adler emphasizes imagination and script analysis."
  },
  {
    id: 'm9-q8',
    text: "What is an action verb in acting?",
    options: [
      "A descriptive word",
      "An active, playable verb that drives the scene",
      "A stage direction",
      "A dialogue cue"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.6: Action verbs are playable verbs like to accuse, to console, or to seduce – actions you can actively do."
  },
  {
    id: 'm9-q9',
    text: "What is a beat in scene study?",
    options: [
      "Musical rhythm",
      "A unit of action with a single objective",
      "A stage direction",
      "A line of dialogue"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.7: A beat is a unit of action with a single objective."
  },
  {
    id: 'm9-q10',
    text: "When does a beat change?",
    options: [
      "Every line",
      "When the objective changes",
      "Every minute",
      "At the director's cue"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.7: When the objective changes, the beat changes."
  },
  {
    id: 'm9-q11',
    text: "What is 'size' in Adler's technique?",
    options: [
      "Physical stature",
      "Being larger than life while remaining truthful",
      "Costume size",
      "Set size"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.8: Size means being larger than life while remaining truthful."
  },
  {
    id: 'm9-q12',
    text: "What is the relationship between action and emotion?",
    options: [
      "Emotion causes action",
      "Action causes emotion – play action, emotion follows",
      "They are unrelated",
      "Emotion is more important"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.6: Play actions, not emotions – emotion follows action."
  },
  {
    id: 'm9-q13',
    text: "What is the first step in Stella Adler's script analysis?",
    options: [
      "Memorize lines",
      "Research the time period and given circumstances",
      "Find emotional memories",
      "Block the scene"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.9: Adler taught to research the time period and given circumstances first."
  },
  {
    id: 'm9-q14',
    text: "What is 'the magic of as if' in Adler's technique?",
    options: [
      "Pretending",
      "Using imagination to create circumstances that affect behavior",
      "Magic tricks",
      "Illusion"
    ],
    correctAnswer: 1,
    explanation: "Lesson 9.10: Imagination creates the world of the play through 'the magic of as if.'"
  },
  {
    id: 'm9-q15',
    text: "How often should Meisner repetition be practiced?",
    options: ["Weekly", "Daily with a partner", "Monthly", "Only in class"],
    correctAnswer: 1,
    explanation: "Lesson 9.11: Daily repetition practice with a partner is recommended."
  }
];

// Map module numbers to their question sets
const MODULE_TITLE_OVERRIDES: Record<number, string> = {
  6: 'Foundation',
  7: 'Audition Technique',
  8: 'Scene Study',
  9: 'Advanced Technique',
};

const getQuestionsForModule = (moduleNumber: number): Question[] => {
  switch (moduleNumber) {
    case 1: return MODULE_1_QUESTIONS;
    case 2: return MODULE_2_QUESTIONS;
    case 3: return MODULE_3_QUESTIONS;
    case 4: return MODULE_4_QUESTIONS;
    case 5: return MODULE_5_QUESTIONS;
    case 6: return MODULE_6_QUESTIONS;
    case 7: return MODULE_7_QUESTIONS;
    case 8: return MODULE_8_QUESTIONS;
    case 9: return MODULE_9_QUESTIONS;
    default: return MODULE_1_QUESTIONS;
  }
};

// Function to request app store review (safe check for iOS)
const requestReview = () => {
  if (typeof window !== 'undefined' && 'ReactNativeWebView' in window) {
    try {
      (window as any).ReactNativeWebView?.postMessage(JSON.stringify({ type: 'requestReview' }));
    } catch (e) {
      console.log('Review request not available');
    }
  } else if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.requestReview) {
    (window as any).webkit.messageHandlers.requestReview.postMessage({});
  } else {
    localStorage.setItem('setready_quiz_completed', Date.now().toString());
    console.log('Quiz completed successfully!');
  }
};

export default function QuizTestPage({ params }: TestPageProps) {
  const unwrappedParams = React.use(params);
  const moduleId = unwrappedParams.id;
  
  const router = useRouter();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [certificateGenerated, setCertificateGenerated] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [moduleNumber, setModuleNumber] = useState<number>(1);
  const [moduleTitle, setModuleTitle] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;
  
  // Load module questions and get user ID directly using getSession()
  React.useEffect(() => {
    async function loadModuleAndQuestions() {
      setLoading(true);
      
      // Get user ID directly using getSession() - THIS WORKED BEFORE
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check on load:', session?.user?.id);  // Just log directly
      
      if (session?.user) {
        setUserId(session.user.id);
        console.log('Quiz test page - User ID from session:', session.user.id);
      } else {
        console.error('Quiz test page - No user session found');
      }
      
      // Get module info
      const { data: moduleData } = await supabase
        .from('modules')
        .select('module_number, title')
        .eq('id', moduleId)
        .single();
      
      const modNumber = moduleData?.module_number || 1;
      setModuleNumber(modNumber);
      setModuleTitle(MODULE_TITLE_OVERRIDES[modNumber] || moduleData?.title || `Module ${modNumber}`);
      
      // Get hardcoded questions for this module
      const moduleQuestions = getQuestionsForModule(modNumber);
      
      // Shuffle questions
      const shuffled = [...moduleQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      setQuestions(shuffled);
      setLoading(false);
    }
    
    loadModuleAndQuestions();
  }, [moduleId, supabase]);
  
  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    if (submitError) {
      setSubmitError(null);
      setUnansweredQuestions([]);
    }
  };
  
  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) correct++;
    });
    return (correct / questions.length) * 100;
  };
  
  const generateCertificate = async (finalScore: number) => {
    if (certificateGenerated) return;
    
    try {
      console.log('=== CERTIFICATE GENERATION START ===');
      console.log('Module number:', moduleNumber);
      console.log('Score:', Math.round(finalScore));
      
      // 1. Get the current session to extract the access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        console.error('No access token found - user may not be logged in');
        alert('Unable to generate certificate: You need to be logged in.');
        return;
      }
      
      // 2. Send the token in the Authorization header
      const response = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          moduleId: moduleNumber,
          score: Math.round(finalScore),
          certificateType: 'module'
        })
      });
      
      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Certificate API response:', result);
      
      if (result.success) {
        setCertificateGenerated(true);
        if (result.pdfUrl) {
          console.log('Certificate URL received:', result.pdfUrl);
          setCertificateUrl(result.pdfUrl);
        } else {
          console.error('API returned success but no pdfUrl');
        }
      } else {
        console.error('Certificate generation failed:', result.error);
      }
    } catch (error) {
      console.error('Certificate generation error:', error);
    }
  };
  
  // handleSubmit - uses userId from state (set during page load)
  const handleSubmit = async () => {
    if (!allAnswered) {
      const unanswered = questions
        .map((q, idx) => (answers[q.id] === undefined ? idx : -1))
        .filter(idx => idx !== -1);
      setUnansweredQuestions(unanswered);
      setSubmitError(`Please answer all questions before submitting. ${unanswered.length} question${unanswered.length !== 1 ? 's' : ''} still unanswered.`);
      setCurrentIndex(unanswered[0]);
      return;
    }
    
    setSubmitting(true);
    
    const finalScore = calculateScore();
    setScore(finalScore);
    const passed = finalScore >= 80;
    const roundedScore = Math.round(finalScore);
    
    console.log('=== QUIZ SUBMISSION ===');
    console.log('Module ID:', moduleId);
    console.log('Module Number:', moduleNumber);
    console.log('Module Title:', moduleTitle);
    console.log('Score:', roundedScore);
    console.log('Passed:', passed);
    console.log('User ID from state:', userId);
    
    if (!userId) {
      console.error('No user ID found - cannot save progress');
      alert('Unable to verify your login. Please refresh the page and try again.');
      setSubmitting(false);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          module_id: moduleId,
          completed: passed,
          score: roundedScore,
          completed_at: new Date().toISOString(),
          attempts: 1,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,module_id' });
      
      if (error) {
        console.error('Error saving progress:', error);
        alert(`Error saving progress: ${error.message}`);
      } else {
        console.log('Progress saved successfully');
      }
      
      // Also update quiz_results table if it exists
      const { error: quizError } = await supabase
        .from('quiz_results')
        .upsert({
          user_id: userId,
          module_id: moduleId,
          score: roundedScore,
          total_questions: questions.length,
          percentage: roundedScore,
          passed: passed,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,module_id' });
      
      if (quizError) {
        console.log('Note: quiz_results table may not exist yet:', quizError.message);
      } else {
        console.log('Quiz results saved successfully');
      }
      
    } catch (err) {
      console.error('Unexpected error during save:', err);
      alert('There was an error saving your progress. Please contact support.');
    }
    
    if (passed) {
      await generateCertificate(finalScore);
      setTimeout(() => requestReview(), 1500);
    }
    
    setSubmitted(true);
    setSubmitting(false);
  };
  
  const handleRetake = () => {
    setAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
    setScore(0);
    setCertificateGenerated(false);
    setCertificateUrl(null);
  };
  
  const handleDownloadCertificate = () => {
    if (certificateUrl) {
      window.open(certificateUrl, '_blank');
    } else {
      alert('Certificate URL not available.');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your quiz...</p>
        </div>
      </div>
    );
  }
  
  if (submitted) {
    const passed = score >= 80;
    const percentage = Math.round(score);
    const incorrectCount = questions.filter(q => answers[q.id] !== q.correctAnswer).length;

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 pb-20">

        {/* ── Score summary card (unchanged) ── */}
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center mb-8">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className={`text-4xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>{percentage}%</span>
          </div>

          {passed ? (
            <>
              <h1 className="text-2xl font-bold text-green-600 mb-2">🎉 Congratulations!</h1>
              <p className="text-gray-600 mb-4">You passed with {percentage}%!</p>
              <p className="text-green-600 font-semibold mb-4">✓ {moduleTitle} is now COMPLETE!</p>

              {/* Certificate section - shows status and download button when ready */}
              <div className="mt-4">
                {certificateUrl ? (
                  <button
                    onClick={handleDownloadCertificate}
                    className="text-blue-600 underline text-sm hover:text-blue-800"
                  >
                    📄 Download Your Certificate
                  </button>
                ) : (
                  <p className="text-gray-500 text-sm">
                    {certificateGenerated ? 'Certificate URL not available - please contact support' : '⏳ Generating your certificate...'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Not Quite There Yet</h1>
              <p className="text-gray-600 mb-4">You scored {percentage}%. You need 80% to pass.</p>
            </>
          )}

          <div className="flex gap-4 mt-6">
            {!passed && (
              <button onClick={handleRetake} className="flex-1 bg-blue-600 text-white py-3 rounded-lg">Retake Test</button>
            )}
            <button onClick={() => router.push('/dashboard?refresh=' + Date.now())} className="flex-1 bg-green-600 text-white py-3 rounded-lg">
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* ── Answer review section ── */}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Review Your Answers</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {incorrectCount === 0
                  ? 'Perfect score — you got everything right!'
                  : `${incorrectCount} incorrect answer${incorrectCount !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => setShowAllAnswers(prev => !prev)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 shrink-0"
            >
              {showAllAnswers ? 'Show Incorrect Only' : 'Show All Answers'}
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;

              if (isCorrect && !showAllAnswers) {
                return (
                  <div key={q.id} className="flex items-center gap-3 px-4 py-3 bg-green-50 border-l-4 border-green-400 rounded-xl">
                    <span className="text-green-500 font-bold shrink-0">✓</span>
                    <p className="text-sm text-green-700 leading-snug">
                      <span className="font-semibold">Q{idx + 1}:</span> {q.text}
                    </p>
                  </div>
                );
              }

              if (isCorrect) {
                return (
                  <div key={q.id} className="bg-white rounded-xl border-l-4 border-green-400 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-green-500 font-bold mt-0.5 shrink-0">✓</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm mb-3">
                          Q{idx + 1}: {q.text}
                        </p>
                        <div className="bg-green-50 rounded-lg px-4 py-2.5">
                          <p className="text-sm text-green-700">
                            <span className="font-semibold">Your answer:</span> {q.options[userAnswer]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={q.id} className="bg-white rounded-xl border-l-4 border-red-400 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 font-bold mt-0.5 shrink-0">✗</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm mb-4">
                        Q{idx + 1}: {q.text}
                      </p>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-start gap-2 bg-red-50 rounded-lg px-4 py-2.5">
                          <span className="text-red-500 font-bold text-sm mt-0.5 shrink-0">✗</span>
                          <p className="text-sm text-red-700">
                            <span className="font-semibold">Your answer:</span>{' '}
                            {typeof userAnswer === 'number' ? q.options[userAnswer] : 'No answer selected'}
                          </p>
                        </div>
                        <div className="flex items-start gap-2 bg-green-50 rounded-lg px-4 py-2.5">
                          <span className="text-green-500 font-bold text-sm mt-0.5 shrink-0">✓</span>
                          <p className="text-sm text-green-700">
                            <span className="font-semibold">Correct answer:</span>{' '}
                            {q.options[q.correctAnswer]}
                          </p>
                        </div>
                      </div>

                      {q.explanation && (
                        <div className="bg-blue-50 rounded-lg px-4 py-2.5 border-l-2 border-blue-400">
                          <p className="text-xs text-blue-700 leading-relaxed">
                            <span className="font-semibold">Explanation: </span>{q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-500">{moduleTitle} • {questions.length} Questions</p>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{answeredCount} of {questions.length} answered</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
          </div>
        </div>
        
        <div id={`question-${currentIndex}`} className={`bg-white rounded-lg shadow-lg p-6 mb-6 ${submitError && answers[currentQuestion?.id] === undefined ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
          <h2 className="text-xl font-semibold mb-6">{currentQuestion?.text}</h2>
          <div className="space-y-3">
            {currentQuestion?.options.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${answers[currentQuestion.id] === idx ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
              >
                <input
                  type="radio"
                  name={`q${currentQuestion.id}`}
                  checked={answers[currentQuestion.id] === idx}
                  onChange={() => handleAnswer(currentQuestion.id, idx)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>
        
        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm font-medium">
            ⚠️ {submitError}
          </div>
        )}

        {isLast && !allAnswered && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm">
            <p className="font-semibold mb-1">⚠️ All {questions.length} questions must be answered before you can submit.</p>
            <p>
              You still have{' '}
              <span className="font-bold">{questions.length - answeredCount}</span>{' '}
              unanswered question{questions.length - answeredCount !== 1 ? 's' : ''}.{' '}
              <button
                type="button"
                onClick={() => {
                  const firstUnanswered = questions.findIndex(q => answers[q.id] === undefined);
                  if (firstUnanswered !== -1) setCurrentIndex(firstUnanswered);
                }}
                className="underline font-semibold hover:text-amber-900"
              >
                Go to the first unanswered question →
              </button>
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={currentIndex === 0}
            className="px-6 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          
          {!isLast ? (
            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-6 py-2 rounded-lg font-semibold ${submitting ? 'bg-gray-300 cursor-not-allowed' : !allAnswered ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {submitting ? 'Submitting...' : !allAnswered ? 'Answer all questions to submit' : 'Submit Test'}
            </button>
          )}
        </div>
        
        <div className="flex justify-center gap-2 mt-8 flex-wrap">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all ${currentIndex === idx ? 'bg-blue-600 w-6' : answers[questions[idx].id] !== undefined ? 'bg-green-500' : submitError ? 'bg-red-400' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}