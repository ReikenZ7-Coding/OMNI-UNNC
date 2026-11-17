/*
 * OMNI-UNNC sample data.
 *
 * Everything here is SAMPLE data written for the prototype. It is not an
 * official UNNC listing. Event dates are stored as "days from today" so the
 * demo always looks current whenever you open it.
 *
 * To add an event, copy one of the objects below and change the fields.
 */
(function (root) {
  var CATEGORIES = [
    { id: "academic", label: "Academic" },
    { id: "careers", label: "Careers" },
    { id: "clubs", label: "Clubs & societies" },
    { id: "sports", label: "Sports" },
    { id: "culture", label: "Culture" },
    { id: "wellbeing", label: "Wellbeing" }
  ];

  // Where students would have had to look for this event before OMNI.
  var SOURCES = {
    email: "University email",
    moodle: "Moodle",
    wechat: "WeChat official account",
    group: "Club WeChat group",
    mini: "Mini program",
    web: "UNNC website",
    portal: "UNNC portal",
    omni: "Posted in OMNI"
  };

  // Events, notices and news come only from real sources: the UNNC website,
  // official feeds and posts made in OMNI. (Test-only samples live in tests/fixtures.js.)
  var EVENTS = [];
  var POSTS = [];


  // Offices students can be routed to. Hours and places are sample values.
  var OFFICES = [
    {
      id: "it",
      name: "IT Services",
      short: "Wi-Fi, accounts, Moodle access, printing",
      where: "Library, ground floor help desk",
      hours: "Mon to Fri, 08:30 to 17:30",
      replies: "within 1 working day",
      keywords: ["wifi", "wi-fi", "internet", "network", "eduroam", "password", "login", "log in", "account", "moodle", "email", "outlook", "printer", "printing", "print", "vpn", "laptop", "software", "office 365", "teams", "网络", "密码"]
    },
    {
      id: "registry",
      name: "Registry & Student Records",
      short: "Exams, timetables, transcripts, student ID cards",
      where: "Trent Building, Student Service Centre",
      hours: "Mon to Fri, 09:00 to 17:00",
      replies: "within 2 working days",
      keywords: ["exam", "exams", "timetable", "transcript", "certificate", "student card", "id card", "enrolment", "enrollment", "module", "resit", "extenuating", "ec", "deadline", "extension", "grade", "marks", "graduation", "考试", "成绩"]
    },
    {
      id: "wellbeing",
      name: "Counselling & Wellbeing",
      short: "Stress, anxiety, homesickness, someone to talk to",
      where: "Student Wellbeing Centre",
      hours: "Mon to Fri, 09:00 to 17:00",
      replies: "the same day",
      keywords: ["stress", "stressed", "anxiety", "anxious", "depressed", "sad", "lonely", "homesick", "mental", "counselling", "counseling", "talk", "sleep", "overwhelmed", "panic", "心理"]
    },
    {
      id: "health",
      name: "Health Centre",
      short: "Feeling ill, medical notes, insurance claims",
      where: "Health Centre, next to the dorms",
      hours: "Every day, 08:00 to 20:00",
      replies: "within 1 working day",
      keywords: ["sick", "ill", "fever", "doctor", "medical", "medicine", "hospital", "injury", "insurance", "health", "clinic", "nurse", "生病", "医院"]
    },
    {
      id: "accommodation",
      name: "Accommodation Office",
      short: "Dorm repairs, room changes, fridge space, laundry",
      where: "Residential Services, dorm area reception",
      hours: "Mon to Sun, 08:30 to 21:00",
      replies: "within 1 working day",
      keywords: ["dorm", "dormitory", "room", "roommate", "repair", "broken", "fridge", "laundry", "washing machine", "air conditioner", "aircon", "noise", "key", "accommodation", "housing", "宿舍", "空调"]
    },
    {
      id: "international",
      name: "International Office",
      short: "Visas, residence permits, exchange to Nottingham UK",
      where: "Portland Building, Room 105",
      hours: "Mon to Fri, 09:00 to 17:00",
      replies: "within 2 working days",
      keywords: ["visa", "residence permit", "passport", "immigration", "exchange", "study abroad", "uk campus", "malaysia campus", "registration form", "police registration", "签证"]
    },
    {
      id: "careers",
      name: "Careers & Employability",
      short: "CVs, internships, job applications, mock interviews",
      where: "Trent Building, Room 145",
      hours: "Mon to Fri, 09:00 to 17:00",
      replies: "within 2 working days",
      keywords: ["career", "careers", "cv", "resume", "internship", "job", "jobs", "interview", "linkedin", "graduate", "employer", "实习", "工作"]
    },
    {
      id: "library",
      name: "Library",
      short: "Books, study rooms, referencing, databases",
      where: "Library, information desk",
      hours: "Every day, 08:00 to 22:30",
      replies: "within 1 working day",
      keywords: ["library", "book", "books", "borrow", "loan", "study room", "group room", "reference", "referencing", "citation", "database", "journal", "endnote", "图书馆"]
    },
    {
      id: "finance",
      name: "Finance Office",
      short: "Tuition fees, payments, refunds, scholarships",
      where: "Trent Building, Student Service Centre",
      hours: "Mon to Fri, 09:00 to 16:30",
      replies: "within 3 working days",
      keywords: ["fee", "fees", "tuition", "payment", "pay", "refund", "invoice", "receipt", "scholarship", "bursary", "money", "学费", "奖学金"]
    },
    {
      id: "su",
      name: "Student Union",
      short: "Clubs, societies, starting a club, student reps",
      where: "Student Union Lounge",
      hours: "Mon to Fri, 10:00 to 18:00",
      replies: "within 2 working days",
      keywords: ["club", "clubs", "society", "societies", "join", "start a club", "student union", "su", "rep", "event", "events", "volunteer", "社团"]
    }
  ];

  var FAQS = [
    { office: "it", q: "I can't connect to campus Wi-Fi", a: "Forget the network on your device, reconnect, and sign in with your full university username and password. If it still fails, bring the device to the IT help desk so they can check it." },
    { office: "it", q: "I forgot my university password", a: "Use the self-service password reset on the IT page. If you never set up recovery options, take your student ID card to the IT help desk." },
    { office: "it", q: "How do I print on campus?", a: "Send your file to the campus print queue from any university PC or your laptop, then release it at any printer by tapping your student ID card." },
    { office: "registry", q: "Where do I find my exam timetable?", a: "Your personal exam timetable is published about four weeks before the exam period. In the full version of OMNI it would appear here automatically." },
    { office: "registry", q: "I'm ill and will miss a deadline. What do I do?", a: "Submit an Extenuating Circumstances (EC) claim with evidence, such as a medical note, as soon as you can. Registry passes it to your school." },
    { office: "registry", q: "I lost my student ID card", a: "Report it to Registry so the old card is blocked, then collect a replacement from the Student Service Centre. A small fee may apply." },
    { office: "wellbeing", q: "I feel stressed and overwhelmed", a: "You are not alone, and it helps to talk. Book a free, confidential appointment with a counsellor, or join a drop-in session. If you are in danger right now, contact emergency services." },
    { office: "wellbeing", q: "I feel homesick", a: "Homesickness is very common in the first semester. Wellbeing runs peer support groups and one-to-one chats. Joining a club or event is also a good way to meet people." },
    { office: "health", q: "I have a fever. Where do I go?", a: "Go to the campus Health Centre. If it is closed or it is an emergency, go to the nearest hospital and keep your receipts for an insurance claim." },
    { office: "accommodation", q: "Something in my dorm room is broken", a: "Report it through a repair request. Include your building, room number and a photo. Urgent problems like leaks should be reported at reception straight away." },
    { office: "accommodation", q: "There's no space in our shared fridge", a: "Ask your block reception about extra fridge space or a shared kitchen fridge. Residential Services collects these requests to plan improvements." },
    { office: "international", q: "How do I renew my residence permit?", a: "Start at least 30 days before it expires. The International Office checks your documents and books your appointment with the local immigration office." },
    { office: "careers", q: "Can someone check my CV?", a: "Yes. Book a 20-minute CV review with a careers adviser. Careers workshops appear in Discover when the Careers team posts them." },
    { office: "library", q: "How do I book a group study room?", a: "Group rooms can be booked up to seven days ahead for two hours at a time. Bring your student ID card to get in." },
    { office: "finance", q: "When is the tuition fee deadline?", a: "Fee deadlines are on your invoice. If you are struggling to pay, contact the Finance Office before the deadline to discuss a payment plan." },
    { office: "su", q: "How do I join or start a club?", a: "Browse clubs at the Student Union. To start a new one you need a short proposal and at least 15 interested students." }
  ];

  // Campus systems. In the real app each one opens already signed in.
  var TOOLS = [
    { id: "email", name: "University email", desc: "Course and campus email", icon: "mail", section: "study", tint: "blue",
      items: [{ t: "Your module feedback is ready", m: "Business School · 2 hours ago" }, { t: "Library opens until midnight", m: "Library · yesterday" }] },
    { id: "moodle", name: "Moodle", desc: "Course materials, assignments and online learning", icon: "cap", section: "study", tint: "violet",
      items: [{ t: "BUSI1116 Workshop 03 form", m: "Due in 6 days" }, { t: "Week 9 lecture slides", m: "Business Economics · new" }, { t: "Quiz 4 opens", m: "Quantitative Methods · Friday" }] },
    { id: "timetable", name: "Timetable", desc: "Your classes this week", icon: "calendar", section: "study", tint: "violet", mini: "timetable" },
    { id: "portal", name: "Student portal", desc: "Campus information and services", icon: "grid", section: "study", tint: "blue",
      items: [{ t: "Update your contact details", m: "Personal record" }, { t: "Accommodation contract", m: "Signed" }] },
    { id: "hub", name: "Student Service Centre", desc: "One-stop student services", icon: "bank", section: "study", tint: "jade", help: true },
    { id: "library", name: "Library", desc: "Loans, study rooms and learning resources", icon: "book", section: "study", tint: "amber",
      items: [{ t: "Principles of Marketing (8th ed.)", m: "On loan · due in 9 days" }, { t: "Entrepreneurship: Theory and Practice", m: "On loan · due in 2 days" }] },
    { id: "results", name: "Results and progression", desc: "Marks, progression and module feedback", icon: "badge", section: "study", tint: "violet",
      items: [{ t: "Semester 1 results", m: "Published after the exam board" }] },
    { id: "edocs", name: "E-documents", desc: "Transcripts and student status letters", icon: "doc", section: "study", tint: "violet",
      items: [{ t: "Student status letter (English)", m: "Ready to download" }, { t: "Student status letter (Chinese)", m: "Ready to download" }] },
    { id: "it", name: "IT help", desc: "IT guides, equipment and software", icon: "info", section: "life", tint: "jade", help: "it" },
    { id: "rooms", name: "Room booking", desc: "Book study rooms and activity spaces", icon: "door", section: "life", tint: "green", mini: "rooms" },
    { id: "printing", name: "Printing", desc: "Print credit and print jobs", icon: "printer", section: "life", tint: "jade", mini: "printing" },
    { id: "sport", name: "Sport", desc: "Facilities and sports activities", icon: "dumbbell", section: "life", tint: "coral",
      items: [{ t: "Gym", m: "Open today 07:00 to 22:00 · 40% busy" }, { t: "Swimming pool", m: "Open today 12:00 to 21:00" }, { t: "Badminton courts", m: "3 courts free at 18:00" }] },
    { id: "map", name: "Campus map", desc: "Find buildings, residences and gates", icon: "map", section: "life", tint: "green", mini: "map" },
    { id: "contacts", name: "Who to contact", desc: "Offices, opening hours and requests", icon: "users", section: "life", tint: "blue", help: true },
    { id: "food", name: "Food", desc: "Canteens, cafés and what to eat", icon: "food", section: "life", tint: "coral", route: "food" }
  ];
  var DEFAULT_PINS = ["map", "rooms", "timetable", "printing", "moodle", "email", "library", "food"];

  var TIMETABLE = [
    { d: 1, start: "09:00", end: "10:00", what: "Business Economics", type: "Lecture", where: "Trent Building, LT1" },
    { d: 1, start: "14:00", end: "16:00", what: "BUSI1116 Entrepreneurship", type: "Workshop", where: "Portland Building, Room 2" },
    { d: 2, start: "11:00", end: "12:00", what: "Quantitative Methods", type: "Lecture", where: "Science and Engineering Building, A01" },
    { d: 3, start: "10:00", end: "12:00", what: "Academic English", type: "Seminar", where: "Trent Building, Room 145" },
    { d: 4, start: "09:00", end: "11:00", what: "BUSI1116 Entrepreneurship", type: "Lecture", where: "Trent Building, LT1" },
    { d: 4, start: "15:00", end: "16:00", what: "Business Economics", type: "Tutorial", where: "Portland Building, Room 105" },
    { d: 5, start: "13:00", end: "14:00", what: "Quantitative Methods", type: "Computer lab", where: "Science and Engineering Building, Lab 3" }
  ];

  var ROOMS = [
    { id: "lib-g1", name: "Library group room G1", seats: 6, slots: ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"], taken: ["12:00", "16:00"] },
    { id: "lib-g4", name: "Library group room G4", seats: 4, slots: ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"], taken: ["10:00", "14:00", "18:00"] },
    { id: "trent-sr", name: "Trent Building study room", seats: 10, slots: ["09:00", "11:00", "13:00", "15:00", "17:00"], taken: ["13:00"] },
    { id: "su-act", name: "Student Union activity room", seats: 30, slots: ["12:00", "15:00", "18:00", "20:00"], taken: ["18:00"] }
  ];

  var BUILDINGS = [
    { name: "Trent Building", what: "Lecture theatres, Student Service Centre, Careers" },
    { name: "Portland Building", what: "Teaching rooms, International Office, atrium" },
    { name: "Library", what: "Books, group study rooms, IT help desk" },
    { name: "Science and Engineering Building", what: "Labs and computer rooms" },
    { name: "Indoor Sports Centre", what: "Gym, courts, swimming pool" },
    { name: "Student Union Lounge", what: "Clubs, societies, events" },
    { name: "Student Wellbeing Centre", what: "Counselling and wellbeing support" },
    { name: "Health Centre", what: "Doctors and nurses, next to the dorms" },
    { name: "Dining Hall", what: "Canteens and cafés" },
    { name: "Main gate", what: "Taxis, shuttle buses, deliveries" }
  ];

  // Sample places to eat. Names are made up for the prototype.
  var FOOD = [
    { id: "north", name: "North Canteen", area: "Next to the dorms", icon: "food", tint: "blue",
      shops: [{ n: "Noodle Bar", c: "Hand-pulled noodles", p: "¥12–20", h: "07:00–21:00" }, { n: "Rice Bowls", c: "Chinese home cooking", p: "¥10–18", h: "10:30–20:00" }, { n: "Breakfast Corner", c: "Baozi, soy milk, jianbing", p: "¥4–10", h: "06:30–10:00" }] },
    { id: "south", name: "South Canteen", area: "Near the Library", icon: "food", tint: "green",
      shops: [{ n: "Halal Kitchen", c: "Lanzhou beef noodles, rice", p: "¥14–22", h: "10:30–20:30" }, { n: "Malatang", c: "Pick your own hotpot bowl", p: "¥15–30", h: "11:00–21:00" }, { n: "Western Grill", c: "Burgers, pasta, salads", p: "¥22–38", h: "11:00–20:00" }, { n: "Fruit and Juice", c: "Fresh fruit, smoothies", p: "¥8–18", h: "09:00–21:00" }] },
    { id: "lake", name: "Lakeside Café", area: "By the lake", icon: "cup", tint: "amber",
      shops: [{ n: "Lakeside Coffee", c: "Coffee, tea, cakes", p: "¥15–32", h: "08:00–22:00" }, { n: "Bakery", c: "Bread, sandwiches", p: "¥8–20", h: "08:00–19:00" }] },
    { id: "night", name: "Night Kitchen", area: "Dorm area, ground floor", icon: "moon", tint: "violet",
      shops: [{ n: "Late Noodles", c: "Wonton, noodle soup", p: "¥10–18", h: "17:00–00:30" }, { n: "BBQ Skewers", c: "Chuanr and grilled snacks", p: "¥2–5 each", h: "18:00–01:00" }, { n: "Fried Rice", c: "Egg fried rice, chow mein", p: "¥12–16", h: "17:00–00:00" }] },
    { id: "market", name: "Campus Market", area: "Behind the Sports Centre", icon: "bag", tint: "coral",
      shops: [{ n: "Convenience Store", c: "Snacks, drinks, essentials", p: "¥", h: "24 hours" }, { n: "Milk Tea", c: "Bubble tea, fruit tea", p: "¥10–20", h: "10:00–22:00" }] }
  ];

  root.OMNI_DATA = {
    categories: CATEGORIES,
    sources: SOURCES,
    events: EVENTS,
    posts: POSTS,
    offices: OFFICES,
    faqs: FAQS,
    tools: TOOLS,
    defaultPins: DEFAULT_PINS,
    timetable: TIMETABLE,
    rooms: ROOMS,
    buildings: BUILDINGS,
    food: FOOD
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.OMNI_DATA;
})(typeof window !== "undefined" ? window : globalThis);
