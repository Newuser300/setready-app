'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

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
  address?: string;
}

const agencies: Agency[] = [

  // ========================================
  // BRITISH COLUMBIA — BACKGROUND SPECIALISTS
  // ========================================
  {
    province: 'British Columbia',
    city: 'North Vancouver',
    name: 'Boss Management Inc.',
    description: 'Established in 1992. Vancouver\'s top full service agency representing Union and Non-Union Background Performers, Principal Actors, Commercial Actors, Models, Specialty Performers, Musicians, Singers, Dancers and Entertainers. Pays performers via Direct Deposit.',
    website: 'https://bossmanagement.com',
    email: 'extras@bossmanagement.com',
    address: '#500-224 Esplanade West, North Vancouver BC',
    notes: 'Agency Licence #467579 — Background, principal, commercial — Est. 1992',
  },
  {
    province: 'British Columbia',
    city: 'Burnaby',
    name: 'Hollywood North Extras',
    description: 'Since 1994, connecting everyday people with real film and TV productions in Vancouver and the Lower Mainland. Books union and non-union background performers. No experience required.',
    website: 'https://hollywoodnorthextras.com',
    email: 'stephanie@hollywoodnorthextras.com',
    phone: '604-466-3045',
    address: '5050 Kingsway #302, Burnaby BC V5H 4H2',
    notes: 'Background specialists — Est. 1994 — No experience required',
  },
  {
    province: 'British Columbia',
    city: 'Burnaby',
    name: 'Showbiz Management',
    description: 'Premier talent agency providing background performers and actors for film, TV, commercials, music videos and documentaries across Vancouver and the Lower Mainland.',
    website: 'https://www.showbizmanagement.com',
    address: '120A - 3989 Henning Drive, Burnaby BC V5C 6N5',
    notes: 'Background and principal talent',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'In-Motion Talent Ltd',
    description: 'Founded in 1995 by James and Carolyn Strand. Dedicated to providing gifted and dedicated Background Performers to the Film and Television Industry. Accepts Visa, MasterCard and Debit for commission payments.',
    website: 'http://www.inmotiontalent.com',
    email: 'info@inmotiontalent.com',
    phone: '604-336-5220',
    address: '1191 Grant Street, Vancouver BC V6A 2J7',
    notes: 'Background performers specialist — Est. 1995',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Eleven Talent Management',
    description: 'One of Vancouver\'s longest running background agencies, providing background performers for film and television since 1997.',
    website: 'http://www.eleventalentmanagement.com',
    email: 'info@eleventalentmanagement.com',
    phone: '778-734-0764',
    address: '1707 East 4th Avenue #7, Vancouver BC V5N 1J9',
    notes: 'Background specialists since 1997',
  },
  {
    province: 'British Columbia',
    city: 'New Westminster',
    name: 'Twins Plus Talent',
    description: 'Background performers talent agency in British Columbia providing performers for film, television and commercial productions. Their mission is to facilitate access for every person who wants the opportunity to work in the film and TV industry.',
    website: 'https://twinsplus.ca',
    address: 'New Westminster BC',
    notes: 'Background performers — all ages welcome',
  },
  {
    province: 'British Columbia',
    city: 'Surrey',
    name: 'Narnia Talent Agency',
    description: 'Books extras and background performers for the film and television industry in the Vancouver Area and Lower Mainland.',
    website: 'https://narniatm.com',
    email: 'narniagency@gmail.com',
    address: 'Surrey BC',
    notes: 'Background extras — Lower Mainland',
  },
  {
    province: 'British Columbia',
    city: 'Surrey',
    name: 'Infinity Talent',
    description: 'Boutique background agency in the Lower Mainland. Kids and adults welcome. Representing background performers for film and TV productions.',
    website: 'https://infinitytalent.ca',
    address: '800-15355 24th Avenue Suite #506, Surrey BC V4A 2H9',
    notes: 'Background performers — kids and adults',
  },
  {
    province: 'British Columbia',
    city: 'Langley',
    name: 'Valley Extras — JL Model Talent Management',
    description: 'The background performer division of JL Talent Management Inc. Serves the Fraser Valley and surrounding areas including agents in Vancouver and Northern BC. Currently accepting new talent of all ages.',
    website: 'https://jlmtm.com',
    email: 'info@jlmtm.com',
    phone: '604-587-1988',
    address: 'PO Box 12054 Murrayville, Langley BC V2Y 0M6',
    notes: 'Fraser Valley and Northern BC — email to apply',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'The Casting Collective',
    description: 'Provides background artists for film and television productions across British Columbia and Alberta. One of the main background booking services for Western Canada. Create a performer profile to get started.',
    website: 'https://castingcollectivebga.com',
    notes: 'BC and Alberta — major background casting service',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Pico Talent',
    description: 'Represents background performers working in the film and TV industry in the Greater Vancouver Area.',
    website: 'https://www.picobello.ca',
    address: 'Vancouver BC',
    notes: 'Greater Vancouver Area background performers',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Inspirationall Talent',
    description: 'Vancouver based talent agency with over 25 years of combined experience. Proudly representing talented actors in film, TV, commercials and background since 2007.',
    website: 'http://inspirationall.com',
    email: 'info@inspirationall.com',
    phone: '604-558-4864',
    address: '2050 Scotia Street, Vancouver BC V5T 4T1',
    notes: 'Background and principal — 25+ years experience',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Ignite Artists',
    description: 'Represents a diverse range of actors, background performers and commercial print models of all ages and ethnicities. Gives back to local youth and mental health non-profits.',
    website: 'https://ignite-artists.com',
    email: 'info@ignite-artists.com',
    phone: '604-681-0899',
    address: 'Gastown, Vancouver BC',
    notes: 'Background, actors, models — all ages and ethnicities',
  },

  // ========================================
  // BRITISH COLUMBIA — FULL SERVICE AGENCIES
  // ========================================
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Lucas Talent Inc.',
    description: 'One of Canada\'s leading talent agencies representing many of Canada\'s top talents in film and television since 1986. Has dedicated background agents on staff.',
    website: 'https://lucastalent.com',
    phone: '604-685-0345',
    address: 'Vancouver BC',
    notes: 'Has dedicated background agents — Jennifer Lee and Derek Nordick',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'KC Talent',
    description: 'Representing the very best Vancouver talent with a dedication and focus on career development for both new and experienced actors alike.',
    website: 'http://www.kctalent.com',
    email: 'info@kctalent.com',
    phone: '604-734-0003',
    address: '2-1955 Trafalgar St, Vancouver BC V6K 3S4',
    notes: 'Film, TV and commercials — new and experienced',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Connekt Creative Agency',
    description: 'National talent agency representing high profile professional performers for film, TV, commercials, theatre and voice across Canada.',
    website: 'http://www.connektcreative.com',
    email: 'talent@connektcreative.com',
    phone: '604-288-4844',
    address: '305 - 190 Alexander Street, Vancouver BC V6A 2S5',
    notes: 'National agency — principal and background',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'All Heart Talent',
    description: 'Full service talent agency focusing on protecting actors mental health in the film industry. Represents background performers and principal actors of all ages.',
    website: 'https://allhearttalent.com',
    email: 'contact@allhearttalent.com',
    address: '1865 Barclay Street, Vancouver BC V6G 1K7',
    notes: 'Mental health focused — background and principal',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Alpha Artist Management',
    description: 'Vancouver-based talent agency dedicated to representing established and emerging actors in the North American film and television industry.',
    website: 'http://alphaartist.ca',
    email: 'info@alphaartist.ca',
    address: '900 Helmcken St 2nd Floor, Vancouver BC V6Z 1B3',
    notes: 'Principal talent — established and emerging actors',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Hero Artists Inc.',
    description: 'Represents professional actors nationally for Film, TV and Commercials. Offices in both Vancouver and Toronto.',
    website: 'https://www.heroartists.com',
    phone: '604-800-0015',
    address: '402-1008 Homer St., Vancouver BC V6B 2X1',
    notes: 'Vancouver and Toronto offices — national representation',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'da Costa Talent Management',
    description: 'Dedicated and effective representation of some of Canada\'s leading actors, dancers, singers and world class choreographers for every area of the entertainment industry.',
    website: 'http://dacostatalent.com',
    email: 'vancouver@dacostatalent.com',
    phone: '604-210-2967',
    address: '1820 Fir Street Suite 250, Vancouver BC V6J 3B1',
    notes: 'Actors, dancers, singers and choreographers',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'HectiQ Artists Talent Management',
    description: 'One of the fastest growing talent agencies in Canada. Represents artists for Film, TV, Commercials and Motion Capture across Canada.',
    website: 'https://www.hectiqartists.com',
    email: 'christopher@hectiqartists.com',
    phone: '604-785-1100',
    address: 'North Vancouver BC',
    notes: 'Film, TV, commercials and motion capture',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Carrier Talent Management',
    description: 'Handles Animation, Voiceover, Motion Capture, Video-gaming, Musical Theatre, Film and Television for US and Canadian productions.',
    website: 'http://www.carriertalent.com',
    email: 'carriertalent@gmail.com',
    phone: '604-683-8641',
    address: '1080 Howe Street 705, Vancouver BC V6Z 2T1',
    notes: 'Animation, voiceover, MoCap, film and TV',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Carrie Wheeler Entertainment Group',
    description: 'Talent agent and producer based in Vancouver with 2 decades of experience in fashion and film. Clients work locally, nationally and internationally.',
    website: 'http://www.carriewheelerentertainment.com',
    email: 'carrie@carriewheelerentertainment.com',
    address: '#338, 101 - 1001 West Broadway, Vancouver BC V6H 4E4',
    notes: 'National and international representation',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Evangelista Talent Management',
    description: 'Boutique agency serving North America located in Vancouver. Mission is to provide actors with agents who can get them in the room.',
    website: 'http://www.evangelistatalent.com',
    email: 'evangelistatalent@gmail.com',
    phone: '604-551-2308',
    address: '5870 Lincoln St, Vancouver BC V5R 4P7',
    notes: 'Boutique — North America representation',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Dorothy S Management Inc.',
    description: 'Talent management agency representing actors for film and television productions in Vancouver.',
    website: 'https://www.dorothysmgmt.com',
    email: 'info@dorothysmgmt.com',
    phone: '604-874-3309',
    address: 'Vancouver BC',
    notes: 'Film and television',
  },
  {
    province: 'British Columbia',
    city: 'Burnaby',
    name: 'Dallas Talent',
    description: 'Vancouver based talent agency representing actors and background performers for film and TV productions across the Lower Mainland.',
    website: 'https://dallastalent.ca',
    email: 'dallastalentagency@yahoo.com',
    phone: '604-415-4783',
    address: '501-3292 Production Way, Burnaby BC V5A 4R4',
    notes: 'Background and principal',
  },
  {
    province: 'British Columbia',
    city: 'Burnaby',
    name: 'Collingwood Management Inc.',
    description: 'Talent management representing actors for film and television productions in the Vancouver area.',
    website: 'http://collingwoodmanagement.ca',
    email: 'dylancollingwood@gmail.com',
    phone: '604-220-0157',
    address: '2400 Boundary Road, Burnaby BC V5M 3Z3',
    notes: 'Film and television',
  },
  {
    province: 'British Columbia',
    city: 'New Westminster',
    name: 'Actum Talent Management Inc.',
    description: 'Boutique talent agency representing actors in Canada and Europe for film, television and background work.',
    website: 'https://www.actumtalentmanagement.com',
    email: 'nadia@actumtalentmanagement.com',
    phone: '905-638-9815',
    address: '720 Queens Ave, New Westminster BC V3M 1L6',
    notes: 'Canada and Europe — boutique agency',
  },
  {
    province: 'British Columbia',
    city: 'Surrey',
    name: 'Hellkat Talent',
    description: 'Surrey based talent agency representing performers for film and television in the Lower Mainland and Greater Vancouver area.',
    website: 'http://hellkattalent.ca',
    email: 'info@hellkattalent.ca',
    phone: '604-816-4528',
    address: '34139 RPO Cloversquare, Surrey BC V3S 8C4',
    notes: 'Lower Mainland — film and television',
  },
  {
    province: 'British Columbia',
    city: 'Maple Ridge',
    name: 'Bona Fide Talents',
    description: 'Talent agency representing performers for film and television in the Vancouver area and Fraser Valley region.',
    website: 'https://bonafidetalents.com',
    email: 'bonafidetalents@gmail.com',
    phone: '604-997-4937',
    address: '31512 Burnham Place, Maple Ridge BC V4S 0E8',
    notes: 'Fraser Valley and Vancouver area',
  },
  {
    province: 'British Columbia',
    city: 'Langley',
    name: 'Ascension Talent Management',
    description: 'Guiding actors from Vancouver to Toronto in film and television. Helping performers reach their fullest potential.',
    website: 'https://www.ascensiontalent.ca',
    email: 'clay@ascensiontalent.ca',
    phone: '778-808-6324',
    address: '505-20839 78B Ave, Langley BC V2Y 0Z5',
    notes: 'Vancouver and Toronto — principal talent',
  },
  {
    province: 'British Columbia',
    city: 'Vancouver',
    name: 'Agency Click',
    description: 'Online casting database recommended for independent background actors. Widely used across BC to find and book background work. Recommended starting point for new background performers without an agent.',
    website: 'https://www.agencyclick.com',
    notes: 'Online casting database — great for self-managed performers',
  },

  // ========================================
  // BRITISH COLUMBIA — VICTORIA
  // ========================================
  {
    province: 'British Columbia',
    city: 'Victoria',
    name: 'Coultish Management',
    description: 'Representing Actors, Models, Comedians, Voice Artists and Background Performers in Victoria and on Vancouver Island.',
    website: 'http://www.barbaracoultish.ca',
    email: 'coultishtalent@telus.net',
    phone: '250-382-2670',
    address: '210 Fort Street, Victoria BC V8W 1G2',
    notes: 'Victoria and Vancouver Island — background and principal',
  },
  {
    province: 'British Columbia',
    city: 'Victoria',
    name: 'DEI Talent Management',
    description: 'Diversity, Equality and Inclusion agency based in Victoria. Represents diverse Principal, Background and Voice Over Actors and models across Vancouver Island.',
    website: 'https://www.deitalent.ca',
    email: 'contact@deitalent.ca',
    phone: '250-514-7432',
    address: 'Victoria BC',
    notes: 'Diversity focused — background, principal and voice over',
  },

  // ========================================
  // BRITISH COLUMBIA — KELOWNA / OKANAGAN
  // ========================================
  {
    province: 'British Columbia',
    city: 'Kelowna',
    name: 'BookIT Talent',
    description: 'Leading talent agency representing actors from infants to seniors. Offices in Toronto, Vancouver and Kelowna servicing casting directors across Canada and the United States coast to coast.',
    website: 'https://bookittalent.com',
    email: 'assistant@bookittalent.com',
    address: 'Kelowna BC',
    notes: 'Toronto, Vancouver and Kelowna — all ages',
  },
  {
    province: 'British Columbia',
    city: 'Kelowna',
    name: 'Shine Agency',
    description: 'The Okanagan\'s most trusted talent agency. Full service Kelowna based agency for Principal, Commercial and Voice Over. Representing professional actors across Canada with a diverse and inclusive roster.',
    website: 'https://shineagency.ca',
    address: 'Kelowna BC',
    notes: 'Kelowna based — principal, commercial and voice over',
  },

  // ========================================
  // ONTARIO — TORONTO
  // ========================================
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Toronto Film Extras (TFX)',
    description: 'One of the leading background talent agencies in the Greater Toronto Area. Has booked thousands of performers on over 500 major productions including Spotlight, Suits and Degrassi.',
    website: 'http://www.torontofilmextras.com',
    notes: '500+ productions — over a decade in the GTA',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Toronto Talent Agency (TTA)',
    description: 'Background performer opportunities across Toronto. Flexible scheduling, no experience required. Must be Ontario resident with SIN and Worker Health and Safety certificate.',
    website: 'https://torontotalentagency.com',
    notes: 'Beginner friendly — Ontario resident with SIN required',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'ML Talent Agency (Melissa Lee)',
    description: 'One of Toronto\'s top agencies for background extras. Founded by Melissa Lee with nearly three decades in the Toronto film industry. Exceptional service for talent and casting directors.',
    website: 'https://www.mltalent.com',
    notes: 'Nearly 30 years experience — Toronto background specialists',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Forefront Talent',
    description: 'Specializes in booking extras, stand-ins and photo doubles for major productions throughout the Greater Toronto Area.',
    website: 'https://www.forefronttalent.ca',
    notes: 'Extras, stand-ins and photo doubles — GTA',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Ontario Talent Agency',
    description: 'Provides extras and background performers for film and TV productions across Southern Ontario and the GTA. Free to sign up, no obligations, no experience required.',
    website: 'https://ontariotalent.com',
    notes: 'Free registration — Southern Ontario and GTA',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Susan J. Talent — Shine Talent Division',
    description: 'Shine Talent is the extras division of Susan J. Talent. Works with top casting directors in Toronto, Vancouver, New York and LA. All ages and ethnicities welcome.',
    website: 'https://www.susanj.com/talentExtras.html',
    email: 'background@susanj.com',
    phone: '416-536-5883',
    address: '219 Dufferin Street Unit 1D, Toronto ON M6K 3J1',
    notes: 'Appointments Tues and Thurs 3–6pm — all ages',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'Y-H Acting Division Inc.',
    description: 'Toronto talent agency specializing in background performers. Listed in the official ACTRA Toronto agents directory updated March 2026.',
    website: 'https://actratoronto.com/agents-directory/',
    notes: 'Background specialist — ACTRA Toronto registered',
  },
  {
    province: 'Ontario',
    city: 'Toronto',
    name: 'ACTRA Toronto — Working Background Resource',
    description: 'Essential resource for all background performers in Ontario. Explains union background work, voucher types, rates, The Count system and how to qualify for ACTRA membership.',
    website: 'https://actratoronto.com/working-background/',
    notes: 'Union resource — Ontario background performer information',
  },

  // ========================================
  // ALBERTA
  // ========================================
  {
    province: 'Alberta',
    city: 'Calgary & Edmonton',
    name: 'The Casting Collective',
    description: 'Provides background artists for film and television productions across Alberta and British Columbia. The main background booking service for Western Canada covering both Calgary and Edmonton.',
    website: 'https://castingcollectivebga.com',
    notes: 'Covers Calgary, Edmonton and BC',
  },
  {
    province: 'Alberta',
    city: 'Calgary & Edmonton',
    name: 'ACTRA Alberta — Agent Directory',
    description: 'ACTRA Alberta maintains a list of verified reputable talent agents in Calgary and Edmonton. Standard agent commission is 15% plus GST. Essential resource before signing with any Alberta agency.',
    website: 'https://actraalberta.com/talent-agents/',
    notes: 'Verify any Alberta agent here first — beware excessive sign-up fees',
  },

  // ========================================
  // QUEBEC
  // ========================================
  {
    province: 'Quebec',
    city: 'Montreal',
    name: 'Bellini International',
    description: 'Montreal talent agency strong in both English and French markets. Works with UBISOFT and major casting directors across Canada. Full service including background performers.',
    website: 'https://belliniinternational.com',
    notes: 'Bilingual English and French — Montreal',
  },
  {
    province: 'Quebec',
    city: 'Montreal',
    name: 'ACTRA Montreal — Background Performers',
    description: 'Professional association for background performers in Quebec. Joining provides access to union background work on major productions. Must prove 15 days of background work to qualify.',
    website: 'https://actramontreal.ca/specializations/background-work-performer/',
    email: 'montreal@actra.ca',
    phone: '514-844-3318',
    notes: 'Union — must prove 15 days work to qualify',
  },

  // ========================================
  // NOVA SCOTIA / ATLANTIC CANADA
  // ========================================
  {
    province: 'Nova Scotia',
    city: 'Dartmouth',
    name: 'Sky Talent Group',
    description: 'The largest talent agency in Atlantic Canada. Active in Nova Scotia since 1993. Represents actors and performers for film, television and theatre across the Maritime provinces.',
    website: 'https://www.skytalent.ca',
    notes: 'Largest in Atlantic Canada — Est. 1993',
  },
  {
    province: 'Nova Scotia',
    city: 'Halifax',
    name: 'Anchor Talent Group',
    description: 'Halifax based agency representing a diverse roster including actors, creatives, stunt performers and background performers for Nova Scotia productions.',
    website: 'https://www.anchortalentgroup.com',
    notes: 'Halifax — includes background performers',
  },
  {
    province: 'Nova Scotia',
    city: 'Halifax',
    name: 'Hennessey Casting',
    description: 'Halifax based casting service covering all of Atlantic Canada. Background work, acting, voice work and modelling. Create a free talent profile to get discovered.',
    website: 'https://www.hennesseycasting.com',
    notes: 'All Atlantic Canada — free talent profile',
  },

  // ========================================
  // MANITOBA
  // ========================================
  {
    province: 'Manitoba',
    city: 'Winnipeg',
    name: 'Paquin Entertainment Group',
    description: 'One of Canada\'s leading entertainment companies with offices in Winnipeg, Toronto and Vancouver. Full service talent management.',
    website: 'https://paquinent.com',
    notes: 'Winnipeg, Toronto and Vancouver offices',
  },
  {
    province: 'Manitoba',
    city: 'Winnipeg',
    name: 'Get on Set Manitoba',
    description: 'Manitoba\'s primary resource for background casting. Connects background performers with film and TV productions shooting in the province.',
    website: 'https://www.getonsetmanitoba.com/extras-casting',
    notes: 'Manitoba background casting resource',
  },

  // ========================================
  // NATIONAL RESOURCES
  // ========================================
  {
    province: 'National',
    city: 'All Provinces',
    name: 'ACTRA — Alliance of Canadian Cinema Television and Radio Artists',
    description: 'The national union for professional performers in Canada. Joining provides access to better-paying union background work across all provinces with agreed minimum rates and working conditions.',
    website: 'https://www.actra.ca',
    notes: 'National union — recommended for serious performers',
  },
  {
    province: 'National',
    city: 'British Columbia',
    name: 'UBCP/ACTRA — Union of BC Performers',
    description: 'The union for performers in British Columbia. Union background work pays better rates and offers more consistent bookings on major productions.',
    website: 'https://ubcpactra.ca',
    notes: 'BC performers union — see agreements at ubcpactra.ca/agreements/',
  },
  {
    province: 'National',
    city: 'All Provinces',
    name: 'Casting Workbook',
    description: 'Online platform used across Canada by casting directors and talent agents. Create a free performer profile to be discovered for background and principal roles nationally.',
    website: 'https://www.castingworkbook.com',
    notes: 'Free profile — used by agencies and casting directors nationwide',
  },
  {
    province: 'National',
    city: 'British Columbia',
    name: 'Creative BC — In Production List',
    description: 'Lists all active film and TV productions in British Columbia. Submit directly to production offices for background work without needing an agent.',
    website: 'https://www.creativebc.com',
    notes: 'Submit directly to BC productions — no agent required',
  },
];

const PROVINCES = [
  'All',
  'British Columbia',
  'Ontario',
  'Alberta',
  'Quebec',
  'Nova Scotia',
  'Manitoba',
  'National',
];

const BADGE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  'British Columbia': { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  'Ontario':          { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
  'Alberta':          { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  'Quebec':           { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-400' },
  'Nova Scotia':      { bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-400' },
  'Manitoba':         { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  'National':         { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
};

const FILTER_ACTIVE: Record<string, string> = {
  'All':              'bg-amber-500 text-black border-amber-500',
  'British Columbia': 'bg-blue-600 text-white border-blue-600',
  'Ontario':          'bg-red-600 text-white border-red-600',
  'Alberta':          'bg-orange-500 text-white border-orange-500',
  'Quebec':           'bg-teal-600 text-white border-teal-600',
  'Nova Scotia':      'bg-sky-600 text-white border-sky-600',
  'Manitoba':         'bg-green-600 text-white border-green-600',
  'National':         'bg-purple-600 text-white border-purple-600',
};

const PROVINCE_ABBR: Record<string, string> = {
  'British Columbia': 'BC',
  'Ontario':          'ON',
  'Alberta':          'AB',
  'Quebec':           'QC',
  'Nova Scotia':      'NS',
  'Manitoba':         'MB',
  'National':         'National',
};

function abbr(province: string) {
  return PROVINCE_ABBR[province] ?? province;
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
        {(agency.phone || agency.email || agency.address) && (
          <div className="space-y-1 mb-4">
            {agency.address && (
              <p className="flex items-start gap-2 text-xs text-gray-500">
                <span>📍</span> {agency.address}
              </p>
            )}
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
          <Logo size="sm" darkBackground={false} />
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
          <p className="text-gray-500 text-lg mb-2 max-w-2xl">
            Find agencies in your province to start booking film and TV work.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {agencies.length} agencies across {PROVINCES.length - 1} provinces and national resources
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
              const label = province === 'All' ? 'All' : abbr(province);
              return (
                <button
                  key={province}
                  onClick={() => setActiveFilter(province)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${activeClass}`}
                >
                  {label}
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
          <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto mb-3">
            Agency information verified from the Vancouver Actor's Guide (June 2026), ACTRA Toronto
            agents directory (March 2026), ACTRA Alberta, and official agency websites. BCF Casting
            has been removed as it no longer operates. Always contact agencies directly to verify
            current requirements and availability.
          </p>
          <p className="text-xs text-gray-400 mb-6">Last updated: June 2026</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </section>

    </div>
  );
}
