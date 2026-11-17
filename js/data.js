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
    omni: "Posted in OMNI"
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

  // Chinese descriptions for the 中文 / English switch on each event.
  var EVENT_ZH = {
    "careers-fair": "60多家雇主来到校园，招聘宁波、上海及海外的实习和毕业生岗位。请携带纸质简历，建议商务休闲着装。",
    "cv-clinic": "职业顾问逐行修改你的简历，并帮你建立一份招聘官真正会看的领英主页。为招聘会做好准备。",
    "referencing": "学习如何收集文献，并在几秒钟内把正确的哈佛格式引用插入 Word。适合所有大一论文。请携带已安装 EndNote 的电脑。",
    "first-essay": "如何规划、组织并论证一篇两千字的论文，附真实批改范例。面向大一本科生。",
    "mindfulness": "在忙碌的一周里，用30分钟的引导练习放松一下。直接来即可，无需预约，无需携带任何物品。",
    "food-festival": "二十个学生社团烹饪家乡美食，从印尼沙爹到哈萨克包尔萨克。报名即可获得五张免费试吃券。",
    "hackathon": "最多四人一组，用12小时做出解决真实校园问题的作品。欢迎新手，现场有导师，前三名有奖品。目前已满，可加入候补名单，有空位时会通知你。",
    "badminton": "和羽毛球社一起打几局，认识社团干事，了解每周训练安排。提供球拍。",
    "port-lecture": "一位物流总监讲述宁波舟山港如何成为全球货物吞吐量第一的港口，以及这对供应链职业意味着什么。",
    "calligraphy": "学习握毛笔，用汉字写出自己的名字。提供全部材料。非常适合国际学生参加的第一场活动。",
    "pitch-night": "六支学生团队各用三分钟向本地投资人路演。欢迎来观看、投票并结识创始人。适合修读创业课程的同学。",
    "mun": "为期一天的模拟联合国大会，设四个委员会。报名后会通过邮件收到代表国家分配。无需经验。",
    "lake-cleanup": "沿湖边步道清理垃圾，然后一起吃午饭。提供交通、手套和垃圾袋。计入志愿服务时长。",
    "dumplings": "和全校同学一起包饺子、吃饺子。提供素馅。仅剩少量名额。",
    "visa-session": "国际学生寒假前续签居留许可需要准备什么，并与签证团队现场问答。",
    "five-a-side": "可以组队来，也可以一个人来，我们帮你分队。表现最好的队伍将参加本学期的宿舍联赛。",
    "halloween-movie": "露天电影放映，提供免费爆米花。"
  };
  EVENTS.forEach(function (e) {
    e.zh = EVENT_ZH[e.id] || "";
    if (e.posted == null) e.posted = Math.min(e.day, 0) - 3 - (e.title.length % 5);
  });

  // Notices and news: things to read, not to register for. "posted" is days from today.
  var POSTS = [
    { id: "n-email", kind: "notice", title: "University email restored after overnight maintenance", organiser: "IT Services", source: "email", posted: 0, topic: "academic",
      body: "Email and calendar services are working normally again after planned maintenance last night. If your phone still shows a sign-in error, remove the account and add it again.",
      zh: "邮件和日历服务在昨晚计划维护后已恢复正常。如果手机仍提示登录错误，请删除该账户后重新添加。" },
    { id: "n-exams", kind: "notice", title: "Autumn exam timetable is now published", organiser: "Registry", source: "moodle", posted: -1, topic: "academic",
      body: "Your personal exam timetable for the autumn assessment period is now available. Check the date, time and room of every exam, and tell Registry about any clash within five working days.",
      zh: "秋季考试的个人考试时间表现已发布。请核对每门考试的日期、时间和考场，如有冲突请在五个工作日内告知注册处。" },
    { id: "n-shuttle", kind: "notice", title: "Weekend shuttle bus timetable changes", organiser: "Transport Office", source: "wechat", posted: -2, topic: "wellbeing",
      body: "This Saturday and Sunday, shuttle buses to the city centre leave every 40 minutes instead of every 30 because of road works. The last bus back to campus is unchanged.",
      zh: "由于道路施工，本周六和周日前往市中心的班车改为每40分钟一班（原为30分钟）。返校末班车时间不变。" },
    { id: "n-cup", kind: "notice", title: "Inter-university football cup: this weekend's fixtures", organiser: "Sports Centre", source: "mini", posted: -3, topic: "sports",
      body: "Our men's and women's teams play home matches on Saturday from 14:00 on the outdoor pitches. Come and support them. Entry is free.",
      zh: "我校男足和女足将于周六14:00起在室外球场进行主场比赛。欢迎来加油，免费入场。" },
    { id: "n-library", kind: "notice", title: "Library opens until midnight during exam season", organiser: "Library", source: "email", posted: -4, topic: "academic",
      body: "From next Monday until the end of the exam period, the library stays open until 00:00 every day. Group study rooms can still be booked up to seven days ahead.",
      zh: "从下周一起至考试结束，图书馆每天开放至24:00。小组研讨室仍可提前七天预约。" },
    { id: "news-pitch", kind: "news", title: "Student team wins provincial business plan competition", organiser: "Business School", source: "wechat", posted: -2, topic: "careers",
      body: "A team of four second-year students won first prize for a food-waste app that connects campus canteens with students at closing time. They will now go on to the national final.",
      zh: "四名大二学生凭借一款连接校园食堂与学生、减少打烊时食物浪费的应用获得一等奖，并将晋级全国总决赛。" },
    { id: "news-building", kind: "news", title: "New teaching building: construction update", organiser: "Estates Office", source: "wechat", posted: -5, topic: "academic",
      body: "The new teaching building has reached its full height. It will add 30 classrooms and a large study hall, and is planned to open for the next academic year.",
      zh: "新教学楼主体已封顶，将新增30间教室和一个大型自习厅，计划于下一学年启用。" },
    { id: "news-green", kind: "news", title: "Green Society volunteers collect 300 kg of litter", organiser: "Student Union", source: "group", posted: -8, topic: "wellbeing",
      body: "Over 60 students joined last month's lakeside clean-up. The next one is coming up soon and you can register in OMNI in one tap.",
      zh: "上月有60多名同学参加了湖边清洁活动。下一次活动即将开始，可以在 OMNI 中一键报名。" }
  ];

  // Campus systems. In the real app each one opens already signed in.
  var TOOLS = [
    { id: "email", name: "University email", desc: "Course and campus email", icon: "mail", section: "study", tint: "blue",
      items: [{ t: "Your module feedback is ready", m: "Business School · 2 hours ago" }, { t: "Reminder: CV and LinkedIn Clinic tomorrow", m: "Careers · now also in OMNI" }, { t: "Library opens until midnight", m: "Library · yesterday" }] },
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
