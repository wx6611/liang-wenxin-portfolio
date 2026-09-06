export const figmaLink = (node: string) => `https://www.figma.com/design/OJpKSVGiiRX6Uoqu6JVOh7/20260818作品集?node-id=${node.replace(":", "-")}`;
export const categories = [
  { id: "research", title: "区域研究 & 数据可视化", english: "Research & Data Visualization" },
  { id: "spatial", title: "空间产品 & 体验设计", english: "Spatial Products & Experience" },
  { id: "branding", title: "街区品牌设计", english: "Neighborhood Branding" },
  { id: "products", title: "学术研究 & 产品应用", english: "Research & Digital Products" },
] as const;
export type Project = { id: string; category: (typeof categories)[number]["id"]; title: string; year: string; node: string; description: string[]; images: { src: string; caption: string; width: number; height: number }[] };
export const projects: Project[] = [
  { id: "taihu-research", category: "research", title: "太湖科学城 · 科创资源研究", year: "2020", node: "144:379", description: [
    "太湖科学城战略规划与概念性城市设计国际方案征询。从长三角城市协同与科创资源分布出发，通过分类统计与空间映射，将产业数据转化为规划与功能策划的依据。",
    "研究覆盖大科学装置、重点实验室、科研机构、双一流学校和高等院校，并进一步梳理苏州工业园区、昆山高新区、苏州高新区与常熟高新区的研发资源分布。",
  ], images: [] },
  { id: "maozhou", category: "research", title: "光明茅洲河 · 数据可视化", year: "2023", node: "144:382", description: [
    "深圳市光明茅洲河中央水岸城市设计国际咨询。围绕研发网络与企业空间偏好展开分析，以空间映射、热力分析和关系网络等可视化方式，识别资源集聚、区域联系与选址规律。",
    "从区域尺度的产业研究走向片区尺度的空间证据，为战略规划、空间布局和功能策划提供支持。",
  ], images: [] },
  { id: "guangming", category: "spatial", title: "光明科学城 · 独角兽岛", year: "2019", node: "144:418", description: [
    "围绕独角兽岛的空间产品与体验设计，从整体空间意象、创新街区与街坊场景，到创新办公空间的体验塑造，将产业定位与创新人群需求转化为可感知、可使用的空间产品。",
    "通过立体步道、轨道交通、共享平台与多层绿化，将办公、展示、交流和休闲活动组织在连续开放的公共空间中。结合轨道站点，以高密度、混合化的功能布局构建可灵活生长的研发办公空间。",
    "办公场景覆盖路演讲座、开放办公、实验研发与成果展示，并将咖啡、阅读、会客和绿植庭院融入办公环境，形成兼具专业效率、交流活力与生活体验的创新社区。",
  ], images: [] },
  { id: "taihu-brand", category: "branding", title: "太湖科学城 · 山水主题街区", year: "2020", node: "144:996", description: [
    "从山水文化母题出发，探索街区的概念生成与功能策划。将地域文化研究、叙事概念和空间应用联系起来，让文化意象成为可识别、可体验的街区语言。",
    "以传统山水图像作为概念研究素材，连接自然体验、场所记忆与公共空间的功能组织。",
  ], images: [{ src: "/portfolio/taihu-mountain.png", caption: "山水主题街区 · 概念研究参考图", width: 3072, height: 1526 }] },
  { id: "hankou", category: "branding", title: "汉口在场 · 江汉路历史街区", year: "2026", node: "191:1549", description: [
    "长江来去，汉口在场。人来人往，百年如常。武汉市江汉区历史街区城市更新项目，以地方记忆为起点，串联文化母题、品牌叙事、视觉识别与空间应用。",
    "品牌叙事把游客的一次街区漫游组织成四个连续发生的城市现场：商埠寻踪、街巷漫游、汉派烟火与戏乐夜游。让游客从历史旁观者，逐步成为城市行走者、现场体验者和故事参与者。",
    "设计延展至导视、海报、公共空间、周边物料与数字客户端，形成可识别、可传播、可体验的街区品牌语言。",
  ], images: [{ src: "/portfolio/hankou-story.png", caption: "汉口在场 · 资源、叙事与品牌应用体系", width: 3216, height: 2180 }] },
  { id: "urban-renewal", category: "products", title: "城市更新 · 研究与出版", year: "2021", node: "146:1008", description: [
    "受中建八局委托，参与全国城市更新研究与技术路径搭建，研究成果由中国建筑工业出版社出版。",
    "独立完成城市更新政策框架、实施决策流程与主要问题研究，以及历史街区保护更新产品手册板块撰写，并向委托方进行成果汇报。研究为城市更新业务与实施路径提供支撑。",
  ], images: [] },
  { id: "chip-platform", category: "products", title: "芯片产业链全景平台", year: "2026", node: "187:1392", description: [
    "一个芯片产业链交互式分析网站，将复杂的半导体产业链拆解为可理解、可点击、可查询的结构，支持产业研究、公司梳理与投资观察。",
    "从上游支撑、芯片设计、晶圆制造、封装测试到终端应用，按生产顺序呈现产业链。用户可以查看细分节点、相关企业、国家分类和行情信息。",
    "企业视图集中展示国家、股票代码、所属板块与细分环节，并提供跳转行情页面的入口。",
  ], images: [
    { src: "/portfolio/chip-overview.png", caption: "产业总览 · 生产链与重点赛道", width: 2824, height: 1294 },
    { src: "/portfolio/chip-chain.png", caption: "全链路结构 · 上下游关系与节点查询", width: 2846, height: 1370 },
    { src: "/portfolio/chip-companies.png", caption: "企业行情 · 分类筛选与公司检索", width: 2846, height: 1372 },
  ] },
  { id: "ielts", category: "products", title: "雅思词汇学习 Agent", year: "2026", node: "195:1632", description: [
    "围绕“先筛掉太简单的词，再集中攻克真正不会的词”设计的雅思词汇学习工具。通过快速筛词，让学习者把精力集中在需要掌握的词汇上。",
    "核心功能包括雅思核心词汇学习、深度单词解析、例句与雅思语境、发音、学习记录、复习与学习计划。",
    "提出 i+1 阅读推荐：根据已掌握的词汇，推荐略高于当前水平的英语阅读材料，在可理解的基础上保留适度挑战。",
  ], images: [] },
];
