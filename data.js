/* ============================================================
   ИСХОДНЫЙ КАТАЛОГ ИГР

   Это массив объектов — обычная конструкция JavaScript.
   В каждом объекте перечислены свойства одной игры:
   id          — уникальный номер (по нему находим игру);
   title       — название;
   genre       — жанр;
   year        — год;
   developer   — разработчик;
   platforms   — массив платформ;
   description — текст для окна «Подробнее»;
   steamId     — номер игры в Steam для загрузки обложки;
   color       — цвет-заглушка, если нет интернета.

   Если пользователь что-то меняет, изменения хранятся отдельно
   в localStorage — оригинальные данные здесь не переписываются.
   ============================================================ */

const startingGames = [
    {
        id: 1, title: "Hollow Knight", genre: "Метроидвания", year: 2017,
        developer: "Team Cherry", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Исследуй огромное подземное королевство Холлоунест, знакомься с необычными персонажами и раскрывай историю давно забытого мира.",
        steamId: 367520, color: "#4d568f"
    },
    {
        id: 2, title: "Red Dead Redemption 2", genre: "Экшен", year: 2018,
        developer: "Rockstar Games", platforms: ["PC", "PlayStation", "Xbox"],
        description: "История банды Ван дер Линде на закате эпохи Дикого Запада. Огромный открытый мир, непростые решения и детально проработанная атмосфера.",
        steamId: 1174180, color: "#98503d"
    },
    {
        id: 3, title: "Hades", genre: "Рогалик", year: 2020,
        developer: "Supergiant Games", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Прорывайся из царства мёртвых, знакомься с олимпийскими богами и пробуй новые сочетания способностей в каждом забеге.",
        steamId: 1145360, color: "#984c6a"
    },
    {
        id: 4, title: "Gloomwood", genre: "Экшен", year: 2022,
        developer: "Dillon Rogers, David Szymanski", platforms: ["PC"],
        description: "Мрачное приключение от первого лица с исследованием готического города, скрытностью и необычной атмосферой.",
        steamId: 1150760, color: "#275f59"
    },
    {
        id: 5, title: "Portal 2", genre: "Головоломка", year: 2011,
        developer: "Valve", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Решай пространственные головоломки с помощью портальной пушки и исследуй заброшенные испытательные комплексы.",
        steamId: 620, color: "#7d879c"
    },
    {
        id: 6, title: "DOOM Eternal", genre: "Шутер", year: 2020,
        developer: "id Software", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Быстрый научно-фантастический шутер, где важны постоянное движение, подбор вооружения и реакция.",
        steamId: 782330, color: "#b05e46"
    },
    {
        id: 7, title: "Disco Elysium", genre: "Ролевая игра", year: 2019,
        developer: "ZA/UM", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Необычная детективная ролевая игра, в которой диалоги, характер героя и решения определяют развитие расследования.",
        steamId: 632470, color: "#66558b"
    },
    {
        id: 8, title: "Elden Ring", genre: "Ролевая игра", year: 2022,
        developer: "FromSoftware", platforms: ["PC", "PlayStation", "Xbox"],
        description: "Путешествуй по Междуземью, исследуй крепости и подземелья, развивай героя и выбирай свой путь через открытый мир.",
        steamId: 1245620, color: "#8e784c"
    },
    {
        id: 9, title: "Celeste", genre: "Платформер", year: 2018,
        developer: "Maddy Makes Games", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Точный платформер про восхождение на гору. Небольшие испытания требуют терпения, а история рассказывает о преодолении трудностей.",
        steamId: 504230, color: "#545b9d"
    },
    {
        id: 10, title: "Outer Wilds", genre: "Приключение", year: 2019,
        developer: "Mobius Digital", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Исследуй небольшую солнечную систему, изучай древние тайны и постепенно понимай устройство необычного космического мира.",
        steamId: 753640, color: "#62648f"
    },
    {
        id: 11, title: "Dead Cells", genre: "Рогалик", year: 2018,
        developer: "Motion Twin", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Динамичная игра с исследованием меняющихся уровней, разнообразными навыками и множеством вариантов прохождения.",
        steamId: 588650, color: "#7d427e"
    },
    {
        id: 12, title: "Stardew Valley", genre: "Симулятор", year: 2016,
        developer: "ConcernedApe", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Обустраивай ферму, общайся с жителями, выращивай урожай и постепенно развивай собственное хозяйство.",
        steamId: 413150, color: "#609077"
    },
    {
        id: 13, title: "DUSK", genre: "Шутер", year: 2018,
        developer: "David Szymanski", platforms: ["PC", "Switch"],
        description: "Атмосферный шутер в духе классических игр 1990-х с высокой скоростью, секретами и необычными уровнями.",
        steamId: 519860, color: "#95654c"
    },
    {
        id: 14, title: "Dark Souls III", genre: "Ролевая игра", year: 2016,
        developer: "FromSoftware", platforms: ["PC", "PlayStation", "Xbox"],
        description: "Фэнтезийная ролевая игра с запоминающимися локациями, внимательным исследованием и сложными противниками.",
        steamId: 374320, color: "#5b566f"
    },
    {
        id: 15, title: "The Witcher 3: Wild Hunt", genre: "Ролевая игра", year: 2015,
        developer: "CD Projekt RED", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Продолжительное приключение ведьмака Геральта в открытом мире с сюжетными заданиями и важными выборами.",
        steamId: 292030, color: "#62647b"
    },
    {
        id: 16, title: "Baldur's Gate 3", genre: "Ролевая игра", year: 2023,
        developer: "Larian Studios", platforms: ["PC", "PlayStation", "Xbox"],
        description: "Сюжетная ролевая игра с пошаговыми сражениями, свободой выбора, взаимодействием с напарниками и множеством вариантов развития событий.",
        steamId: 1086940, color: "#70507c"
    },
    {
        id: 17, title: "Slay the Spire", genre: "Стратегия", year: 2019,
        developer: "Mega Crit", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Карточная стратегия, в которой нужно собрать колоду, выбирать маршрут и находить удачные сочетания карт и артефактов.",
        steamId: 646570, color: "#7b6750"
    },
    {
        id: 18, title: "Subnautica", genre: "Выживание", year: 2018,
        developer: "Unknown Worlds Entertainment", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Исследуй океан инопланетной планеты, создавай оборудование и постройки, изучай морскую жизнь и тайны глубин.",
        steamId: 264710, color: "#267c8b"
    },
    {
        id: 19, title: "INSIDE", genre: "Головоломка", year: 2016,
        developer: "Playdead", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Атмосферный платформер с загадками и необычной визуальной подачей, в котором история раскрывается через окружение.",
        steamId: 304430, color: "#555d68"
    },
    {
        id: 20, title: "UNDERTALE", genre: "Ролевая игра", year: 2015,
        developer: "tobyfox", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Небольшая ролевая игра с запоминающимися персонажами, необычными диалогами и разными вариантами прохождения.",
        steamId: 391540, color: "#75638a"
    },
    {
        id: 21, title: "Cyberpunk 2077", genre: "Ролевая игра", year: 2020,
        developer: "CD Projekt RED", platforms: ["PC", "PlayStation", "Xbox"],
        description: "История наёмника в футуристическом Найт-Сити, где исследование города и выбор игрока влияют на развитие событий.",
        steamId: 1091500, color: "#9b8d46"
    },
    {
        id: 22, title: "Terraria", genre: "Выживание", year: 2011,
        developer: "Re-Logic", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Двухмерная песочница с добычей ресурсов, строительством, исследованием подземелий и различными противниками.",
        steamId: 105600, color: "#52846e"
    },
    {
        id: 23, title: "Ori and the Will of the Wisps", genre: "Платформер", year: 2020,
        developer: "Moon Studios", platforms: ["PC", "Xbox", "Switch"],
        description: "Красочное приключение с акробатикой, исследованием природного мира и историей маленького духа Ори.",
        steamId: 1057090, color: "#508f9a"
    },
    {
        id: 24, title: "ULTRAKILL", genre: "Шутер", year: 2020,
        developer: "Arsi Patala", platforms: ["PC"],
        description: "Очень быстрый шутер, в котором движение, стиль игры и умелое использование возможностей героя становятся основой прохождения.",
        steamId: 1229490, color: "#a04e59"
    },
    {
        id: 25, title: "Balatro", genre: "Стратегия", year: 2024,
        developer: "LocalThunk", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Карточная стратегия, в которой ты составляешь комбинации и ищешь необычные способы набрать как можно больше очков.",
        steamId: 2379780, color: "#6d5e96"
    },
    {
        id: 26, title: "TUNIC", genre: "Приключение", year: 2022,
        developer: "Andrew Shouldice", platforms: ["PC", "PlayStation", "Xbox", "Switch"],
        description: "Изометрическое приключение с исследованием древних руин, загадками и постепенно открывающимися правилами мира.",
        steamId: 553420, color: "#71865b"
    }
];
