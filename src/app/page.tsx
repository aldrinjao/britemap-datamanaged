'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/lib/api'

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const links = [
    { href: '#home', label: 'Home' },
    { href: '#about', label: 'About' },
    { href: '#projects', label: 'Projects' },
    { href: '#news', label: 'News' },
    { href: '#resources', label: 'Resources' },
    { href: '#contact', label: 'Contact' },
  ]
  return (
    <nav className="sticky top-0 z-50 bg-emerald-800 shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <ul className="flex flex-wrap items-center gap-0 text-sm font-medium">
          {links.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className="block px-4 py-3 text-emerald-100 hover:text-white hover:bg-emerald-700 transition-colors"
              >
                {label}
              </a>
            </li>
          ))}
          <li className="ml-auto flex items-center gap-2 pr-2">
            <Link
              href="/map"
              className="block px-4 py-1.5 rounded-full border border-emerald-300/60 text-emerald-100 font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              Launch Map
            </Link>
            <Link
              href="/dashboard"
              className="block px-4 py-1.5 rounded-full bg-white text-emerald-800 font-semibold text-sm hover:bg-emerald-50 transition-colors shadow"
            >
              Dashboard
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={`py-16 ${className}`}>
      <div className="max-w-6xl mx-auto px-6">{children}</div>
    </section>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">
      {children}
      <div className="mt-3 mx-auto w-16 h-1 bg-emerald-500 rounded-full" />
    </h2>
  )
}

// ─── Image with fallback gradient ────────────────────────────────────────────

function ProjectImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-emerald-900 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

// ─── Stats strip ─────────────────────────────────────────────────────────────

function StatCell({ value, label }: { value: string | number | undefined; label: string }) {
  return (
    <div>
      <p className="text-3xl font-extrabold text-emerald-300 leading-none tabular-nums">
        {value === undefined ? (
          <span className="inline-block w-16 h-8 rounded bg-emerald-700/60 animate-pulse align-bottom" />
        ) : (
          value
        )}
      </p>
      <p className="mt-1 text-sm text-emerald-100 font-medium">{label}</p>
    </div>
  )
}

function StatsStrip() {
  const { data } = useQuery({
    queryKey: ['public-stats'],
    queryFn: publicApi.stats,
    staleTime: 5 * 60_000,
  })

  return (
    <div className="bg-emerald-800 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        <StatCell value={data?.quadratCount} label="Quadrats Surveyed" />
        <StatCell value={data?.clumpCount?.toLocaleString()} label="Bamboo Clumps" />
        <StatCell value={data?.speciesCount} label="Bamboo Species" />
        <StatCell value={data?.regionCount} label="Regions Covered" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ scrollBehavior: 'smooth' }}>

      {/* ── Header ── */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Logos — fixed 56×56 container so all three are the same visual size */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {[
                { src: '/logo.svg', alt: 'BRITEMAP Logo' },
                { src: '/UP_System_Logo.svg', alt: 'UP Logo' },
                { src: '/PCAARRD.svg', alt: 'DOST-PCAARRD Logo' },
              ].map(({ src, alt }) => (
                <div
                  key={src}
                  className="w-14 h-14 flex items-center justify-center bg-white/10 rounded-full p-1.5 flex-shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              ))}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none">
                BRITE
                <span className="text-emerald-300">MAP</span>
              </h1>
              <p className="mt-1.5 text-emerald-200 text-sm sm:text-base font-medium max-w-lg leading-snug">
                Bamboo Resources Inventory and Technology-Enabled Mapping in the Philippines
              </p>
            </div>
          </div>
        </div>
      </header>

      <Nav />

      {/* ── Hero ── */}
      <section id="home" className="relative overflow-hidden bg-slate-950 min-h-[420px] flex items-end">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero2.png"
          alt="Bamboo Forest"
          className="absolute inset-0 w-full h-full object-cover opacity-75"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0' }}
        />
        {/* Dark gradient anchors the text without casting a green tint over the image */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 w-full">
          <div className="max-w-2xl">
            <span className="inline-block mb-3 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              DOST-PCAARRD Funded Program
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              Mapping the Bamboo Resources<br />of the Philippines
            </h2>
            <p className="mt-4 text-emerald-200 text-base sm:text-lg leading-relaxed max-w-xl">
              A community-based, technology-enabled inventory system covering 11 regions — from field survey to interactive web dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/map"
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors shadow-lg"
              >
                Launch Map
              </Link>
              <a
                href="#about"
                className="px-5 py-2.5 rounded-lg border border-emerald-400/60 text-emerald-200 hover:bg-emerald-800/60 font-semibold text-sm transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <StatsStrip />

      {/* ── About ── */}
      <Section id="about" className="bg-slate-50">
        <SectionHeading>About the Project</SectionHeading>
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="rounded-2xl overflow-hidden bg-emerald-100 min-h-[320px] shadow-md">
            <ProjectImage src="/about.JPG" alt="About BRITEMAP" className="w-full h-80" />
          </div>
          <div className="space-y-4 text-slate-700 leading-relaxed">
            <p>
              <strong className="text-slate-900">BRITEMAP</strong> is a three-year program funded by the{' '}
              <strong>DOST-PCAARRD</strong> and jointly implemented by the Department of Forest Biological Sciences,
              Institute of Renewable Natural Resources, and Forestry Development Center of the College of Forestry
              and Natural Resources, <strong>University of the Philippines Los Baños</strong>.
            </p>
            <p>
              The program builds on previous initiatives to enhance policy on bamboo resources and aims to:
            </p>
            <ul className="space-y-2">
              {[
                'Scale out the harmonized community-based bamboo inventory in 11 regions',
                'Establish partnerships and build capacity of partner institutions',
                'Document lessons learned for project monitoring and evaluation',
                'Enhance mobile application and web dashboard for bamboo inventory',
                'Advocate for institutionalization of the inventory system',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M6.7 1.3L3 5 1.3 3.3.3 4.3l2.7 2.7 4.4-4.4z" />
                    </svg>
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ── Projects ── */}
      <Section id="projects">
        <SectionHeading>Project Components</SectionHeading>
        <div className="space-y-10">
          {[
            {
              number: 1,
              title: 'COM-APP BRITEMAP',
              subtitle: 'Community-based Inventory and Mapping of Bamboo Resources',
              image: '/p1.JPG',
              color: 'bg-emerald-600',
              objectives: [
                'Scale out harmonized bamboo inventory in 11 regions (CAR, R3, R4A, R4B, R5, R6, R7, R8, R9, R11, R12, R13)',
                'Develop knowledge and skills of stakeholders on inventory system',
                'Document lessons learned for project evaluation',
                'Finalize harmonized bamboo inventory system and protocol guidelines',
              ],
              team: [
                { role: 'Project Leader', name: 'Dr. Pastor L. Malabrigo, Jr.' },
                { role: 'Staff Level 3', name: 'Dr. Rosalie C. Mendoza' },
                { role: 'Staff Level 2', name: 'Arthur Glenn A. Umali, MSc' },
                { role: 'S&T Consultant', name: 'Rowena Esperanza D. Cabahug, MF' },
                { role: 'Technical Assistants', name: 'For. Veronica M. Evangelista, For. Irish Valerie N. Gecolea' },
              ],
              email: 'comapp-britemap.uplb@up.edu.ph',
            },
            {
              number: 2,
              title: 'MAP-APP BRITEMAP',
              subtitle: 'Mapping and Mobile Application Development',
              image: '/p2.JPG',
              color: 'bg-blue-700',
              objectives: [
                'Enhance mobile application for bamboo inventory protocol',
                'Generate bamboo distribution maps using geospatial technology',
                'Develop web dashboard for data management and visualization',
                'Provide recommendations on institutionalization of applications',
              ],
              team: [
                { role: 'Project Leader', name: 'Dr. Cristino L. Tiburan Jr' },
                { role: 'Staff Level 2', name: 'Jayson L. Arizapa, MSc' },
                { role: 'S&T Consultants', name: 'Leonardo D. Barua, MSc; Aldrin Joseph J. Hao, MSc' },
                { role: 'Mobile App Developer', name: 'Toni-Jan Keith Monserrat, MSc' },
                { role: 'Remote Sensing Specialist', name: 'Gerald T. Eduarte, MSc' },
                { role: 'Technical Assistant', name: 'For. Eljohn D. Dulay' },
              ],
              email: 'mapapp-britemap.uplb@up.edu.ph',
            },
            {
              number: 3,
              title: 'IMPLEMENT BRITEMAP',
              subtitle: 'Imperatives of Policy and Leveraging Stakeholders',
              image: '/p3.JPG',
              color: 'bg-amber-700',
              objectives: [
                'Conduct consultations and forums for stakeholder participation',
                'Formulate JAO or JMC (DENR-DA-DILG-DTI) for mandated implementation',
                'Advocate for adoption of proposed policy',
              ],
              team: [
                { role: 'Project Leader', name: 'For. Noel L. Tolentino' },
                { role: 'Staff Level 1', name: 'For. Jean C. Nicmic; Ailene A. Alcala, MF' },
                { role: 'S&T Consultants', name: 'Dr. Ramon A. Razal; Dr. Priscilla C. Dolom; For. Kristel S. Victoria' },
                { role: 'Support Staff', name: 'Diorella Mari T. Garcia' },
                { role: 'Technical Aide', name: 'Trixsie Dianne J. Bullecer' },
              ],
              email: 'implement-britemap.uplb@up.edu.ph',
            },
          ].map((project) => (
            <div
              key={project.number}
              className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              {/* Card header */}
              <div className={`${project.color} px-6 py-4 text-white`}>
                <h3 className="text-xl font-bold">Project {project.number}: {project.title}</h3>
                <p className="text-sm opacity-90 mt-0.5">{project.subtitle}</p>
              </div>

              {/* Card body */}
              <div className="grid md:grid-cols-2 gap-0">
                {/* Image */}
                <div className="bg-slate-100 min-h-[260px]">
                  <ProjectImage src={project.image} alt={project.title} className="w-full h-64 md:h-full" />
                </div>

                {/* Details */}
                <div className="p-6 space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Objectives</h4>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {project.objectives.map((obj) => (
                        <li key={obj} className="flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">▸</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Project Team</h4>
                    <div className="space-y-1 text-sm">
                      {project.team.map(({ role, name }) => (
                        <div key={role} className="flex gap-1.5 text-slate-700">
                          <span className="font-medium text-slate-900 flex-shrink-0">{role}:</span>
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Contact:{' '}
                      <a href={`mailto:${project.email}`} className="text-emerald-600 hover:underline">
                        {project.email}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Map CTA ── */}
      <section className="relative overflow-hidden bg-emerald-950 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-800/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Interactive WebGIS</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Explore the Bamboo Distribution Map
          </h2>
          <p className="mt-4 text-emerald-200 text-base max-w-xl mx-auto leading-relaxed">
            Browse survey sites across the Philippines, filter by region or species, and drill into field-level data — all in your browser.
          </p>
          <Link
            href="/map"
            className="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors shadow-xl"
          >
            Open Map
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── News ── */}
      <Section id="news" className="bg-slate-50">
        <SectionHeading>Latest News &amp; Updates</SectionHeading>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              src: '/news1.png',
              date: 'January 17, 2025',
              title: 'Manual on Harmonized System for Community-based Inventory of Bamboo Resources in the Philippines',
              excerpt: 'A comprehensive field guide covering bamboo identification, GIS-aided mapping procedures, and the standardized community-based inventory protocol used across 11 regions.',
            },
            {
              src: '/news2.jpg',
              date: 'September 24, 2024',
              title: 'BRITEMAP conducts first bamboo inventory protocol training in Tarlac, Region III',
              excerpt: 'The BRITEMAP team successfully held its first regional training on the Harmonized Community-based bamboo inventory system at the Tarlac Capitol Center Conference Room.',
            },
            {
              src: '/news3.jpg',
              date: 'September 25–27, 2024',
              title: 'BRITEMAP team conducts actual bamboo field inventory in Tarlac, Region III',
              excerpt: 'BRITEMAP Projects 1 & 2 conducted actual bamboo field inventory in the province of Tarlac in the municipalities of Mayantoc, San Jose, and Capas.',
            },
            {
              src: '/news4.jpg',
              date: 'September 25–27, 2024',
              title: "BRITEMAP team conducts stakeholders' consultation and key informant interviews",
              excerpt: "BRITEMAP team conducts stakeholders' consultation and key informant interviews across partner regions.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="h-44 bg-emerald-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-emerald-600 font-medium">{item.date}</p>
                <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-3">{item.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{item.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* ── Resources ── */}
      <Section id="resources">
        <SectionHeading>Resources &amp; Publications</SectionHeading>

        <div className="grid md:grid-cols-[240px_1fr] gap-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-8 shadow-sm">
          {/* Manual cover */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-48 h-64 bg-emerald-800 rounded-xl overflow-hidden shadow-lg border-4 border-emerald-200 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/manual-cover.png"
                alt="Bamboo Inventory Manual Cover"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 leading-snug">
                Manual on Harmonized System for Community-based Inventory of Bamboo Resources
              </h3>
              <p className="mt-1 text-sm font-semibold text-emerald-700">PCAARRD Information Bulletin No. 125/2024</p>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed">
              This comprehensive manual provides guidelines and methodology for identifying, mapping, and conducting an
              inventory of bamboo using advanced technologies. It serves as an essential field guide for bamboo
              identification and systematic inventory in bamboo production areas across the Philippines.
            </p>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">What&apos;s Inside:</h4>
              <ul className="grid sm:grid-cols-2 gap-1.5 text-sm text-slate-700">
                {[
                  'Step-by-step bamboo inventory protocols',
                  'GIS and remote sensing techniques',
                  'Pictorial guide of 9 bamboo species',
                  'Community-based mapping procedures',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="https://forms.gle/h7xt2CWxj4yUjNkb9"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors shadow"
              >
                Download Manual
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold transition-colors"
              >
                Request Print Copy
              </a>
            </div>

            <p className="text-xs text-slate-500">
              <strong>Note:</strong> Please complete a brief survey to download the manual. The download link will be
              provided after submission.
            </p>
            <p className="text-xs text-slate-400 italic">
              <strong>Citation:</strong> Razal RA, Malabrigo PL, Umali AGA, et al. (2024). Manual on harmonized system
              for community-based inventory of bamboo resources in the Philippines. DOST-PCAARRD Information Bulletin
              No. 125/2024.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-emerald-900 text-emerald-100">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-10">
            <div className="space-y-1.5">
              <h3 className="text-white font-semibold mb-3">Contact Information</h3>
              <p className="text-sm">College of Forestry and Natural Resources</p>
              <p className="text-sm">University of the Philippines Los Baños</p>
              <p className="text-sm">College, Laguna, Philippines 4031</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-white font-semibold mb-3">Quick Links</h3>
              <p><a href="https://uplb.edu.ph/" target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-300 hover:text-white transition-colors">UPLB</a></p>
              <p><a href="https://www.pcaarrd.dost.gov.ph/" target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-300 hover:text-white transition-colors">DOST-PCAARRD</a></p>
              <p>
                <Link href="/map" className="text-sm text-emerald-300 hover:text-white transition-colors">
                  WebGIS Dashboard →
                </Link>
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-white font-semibold mb-3">Follow Us</h3>
              <p>
                <a
                  href="https://www.facebook.com/profile.php?id=61567149400191"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-300 hover:text-white transition-colors"
                >
                  Facebook
                </a>
              </p>
              <p className="text-sm">
                Email:{' '}
                <a href="mailto:mapapp-britemap.uplb@up.edu.ph" className="text-emerald-300 hover:text-white transition-colors">
                  mapapp-britemap.uplb@up.edu.ph
                </a>
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-emerald-800 text-center text-xs text-emerald-400">
            © 2024–2025 BRITEMAP. All rights reserved. | Funded by DOST-PCAARRD
          </div>
        </div>
      </footer>
    </div>
  )
}
