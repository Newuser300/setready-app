// lib/questions.ts
// SETREADY - Complete Questions for All 9 Modules
// Each question's answer is found VERBATIM in the corresponding lesson

export interface Question {
  id?: number;
  module_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  province_id: string | null;
}

export const QUESTIONS: Question[] = [
  // =====================================================
  // MODULE 1: Film Set Terminology (15 questions)
  // UUID: 3adad7a8-60d0-402b-a412-c7a0d24f7b9b
  // =====================================================
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'Why does the film industry operate on a 24-hour clock?',
    option_a: 'To confuse new performers',
    option_b: 'To eliminate AM/PM confusion during overnight shoots',
    option_c: 'To follow military tradition',
    option_d: 'To make calculations harder',
    correct_answer: 'b',
    explanation: 'Lesson 1.1: "The film industry operates on a 24-hour clock (military time) to eliminate AM/PM confusion during overnight shoots."',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'How long do productions routinely run?',
    option_a: '8-10 hour days',
    option_b: '10-12 hour days',
    option_c: '14-16 hour days',
    option_d: '24 hour days',
    correct_answer: 'c',
    explanation: 'Lesson 1.1: "Productions routinely run 14-16 hour days."',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'What is the minimum legal turnaround requirement under ACTRA/UBCP?',
    option_a: '8 hours',
    option_b: '10 hours',
    option_c: '12 hours',
    option_d: '14 hours',
    correct_answer: 'c',
    explanation: 'Lesson 1.1: "A 12-hour turnaround is the minimum legal requirement under ACTRA/UBCP collective agreements."',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'What is "call time"?',
    option_a: 'When you arrive at the parking lot',
    option_b: 'When you must be ready to work in wardrobe and makeup',
    option_c: 'When you start driving to set',
    option_d: 'When you sign your voucher',
    correct_answer: 'b',
    explanation: 'Lesson 1.1: "Call time" is when you must be ready to work in wardrobe and makeup, not when you arrive."',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'How is time tracked for payroll accuracy?',
    option_a: '15-minute increments',
    option_b: '30-minute increments',
    option_c: '6-minute increments (0.1 hours)',
    option_d: '1-hour increments',
    correct_answer: 'c',
    explanation: 'Lesson 1.1: "Time is tracked in 6-minute increments (0.1 hours) for payroll accuracy."',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'What is the overtime rate for hours 8-12?',
    option_a: 'Straight time',
    option_b: '1.5x (time and a half)',
    option_c: '2.0x (double time)',
    option_d: '2.5x',
    correct_answer: 'b',
    explanation: 'Lesson 1.1: "Hours 8-12: 1.5x (time and a half)"',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'What is the overtime rate for hours 12+?',
    option_a: 'Straight time',
    option_b: '1.5x (time and a half)',
    option_c: '2.0x (double time)',
    option_d: '2.5x',
    correct_answer: 'c',
    explanation: 'Lesson 1.1: "Hours 12+: 2x (double time)"',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'When does a meal penalty occur?',
    option_a: 'If meal is served before 4 hours',
    option_b: 'If meal is delayed beyond 6 hours',
    option_c: 'If meal is skipped entirely',
    option_d: 'If meal is served after 8 hours',
    correct_answer: 'b',
    explanation: 'Lesson 1.1: "Meal Penalty: If meal is delayed beyond 6 hours, production pays penalties"',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'What is the role of the 1st Assistant Director (1st AD)?',
    option_a: 'Handles costumes and wardrobe',
    option_b: 'Sets the pace, manages the schedule, ensures safety',
    option_c: 'Operates the camera',
    option_d: 'Manages craft services',
    correct_answer: 'b',
    explanation: 'Lesson 1.2: "1st AD sets the pace, manages the schedule, ensures safety"',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'Who is your primary contact for vouchers?',
    option_a: 'The Director',
    option_b: 'The 1st AD',
    option_c: 'The 2nd AD',
    option_d: 'The Background Wrangler',
    correct_answer: 'c',
    explanation: 'Lesson 1.2: "2nd AD creates call sheets, manages cast logistics, your primary contact; handles vouchers"',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'Who gives specific direction to background performers?',
    option_a: 'The Director',
    option_b: 'The 1st AD',
    option_c: 'The 2nd AD',
    option_d: 'The 3rd AD or Background Wrangler',
    correct_answer: 'd',
    explanation: 'Lesson 1.2: "3rd AD coordinates background action, crowd scenes, your direct supervisor; gives specific direction" and "Ask questions to 3rd AD or Background Wrangler"',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'Who should you never approach directly on set?',
    option_a: 'The 2nd AD',
    option_b: 'The Background Wrangler',
    option_c: 'The Director',
    option_d: 'The 3rd AD',
    correct_answer: 'c',
    explanation: 'Lesson 1.2: "Never approach the Director directly – all communication flows through the AD department"',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'What does the command "Background action" mean?',
    option_a: 'Principal actors begin speaking',
    option_b: 'Start background movement',
    option_c: 'Stop all movement',
    option_d: 'Return to starting position',
    correct_answer: 'b',
    explanation: 'Lesson 1.3: "Background action" means start background movement.',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'What does the command "Cut" mean?',
    option_a: 'Start moving',
    option_b: 'Stop immediately and freeze in place',
    option_c: 'Return to start',
    option_d: 'Take a break',
    correct_answer: 'b',
    explanation: 'Lesson 1.3: "Cut" means stop immediately and freeze in place.',
    province_id: null
  },
  {
    module_id: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
    question_text: 'What does "Back to one" mean?',
    option_a: 'Return to starting position',
    option_b: 'Go to the bathroom',
    option_c: 'Finish your scene',
    option_d: 'Look at the camera',
    correct_answer: 'a',
    explanation: 'Lesson 1.3: "Back to one" means return to starting position.',
    province_id: null
  },

  // =====================================================
  // MODULE 2: Background Acting Terms & Performance (15 questions)
  // UUID: 3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0
  // =====================================================
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is a "mark" on a film set?',
    option_a: 'A signature on a voucher',
    option_b: 'A piece of colored spike tape on the floor indicating your exact position',
    option_c: 'A type of camera lens',
    option_d: 'A lighting cue',
    correct_answer: 'b',
    explanation: 'Lesson 2.1: "A mark is a piece of colored spike tape on the floor indicating your exact position for camera focus and lighting."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What are the types of marks mentioned in Lesson 2.1?',
    option_a: 'Red, blue, and green dots',
    option_b: 'T-shaped tape, cross-shaped tape, colored tape',
    option_c: 'Square, circle, triangle tape',
    option_d: 'Numbered stickers only',
    correct_answer: 'b',
    explanation: 'Lesson 2.1: "Types of Marks: T-shaped tape, cross-shaped tape, colored tape"',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is continuity in background acting?',
    option_a: 'The script supervisor\'s notes',
    option_b: 'Keeping consistent positioning, wardrobe, and actions between takes',
    option_c: 'The editing process',
    option_d: 'The director\'s vision',
    correct_answer: 'b',
    explanation: 'Lesson 2.2: "Continuity ensures consistent positioning, wardrobe, and actions."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What must match across every take according to Lesson 2.2?',
    option_a: 'Only dialogue',
    option_b: 'Physical positioning, prop handling, walking path, facial expression, clothing',
    option_c: 'Only camera angles',
    option_d: 'Only lighting',
    correct_answer: 'b',
    explanation: 'Lesson 2.2: "Physical positioning, prop handling, walking path, facial expression, clothing"',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is the critical rule about looking at the camera?',
    option_a: 'Always look directly at the camera',
    option_b: 'Never look directly at the camera unless specifically instructed',
    option_c: 'Look at the camera only during close-ups',
    option_d: 'Look at the camera between takes',
    correct_answer: 'b',
    explanation: 'Lesson 2.3: "Never look directly at the camera unless specifically instructed."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What does "eyeline" refer to?',
    option_a: 'The camera angle',
    option_b: 'Where the actor is looking',
    option_c: 'The lighting direction',
    option_d: 'The character\'s costume',
    correct_answer: 'b',
    explanation: 'Lesson 2.3: "Eyeline is where the actor directs their gaze."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is the "furniture" mindset?',
    option_a: 'Arranging props',
    option_b: 'Blending into the environment without drawing attention',
    option_c: 'Moving furniture',
    option_d: 'Working in props',
    correct_answer: 'b',
    explanation: 'Lesson 2.4: "The furniture mindset means being present but not drawing focus."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is pantomime?',
    option_a: 'Dance routines',
    option_b: 'Silent acting without props',
    option_c: 'Singing on camera',
    option_d: 'Reading lines',
    correct_answer: 'b',
    explanation: 'Lesson 2.5: "Pantomime is silent acting without props."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is "business" in background acting?',
    option_a: 'Talking to principals',
    option_b: 'Your activity (reading, typing, etc.)',
    option_c: 'Paperwork',
    option_d: 'Union meetings',
    correct_answer: 'b',
    explanation: 'Lesson 2.5: "Business is your activity (reading, typing)."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is a "cross" in acting?',
    option_a: 'Crossing out lines',
    option_b: 'Walking across frame',
    option_c: 'A camera angle',
    option_d: 'A lighting technique',
    correct_answer: 'b',
    explanation: 'Lesson 2.5: "A cross is walking across frame."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What does "deep background" mean?',
    option_a: 'Close to camera',
    option_b: 'Far from camera, focus on group movement',
    option_c: 'Principal acting',
    option_d: 'Stand-in work',
    correct_answer: 'b',
    explanation: 'Lesson 2.5: "Deep background means far from camera, focus on group movement."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'When should background actors begin moving after "Action"?',
    option_a: 'Immediately on "Action"',
    option_b: 'Wait for "Background Action"',
    option_c: 'Look at the camera first',
    option_d: 'Stop moving',
    correct_answer: 'b',
    explanation: 'Lesson 2.5: "Background actors move on "Background Action," not on "Action"."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is the rule about touching equipment?',
    option_a: 'Handle freely',
    option_b: 'Never touch camera, lighting, or sound equipment',
    option_c: 'Only touch if interested',
    option_d: 'Ask permission first',
    correct_answer: 'b',
    explanation: 'Lesson 2.6: "Never touch camera, lighting, or sound equipment."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What should you do about cables on the floor?',
    option_a: 'Step over them',
    option_b: 'Ask for cable covers',
    option_c: 'Move them yourself',
    option_d: 'Ignore them',
    correct_answer: 'b',
    explanation: 'Lesson 2.6: "Never step over cables – ask for cable covers."',
    province_id: null
  },
  {
    module_id: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
    question_text: 'What is the professional insight about hitting marks?',
    option_a: 'It is not important',
    option_b: 'Actors who consistently miss their marks are often not rehired',
    option_c: 'Only principals need to hit marks',
    option_d: 'Marks are optional',
    correct_answer: 'b',
    explanation: 'Lesson 2.1: "Actors who consistently miss their marks are often not rehired."',
    province_id: null
  },

  // =====================================================
  // MODULE 3: Set Etiquette & Professional Conduct (15 questions)
  // UUID: e5b51522-90b4-4341-b082-ea667bb14ff1
  // =====================================================
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What is the #1 reason background performers are not rehired?',
    option_a: 'Poor acting',
    option_b: 'Being late',
    option_c: 'Wrong wardrobe',
    option_d: 'Talking too much',
    correct_answer: 'b',
    explanation: 'Lesson 3.1: "Being late is the #1 reason background performers are not rehired."',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What should you do if running late?',
    option_a: 'Don\'t show up',
    option_b: 'Call the 3rd AD or production office immediately',
    option_c: 'Show up late and apologize',
    option_d: 'Send a text',
    correct_answer: 'b',
    explanation: 'Lesson 3.1: "Call the 3rd AD or production office immediately"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What is the cell phone protocol on set?',
    option_a: 'Use freely between takes',
    option_b: 'Phones on silent or off at all times',
    option_c: 'Use only in the bathroom',
    option_d: 'Keep loud for emergencies',
    correct_answer: 'b',
    explanation: 'Lesson 3.2: "Phones on silent or off at all times"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'Are NDAs legally binding?',
    option_a: 'No, they are optional',
    option_b: 'Yes, they are legally binding',
    option_c: 'Only for principals',
    option_d: 'Only for union members',
    correct_answer: 'b',
    explanation: 'Lesson 3.2: "NDAs are legally binding"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What should you do immediately upon arrival?',
    option_a: 'Find craft services',
    option_b: 'Sign in immediately with 3rd AD or Wrangler',
    option_c: 'Call your agent',
    option_d: 'Find the director',
    correct_answer: 'b',
    explanation: 'Lesson 3.3: "Sign in immediately with the 3rd AD or Wrangler upon arrival – starts your pay clock"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What should you do with your voucher after signing?',
    option_a: 'Throw it away',
    option_b: 'Take a photo for your records',
    option_c: 'Give it to the director',
    option_d: 'Mail it to ACTRA',
    correct_answer: 'b',
    explanation: 'Lesson 3.3: "Take a photo of your voucher for your records"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'When should you sign out?',
    option_a: 'As soon as you finish your last scene',
    option_b: 'When dismissed – never before',
    option_c: 'At exactly 12 hours',
    option_d: 'Whenever you want',
    correct_answer: 'b',
    explanation: 'Lesson 3.3: "Sign out when dismissed – never before"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'Who eats first at craft services?',
    option_a: 'Background performers',
    option_b: 'First team (principals) and crew',
    option_c: 'Production Assistants',
    option_d: 'Anyone can eat first',
    correct_answer: 'b',
    explanation: 'Lesson 3.5: "First team (principals) and crew eat first"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What should you never do with production wardrobe?',
    option_a: 'Return it',
    option_b: 'Take it home',
    option_c: 'Report damage',
    option_d: 'Ask for repairs',
    correct_answer: 'b',
    explanation: 'Lesson 3.6: "Never take wardrobe home – this is theft"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What should you never do with props?',
    option_a: 'Return them',
    option_b: 'Take them home',
    option_c: 'Report damage',
    option_d: 'Handle with care',
    correct_answer: 'b',
    explanation: 'Lesson 3.6: "Do not take props home – this is theft"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'How should you handle hero props?',
    option_a: 'Carelessly',
    option_b: 'With extreme care',
    option_c: 'Take them home',
    option_d: 'Ignore them',
    correct_answer: 'b',
    explanation: 'Lesson 3.6: "Hero props are valuable – handle with extreme care"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'Who should you report harassment to?',
    option_a: 'The Director',
    option_b: '3rd AD or Background Wrangler',
    option_c: 'Other background actors',
    option_d: 'Social media',
    correct_answer: 'b',
    explanation: 'Lesson 3.7: "Report to 3rd AD or Background Wrangler"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'Can you be fired for reporting harassment in good faith?',
    option_a: 'Yes, production can fire anyone',
    option_b: 'No, you cannot be fired or punished for reporting in good faith',
    option_c: 'Only if you are non-union',
    option_d: 'Only if you are wrong',
    correct_answer: 'b',
    explanation: 'Lesson 3.7: "You cannot be fired or punished for reporting in good faith"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What should you do if you need to leave holding?',
    option_a: 'Just leave',
    option_b: 'Tell the Background Wrangler or 3rd AD',
    option_c: 'Send a text',
    option_d: 'Wait for lunch',
    correct_answer: 'b',
    explanation: 'Lesson 3.2: "Signal if leaving holding - inform the AD"',
    province_id: null
  },
  {
    module_id: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
    question_text: 'What is proper conduct with principal actors?',
    option_a: 'Ask for autographs',
    option_b: 'Treat them as colleagues and be respectful of their space',
    option_c: 'Stare at them',
    option_d: 'Approach them first',
    correct_answer: 'b',
    explanation: 'Lesson 3.4: "Treat them as colleagues, make brief professional eye contact, respond if they speak to you, be respectful of their space"',
    province_id: null
  },

  // =====================================================
  // MODULE 4: Safety on Set (15 questions)
  // UUID: 762fb8fb-5189-4943-adaa-92f4c16fac4f
  // =====================================================
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What is your legal right regarding unsafe work?',
    option_a: 'Must do it anyway',
    option_b: 'Right to refuse unsafe work',
    option_c: 'Only union can refuse',
    option_d: 'Only principals can refuse',
    correct_answer: 'b',
    explanation: 'Lesson 4.1: "No performer shall be dismissed or disciplined for refusing to work in conditions they reasonably believe to be unsafe."',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What should you do if you see a safety hazard?',
    option_a: 'Ignore it',
    option_b: 'Report to 3rd AD or Background Wrangler',
    option_c: 'Wait until wrap',
    option_d: 'Tell other actors',
    correct_answer: 'b',
    explanation: 'Lesson 4.1: "Report unsafe work immediately"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What is the first step in injury reporting?',
    option_a: 'Go home',
    option_b: 'Advise Background Wrangler',
    option_c: 'Call a lawyer',
    option_d: 'Post on social media',
    correct_answer: 'b',
    explanation: 'Lesson 4.1: "Advise Background Wrangler immediately"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What should you do after reporting an injury to First Aid?',
    option_a: 'Go home and rest',
    option_b: 'Complete an Accident Report and get a copy',
    option_c: 'Ignore it',
    option_d: 'Tell other actors',
    correct_answer: 'b',
    explanation: 'Lesson 4.1: "Complete an Accident Report – get a copy"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What is the rule about propane heater tent flaps?',
    option_a: 'Close them completely to keep heat in',
    option_b: 'Never close tent flaps completely – ventilation prevents carbon monoxide poisoning',
    option_c: 'Keep half closed',
    option_d: 'Remove all flaps',
    correct_answer: 'b',
    explanation: 'Lesson 4.3: "Never close tent flaps completely – ventilation prevents carbon monoxide poisoning"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What is the minimum distance from propane heaters to combustibles?',
    option_a: '1 foot',
    option_b: '2 feet',
    option_c: '4 feet 6 inches',
    option_d: '6 feet',
    correct_answer: 'c',
    explanation: 'Lesson 4.3: "Keep combustibles at least 4 feet 6 inches away"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What are symptoms of carbon monoxide poisoning?',
    option_a: 'Hunger and thirst',
    option_b: 'Headache, nausea, dizziness, confusion',
    option_c: 'Fever and chills',
    option_d: 'Muscle pain',
    correct_answer: 'b',
    explanation: 'Lesson 4.3: "CO poisoning: headache, nausea, dizziness, confusion"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What are symptoms of heat exhaustion?',
    option_a: 'Shivering and numbness',
    option_b: 'Dizziness, nausea, heavy sweating',
    option_c: 'Confusion, no sweating',
    option_d: 'Frostbite',
    correct_answer: 'b',
    explanation: 'Lesson 4.4: "Heat Exhaustion: Dizziness, nausea, heavy sweating"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What action should you take for heat stroke?',
    option_a: 'Rest and hydrate',
    option_b: 'Seek shade',
    option_c: 'Call 911',
    option_d: 'Keep working',
    correct_answer: 'c',
    explanation: 'Lesson 4.4: "Heat Stroke: Call 911"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What is the critical rule about prop guns?',
    option_a: 'Handle freely',
    option_b: 'Never touch a prop gun, even if you think it\'s not real',
    option_c: 'Practice with them',
    option_d: 'Take photos',
    correct_answer: 'b',
    explanation: 'Lesson 4.5: "Never touch a prop gun, even if you think it\'s not real."',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What is the speed limit for vehicles in staging areas?',
    option_a: '20 km/h',
    option_b: '15 km/h',
    option_c: '5-10 km/h',
    option_d: '30 km/h',
    correct_answer: 'c',
    explanation: 'Lesson 4.6: "Drive slowly (5-10 km/h in staging areas)"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'Can you be forced to perform intimate scenes?',
    option_a: 'Yes, if it\'s in the script',
    option_b: 'No, you cannot be forced to perform intimate scenes',
    option_c: 'Only if you are union',
    option_d: 'Only if you signed a waiver',
    correct_answer: 'b',
    explanation: 'Lesson 4.7: "You cannot be forced to perform intimate scenes"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What should you do if you smell gas on set?',
    option_a: 'Ignore it',
    option_b: 'Report immediately',
    option_c: 'Open a window',
    option_d: 'Leave quietly',
    correct_answer: 'b',
    explanation: 'Lesson 4.3: "Report any smell of gas immediately"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What is required for child performers?',
    option_a: 'Nothing special',
    option_b: 'Parental accompaniment required',
    option_c: 'They can work alone',
    option_d: 'No rest periods needed',
    correct_answer: 'b',
    explanation: 'Lesson 4.8: "Parental accompaniment required"',
    province_id: null
  },
  {
    module_id: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
    question_text: 'What should you do if you feel faint or dizzy?',
    option_a: 'Keep working',
    option_b: 'Sit down immediately and tell AD',
    option_c: 'Go to craft services',
    option_d: 'Ignore it',
    correct_answer: 'b',
    explanation: 'Lesson 4.4: "Heat exhaustion requires seeking shade and hydrating"',
    province_id: null
  },

  // =====================================================
  // MODULE 5: Industry Standards, Pay & Career Advancement (15 questions)
  // UUID: c92d6d19-9153-4879-96bb-b4fdc50bbafd
  // =====================================================
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the 2026 UBCP background rate for an 8-hour day?',
    option_a: '$244.04',
    option_b: '$259.90',
    option_c: '$270.30',
    option_d: '$285.00',
    correct_answer: 'c',
    explanation: 'Lesson 5.5: "Background (8 hours): $270.30"',
    province_id: 'BC'
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the permit fee for union background in BC?',
    option_a: '$7.50',
    option_b: '$10.00',
    option_c: '$12.50',
    option_d: '$15.00',
    correct_answer: 'c',
    explanation: 'Lesson 5.5: "Union permit fee is $12.50/day"',
    province_id: 'BC'
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the Union night premium rate in BC?',
    option_a: '$20.00',
    option_b: '$25.00',
    option_c: '$30.00',
    option_d: '$35.00',
    correct_answer: 'c',
    explanation: 'Lesson 5.5: "Union night premium: $30.00"',
    province_id: 'BC'
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the Special Ability bump rate?',
    option_a: '+$10/day',
    option_b: '+$20-50/day',
    option_c: '+$100/day',
    option_d: '+$200/day',
    correct_answer: 'b',
    explanation: 'Lesson 5.1: "Special Ability: +$20-50/day"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the Stand-in bump rate?',
    option_a: '+$10/day',
    option_b: '+$25-50/day',
    option_c: '+$100/day',
    option_d: '+$200/day',
    correct_answer: 'b',
    explanation: 'Lesson 5.1: "Stand-in: +$25-50/day"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the Photo Double bump rate?',
    option_a: '+$10/day',
    option_b: '+$25-50/day',
    option_c: '+$100/day',
    option_d: '+$200/day',
    correct_answer: 'b',
    explanation: 'Lesson 5.1: "Photo Double: +$25-50/day"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What pension contribution rate do ACTRA/UBCP members receive?',
    option_a: '5%',
    option_b: '7%',
    option_c: '10%',
    option_d: '12%',
    correct_answer: 'b',
    explanation: 'Lesson 5.2: "Pension contributions (7%)"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'How many qualifying credits are required for full ACTRA membership?',
    option_a: '1',
    option_b: '2',
    option_c: '3',
    option_d: '5',
    correct_answer: 'c',
    explanation: 'Lesson 5.2: "3 qualifying credits required for full membership"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'Do background permits count toward ACTRA/UBCP membership?',
    option_a: 'Yes, they count',
    option_b: 'No, background permits do NOT count – only speaking/featured roles',
    option_c: 'Only if you have 10 permits',
    option_d: 'Only union permits count',
    correct_answer: 'b',
    explanation: 'Lesson 5.2: "Background permits do NOT count – only speaking/featured roles"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the ACTRA/UBCP initiation fee?',
    option_a: '$800',
    option_b: '$1,200',
    option_c: '$1,600',
    option_d: '$2,000',
    correct_answer: 'c',
    explanation: 'Lesson 5.2: "Initiation fee: $1,600 CAD"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What triggers an upgrade to Principal Actor rates?',
    option_a: 'Working 8 hours',
    option_b: 'Speaking any line of dialogue',
    option_c: 'Getting a voucher',
    option_d: 'Joining ACTRA',
    correct_answer: 'b',
    explanation: 'Lesson 5.4: "Speaking line triggers immediate upgrade to Principal Actor rates"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'Upon upgrade to Principal Actor rates, when is the new rate applied?',
    option_a: 'Starting the next day',
    option_b: 'Retroactive to call time',
    option_c: 'Only for future scenes',
    option_d: 'After signing a new contract',
    correct_answer: 'b',
    explanation: 'Lesson 5.4: "Paid principal actor rates retroactive to call time"',
    province_id: null
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the Ontario permit fee (within 120km)?',
    option_a: '$7.50',
    option_b: '$10.00',
    option_c: '$12.50',
    option_d: '$15.00',
    correct_answer: 'c',
    explanation: 'Lesson 5.5: "Permit fee (within 120km): $12.50"',
    province_id: 'ON'
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the Ontario permit fee (outside 120km)?',
    option_a: '$7.50',
    option_b: '$10.00',
    option_c: '$12.50',
    option_d: '$15.00',
    correct_answer: 'a',
    explanation: 'Lesson 5.5: "Permit fee (outside 120km): $7.50"',
    province_id: 'ON'
  },
  {
    module_id: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
    question_text: 'What is the minimum call-out pay for Union background?',
    option_a: '4 hours',
    option_b: '6 hours',
    option_c: '8 hours',
    option_d: '10 hours',
    correct_answer: 'c',
    explanation: 'Lesson 5.5: "Union background is guaranteed a minimum of 8 hours pay"',
    province_id: null
  },

  // =====================================================
  // MODULE 6: Foundation (Stanislavski) (15 questions)
  // UUID: c5783d3a-85b5-415f-afb9-72a6b8932504
  // =====================================================
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What are "given circumstances"?',
    option_a: 'The set design',
    option_b: 'All the conditions of the character\'s life that the actor must accept as true and real',
    option_c: 'The director\'s notes',
    option_d: 'The script pages',
    correct_answer: 'b',
    explanation: 'Lesson 6.1: "The given circumstances are all the conditions of the character\'s life that the actor must accept as true and real."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What categories are included in given circumstances?',
    option_a: 'Only the character\'s name',
    option_b: 'Who you are, where you are, when it is, what you want, what just happened, your relationships',
    option_c: 'Only the costume',
    option_d: 'Only the dialogue',
    correct_answer: 'b',
    explanation: 'Lesson 6.1: "Who you are, where you are, when it is, what you want, what just happened, your relationships"',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What does Stanislavski say about specific given circumstances?',
    option_a: 'They don\'t matter',
    option_b: '"The more specific your given circumstances, the more truthful your performance."',
    option_c: 'Only broad circumstances matter',
    option_d: 'They are optional',
    correct_answer: 'b',
    explanation: 'Lesson 6.1: "The more specific your given circumstances, the more truthful your performance."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is the "Magic If"?',
    option_a: 'A superstition',
    option_b: 'Asking "What would I do IF I were in this character\'s situation?"',
    option_c: 'A lighting cue',
    option_d: 'A rehearsal warm-up',
    correct_answer: 'b',
    explanation: 'Lesson 6.2: "Ask yourself: What would I do IF I were in this character\'s situation?"',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is an "objective" in acting?',
    option_a: 'The camera angle',
    option_b: 'What the character wants or needs in a scene',
    option_c: 'The director\'s goal',
    option_d: 'The playwright\'s intention',
    correct_answer: 'b',
    explanation: 'Lesson 6.3: "An objective is what the character wants in a scene."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What are the criteria for strong objectives?',
    option_a: 'Vague and general',
    option_b: 'Active, specific, personal, urgent, playable',
    option_c: 'Passive and weak',
    option_d: 'Only emotional',
    correct_answer: 'b',
    explanation: 'Lesson 6.3: "Active, specific, personal, urgent, playable"',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is a "super objective"?',
    option_a: 'The scene objective',
    option_b: 'The character\'s overall life goal that drives all scene objectives',
    option_c: 'The director\'s vision',
    option_d: 'The playwright\'s message',
    correct_answer: 'b',
    explanation: 'Lesson 6.4: "The super objective is the character\'s overall life goal that drives all scene objectives."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is the "through-line of action"?',
    option_a: 'The stage blocking',
    option_b: 'The continuous line of objectives from beginning to end',
    option_c: 'The script structure',
    option_d: 'The director\'s plan',
    correct_answer: 'b',
    explanation: 'Lesson 6.4: "The through-line connects all character objectives from beginning to end."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is "subtext"?',
    option_a: 'The written dialogue',
    option_b: 'The meaning beneath the words',
    option_c: 'Stage directions',
    option_d: 'The title',
    correct_answer: 'b',
    explanation: 'Lesson 6.3: "Subtext is the meaning beneath the words."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is the danger of playing emotions directly?',
    option_a: 'Vocal strain',
    option_b: 'Leads to clichéd, generalized performances',
    option_c: 'Forgetting lines',
    option_d: 'Confusing other actors',
    correct_answer: 'b',
    explanation: 'Lesson 6.3: "Playing emotions directly leads to clichéd performances."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is "emotional memory"?',
    option_a: 'Memorizing lines',
    option_b: 'Recalling your own past experiences to generate authentic emotion',
    option_c: 'Remembering blocking',
    option_d: 'Learning songs',
    correct_answer: 'b',
    explanation: 'Lesson 6.5: "Emotional memory is recalling your own past experiences to generate authentic emotion."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is "method of physical actions"?',
    option_a: 'Stage combat',
    option_b: 'Using physical actions to access emotional truth',
    option_c: 'Dance',
    option_d: 'Movement training',
    correct_answer: 'b',
    explanation: 'Lesson 6.5: "Method of physical actions uses physical actions to access emotional truth."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is "public solitude"?',
    option_a: 'Acting alone',
    option_b: 'Maintaining private concentration while performing publicly',
    option_c: 'Rehearsing alone',
    option_d: 'No audience',
    correct_answer: 'b',
    explanation: 'Lesson 6.1: "Public solitude is maintaining private concentration while performing for an audience."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is "tempo-rhythm"?',
    option_a: 'Speed of play',
    option_b: 'Inner and outer pace that reveals emotional state',
    option_c: 'Musical score',
    option_d: 'Rhythm of dialogue',
    correct_answer: 'b',
    explanation: 'Lesson 6.5: "Tempo-rhythm is inner and outer pace that reveals emotional state."',
    province_id: null
  },
  {
    module_id: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
    question_text: 'What is the purpose of relaxation in Stanislavski\'s technique?',
    option_a: 'Rest between takes',
    option_b: 'Release physical tension that blocks truthful expression',
    option_c: 'Sleep before performance',
    option_d: 'Calm nerves',
    correct_answer: 'b',
    explanation: 'Lesson 6.1: "Relaxation releases physical tension that blocks truthful expression."',
    province_id: null
  },

  // =====================================================
  // MODULE 7: Audition Technique (Shurtleff) (15 questions)
  // UUID: 364373e1-88de-44ea-a434-2c3f0935c204
  // =====================================================
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What is the most important guidepost according to Shurtleff?',
    option_a: 'Conflict',
    option_b: 'Relationship',
    option_c: 'The Moment Before',
    option_d: 'Discoveries',
    correct_answer: 'b',
    explanation: 'Lesson 7.2: "Relationship is the most important guidepost."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What is conflict according to Shurtleff?',
    option_a: 'Fighting',
    option_b: 'Opposing wants between characters',
    option_c: 'Loud delivery',
    option_d: 'Physical altercations',
    correct_answer: 'b',
    explanation: 'Lesson 7.3: "Conflict is not fighting – it\'s opposing wants between characters."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What is "The Moment Before"?',
    option_a: 'Previous scene',
    option_b: 'What just happened before the scene started',
    option_c: 'Script pages',
    option_d: 'Rehearsal',
    correct_answer: 'b',
    explanation: 'Lesson 7.4: "The Moment Before gives you immediate emotional preparation and entry into the scene."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What is the rule about humor in scenes?',
    option_a: 'Only comedies have humor',
    option_b: 'Find what is funny in every scene, even dramas',
    option_c: 'Ignore humor entirely',
    option_d: 'Only play for laughs',
    correct_answer: 'b',
    explanation: 'Lesson 7.5: "Find what is funny in every scene, even dramas."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What does "Opposites" mean in audition technique?',
    option_a: 'Stand opposite your partner',
    option_b: 'Play the opposite of what is expected',
    option_c: 'Disagree with the director',
    option_d: 'Find opposite meanings in lines',
    correct_answer: 'b',
    explanation: 'Lesson 7.6: "Play the opposite of what is expected."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What are discoveries in a scene?',
    option_a: 'Plot twists',
    option_b: 'What is new in each moment',
    option_c: 'The ending',
    option_d: 'The climax',
    correct_answer: 'b',
    explanation: 'Lesson 7.7: "Discoveries are what is new in the scene."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What is the purpose of "Importance"?',
    option_a: 'Speak louder',
    option_b: 'Raise the stakes – make it matter more',
    option_c: 'Slow down pacing',
    option_d: 'Add more props',
    correct_answer: 'b',
    explanation: 'Lesson 7.9: "Importance raises the stakes – make it matter more."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What are "Events" in a scene?',
    option_a: 'Plot points only',
    option_b: 'Moments where something changes the direction of the scene',
    option_c: 'The beginning only',
    option_d: 'The ending only',
    correct_answer: 'b',
    explanation: 'Lesson 7.10: "Events are moments where something changes the direction of the scene."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What does "Place" require from the actor?',
    option_a: 'Knowing the theatre name',
    option_b: 'Being specific about where you are and what it means',
    option_c: 'Knowing the city name',
    option_d: 'Knowing the set design',
    correct_answer: 'b',
    explanation: 'Lesson 7.11: "Place requires being specific about location."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What is "Mystery and Secret"?',
    option_a: 'The plot',
    option_b: 'What is unsaid – often more important than what is said',
    option_c: 'The ending',
    option_d: 'The twist',
    correct_answer: 'b',
    explanation: 'Lesson 7.13: "Mystery and Secret focuses on what is unsaid, which is often more important than what is said."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'How should you prepare for a cold reading?',
    option_a: 'Memorize the entire script',
    option_b: 'Quickly identify relationship, conflict, objective',
    option_c: 'Ignore the text',
    option_d: 'Focus only on your lines',
    correct_answer: 'b',
    explanation: 'Lesson 7.14: "Apply all 12 guideposts quickly before the audition."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What should you do if the casting director gives an adjustment?',
    option_a: 'Ignore it',
    option_b: 'Incorporate it immediately',
    option_c: 'Argue with them',
    option_d: 'Ask why',
    correct_answer: 'b',
    explanation: 'Lesson 7.14: "Take direction during audition."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What is the recommended monologue length?',
    option_a: '30 seconds',
    option_b: '60-90 seconds',
    option_c: '3 minutes',
    option_d: '5 minutes',
    correct_answer: 'b',
    explanation: 'Lesson 7.14: "Standard monologue length is 60-90 seconds."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What should you do after an audition?',
    option_a: 'Call the casting director',
    option_b: 'Let it go and move on',
    option_c: 'Ask for feedback immediately',
    option_d: 'Post about it on social media',
    correct_answer: 'b',
    explanation: 'Lesson 7.14: "Let go of the audition and move on."',
    province_id: null
  },
  {
    module_id: '364373e1-88de-44ea-a434-2c3f0935c204',
    question_text: 'What is the most common audition format today?',
    option_a: 'Live in-person',
    option_b: 'Self-taped auditions',
    option_c: 'Group auditions',
    option_d: 'Written tests',
    correct_answer: 'b',
    explanation: 'Lesson 7.14: "Self-taped auditions are common today."',
    province_id: null
  },

  // =====================================================
  // MODULE 8: Scene Study (Hagen) (15 questions)
  // UUID: 9894b48d-d43e-43e0-b5e5-3f4a3df95414
  // =====================================================
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is substitution in acting?',
    option_a: 'Replacing an actor',
    option_b: 'Replacing the character\'s circumstances with your own reality',
    option_c: 'Changing lines',
    option_d: 'Switching props',
    correct_answer: 'b',
    explanation: 'Lesson 8.1: "Substitution is replacing the character\'s circumstances with your own reality to make the situation personally meaningful."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is endowment?',
    option_a: 'Giving money',
    option_b: 'Giving physical objects and places specific meaning and history',
    option_c: 'Ending a scene',
    option_d: 'Donating costumes',
    correct_answer: 'b',
    explanation: 'Lesson 8.2: "Endowment gives physical objects and places specific meaning and history."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is the Fourth Side?',
    option_a: 'The audience',
    option_b: 'The imaginary wall that completes the room',
    option_c: 'The back wall',
    option_d: 'The side wall',
    correct_answer: 'b',
    explanation: 'Lesson 8.3: "The Fourth Side is the imaginary wall that completes the room."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What are object exercises?',
    option_a: 'Lifting weights',
    option_b: 'Training the actor\'s ability to create reality through physical action',
    option_c: 'Handling props',
    option_d: 'Set decoration',
    correct_answer: 'b',
    explanation: 'Lesson 8.4: "Object exercises train the actor\'s ability to create reality through physical action."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What are the six W\'s?',
    option_a: 'Who, What, Where, When, Why, How',
    option_b: 'Who, What, Where, When, Which, Whose',
    option_c: 'Where, When, Why, What, Who, Whom',
    option_d: 'What, Where, When, Why, Who, Whose',
    correct_answer: 'a',
    explanation: 'Lesson 8.1: "The six W\'s are Who, What, Where, When, Why, How."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is the purpose of sensory awareness?',
    option_a: 'Sensing the audience',
    option_b: 'Experiencing the character\'s world through all five senses',
    option_c: 'Developing intuition',
    option_d: 'Feeling other actors',
    correct_answer: 'b',
    explanation: 'Lesson 8.4: "Use all five senses to make the character\'s world real."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is the difference between indicating and behaving?',
    option_a: 'No difference',
    option_b: 'Indicating shows emotion; behaving experiences it',
    option_c: 'Indicating is for film; behaving is for stage',
    option_d: 'Behaving is for background actors only',
    correct_answer: 'b',
    explanation: 'Lesson 8.4: "Object exercises eliminate self-consciousness by focusing on the task rather than indicating emotion."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is the ultimate goal of Hagen\'s technique?',
    option_a: 'To perform perfectly',
    option_b: 'To live truthfully under imaginary circumstances',
    option_c: 'To get the role',
    option_d: 'To impress the director',
    correct_answer: 'b',
    explanation: 'Lesson 8.5: "The goal of Hagen\'s technique is to live truthfully under imaginary circumstances."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is the first step in preparing a role using Hagen\'s technique?',
    option_a: 'Memorize lines',
    option_b: 'Answer the six W\'s',
    option_c: 'Find costumes',
    option_d: 'Block the scene',
    correct_answer: 'b',
    explanation: 'Lesson 8.1: "First answer the six W\'s."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What book contains Uta Hagen\'s complete acting technique?',
    option_a: 'An Actor Prepares',
    option_b: 'Respect for Acting',
    option_c: 'Audition',
    option_d: 'The Actor and the Target',
    correct_answer: 'b',
    explanation: 'Lesson 8.5: "Respect for Acting by Uta Hagen."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is "destination" in Hagen\'s technique?',
    option_a: 'The end of the play',
    option_b: 'What the character wants to achieve in the scene',
    option_c: 'Final blocking',
    option_d: 'The character\'s death',
    correct_answer: 'b',
    explanation: 'Lesson 8.3: "Destination is what the character wants to achieve in the scene."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What is the character\'s identity composed of?',
    option_a: 'Costume and makeup only',
    option_b: 'The sum of given circumstances, relationships, and objectives',
    option_c: 'The character\'s name only',
    option_d: 'The character\'s job only',
    correct_answer: 'b',
    explanation: 'Lesson 8.1: "Identity is the sum of given circumstances, relationships, and objectives."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'How is the character\'s past used?',
    option_a: 'To fill time',
    option_b: 'To understand present behavior and motivations',
    option_c: 'To memorize lines',
    option_d: 'To impress the director',
    correct_answer: 'b',
    explanation: 'Lesson 8.1: "Given circumstances include character history, which helps understand present behavior and motivations."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'How often should object exercises be practiced?',
    option_a: 'Weekly',
    option_b: 'Daily for 15-30 minutes',
    option_c: 'Monthly',
    option_d: 'Only during rehearsals',
    correct_answer: 'b',
    explanation: 'Lesson 8.4: "Daily practice of object exercises for 15-30 minutes."',
    province_id: null
  },
  {
    module_id: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
    question_text: 'What does Hagen say about the object?',
    option_a: 'The object is just an object',
    option_b: '"The object is not the object. It is what it means to the character."',
    option_c: 'Objects are unimportant',
    option_d: 'Objects should be ignored',
    correct_answer: 'b',
    explanation: 'Lesson 8.2: "The object is not the object. It is what it means to the character."',
    province_id: null
  },

  // =====================================================
  // MODULE 9: Advanced Technique (Meisner, Adler) (15 questions)
  // UUID: 93e45eb0-50d5-46d8-b7b8-d93d25b25f27
  // =====================================================
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is the foundation of Meisner technique?',
    option_a: 'Emotional memory',
    option_b: 'Living truthfully under imaginary circumstances',
    option_c: 'Script analysis',
    option_d: 'Voice work',
    correct_answer: 'b',
    explanation: 'Lesson 9.1: "The foundation is living truthfully under imaginary circumstances."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is the Repetition Exercise?',
    option_a: 'Repeating lines',
    option_b: 'Responding to actual behavior in the moment',
    option_c: 'Vocal projection',
    option_d: 'A warm-up exercise',
    correct_answer: 'b',
    explanation: 'Lesson 9.1: "The Repetition Exercise trains actors to respond to actual behavior in the moment."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What are the rules of the Repetition Exercise?',
    option_a: 'Plan, anticipate, perform, judge',
    option_b: 'No planning, no anticipating, no performing, no judging',
    option_c: 'Only plan ahead',
    option_d: 'Only judge your partner',
    correct_answer: 'b',
    explanation: 'Lesson 9.1: "No planning, no anticipating, no performing, no judging"',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is an Independent Activity in Meisner technique?',
    option_a: 'Working alone',
    option_b: 'A physical task with meaning and urgency',
    option_c: 'Solo rehearsal',
    option_d: 'Individual performance',
    correct_answer: 'b',
    explanation: 'Lesson 9.2: "An Independent Activity is a physical task with meaning and urgency."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What are the requirements for an Independent Activity?',
    option_a: 'Easy and relaxing',
    option_b: 'Difficult, has a clear objective, has a deadline, important, has obstacles',
    option_c: 'No deadline needed',
    option_d: 'No obstacles needed',
    correct_answer: 'b',
    explanation: 'Lesson 9.2: "Must be difficult enough to require concentration, have a clear objective, have a deadline (urgency), be important to you, have obstacles"',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is Emotional Preparation in Meisner?',
    option_a: 'Rehearsing emotions',
    option_b: 'Generating the necessary emotional state before entering the scene',
    option_c: 'Learning emotional lines',
    option_d: 'Practicing crying',
    correct_answer: 'b',
    explanation: 'Lesson 9.3: "Emotional Preparation is generating the necessary emotional state before entering the scene."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What does Stella Adler emphasize?',
    option_a: 'Emotional memory',
    option_b: 'Imagination and script analysis',
    option_c: 'Physical movement',
    option_d: 'Voice work',
    correct_answer: 'b',
    explanation: 'Lesson 9.4: "Adler emphasizes imagination and script analysis."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is an action verb in acting?',
    option_a: 'A descriptive word',
    option_b: 'An active, playable verb that drives the scene',
    option_c: 'A stage direction',
    option_d: 'A dialogue cue',
    correct_answer: 'b',
    explanation: 'Lesson 9.5: "Action verbs are playable verbs like to accuse, to console, or to seduce – actions you can actively do."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is a beat in scene study?',
    option_a: 'Musical rhythm',
    option_b: 'A unit of action with a single objective',
    option_c: 'A stage direction',
    option_d: 'A line of dialogue',
    correct_answer: 'b',
    explanation: 'Lesson 9.6: "A beat is a unit of action with a single objective."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'When does a beat change?',
    option_a: 'Every line',
    option_b: 'When the objective changes',
    option_c: 'Every minute',
    option_d: 'At the director\'s cue',
    correct_answer: 'b',
    explanation: 'Lesson 9.6: "When the objective changes, the beat changes."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is "size" in Adler\'s technique?',
    option_a: 'Physical stature',
    option_b: 'Being larger than life while remaining truthful',
    option_c: 'Costume size',
    option_d: 'Set size',
    correct_answer: 'b',
    explanation: 'Lesson 9.4: "Size means being larger than life while remaining truthful."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is the relationship between action and emotion in advanced technique?',
    option_a: 'Emotion causes action',
    option_b: 'Action causes emotion – play action, emotion follows',
    option_c: 'They are unrelated',
    option_d: 'Emotion is more important',
    correct_answer: 'b',
    explanation: 'Lesson 9.5: "Play actions, not emotions – emotion follows action."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is the first step in Stella Adler\'s script analysis?',
    option_a: 'Memorize lines',
    option_b: 'Research the time period and given circumstances',
    option_c: 'Find emotional memories',
    option_d: 'Block the scene',
    correct_answer: 'b',
    explanation: 'Lesson 9.4: "Adler taught to research the time period and given circumstances first."',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'What is "the magic of as if" in Adler\'s technique?',
    option_a: 'Pretending',
    option_b: 'Using imagination to create circumstances that affect behavior',
    option_c: 'Magic tricks',
    option_d: 'Illusion',
    correct_answer: 'b',
    explanation: 'Lesson 9.4: 'Imagination creates the world of the play through "the magic of as if."'',
    province_id: null
  },
  {
    module_id: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27',
    question_text: 'How often should Meisner repetition be practiced?',
    option_a: 'Weekly',
    option_b: 'Daily with a partner',
    option_c: 'Monthly',
    option_d: 'Only in class',
    correct_answer: 'b',
    explanation: 'Lesson 9.1: "Daily repetition practice with a partner is recommended."',
    province_id: null
  }
];

// Helper functions
export function getQuestionsByModule(moduleId: string): Question[] {
  return QUESTIONS.filter(q => q.module_id === moduleId);
}

export function getQuestionsByProvince(provinceId: string): Question[] {
  return QUESTIONS.filter(q => q.province_id === provinceId);
}

export function getQuestionCountByModule(): { moduleId: string; count: number }[] {
  const counts = new Map<string, number>();
  QUESTIONS.forEach(q => {
    counts.set(q.module_id, (counts.get(q.module_id) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([moduleId, count]) => ({ moduleId, count }));
}

export const MODULE_IDS = {
  MODULE_1: '3adad7a8-60d0-402b-a412-c7a0d24f7b9b',
  MODULE_2: '3a5ba7a7-1042-4f2e-893b-0f4c001f7ea0',
  MODULE_3: 'e5b51522-90b4-4341-b082-ea667bb14ff1',
  MODULE_4: '762fb8fb-5189-4943-adaa-92f4c16fac4f',
  MODULE_5: 'c92d6d19-9153-4879-96bb-b4fdc50bbafd',
  MODULE_6: 'c5783d3a-85b5-415f-afb9-72a6b8932504',
  MODULE_7: '364373e1-88de-44ea-a434-2c3f0935c204',
  MODULE_8: '9894b48d-d43e-43e0-b5e5-3f4a3df95414',
  MODULE_9: '93e45eb0-50d5-46d8-b7b8-d93d25b25f27'
};