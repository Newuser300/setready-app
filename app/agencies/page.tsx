'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ── Agency data ─────────────────────────────────────────────── */
interface Agency {
  province: string;
  city: string;
  name: string;
  description: string;
  website: string;
  notes: string;
  email?: string;
  phone?: string;
}

const agencies: Agency[] = [
  // BRITISH COLUMBIA
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Hollywood North Extras',
    description: "One of Vancouver's most established background agencies since 1994. Books union and non-union performers for film and TV in the Lower Mainland.",
    website: 'https://hollywoodnorthextras.com',
    notes: 'Licensed Talent Agency — Licence #BA-2022-075824',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'The Casting Collective',
    description: 'Provides background artists for film and television productions in British Columbia and Alberta.',
    website: 'https://castingcollectivebga.com',
    notes: 'Covers both BC and Alberta productions',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Showbiz Management',
    description: "Vancouver's premier talent agency providing background performers and actors for film, TV, commercials, music videos and documentaries.",
    website: 'https://www.showbizmanagement.com',
    notes: 'Located in Burnaby, BC',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Pico Talent',
    description: 'Represents background performers working in the film and TV industry in the Greater Vancouver Area.',
    website: 'https://www.picobello.ca',
    notes: 'Greater Vancouver Area',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Twins Plus Talent',
    description: 'Background performers talent agency in British Columbia providing performers for film, television and commercial productions.',
    website: 'https://twinsplus.ca',
    notes: 'All ages welcome',
  },
  {
    province: 'British Columbia',
    city: 'Abbotsford',
    name: 'Valley Extras (JL Talent Management)',
    description: 'The background performer division of JL Talent Management. Serves the Fraser Valley and surrounding areas.',
    website: 'https://jlmtm.com/background-division',
    notes: 'Serves Fraser Valley region',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'In-Motion Talent',
    description: 'Founded in 1995, dedicated to providing professional people to fill background performer roles required by the movie industry.',
    website: 'https://www.inmotiontalent.com',
    notes: 'Established 1995',
  },

  // ONTARIO
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Toronto Film Extras (TFX)',
    description: 'One of the leading background talent agencies in the Greater Toronto Area. Has worked with over 500 major productions including Spotlight, Suits and Degrassi.',
    website: 'http://www.torontofilmextras.com',
    notes: 'Over a decade serving the GTA film industry',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Toronto Talent Agency (TTA)',
    description: 'Provides background performer opportunities across Toronto. Flexible scheduling and no experience required to get started.',
    website: 'https://torontotalentagency.com',
    notes: 'Great for beginners',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'ML Talent Agency (Melissa Lee)',
    description: "One of Toronto's top agencies for background extras. Over 14 years delivering exceptional service for talent and casting directors.",
    website: 'https://www.mltalent.com',
    notes: '14+ years in business',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Forefront Talent',
    description: 'Specializes in booking extras, stand-ins and photo doubles for major productions throughout the Greater Toronto Area.',
    website: 'https://www.forefronttalent.ca',
    notes: 'Specializes in stand-ins and doubles',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Ontario Talent Agency',
    description: 'Provides extras and background performers for film and TV productions all over Southern Ontario and the GTA. Free to sign up.',
    website: 'https://ontariotalent.com',
    notes: 'Southern Ontario and GTA — Free registration',
  },

  // ALBERTA
  {
    province: 'Alberta',
    city: 'Calgary & Edmonton',
    name: 'The Casting Collective',
    description: 'Provides background artists for film and television productions across Alberta and British Columbia.',
    website: 'https://castingcollectivebga.com',
    notes: 'Covers both Calgary and Edmonton',
  },

  // QUEBEC
  {
    province: 'Quebec',
    city: 'Montreal',
    name: 'Bellini International',
    description: 'Montreal talent agency strong in both English and French markets. Works with UBISOFT and major casting directors across Canada.',
    website: 'https://belliniinternational.com',
    notes: 'Bilingual English and French',
  },
  {
    province: 'Quebec',
    city: 'Montreal',
    name: 'ACTRA Montreal',
    description: 'The professional association for background performers in Quebec. Join ACTRA to access union background work on major productions.',
    website: 'https://actramontreal.ca',
    email: 'montreal@actra.ca',
    phone: '514-844-3318',
    notes: 'Union background work in Quebec',
  },

  // NATIONAL
  {
    province: 'National',
    city: 'All Provinces',
    name: 'ACTRA (Alliance of Canadian Cinema, Television and Radio Artists)',
    description: 'The national union for professional performers in Canada. Joining ACTRA provides access to better-paying union background work across all provinces.',
    website: 'https://www.actra.ca',
    notes: 'National union — recommended for serious performers',
  },
  {
    province: 'National',
    city: 'All Provinces',
    name: 'UBCP/ACTRA (BC)',
    description: 'The Union of British Columbia Performers. Handles union background work in BC. Joining can get you better-paying and more consistent roles.',
    website: 'https://www.ubcp.com',
    notes: 'BC union for performers',
  },
  {
    province: 'National',
    city: 'All Provinces',
    name: 'Agency Click',
    description: 'A casting database recommended by BCF Casting for independent background actors. Used widely across Canada to find and book background work.',
    website: 'https://www.agencyclick.com',
    notes: 'Online casting database — used across Canada',
  },
];

const PROVINCES = ['All', 'British Columbia', 'Ontario', 'Alberta', 'Quebec', 'National'];

const BADGE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  'British Columbia': { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  'Ontario':          { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
  'Alberta':          { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  'Quebec':           { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-400' },
  'National':         { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
};

const FILTER_ACTIVE: Record<string, string> = {
  'All':              'bg-amber-500 text-black border-amber-500',
  'British Columbia': 'bg-blue-600 text-white border-blue-600',
  'Ontario':          'bg-red-600 text-white border-red-600',
  'Alberta':          'bg-orange-500 text-white border-orange-500',
  'Quebec':           'bg-teal-600 text-white border-teal-600',
  'National':         'bg-purple-600 text-white border-purple-600',
};

/* ── Province abbreviation for badge ───────────────────────── */
function abbr(province: string) {
  const map: Record<string, string> = {
    'British Columbia': 'BC',
    'Ontario': 'ON',
    'Alberta': 'AB',
    'Quebec': 'QC',
    'National': 'CA',
  };
  return map[province] ?? province;
}

/* ── Agency card ─────────────────────────────────────────────── */
function AgencyCard({ agency }: { agency: Agency }) {
  const badge = BADGE_STYLES[agency.province] ?? BADGE_STYLES['National'];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* Card body */}
      <div className="p-6 flex-1">
        {/* Top row: province badge + city */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {abbr(agency.province)}
          </span>
          <span className="text-xs text-gray-400 text-right">{agency.city}</span>
        </div>

        {/* Agency name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{agency.name}</h3>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{agency.description}</p>

        {/* Notes */}
        <p className="text-xs text-gray-400 italic mb-4">{agency.notes}</p>

        {/* Contact details */}
        {(agency.phone || agency.email) && (
          <div className="space-y-1 mb-4">
            {agency.phone && (
              <a
                href={`tel:${agency.phone.replace(/\D/g, '')}`}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-amber-600 transition"
              >
                <span>📞</span> {agency.phone}
              </a>
            )}
            {agency.email && (
              <a
                href={`mailto:${agency.email}`}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-amber-600 transition"
              >
                <span>✉️</span> {agency.email}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Card footer: website button */}
      <div className="px-6 pb-6">
        <a
          href={agency.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500 text-black text-sm font-bold rounded-xl hover:bg-amber-400 transition-all duration-200"
        >
          Visit Website →
        </a>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function AgenciesPage() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? agencies
    : agencies.filter(a => a.province === activeFilter);

  const counts: Record<string, number> = { All: agencies.length };
  PROVINCES.slice(1).forEach(p => {
    counts[p] = agencies.filter(a => a.province === p).length;
  });

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── TOP NAV BAR ─────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-gray-900 font-bold text-lg">🎬 SetReady</span>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🍁</span>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Agency Directory
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Background Performer Agencies<br className="hidden sm:block" /> in Canada
          </h1>
          <p className="text-gray-500 text-lg mb-4 max-w-2xl">
            Find agencies in your province to start booking film and TV work.
          </p>
          <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 max-w-2xl">
            ⚠️ Always verify agency details directly as information may change. SetReady does not endorse any specific agency.
          </p>
        </div>
      </section>

      {/* ── FILTER BAR ──────────────────────────────────────── */}
      <section className="bg-[#F9FAFB] border-b border-gray-200 px-4 py-4 sticky top-[53px] z-30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {PROVINCES.map(province => {
              const isActive = activeFilter === province;
              const activeClass = isActive
                ? FILTER_ACTIVE[province]
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50';
              return (
                <button
                  key={province}
                  onClick={() => setActiveFilter(province)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${activeClass}`}
                >
                  {province === 'All' ? 'All' : province === 'British Columbia' ? 'BC' : province}
                  <span className={`ml-1.5 text-xs ${isActive ? 'opacity-70' : 'text-gray-400'}`}>
                    ({counts[province]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AGENCY GRID ─────────────────────────────────────── */}
      <section className="px-4 py-10">
        <div className="max-w-6xl mx-auto">

          {/* Result count */}
          <p className="text-sm text-gray-400 mb-6">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> agenc{filtered.length === 1 ? 'y' : 'ies'}
            {activeFilter !== 'All' && (
              <> in <span className="font-semibold text-gray-700">{activeFilter}</span></>
            )}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(agency => (
              <AgencyCard key={`${agency.province}-${agency.name}`} agency={agency} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER NOTE ─────────────────────────────────────── */}
      <section className="bg-gray-50 border-t border-gray-200 px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto mb-4">
            This directory is provided as a resource for SetReady users. Agency information is sourced
            from public listings and may change. Always contact agencies directly to verify current
            registration requirements and availability.
          </p>
          <p className="text-xs text-gray-400">Last updated: June 2026</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mt-6 text-sm text-amber-600 hover:text-amber-700 font-medium transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </section>

    </div>
  );
}
