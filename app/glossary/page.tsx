'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const TERMS = [
  { term: 'Action',                             def: 'The director\'s command to begin filming a scene. When you hear "Action" you begin your designated activity immediately.' },
  { term: 'Additional Director (AD)',           def: 'On-set shorthand for an Assistant Director. Any member of the AD department responsible for coordinating set operations and managing background performers.' },
  { term: 'Apple Box',                          def: 'A sturdy wooden crate available in full, half, quarter, and pancake sizes. Used to elevate performers, props, or camera equipment to precise heights.' },
  { term: 'Background',                         def: 'A background performer or extra; someone hired to appear in scenes without scripted dialogue, populating the environment to make scenes feel realistic.' },
  { term: 'Background Action',                  def: 'The specific cue given to background performers to begin their designated activity within a scene, often called just before or after the main action cue.' },
  { term: 'Base Camp',                          def: 'The area on location where production vehicles, cast trailers, crew trucks, and support departments are stationed during a shoot day.' },
  { term: 'Blocking',                           def: 'The planned movement, positioning, and staging of performers and the camera for a scene, determined by the director before filming begins.' },
  { term: 'Call Sheet',                         def: 'A daily document distributed to all cast and crew the night before, listing the next day\'s schedule, scenes, locations, cast, and special requirements.' },
  { term: 'Call Time',                          def: 'The specific time a performer or crew member must arrive and report for work. Being late for call time is considered highly unprofessional.' },
  { term: 'Camera Left',                        def: 'The left side of the frame from the camera\'s perspective. This is the performer\'s right side when they are facing the camera.' },
  { term: 'Camera Right',                       def: 'The right side of the frame from the camera\'s perspective. This is the performer\'s left side when they are facing the camera.' },
  { term: 'Check the Gate',                     def: 'A request to inspect the camera aperture and film gate for debris, hair, or scratches before the crew moves on to the next setup.' },
  { term: 'Continuity',                         def: 'The careful maintenance of consistent wardrobe, props, hair, makeup, and body positions from shot to shot so that edits appear seamless.' },
  { term: 'Copy That',                          def: 'Radio communication acknowledgment meaning the message was received and understood. The professional response when an AD gives you a radio instruction.' },
  { term: 'Craft Services',                     def: 'The department providing snacks, beverages, and light refreshments available to cast and crew between scheduled meals. Background performers access craft services during designated breaks only.' },
  { term: 'Cut',                                def: 'The director\'s command to immediately stop filming. Do not move until instructed — the camera may still be rolling.' },
  { term: 'Dailies',                            def: 'Raw, unedited footage from the previous day\'s shooting, reviewed by the director and director of photography to assess performances and technical quality.' },
  { term: 'Day Player',                         def: 'A performer hired for a specific number of days on a production rather than the full duration of the shoot.' },
  { term: 'Dead Cat',                           def: 'A fluffy windscreen cover placed over a boom microphone to reduce wind noise during outdoor recording. Named for its appearance.' },
  { term: 'Director',                           def: 'The creative lead of a production responsible for guiding performances, camera placement, pacing, and overall visual storytelling. Never approach the director uninvited.' },
  { term: 'Dolly',                              def: 'A wheeled platform used to mount the camera and move it smoothly during a shot, either along a track (dolly track) or on the floor with rubber wheels.' },
  { term: 'DOP/DP',                             def: 'Director of Photography (also called Cinematographer). The department head responsible for all aspects of lighting, camera placement, lens choice, and overall image quality.' },
  { term: 'Double',                             def: 'A performer who substitutes for a principal actor in scenes requiring a physical match — for stunts, body shots, driving scenes, or appearance matching.' },
  { term: 'Downey',                             def: 'A type of daily payment voucher used by background performers in British Columbia to document hours worked, rate, and production details.' },
  { term: 'Dry Run',                            def: 'A full rehearsal of camera movement and performer blocking conducted without actually rolling the camera. Used to fine-tune timing and positions.' },
  { term: 'Extras',                             def: 'Background performers hired to populate scenes without scripted dialogue. Also called background artists or BG. A core part of every production.' },
  { term: 'Eye Line',                           def: 'The specific direction a performer looks during a scene. Eye line must remain consistent between shots to maintain visual logic when the editor cuts.' },
  { term: 'Featured Extra',                     def: 'A background performer assigned a specific, prominent action or visible position that draws noticeable attention in the shot, sometimes receiving additional pay.' },
  { term: 'First Assistant Director (1st AD)',  def: 'The director\'s on-set coordinator. Responsible for running the floor, managing the schedule, communicating between departments, and calling roll, action, and cut.' },
  { term: 'First Team',                         def: 'The principal actors called to set for actual filming, as opposed to the Second Team (stand-ins) who are used during setup.' },
  { term: 'Flipping the Set',                   def: 'Repositioning all lighting equipment, cameras, and crew to shoot from the opposite direction within the same location — a time-consuming process.' },
  { term: 'General Background',                def: 'The standard background performer category requiring no special skills, used to populate crowd scenes, street scenes, and general environments.' },
  { term: 'Holding',                            def: 'The designated waiting area where background performers remain between takes, typically a tent, trailer, or nearby room separate from the filming set.' },
  { term: 'Hot Set',                            def: 'A set that is actively being prepared for or used in filming. Nothing may be touched, moved, or disturbed on a hot set without permission.' },
  { term: 'Lock it Up',                         def: 'A command from the AD department to secure all entrances to the filming area and stop all movement, vehicle traffic, and exterior noise.' },
  { term: 'Martini Shot',                       def: 'The last shot of the shooting day. Named because after it, the next shot poured will be a martini — meaning the day is done.' },
  { term: 'MOS',                                def: 'Mit Out Sound — shooting without recording audio. The footage will have sound effects, music, or dialogue dubbed in during post-production.' },
  { term: 'Moving On',                          def: 'An announcement from the AD that the crew has completed the current camera setup and is moving to the next scene or shot.' },
  { term: 'Non-Deductible Meal',                def: 'A meal provided to cast and crew that does not count against the overtime or meal penalty clock. Distinct from the standard meal break.' },
  { term: 'On a Bell',                          def: 'The period when a bell or buzzer sounds to signal that filming is about to begin. Absolute silence is required from everyone on and near set.' },
  { term: 'Photo Double',                       def: 'A background performer who closely matches a principal actor\'s physical appearance and is used for over-the-shoulder shots, body inserts, or wide shots.' },
  { term: 'Picture Car',                        def: 'A vehicle that appears on camera as part of the scene. Picture cars are handled by the transportation department and must not be touched.' },
  { term: 'Picture Up',                         def: 'The announcement that the camera is about to roll and all performers must be in their starting positions immediately.' },
  { term: 'Playback',                           def: 'Pre-recorded audio or video played on set during filming. Background performers may be asked to react to playback or lip-sync to it.' },
  { term: 'Principal Performer',                def: 'An actor with a speaking or featured role in the production. Background performers should not approach, interrupt, or photograph principal performers.' },
  { term: 'Production',                         def: 'The company or team responsible for creating the film or television show. Also used to mean the production office or production department.' },
  { term: 'Quiet on Set',                       def: 'A command requiring absolute silence from all personnel on and near the set. Issued immediately before filming begins.' },
  { term: 'Reload',                             def: 'A command indicating the camera magazine is being changed or the camera is resetting. A short pause before filming can resume.' },
  { term: 'Roll Camera',                        def: 'The command for the camera operator to begin recording. Typically followed by the slate announcement and then the action call.' },
  { term: 'SAG/AFTRA',                          def: 'Screen Actors Guild — American Federation of Television and Radio Artists. The American performers union. SAG-AFTRA productions in Canada typically use ACTRA agreements.' },
  { term: 'Second Assistant Director (2nd AD)', def: 'Assists the 1st AD by managing background performer paperwork, coordinating vouchers, calling background to set, and handling BG logistics.' },
  { term: 'Second Team',                        def: 'Stand-ins who substitute for principal actors during the time-consuming process of setting up lights and camera angles. First Team rests while Second Team works.' },
  { term: 'Set PA',                             def: 'A Production Assistant working on the set floor. Usually the primary point of contact for background performers regarding direction, breaks, and vouchers.' },
  { term: 'Sides',                              def: 'Printed excerpts from the script covering only the scenes being filmed that day. Distributed to cast and crew before or on the shooting day.' },
  { term: 'Slate',                              def: 'The clapperboard used to identify each scene, shot, and take on camera. Also refers to reading the scene and take information aloud before filming.' },
  { term: 'Special Ability',                    def: 'A background performer category for those with specific skills — driving, horseback riding, playing an instrument, sports, dancing — that earns a higher rate.' },
  { term: 'Stand-in',                           def: 'A background performer who physically resembles a principal actor in height and coloring and substitutes for them during lighting and camera setup. Earns a higher rate.' },
  { term: 'UBCP',                               def: 'Union of British Columbia Performers. The union representing professional performers — including background performers — working on productions in British Columbia. See ubcpactra.ca.' },
  { term: 'Video Village',                      def: 'The area on set where monitors display the live camera feed, allowing the director, producers, and key creative personnel to view shots in real time.' },
  { term: 'Voucher',                            def: 'The official daily payment record completed by a background performer documenting hours worked. Accumulating vouchers can count toward UBCP/ACTRA membership eligibility.' },
  { term: 'Walking',                            def: 'The signal or moment when background performers begin their designated action or movement within a scene, usually initiated by the AD or Set PA.' },
  { term: 'Wrap',                               def: 'The conclusion of filming for the day, for a specific scene, or for the entire production. Do not leave set until you have been officially wrapped by the AD.' },
  { term: 'Wrangler',                           def: 'A crew member responsible for managing and coordinating a specific group — background performers, animals, vehicles, or specialty props — on set.' },
].sort((a, b) => a.term.localeCompare(b.term));

const LETTERS = Array.from(new Set(TERMS.map(t => t.term.charAt(0).toUpperCase()))).sort();

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-amber-200 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

export default function GlossaryPage() {
  const [search, setSearch]       = useState('');
  const [letter, setLetter]       = useState('');

  const filtered = useMemo(() => {
    let list = TERMS;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q));
    } else if (letter) {
      list = list.filter(t => t.term.charAt(0).toUpperCase() === letter);
    }
    return list;
  }, [search, letter]);

  function clearAll() {
    setSearch('');
    setLetter('');
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <span className="font-bold text-gray-900">Film Set Glossary</span>
            <span className="text-xs text-gray-400 hidden sm:inline">— {TERMS.length} terms</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/rate-calculator" className="text-sm text-gray-500 hover:text-gray-900 transition hidden sm:inline">Rate Calculator</Link>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition">← Dashboard</Link>
          </div>
        </div>
      </div>

      {/* Sticky search + A-Z bar */}
      <div className="sticky top-[53px] z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
          {/* Search */}
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setLetter(''); }}
            placeholder="Search terms and definitions..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none bg-gray-50"
          />
          {/* A-Z nav */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={clearAll}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${!letter && !search ? 'bg-amber-500 text-black' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              All
            </button>
            {LETTERS.map(l => (
              <button
                key={l}
                onClick={() => { setLetter(l); setSearch(''); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${letter === l ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Result count */}
        <p className="text-sm text-gray-400 mb-4">
          {filtered.length} term{filtered.length !== 1 ? 's' : ''}
          {(search || letter) && (
            <button onClick={clearAll} className="ml-2 text-amber-600 hover:underline">Clear filter</button>
          )}
        </p>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p>No terms match &quot;{search}&quot;</p>
          </div>
        )}

        {/* Terms grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(t => (
            <div key={t.term} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">
                <Highlight text={t.term} query={search} />
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                <Highlight text={t.def} query={search} />
              </p>
            </div>
          ))}
        </div>

        {/* Footer disclaimer */}
        <p className="text-xs text-gray-400 text-center mt-10 pb-4">
          SetReady Film Set Glossary — for use on set or as a training reference.
          Definitions reflect standard Canadian film industry usage in British Columbia.
        </p>
      </div>
    </div>
  );
}
