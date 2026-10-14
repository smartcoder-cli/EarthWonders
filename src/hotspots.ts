export interface Hotspot {
  id: string;
  wonderId: string;
  nameZh: string;
  nameEn: string;
  category: "建筑奇观" | "考古之谜" | "历史传奇" | "工程智慧" | "隐秘空间" | "军事奇迹";
  /** 位于对应景点 3D Group 局部空间内的坐标 (米) */
  position: [number, number, number];
  /** 镜头特写观察时的目标相机偏移距离 (米) */
  focusDistance: number;
  /** 特写相机的建议航向角度偏移 (度) */
  focusHeading?: number;
  /** 特写相机的建议俯仰角度偏移 (度) */
  focusPitch?: number;
  summary: string;
  description: string;
  funFact: string;
}

export const LANDMARK_HOTSPOTS: Record<string, Hotspot[]> = {
  giza: [
    {
      id: "giza-benben",
      wonderId: "giza",
      nameZh: "塔尖奔奔石与金光之谜",
      nameEn: "Benben Stone & Capstone",
      category: "建筑奇观",
      position: [0, 142, 0],
      focusDistance: 85,
      focusHeading: 135,
      focusPitch: -18,
      summary: "大金字塔最初原高 146.6 米，相传塔尖曾覆盖灿烂的电子合金（金银合金 Electrum）。",
      description:
        "在古埃及神话中，奔奔石（Benben）代表创世之初从浑沌原初之水中升起的第一块陆地。大金字塔建成时，阳光最先洒向纯金银合金包裹的塔尖，在清晨的撒哈拉沙漠中数公里外即可见其反射出的耀眼金芒。随着千年风化与掠夺，顶石早已遗失，现塔顶残留约 10 米宽的平坦平台。",
      funFact: "拿破仑远征埃及期间，法国学者曾登上该平坦塔顶架设测绘仪器，并在此俯瞰开罗全城。",
    },
    {
      id: "giza-tunnel",
      wonderId: "giza",
      nameZh: "盗墓者通道（马蒙暗道）",
      nameEn: "Robbers' Tunnel of Al-Ma'mun",
      category: "考古之谜",
      position: [0, 18, -114],
      focusDistance: 70,
      focusHeading: 0,
      focusPitch: -12,
      summary: "公元 820 年由阿拔斯王朝哈里发马蒙率工匠用火烧淬醋凿穿的暗道，至今仍是游客进入大金字塔的唯一通道。",
      description:
        "大金字塔原初的真正入口位于北面第 19 层石阶处（高约 17 米），并以巨型三角人字石封堵。公元 9 世纪，阿拉伯帝国哈里发马蒙为寻找传闻中的古代秘宝和星盘典籍，在原入口下方数米处开凿横向暗道，工匠通过加热花岗岩并泼冷醋使其裂开。巧合的是，这道暗道最终在内部分支点恰好撞入了通往大走廊的上升通道。",
      funFact: "当马蒙的工匠最终突破重石进入国王墓室时，石棺盖已被移开，里面空无一物，只留下一具空花岗岩石棺。",
    },
    {
      id: "giza-sphinx",
      wonderId: "giza",
      nameZh: "狮身人面像与记梦碑",
      nameEn: "Great Sphinx & Dream Stele",
      category: "历史传奇",
      position: [345, 14, -394],
      focusDistance: 110,
      focusHeading: 90,
      focusPitch: -16,
      summary: "全长 73 米的单体巨石雕刻奇迹，前爪之间屹立着法老图特摩斯四世的红色花岗岩记梦神碑。",
      description:
        "大狮身人面像由吉萨高原原生石灰岩基岩就地整石雕凿而成，拥有哈夫拉法老的威严面容与伏卧雄狮之身躯。两只向前平伸的长爪长达 15 米。双爪间耸立着著名的记梦碑（Dream Stele）：碑文记载图特摩斯四世年轻时在此打猎小憩，在狮身人面像投下的阴影中入梦，狮身人面像显灵许诺：只要他清理埋没神躯的沙漠流沙，就让他继承埃及大统。",
      funFact: "在千百年岁月里，狮身人面像曾多次被撒哈拉风沙掩埋至颈部，直到 1925 年至 1936 年才由现代考古学家全面挖掘清空围槽。",
    },
  ],

  wall: [
    {
      id: "wall-tower",
      wonderId: "wall",
      nameZh: "空心双层骑墙敌楼",
      nameEn: "Hollow Watchtower",
      category: "军事奇迹",
      position: [0, 16, 0],
      focusDistance: 65,
      focusHeading: 140,
      focusPitch: -20,
      summary: "戚继光任蓟镇总兵时主持创制，彻底革新了明长城防守战术的双层砖石堡垒。",
      description:
        "早期的长城多为实心墙台，士兵无法在墙内遮风挡雨。明隆庆年间，抗倭名将戚继光巡抚北方边防，主张“建空心敌楼千座”。这种敌楼横跨长城两侧，上层设射孔、箭窗、擂石口与望亭，供战士日夜瞭望远射；下层为拱券式起居室与军械火药库，能容纳 30~50 名士兵常年驻守，各楼之间互相以烽火炮声联络支援。",
      funFact: "敌楼上层蓄有大型水缸以备灭火防烟熏，下层石门坚固，即使敌骑突破城墙，敌楼依然能作为独立碉堡持久坚守。",
    },
    {
      id: "wall-rampart",
      wonderId: "wall",
      nameZh: "马道与外侧垛口射孔",
      nameEn: "Rampart & Crenellated Battlements",
      category: "工程智慧",
      position: [60, 10, 18],
      focusDistance: 55,
      focusHeading: 110,
      focusPitch: -16,
      summary: "宽可容五马并骑、十人同行的城顶主通道，配有精密的宇墙、垛口与吐水石嘴防洪系统。",
      description:
        "长城顶部的马道通常由三层透水青砖用白石灰糯米浆勾缝铺筑。面向塞外的一侧修筑有约 1.7 米高的垛墙，墙上留有瞭望口和下方用以射箭射铳的转角射孔；面向内侧的一侧则为约 1 米高的低矮宇墙以防人马跌落。为了防止山洪浸泡城基，马道内侧每隔数米便留有花岗岩“吐水嘴”，雨水能够迅速自石槽泻入山涧。",
      funFact: "铺设马道的青砖重达数十公斤，黏合剂使用了古法熟石灰与糯米胶浆混合，硬度可与现代标号水泥媲美。",
    },
  ],

  petra: [
    {
      id: "petra-urn",
      wonderId: "petra",
      nameZh: "卡兹尼顶层皇家宝瓮",
      nameEn: "The Urn of El-Khazneh",
      category: "考古之谜",
      position: [0, 36, -8],
      focusDistance: 50,
      focusHeading: 0,
      focusPitch: -10,
      summary: "高耸于神殿二层圆亭之巅的巨型砂岩石瓮，民间传说藏有法老巨额财宝，留有清晰弹痕。",
      description:
        "在阿拉伯语中，卡兹尼（Al-Khazneh）意为“法老的宝库”。当地游牧民族贝都因人千百年来流传着一个神话：逃亡的埃及法老将无穷的金银财宝藏匿于神殿顶部的这口石瓮之中。为了获取财宝，过去数百年间的贝都因部落猎人经常端起猎枪和火绳枪朝宝瓮射击，希望将石瓮打碎让金币倾泻而出，因此石瓮表面至今密布枪击凿痕。",
      funFact: "事实上，这口宝瓮是与整座佩特拉峭壁一体整石雕刻而成的实心坚硬砂岩，里面空无一物，根本不是容器。",
    },
    {
      id: "petra-facade",
      wonderId: "petra",
      nameZh: "纳巴泰自上而下峭壁雕琢立面",
      nameEn: "Monolithic Rock-Cut Facade",
      category: "建筑奇观",
      position: [0, 16, -6],
      focusDistance: 55,
      focusHeading: 0,
      focusPitch: -14,
      summary: "无需搭设高空脚手架，纳巴泰古代工匠自 40 米山崖顶端向下步步开凿而成的岩石奇迹。",
      description:
        "纳巴泰人没有采用常规由地基向上砌砖的传统方法，而是绳索攀上粉红砂岩峡谷的顶峰。工匠先在崖壁顶端凿出平台立足，一边雕刻山墙雕饰与柯林斯柱头，一边将多余的废石顺着峡谷推下。随着脚下石料逐渐被凿去，建筑高度逐步降至谷底，整座神殿 100% 融入天然山骨，免去了数万根木质脚手架的消耗。",
      funFact: "佩特拉四周为极度干旱的荒漠峡谷，纳巴泰人却在岩壁内部雕刻出密闭的陶管暗渠系统，能收集方圆数十里的山洪蓄水供三万人常年饮用。",
    },
  ],

  colosseum: [
    {
      id: "colosseum-hypogeum",
      wonderId: "colosseum",
      nameZh: "地下迷宫与猛兽升降机",
      nameEn: "The Hypogeum & Stage Lifts",
      category: "工程智慧",
      position: [0, 2, 0],
      focusDistance: 65,
      focusHeading: 220,
      focusPitch: -28,
      summary: "隐藏于沙地木地板下方的两层深邃地下暗道，配有 80 处起重活板门，猛兽可在瞬息间现身舞台。",
      description:
        "罗马斗兽场中央的木质竞技台原铺有厚厚的金黄海沙（用以吸收角斗士的鲜血），其下方是罗马皇帝图密善主持扩建的二层地下工程（Hypogeum）。这里布满了纵横交错的走廊、兽笼牢房与机械升降梯。奴隶操作绞盘与平衡配重滑轮，可将非洲狮、猎豹、犀牛甚至整座微缩森林景观瞬间穿透暗门升至地面，呈现震撼的视觉特效。",
      funFact: "在斗兽场落成典礼的最初数天，甚至曾放水淹没整个竞技场，在场内举办过由真船对抗的古罗马海战模拟表演（Naumachia）。",
    },
    {
      id: "colosseum-velarium",
      wonderId: "colosseum",
      nameZh: "巨型遮阳帆布桅杆座",
      nameEn: "The Velarium Corbel Sockets",
      category: "建筑奇观",
      position: [70, 46, 0],
      focusDistance: 60,
      focusHeading: 90,
      focusPitch: -15,
      summary: "第四层外墙环绕嵌有的 240 根石牛腿承重座，由帝国海军水兵操纵覆盖五万人看台的遮阳天幕。",
      description:
        "为了保护五万名观战贵族与市民免遭罗马盛夏地中海暴晒，顶层外檐装有 240 根粗壮的实木桅杆，上面悬挂由亚麻与帆布缝制的巨大遮阳篷（Velarium）。遮阳篷呈巨型同心圆环形，中央留有圆形通风天窗。操纵这一复杂索具系统的是罗马米塞努姆驻港舰队抽调的专业水兵，其原理与大型风帆战舰的索具调帆完全一致。",
      funFact: "古罗马文献记载，巨型遮阳篷拉开时伴有阵阵如雷鸣般的风帆猎猎声，看台周围还会喷洒掺有藏红花香精的冰凉薄雾为观众降温。",
    },
  ],

  chichen: [
    {
      id: "chichen-equinox",
      wonderId: "chichen",
      nameZh: "春分羽蛇神降临光影",
      nameEn: "The Equinox Serpent Phenomenon",
      category: "建筑奇观",
      position: [24, 12, 24],
      focusDistance: 55,
      focusHeading: 225,
      focusPitch: -18,
      summary: "每年春秋分日落时分，九层阶梯阴影化为 7 个等腰三角形，与台基石蛇头连接成蜿蜒天降的羽蛇神。",
      description:
        "库库尔坎（Kukulcan）在玛雅神话中是带来雨露与丰收的羽蛇神。每年春分和秋分日落前约 3 点 30 分至 5 点之间，太阳光线精确斜切金字塔的西北角阶梯，金字塔九层平台的阴影投射在北面大台阶西侧挡墙上，形成 7 个光亮与阴影交替的等腰三角形，恰似一条鳞甲闪闪的巨蟒身躯，末端正好与底座雕刻的巨大羽蛇神头颅相合，宛若天神游行大地。",
      funFact: "这不仅是艺术构思，更是玛雅祭司向农耕玛雅人预告雨季来临、应即刻进行春耕播种的天文精准农历时钟。",
    },
    {
      id: "chichen-calendar",
      wonderId: "chichen",
      nameZh: "石头雕刻的玛雅太阳历",
      nameEn: "Architectural Mayan Calendar",
      category: "工程智慧",
      position: [0, 26, 0],
      focusDistance: 60,
      focusHeading: 180,
      focusPitch: -16,
      summary: "四面台阶各 91 级，加上顶部神殿基座恰好为 365 级，象征太阳历的整整一年。",
      description:
        "整座库库尔坎金字塔是一座由石头建造的天文日历丰碑：金字塔四面均设有中央通天大台阶，每一面恰好有 91 级台阶，四面相加为 364 级，加上最顶部通往神殿的最后一级基石，总和为 365 级，严丝合缝对应太阳历（Haab'）的一年 365 天。金字塔分为九层台基，被中央台阶分割为左右各 18 块凹凸截面，正好对应玛雅历法中的 18 个月。",
      funFact: "如果站在金字塔底端的大台阶正前方用力拍击双手，回音穿过台阶缝隙会在塔顶反射出酷似美洲凤尾绿咬鹃（Quetzal）清脆啼鸣的神奇声响。",
    },
  ],

  machu: [
    {
      id: "machu-intihuatana",
      wonderId: "machu",
      nameZh: "拴日石天象观测台",
      nameEn: "The Intihuatana Stone",
      category: "工程智慧",
      position: [0, 24, 0],
      focusDistance: 50,
      focusHeading: 200,
      focusPitch: -20,
      summary: "古城至高点雕刻的花岗岩日晷，印加祭司在冬至日举行“拴住太阳”的庄严天文大典。",
      description:
        "在盖丘亚语中，“Inti”代表太阳，“Huatana”代表拴系束缚。这是一块直接自安第斯花岗岩基岩上雕琢出的多棱立体日晷基石。南半球 6 月 21 日冬至前后，太阳离赤道最远，日照最为短促，印加最高祭司会在石柱上系上金丝绳索，举行神圣仪式“拴住太阳”，祈求太阳不要离去并回暖人间；而在 3 月与 9 月的分点，石柱正午几乎没有阴影投下。",
      funFact: "西班牙殖民征服者在秘鲁大举摧毁印加所有的日晷与偶像，由于马丘比丘从未被西班牙人发现，这块拴日石成为整个印加帝国唯一完整幸存的天文日晷原物。",
    },
    {
      id: "machu-terrace",
      wonderId: "machu",
      nameZh: "防洪蓄热的立体梯田群",
      nameEn: "Agricultural Terraces & Drainage",
      category: "工程智慧",
      position: [-24, 8, 20],
      focusDistance: 60,
      focusHeading: 140,
      focusPitch: -22,
      summary: "环绕悬崖建造的 700 多层梯田，具备卓越的排水吸热功能，庇护了高山古城六百年无坍塌。",
      description:
        "马丘比丘坐落在年降水量超 2000 毫米的热带高山雨林带。印加工程师修建了多达 700 层的花岗岩石砌梯田。梯田剖面精妙至极：底层为大块花岗岩块与碎石，中层为河沙透水层，表层覆盖富含有机质的肥沃耕土。这种结构不仅在雨季像海绵般吸水排泄、杜绝山体滑坡泥石流，更在白天吸收太阳辐射，夜间向农作物缓缓释放地热以抵御高原霜冻。",
      funFact: "现代地质勘探表明，马丘比丘古城近 60% 的工程量均隐藏在地表之下，其暗渠地下排水系统至今运转顺畅，甚至未出现过一次严重积水坍塌。",
    },
  ],

  taj: [
    {
      id: "taj-dome",
      wonderId: "taj",
      nameZh: "双层洋葱大理石大穹顶",
      nameEn: "Double Onion Dome Architecture",
      category: "建筑奇观",
      position: [0, 75, 0],
      focusDistance: 70,
      focusHeading: 180,
      focusPitch: -14,
      summary: "内外中空的双层大理石穹顶，外层高耸 73 米展现莫卧儿帝国宏大体量，殿内回音长达 28 秒。",
      description:
        "泰姬陵标志性的洁白中央大圆顶采用精巧的双层中空结构建造。内层穹顶高度适中（约 28 米），使主殿内部空间不会产生过于空旷压抑的疏离感，兼顾人声颂经的完美回响；外层洋葱球冠则高高隆起达 73 米，坐落在 7 米高的鼓座之上，赋予远观天际线绝世无双的巍峨身姿。穹顶顶端矗立着高达 10 米的铜镀金新月权杖饰顶。",
      funFact: "在主殿正中央轻轻吟唱或击掌，清澈的泛音会在双层穹顶之间激荡反射，久久回旋长达 28 秒才完全消逝。",
    },
    {
      id: "taj-pool",
      wonderId: "taj",
      nameZh: "查尔巴赫水上凉台与倒影",
      nameEn: "Charbagh Reflecting Pool & Diana's Bench",
      category: "建筑奇观",
      position: [0, 2, 124],
      focusDistance: 60,
      focusHeading: 180,
      focusPitch: -12,
      summary: "南中轴查尔巴赫十字水系交汇处的大理石水榭，澄澈倒映白玉陵墓与两侧丝柏树。",
      description:
        "莫卧儿帝国园林恪守《古兰经》中天堂乐园有四条河流流淌的“查尔巴赫”（四分园）布局。中轴水渠长达百余米，水道中央设有凸起的大理石八角形霍德·考瑟尔池（Al-Hawd al-Kawthar，意为天国丰足之池），池畔放置的大理石长椅因 1992 年戴安娜王妃在此留下的孤独独照而名扬全球。两侧整齐栽种象征生命永恒的常青丝柏树，倒映于微澜碧水之中。",
      funFact: "为了使水中倒影完美无瑕，水渠底部特别设计了极平缓的落差与沉淀池，水流近乎静止，如同一面天然的深蓝色琉璃水镜。",
    },
    {
      id: "taj-minaret",
      wonderId: "taj",
      nameZh: "宣礼塔抗震防倾倒设计",
      nameEn: "Outward Leaning Minarets",
      category: "工程智慧",
      position: [46, 32, 46],
      focusDistance: 65,
      focusHeading: 225,
      focusPitch: -20,
      summary: "四座 41 米高的大理石宣礼塔在建造时刻意向外微倾 2-3 度，以防地震坍塌损毁主陵墓。",
      description:
        "矗立在白色大理石高台四角的四座宣礼塔均高达 41 米，分为三层，每层带有八角形雕花外挑阳台。建筑师乌斯塔德·艾哈迈德·拉合里在施工时运用了极具前瞻性的防震抗灾力学设计：四座塔楼并未完全垂直于地面，而是各自向远离中央主陵墓的外侧方向微倾 2 到 3 度。一旦阿格拉地区遭遇极具破坏力的大地震，倒塌的塔身将全部落入外侧开阔空地，确保中央陵寝万无一失。",
      funFact: "肉眼在近处很难察觉这一微倾斜度，但若从对角线宣礼塔利用铅垂线进行光学测量，即可观测到精妙的外倾夹角。",
    },
  ],

  christ: [
    {
      id: "christ-hands",
      wonderId: "christ",
      nameZh: "30 米翼展降福圣掌",
      nameEn: "30-Meter Open Blessing Palms",
      category: "建筑奇观",
      position: [14.5, 33, 0],
      focusDistance: 35,
      focusHeading: 90,
      focusPitch: -10,
      summary: "双臂水平舒展达 30 米宽，单手长达 3.2 米，以包容博爱的降福姿态俯瞰里约热内卢港湾。",
      description:
        "救世基督像耸立在海拔 710 米的科尔科瓦多山巅，其展开的双臂化为巨大的天然十字架。雕像单只巨掌长达 3.2 米，重达数吨，掌心微斜向上倾斜，象征对全人类的接纳与庇佑。雕像由数百万块来自米纳斯吉拉斯州的浅灰绿色滑石马赛克贴面拼接而成，耐风化且触感温润。",
      funFact: "由于基督像地处雷暴多发的高峰，手指指尖内藏有现代避雷铜针系统。2014 年世界杯前夕的一次强雷暴曾击断了右手中指指尖，后经专业登山修复师重新雕补。",
    },
    {
      id: "christ-sleeves",
      wonderId: "christ",
      nameZh: "Art Deco 垂悬长袍广袖",
      nameEn: "Art Deco Draped Tunic Sleeves",
      category: "建筑奇观",
      position: [7.5, 29, 0],
      focusDistance: 38,
      focusHeading: 100,
      focusPitch: -12,
      summary: "袖口垂落达 3.6 米并优雅回拢至躯干，融汇 20 世纪装饰艺术风格的刚劲竖向风琴褶。",
      description:
        "法国波兰裔雕塑巨匠保罗·兰多夫斯基（Paul Landowski）在设计基督像时，摒弃了传统巴洛克雕塑复杂的繁缛卷褶，大胆采用了 20 世纪 30 年代风靡全球的 Art Deco 现代主义雕塑语言。圣袍两袖采用垂直下垂 3.6 米的广袖造型，下缘以优美的悬链线曲线回束于腰肋，袖面上雕刻着硬朗挺拔的竖向棱面风琴褶，在晨曦与夕阳的侧光照射下呈现极其富有韵律的光影质感。",
      funFact: "整座雕像内部为由巴西工程师席尔瓦·科斯塔设计的全中空钢筋混凝土骨架，手臂内部甚至有供维护人员爬行检查的通道梯级。",
    },
    {
      id: "christ-chapel",
      wonderId: "christ",
      nameZh: "基座底部的圣母小堂",
      nameEn: "Nossa Senhora Aparecida Chapel",
      category: "隐秘空间",
      position: [0, 6, -6.5],
      focusDistance: 32,
      focusHeading: 0,
      focusPitch: -8,
      summary: "隐藏于 8 米高黑色花岗岩八角基座深处的小圣堂，供奉巴西守护圣人阿帕雷西达圣母。",
      description:
        "基督像足下并非实心水泥块，而是一座高达 8 米、以乌黑花岗岩贴面的八角形礼拜堂。小堂内部装饰庄严肃穆，可容纳约 150 名信徒。这里供奉着巴西国家主保圣人——阿帕雷西达圣母（Nossa Senhora Aparecida）的复制神像。每年有成千上万的朝圣者与新人申请在此举行山巅日出天主教弥撒或神圣浪漫的婚礼。",
      funFact: "礼拜堂于 2006 年基督像落成 75 周年之际由里约热内卢大主教正式祝圣为国家天主教圣所，允许合法举行洗礼与天主教婚礼仪式。",
    },
  ],
};
