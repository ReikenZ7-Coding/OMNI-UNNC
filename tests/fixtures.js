// Made-up events, notices and news used ONLY by the automatic tests.
// The app itself shows real content only.
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


module.exports = { events: EVENTS, posts: POSTS };
