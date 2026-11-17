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
    mini: "Mini program"
  };

  var EVENTS = [
    {
      id: "careers-fair",
      title: "Autumn Careers Fair",
      category: "careers",
      organiser: "Careers & Employability",
      source: "email",
      day: 2, start: "13:00", end: "17:00",
      location: "Indoor Sports Centre, main hall",
      capacity: 600, taken: 512,
      tags: ["jobs", "internship", "graduate", "employers", "networking"],
      description: "Meet over 60 employers hiring UNNC students for internships and graduate roles in Ningbo, Shanghai and abroad. Bring a printed CV. Business casual recommended."
    },
    {
      id: "cv-clinic",
      title: "CV and LinkedIn Clinic",
      category: "careers",
      organiser: "Careers & Employability",
      source: "moodle",
      day: 1, start: "14:00", end: "15:30",
      location: "Trent Building, Room 145",
      capacity: 30, taken: 27,
      tags: ["cv", "resume", "linkedin", "jobs", "internship"],
      description: "A careers adviser reviews your CV line by line, then helps you set up a LinkedIn profile that recruiters actually read. Get ready for the Careers Fair."
    },
    {
      id: "referencing",
      title: "Referencing Without Tears: EndNote Basics",
      category: "academic",
      organiser: "Library",
      source: "moodle",
      day: 0, start: "16:00", end: "17:00",
      location: "Library, Training Room 2",
      capacity: 40, taken: 18,
      tags: ["library", "essay", "harvard", "citation", "endnote", "coursework"],
      description: "Learn to collect sources and drop correct Harvard references into Word in seconds. Useful for every first-year essay. Bring a laptop with EndNote installed."
    },
    {
      id: "first-essay",
      title: "Academic Skills: Writing Your First University Essay",
      category: "academic",
      organiser: "Centre for English Language Education",
      source: "email",
      day: 3, start: "10:00", end: "11:30",
      location: "Portland Building, Room 2",
      capacity: 80, taken: 41,
      tags: ["essay", "writing", "first year", "coursework", "english"],
      description: "How to plan, structure and argue a 2,000-word essay, with real marked examples. Aimed at first-year undergraduates."
    },
    {
      id: "mindfulness",
      title: "Exam Stress? Mindfulness Drop-in",
      category: "wellbeing",
      organiser: "Counselling & Wellbeing",
      source: "wechat",
      day: 1, start: "12:15", end: "12:45",
      location: "Student Wellbeing Centre",
      capacity: 0, taken: 0,
      tags: ["stress", "mental health", "exam", "relax", "calm"],
      description: "A guided 30-minute session to reset during a busy week. Just turn up: no booking needed and nothing to bring."
    },
    {
      id: "food-festival",
      title: "International Food Festival",
      category: "culture",
      organiser: "Student Union",
      source: "wechat",
      day: 5, start: "17:00", end: "21:00",
      location: "Central Lawn",
      capacity: 900, taken: 655,
      tags: ["food", "international", "festival", "free", "culture"],
      description: "Twenty student societies cook dishes from home, from Indonesian satay to Kazakh baursak. Registration gets you five free tasting tokens."
    },
    {
      id: "hackathon",
      title: "Build for Campus Hackathon",
      category: "clubs",
      organiser: "Computer Science Society",
      source: "group",
      day: 9, start: "09:00", end: "21:00",
      location: "Science and Engineering Building, Lab 3",
      capacity: 120, taken: 120,
      tags: ["coding", "tech", "competition", "startup", "app", "prize"],
      description: "Teams of up to four build something that fixes a real campus problem in 12 hours. Beginners welcome, mentors on hand, prizes for the top three teams. Currently full: join the waitlist and you will be told if a place opens."
    },
    {
      id: "badminton",
      title: "Badminton Society Open Night",
      category: "sports",
      organiser: "Badminton Society",
      source: "group",
      day: 2, start: "19:00", end: "21:00",
      location: "Indoor Sports Centre, courts 1 to 6",
      capacity: 48, taken: 30,
      tags: ["badminton", "sport", "society", "beginner", "fitness"],
      description: "Try a few games with the society, meet the committee and find out about weekly training. Rackets provided."
    },
    {
      id: "port-lecture",
      title: "Guest Lecture: How Ningbo's Port Moves the World",
      category: "academic",
      organiser: "Business School",
      source: "email",
      day: 4, start: "15:00", end: "16:30",
      location: "Trent Building, Lecture Theatre 1",
      capacity: 250, taken: 132,
      tags: ["business", "economics", "logistics", "ningbo", "trade", "lecture"],
      description: "A logistics director explains how the Ningbo-Zhoushan port became the world's busiest by cargo tonnage, and what that means for careers in supply chain."
    },
    {
      id: "calligraphy",
      title: "Chinese Calligraphy Taster",
      category: "culture",
      organiser: "Chinese Culture Society",
      source: "mini",
      day: 6, start: "14:00", end: "16:00",
      location: "Student Union Lounge",
      capacity: 25, taken: 22,
      tags: ["calligraphy", "chinese", "art", "culture", "international"],
      description: "Learn to hold a brush and write your name in Chinese characters. All materials provided. A great first event for international students."
    },
    {
      id: "pitch-night",
      title: "Startup Pitch Night",
      category: "careers",
      organiser: "Entrepreneurship Society",
      source: "group",
      day: 7, start: "18:30", end: "20:30",
      location: "Portland Building, Atrium",
      capacity: 100, taken: 64,
      tags: ["startup", "entrepreneurship", "pitch", "business", "busi1116"],
      description: "Six student teams pitch their ideas to local investors in three minutes each. Come to watch, vote, and meet founders. Useful if you are taking an entrepreneurship module."
    },
    {
      id: "mun",
      title: "UNNC Model United Nations Conference",
      category: "clubs",
      organiser: "Model United Nations Society",
      source: "mini",
      day: 12, start: "09:00", end: "17:30",
      location: "Trent Building, various rooms",
      capacity: 150, taken: 97,
      tags: ["mun", "debate", "politics", "public speaking", "international"],
      description: "A one-day conference with four committees. Delegates get their country assignment by email after registering. No experience needed."
    },
    {
      id: "lake-cleanup",
      title: "Volunteer: Lakeside Trail Clean-up",
      category: "wellbeing",
      organiser: "Green Society",
      source: "group",
      day: 8, start: "08:30", end: "12:00",
      location: "Meet at the main gate bus stop",
      capacity: 40, taken: 33,
      tags: ["volunteer", "environment", "outdoors", "green", "hours"],
      description: "Help clear litter along a lakeside walking trail, then share lunch together. Transport, gloves and bags are provided. Counts towards volunteering hours."
    },
    {
      id: "dumplings",
      title: "Dumpling Making Night",
      category: "culture",
      organiser: "Student Union",
      source: "wechat",
      day: 10, start: "18:00", end: "20:00",
      location: "Dining Hall, ground floor",
      capacity: 60, taken: 58,
      tags: ["food", "chinese", "dumplings", "jiaozi", "culture", "free"],
      description: "Fold (and eat) your own jiaozi with students from across campus. Vegetarian filling available. Only a couple of places left."
    },
    {
      id: "visa-session",
      title: "Visa and Residence Permit Information Session",
      category: "academic",
      organiser: "International Office",
      source: "email",
      day: 4, start: "11:00", end: "12:00",
      location: "Portland Building, Room 105",
      capacity: 120, taken: 46,
      tags: ["visa", "residence permit", "international", "immigration", "travel"],
      description: "What international students need to renew their residence permit before winter break, plus a Q&A with the visa team."
    },
    {
      id: "five-a-side",
      title: "Five-a-side Football League Sign-up Match",
      category: "sports",
      organiser: "Sports Centre",
      source: "mini",
      day: 0, start: "18:00", end: "20:00",
      location: "Outdoor pitches",
      capacity: 60, taken: 44,
      tags: ["football", "soccer", "sport", "team", "league"],
      description: "Turn up with a team or on your own and we will put you in one. The top teams join this semester's inter-hall league."
    },
    {
      id: "halloween-movie",
      title: "Movie Night on the Lawn",
      category: "culture",
      organiser: "Film Society",
      source: "group",
      day: -6, start: "19:30", end: "22:00",
      location: "Central Lawn",
      capacity: 200, taken: 180,
      tags: ["film", "movie", "social"],
      description: "An open-air screening with free popcorn."
    }
  ];

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
    { office: "careers", q: "Can someone check my CV?", a: "Yes. Book a 20-minute CV review with a careers adviser, or join the next CV and LinkedIn Clinic in the events feed." },
    { office: "library", q: "How do I book a group study room?", a: "Group rooms can be booked up to seven days ahead for two hours at a time. Bring your student ID card to get in." },
    { office: "finance", q: "When is the tuition fee deadline?", a: "Fee deadlines are on your invoice. If you are struggling to pay, contact the Finance Office before the deadline to discuss a payment plan." },
    { office: "su", q: "How do I join or start a club?", a: "Browse clubs at the Student Union. To start a new one you need a short proposal and at least 15 interested students." }
  ];

  root.OMNI_DATA = {
    categories: CATEGORIES,
    sources: SOURCES,
    events: EVENTS,
    offices: OFFICES,
    faqs: FAQS
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.OMNI_DATA;
})(typeof window !== "undefined" ? window : globalThis);
