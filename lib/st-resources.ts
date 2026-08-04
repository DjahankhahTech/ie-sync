// Science & Technology resources for OIE / IO officers — curated journals,
// research organizations, and recurring conferences (real, public links).
// The S&T tab pairs these with a live research/white-paper feed (/api/st-feed).

export interface STLink { name: string; url: string; note: string; date?: string }

export const JOURNALS: STLink[] = [
  { name: "Joint Force Quarterly (NDU Press)", url: "https://ndupress.ndu.edu/JFQ/", note: "Chairman's joint professional military education journal — joint info/OIE doctrine." },
  { name: "Military Review (Army University Press)", url: "https://www.armyupress.army.mil/Journals/Military-Review/", note: "Information advantage, MDO, and influence-operations articles." },
  { name: "Parameters (US Army War College)", url: "https://press.armywarcollege.edu/parameters/", note: "Strategic-level scholarship; information & cognitive warfare." },
  { name: "Texas National Security Review", url: "https://tnsr.org/", note: "Peer-reviewed strategy journal; disinformation, influence, deterrence." },
  { name: "Journal of Information Warfare", url: "https://www.jinfowar.com/", note: "Dedicated academic journal for IW/IO research." },
  { name: "Survival (IISS)", url: "https://www.iiss.org/online-analysis/survival-online/", note: "Global politics & strategy; info-environment competition." },
  { name: "War on the Rocks", url: "https://warontherocks.com/", note: "Practitioner-focused national-security analysis; frequent IO pieces." },
  { name: "Lawfare", url: "https://www.lawfaremedia.org/", note: "Law/policy of cyber, influence ops, and FIMI." },
];

export const RESEARCH_ORGS: STLink[] = [
  { name: "RAND — Information Operations", url: "https://www.rand.org/topics/information-operations.html", note: "Reports & studies on IO, disinformation, and influence." },
  { name: "Stanford Trust & Safety Research (successor to the Internet Observatory)", url: "https://tip.fsi.stanford.edu/", note: "Empirical research on online influence operations and platform abuse." },
  { name: "DFRLab (Atlantic Council)", url: "https://dfrlab.org/", note: "Open-source investigations into disinformation campaigns." },
  { name: "NATO StratCom COE", url: "https://stratcomcoe.org/", note: "NATO Centre of Excellence for Strategic Communications." },
  { name: "EU DisinfoLab", url: "https://www.disinfo.eu/", note: "FIMI/disinformation research (Doppelganger, etc.)." },
  { name: "ASPI — International Cyber Policy Centre", url: "https://www.aspi.org.au/program/international-cyber-policy-centre", note: "Indo-Pacific influence & cyber research." },
  { name: "CSIS", url: "https://www.csis.org/", note: "Strategy & technology programs; PLA info forces, gray-zone." },
  { name: "Carnegie — Information Environment Project", url: "https://carnegieendowment.org/projects/information-environment-project", note: "Cross-platform influence-operations research (formerly the Partnership for Countering Influence Operations)." },
];

export const TRAINING: STLink[] = [
  { name: "Joint Forces Staff College — Joint IO Planners Course (JIOPC)", url: "https://jfsc.ndu.edu/Academics/Joint-and-Combined-Warfighting-School/", note: "Joint-level qualification course for IO planners (NDU/JFSC)." },
  { name: "NDU — College of Information & Cyberspace (CIC)", url: "https://cic.ndu.edu/", note: "Graduate-level information strategy, cyber, and IO PME." },
  { name: "NPS — DoD Information Strategy Research Center (ISRC)", url: "https://nps.edu/web/isrc", note: "Naval Postgraduate School research & graduate education in information strategy, political warfare, and OIE." },
  { name: "Marine Corps Information Operations Center (MCIOC)", url: "https://www.marforcyber.marines.mil/", note: "USMC IO/IRC integration training & support." },
  { name: "DoD Cyber Exchange / FedVTE", url: "https://public.cyber.mil/", note: "Free DoD cyber & influence-related training modules." },
  { name: "NATO StratCom COE — events, courses & training", url: "https://stratcomcoe.org/events", note: "Strategic-communications and counter-FIMI professional courses." },
  { name: "DISA University / DISA Training", url: "https://www.disa.mil/training", note: "Information-systems & C2 enterprise technology training." },
];

export const CONFERENCES: STLink[] = [
  { name: "AOC International Symposium (Association of Old Crows)", url: "https://www.crows.org/", note: "Premier EW / electromagnetic-spectrum & IO professional event.", date: "Early Dec (annual) · Washington, DC" },
  { name: "NATO StratCom COE Riga Conference", url: "https://stratcomcoe.org/events", note: "NATO strategic-communications & counter-FIMI conference.", date: "Jun (annual) · Riga, Latvia" },
  { name: "ICWSM — Int'l Conf. on Web & Social Media (AAAI)", url: "https://www.icwsm.org/", note: "Computational social science; misinformation & influence.", date: "Jun (annual)" },
  { name: "DEF CON", url: "https://defcon.org/", note: "Cyber/technical security; Misinformation Village & policy tracks.", date: "Early Aug (annual) · Las Vegas, NV" },
  { name: "Black Hat USA", url: "https://www.blackhat.com/", note: "Security research & briefings; influence/info-ops sessions.", date: "Early Aug (annual) · Las Vegas, NV" },
  { name: "MORS Symposium (Military Operations Research Society)", url: "https://www.mors.org/", note: "Defense analysis incl. IO / influence assessment methods.", date: "Jun (annual)" },
  { name: "DISA Forecast to Industry", url: "https://www.disa.mil/", note: "DoD IT / info-systems technology direction & acquisition.", date: "Nov (annual)" },
  { name: "TechNet Cyber (AFCEA)", url: "https://events.afcea.org/", note: "DoD cyber, C2 & information-systems enterprise event.", date: "Spring (annual) · Baltimore, MD" },
];
