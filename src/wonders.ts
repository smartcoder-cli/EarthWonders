export type Wonder = {
  id: string
  index: number
  nameZh: string
  nameEn: string
  place: string
  completed: string
  color: string
  longitude: number
  latitude: number
  /** 相机到目标的距离（米）。Camera-to-target distance in meters. */
  flyDistance: number
  flyHeading: number
  flyPitch: number
  flyDuration: number
  labelHeight: number
  /** 飞向目标时看向的海拔高度（米）。 */
  lookHeight?: number
  /** 模型朝向（度）。缺省 0 表示当地北。 */
  modelHeading?: number
  blurb: string
};

/**
 * 新世界七大奇迹（2007）+ 吉萨大金字塔（荣誉成员）。
 * 坐标为各遗址核心点的公开近似值，示意用。
 */
export const WONDERS: Wonder[] = [
  {
    id: "giza",
    index: 1,
    nameZh: "吉萨金字塔",
    nameEn: "Great Pyramid of Giza",
    place: "埃及 · 开罗",
    completed: "约公元前 2560 年",
    color: "#e8c36a",
    longitude: 31.1342,
    latitude: 29.9792,
    flyDistance: 720,
    flyHeading: 255,
    flyPitch: -22,
    flyDuration: 4.2,
    labelHeight: 155,
    lookHeight: 55,
    blurb:
      "古代世界七大奇迹中唯一仍屹立的一座。胡夫金字塔底边约 230 米，原高约 146 米，是人类早期大规模精确石作的代表。",
  },
  {
    id: "wall",
    index: 2,
    nameZh: "中国长城",
    nameEn: "Great Wall of China",
    place: "中国 · 北京八达岭",
    completed: "明长城主体（约 14–17 世纪）",
    color: "#d97b4a",
    longitude: 116.0169,
    latitude: 40.3598,
    flyDistance: 360,
    flyHeading: 118,
    flyPitch: -22,
    modelHeading: 28,
    flyDuration: 4.6,
    labelHeight: 28,
    blurb:
      "跨越山脉的防御工程体系，并非单墙一道。八达岭是明长城最广为人知的段落之一，也是从地球尺度看中国北方的醒目标记。",
  },
  {
    id: "petra",
    index: 3,
    nameZh: "佩特拉",
    nameEn: "Petra",
    place: "约旦 · 马安省",
    completed: "约公元前 4 世纪起",
    color: "#c45c4a",
    longitude: 35.4444,
    latitude: 30.3285,
    flyDistance: 115,
    flyHeading: 0,
    flyPitch: -8,
    flyDuration: 3.8,
    labelHeight: 58,
    blurb:
      "纳巴泰人在玫瑰色砂岩峡谷中开凿的都城。宝库（Al-Khazneh）的立面从石壁中雕出，是沙漠商路文明的象征。",
  },
  {
    id: "colosseum",
    index: 4,
    nameZh: "罗马斗兽场",
    nameEn: "Colosseum",
    place: "意大利 · 罗马",
    completed: "公元 80 年",
    color: "#c9a27a",
    longitude: 12.4922,
    latitude: 41.8902,
    flyDistance: 210,
    flyHeading: -48,
    flyPitch: -38,
    flyDuration: 4.0,
    labelHeight: 56,
    blurb:
      "弗拉维圆形剧场可容纳数万人。椭圆平面、分层拱券与混凝土技术，定义了此后西方公共建筑的原型。",
  },
  {
    id: "chichen",
    index: 5,
    nameZh: "奇琴伊察",
    nameEn: "Chichen Itza",
    place: "墨西哥 · 尤卡坦",
    completed: "约公元 10 世纪",
    color: "#d4b483",
    longitude: -88.568611,
    latitude: 20.682889,
    flyDistance: 180,
    flyHeading: 142,
    flyPitch: -30,
    flyDuration: 5.2,
    labelHeight: 42,
    lookHeight: 22,
    blurb:
      "玛雅文明后古典期的仪式中心。库库尔坎金字塔在春分、秋分时，北梯阴影会形成蛇形光带，把天文与建筑绑在一起。",
  },
  {
    id: "machu",
    index: 6,
    nameZh: "马丘比丘",
    nameEn: "Machu Picchu",
    place: "秘鲁 · 库斯科大区",
    completed: "约 15 世纪",
    color: "#7dba7a",
    longitude: -72.545,
    latitude: -13.1631,
    flyDistance: 280,
    flyHeading: 155,
    flyPitch: -22,
    flyDuration: 5.4,
    labelHeight: 70,
    lookHeight: 28,
    blurb:
      "安第斯山脉云雾中的印加遗址。梯田、太阳神庙与精密石砌，展示了高海拔农业与礼仪空间如何叠在同一座山脊上。",
  },
  {
    id: "taj",
    index: 7,
    nameZh: "泰姬陵",
    nameEn: "Taj Mahal",
    place: "印度 · 阿格拉",
    completed: "约 1653 年",
    color: "#f2ece4",
    longitude: 78.0421,
    latitude: 27.1751,
    flyDistance: 190,
    flyHeading: 0,
    flyPitch: -16,
    flyDuration: 4.4,
    labelHeight: 78,
    blurb:
      "莫卧儿皇帝沙贾汗为穆姆塔兹·马哈尔修建的白色大理石陵墓。四座宣礼塔与中央穹顶构成严格对称的河畔园林。",
  },
  {
    id: "christ",
    index: 8,
    nameZh: "基督像",
    nameEn: "Christ the Redeemer",
    place: "巴西 · 里约热内卢",
    completed: "1931 年",
    color: "#d8d2c4",
    longitude: -43.21056,
    latitude: -22.95194,
    flyDistance: 95,
    flyHeading: 250,
    flyPitch: -12,
    flyDuration: 5.0,
    labelHeight: 42,
    lookHeight: 20,
    modelHeading: 90,
    blurb:
      "科尔科瓦多山顶的钢筋混凝土雕像，高约 30 米（不含基座）。张开的双臂成为里约港湾与现代城市天际线的标志。",
  },
];

export const SPACE_VIEW = {
  longitude: 28,
  latitude: 18,
  height: 16_500_000,
  heading: 0,
  pitch: -88,
  roll: 0,
} as const;
