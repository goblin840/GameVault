/* ============================================================
   GAMEVAULT — ЛОГИКА САЙТА

   Код написан на обычном JavaScript, без библиотек и фреймворков.
   Не используется innerHTML: элементы создаются через createElement.

   Чтобы проще было читать, код разделён на части:
   1. Данные и сохранение
   2. Небольшие вспомогательные функции
   3. Карточки игр
   4. Разделы сайта
   5. Окно с подробностями игры
   6. Добавление, редактирование и удаление
   7. Импорт / экспорт
   8. Обработчики кнопок
   ============================================================ */

// ============================================================
// 1. ДАННЫЕ И СОХРАНЕНИЕ
// ============================================================

// Это названия «ячеек» localStorage. По ним браузер находит данные.
// Имена этих трёх ключей будут меняться при входе в другой профиль.
// Так у каждого игрока будут отдельные каталог, библиотека и история.
let GAMES_KEY = "gamevault_games_v2";
let LIBRARY_KEY = "gamevault_library_v2";
let ACTIVITY_KEY = "gamevault_activity_v2";

// Считываем JSON. Если ничего не сохранено или JSON повреждён,
// используем запасное значение (второй аргумент).
function readSavedData(key, fallback) {
    try {
        const text = localStorage.getItem(key);
        if (text === null) {
            return fallback;
        }
        return JSON.parse(text);
    } catch (error) {
        console.log("Не удалось прочитать данные:", key);
        return fallback;
    }
}

// В localStorage нельзя сохранять массивы/объекты напрямую.
// JSON.stringify превращает их в строку.
function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        showToast("Не удалось сохранить данные в браузере.", true);
        return false;
    }
}

// Копируем исходный каталог. Так стартовые объекты не меняются.
let games = readSavedData(GAMES_KEY, JSON.parse(JSON.stringify(startingGames)));
let library = readSavedData(LIBRARY_KEY, {});
let activities = readSavedData(ACTIVITY_KEY, []);

// Простая защита от повреждённых данных в localStorage.
if (!Array.isArray(games)) {
    games = JSON.parse(JSON.stringify(startingGames));
}
if (library === null || typeof library !== "object" || Array.isArray(library)) {
    library = {};
}
if (!Array.isArray(activities)) {
    activities = [];
}

// Если человек использовал предыдущую маленькую версию GameVault,
// переносим статусы в новую (только при первой загрузке).
if (localStorage.getItem(LIBRARY_KEY) === null) {
    let oldStatuses = readSavedData("gameVaultStatuses", {});
    const statusNames = {
        "Хочу пройти": "wishlist",
        "Прохожу": "playing",
        "Пройдена": "completed"
    };
    if (oldStatuses && typeof oldStatuses === "object") {
        for (let id in oldStatuses) {
            if (statusNames[oldStatuses[id]]) {
                library[id] = { status: statusNames[oldStatuses[id]], favorite: false, rating: 0, note: "" };
            }
        }
    }
}

// Текущая страница, вкладка библиотеки и количество карточек каталога.
let currentPage = "home";
let libraryTab = "all";
let catalogLimit = 12;
let featuredGameId = 1;
let toastTimer;

// Статусы. В коде используются короткие значения,
// а посетитель видит русские названия.
const statusLabels = {
    none: "Не добавлена",
    wishlist: "Хочу пройти",
    playing: "Прохожу",
    completed: "Пройдена",
    paused: "Отложена"
};

// ============================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

// document.getElementById повторяется часто, поэтому сделали
// короткую функцию с понятным названием.
function getElement(id) {
    return document.getElementById(id);
}

// Создать элемент HTML и сразу задать ему класс и текст.
// Например: createElement("p", "hello", "Привет!").
function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;  // Без innerHTML.
    }
    return element;
}

// Находим нужную игру в массиве по уникальному id.
function findGame(id) {
    for (let game of games) {
        if (game.id === Number(id)) {
            return game;
        }
    }
    return null;
}

// Возвращает данные пользователя по игре.
// Если игра ещё не добавлялась, возвращаем значения по умолчанию.
function getLibraryInfo(id) {
    let info = library[id];
    if (!info || typeof info !== "object") {
        return { status: "none", favorite: false, rating: 0, note: "" };
    }
    return {
        status: statusLabels[info.status] ? info.status : "none",
        favorite: info.favorite === true,
        rating: Number(info.rating) || 0,
        note: typeof info.note === "string" ? info.note : ""
    };
}

// Сохраняем информацию об одной игре.
function setLibraryInfo(id, info) {
    library[id] = info;
    saveData(LIBRARY_KEY, library);
}

// Адрес обложки. Steam ID — обычный номер игры в Steam.
// Если обложка не загрузится, останется цветная карточка.
function getCoverUrl(game) {
    if (!game.steamId) {
        return "";
    }
    return "https://cdn.cloudflare.steamstatic.com/steam/apps/" + game.steamId + "/library_600x900.jpg";
}

// Показываем небольшое уведомление в правом нижнем углу.
function showToast(message, isError) {
    const toast = getElement("toast");
    toast.textContent = message;
    toast.className = isError ? "toast visible error" : "toast visible";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        toast.className = "toast";
    }, 3200);
}

// Добавляем запись в историю действий.
function addActivity(message, symbol) {
    activities.unshift({ message: message, symbol: symbol || "✧", time: new Date().toISOString() });
    // Храним только 30 последних событий, чтобы не переполнять память.
    activities = activities.slice(0, 30);
    saveData(ACTIVITY_KEY, activities);
}

// Получаем короткую дату. Пример: 22.11.2026.
function shortDate(text) {
    const date = new Date(text);
    if (isNaN(date.getTime())) {
        return "Недавно";
    }
    return date.toLocaleDateString("ru-RU");
}

// Сколько игр попало в библиотеку, сколько пройдено и т. д.
function calculateStats() {
    let myGames = 0;
    let completed = 0;
    let playing = 0;
    let favorites = 0;
    let totalRating = 0;
    let ratingCount = 0;

    for (let game of games) {
        const info = getLibraryInfo(game.id);
        if (info.status !== "none") myGames++;
        if (info.status === "completed") completed++;
        if (info.status === "playing") playing++;
        if (info.favorite) favorites++;
        if (info.rating > 0) {
            totalRating += info.rating;
            ratingCount++;
        }
    }
    return {
        total: games.length,
        myGames: myGames,
        completed: completed,
        playing: playing,
        favorites: favorites,
        average: ratingCount === 0 ? "—" : (totalRating / ratingCount).toFixed(1)
    };
}

// Если данные изменились — обновляем все разделы.
// Каталог небольшой, поэтому такой подход понятен и достаточен.
function refreshEverything() {
    fillFilterLists();
    renderHome();
    renderCatalog();
    renderLibrary();
    renderFavorites();
    renderStats();
    renderManage();
    renderProfile();
    getElement("navLibraryCount").textContent = calculateStats().myGames;
}

// ============================================================
// 3. КАРТОЧКИ ИГР
// ============================================================

// Создаём изображение обложки. Оно не обязательно загрузится:
// на случай отсутствия интернета есть цветной фон и текст.
function addCoverImage(parent, game) {
    const url = getCoverUrl(game);
    if (!url) return;

    const image = document.createElement("img");
    image.alt = "Обложка игры «" + game.title + "»";
    image.loading = "lazy";
    image.src = url;

    // Класс has-image добавляется только после успешной загрузки.
    image.addEventListener("load", function () {
        parent.classList.add("has-image");
    });
    image.addEventListener("error", function () {
        image.remove();
    });
    parent.appendChild(image);
}

// Одна карточка игры в каталоге.
// Это отдельная функция, потому что карточки нужны на 4 страницах.
function createGameCard(game) {
    const info = getLibraryInfo(game.id);
    const card = createElement("article", "game-card");

    // Верхняя часть карточки — обложка.
    const cover = createElement("div", "cover");
    cover.style.setProperty("--cover-color", game.color || "#555b89");
    // Символ жанра украшает карточку, когда обложка из Steam недоступна.
    // Это просто текстовый знак, без дополнительных изображений и библиотек.
    const symbols = {
        "Метроидвания": "♛", "Экшен": "✦", "Рогалик": "♠",
        "Шутер": "✛", "Ролевая игра": "⚔", "Платформер": "⇧",
        "Приключение": "◈", "Симулятор": "❋", "Стратегия": "♜",
        "Выживание": "◉", "Головоломка": "⬡", "Другое": "✧"
    };
    const coverArt = createElement("span", "cover-art", symbols[game.genre] || "✧");
    const coverText = createElement("span", "cover-fallback", game.title);
    cover.appendChild(coverArt);
    cover.appendChild(coverText);
    addCoverImage(cover, game);

    // Год в углу обложки.
    const yearBadge = createElement("span", "cover-year", game.year);
    cover.appendChild(yearBadge);

    // Сердечко: добавляет игру в избранное.
    const heart = createElement("button", "favorite-button" + (info.favorite ? " is-favorite" : ""), info.favorite ? "♥" : "♡");
    heart.type = "button";
    heart.title = info.favorite ? "Убрать из избранного" : "Добавить в избранное";
    heart.setAttribute("aria-label", heart.title + ": " + game.title);
    heart.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleFavorite(game.id);
    });
    cover.appendChild(heart);

    // Щелчок по обложке откроет окно с подробностями.
    cover.addEventListener("click", function () {
        openDetails(game.id);
    });
    cover.tabIndex = 0;
    cover.setAttribute("role", "button");
    cover.setAttribute("aria-label", "Подробнее об игре " + game.title);
    cover.addEventListener("keydown", function (event) {
        if (event.target !== cover) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetails(game.id);
        }
    });

    // Нижняя часть карточки — название, разработчик, жанр и статус.
    const body = createElement("div", "game-card-body");
    const title = createElement("button", "game-card-title", game.title);
    title.type = "button";
    title.addEventListener("click", function () {
        openDetails(game.id);
    });
    const meta = createElement("div", "game-card-meta");
    meta.appendChild(createElement("span", "", game.developer));
    if (info.rating > 0) {
        meta.appendChild(createElement("span", "dot-separator", "•"));
        meta.appendChild(createElement("span", "", "★ " + info.rating + "/5"));
    }
    const bottom = createElement("div", "game-card-bottom");
    const genre = createElement("span", "game-genre", game.genre);
    let statusClass = info.status === "none" ? "" : " is-" + info.status;
    const status = createElement("span", "game-status" + statusClass, statusLabels[info.status]);
    bottom.appendChild(genre);
    bottom.appendChild(status);
    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(bottom);
    card.appendChild(cover);
    card.appendChild(body);
    return card;
}

// Отображаем массив игр в выбранном контейнере.
function showCardList(containerId, selectedGames) {
    const container = getElement(containerId);
    container.replaceChildren();  // Удаляем предыдущие карточки.
    for (let game of selectedGames) {
        container.appendChild(createGameCard(game));
    }
}

// Карточка с крупным числом (например, «Пройдено: 5»).
function createStatCard(label, value, icon, color) {
    const card = createElement("div", "stat-card");
    const left = createElement("div");
    const title = createElement("div", "stat-label", label);
    const number = createElement("div", "stat-value", value);
    const iconBox = createElement("div", "stat-icon " + color, icon);
    left.appendChild(title);
    left.appendChild(number);
    card.appendChild(left);
    card.appendChild(iconBox);
    return card;
}

// ============================================================
// 4. СТРАНИЦЫ САЙТА
// ============================================================

// ГЛАВНАЯ СТРАНИЦА
function renderHome() {
    // Большой баннер показывает первую рекомендуемую игру.
    // Если её удалили, выбираем первую оставшуюся из каталога.
    const featured = findGame(1) || games[0];
    getElement("featuredHero").hidden = !featured;
    if (featured) {
        featuredGameId = featured.id;
        getElement("featuredHero").querySelector("h2").textContent = featured.title.toUpperCase();
        getElement("featuredHero").querySelector("p").textContent = featured.description;
        getElement("featuredHero").querySelector(".hero-meta").textContent = featured.year + " · " + featured.genre;
    }
    const stats = calculateStats();
    const container = getElement("homeStats");
    container.replaceChildren();
    container.appendChild(createStatCard("В каталоге", stats.total, "▦", "icon-violet"));
    container.appendChild(createStatCard("В моей библиотеке", stats.myGames, "▣", "icon-blue"));
    container.appendChild(createStatCard("Пройдено", stats.completed, "✓", "icon-green"));
    container.appendChild(createStatCard("Избранное", stats.favorites, "♡", "icon-pink"));

    // Показываем на главной четыре выбранные игры.
    const featuredIds = [1, 2, 3, 4];
    let picks = [];
    for (let id of featuredIds) {
        const game = findGame(id);
        if (game) picks.push(game);
    }
    if (picks.length === 0) picks = games.slice(0, 4);
    showCardList("featuredGames", picks);

    // Процент прохождения — сколько игр пройдено из всех в библиотеке.
    const percentage = stats.myGames === 0 ? 0 : Math.round(stats.completed / stats.myGames * 100);
    const progress = getElement("homeProgress");
    progress.replaceChildren();

    const amount = createElement("div", "progress-total");
    amount.appendChild(createElement("strong", "", percentage + "%"));
    amount.appendChild(createElement("span", "", "игр завершено"));
    const track = createElement("div", "progress-track");
    const fill = createElement("div", "progress-fill");
    fill.style.width = percentage + "%";
    track.appendChild(fill);
    const legend = createElement("div", "progress-legend");
    legend.appendChild(createElement("span", "", "● " + stats.completed + " пройдено"));
    legend.appendChild(createElement("span", "", "● " + stats.playing + " в процессе"));
    progress.appendChild(amount);
    progress.appendChild(track);
    progress.appendChild(legend);

    renderActivity("homeActivity", 3);
}

// Заполняем варианты в фильтрах значениями из каталога.
function fillFilterLists() {
    const genreSelect = getElement("filterGenre");
    const platformSelect = getElement("filterPlatform");
    const oldGenre = genreSelect.value;
    const oldPlatform = platformSelect.value;

    genreSelect.replaceChildren(new Option("Все жанры", "all"));
    platformSelect.replaceChildren(new Option("Все платформы", "all"));

    let genres = [];
    let platforms = [];
    for (let game of games) {
        if (!genres.includes(game.genre)) genres.push(game.genre);
        for (let platform of game.platforms) {
            if (!platforms.includes(platform)) platforms.push(platform);
        }
    }
    genres.sort();
    platforms.sort();
    for (let genre of genres) genreSelect.appendChild(new Option(genre, genre));
    for (let platform of platforms) platformSelect.appendChild(new Option(platform, platform));

    // Не сбрасываем выбор посетителя при обычном обновлении списка.
    genreSelect.value = genres.includes(oldGenre) ? oldGenre : "all";
    platformSelect.value = platforms.includes(oldPlatform) ? oldPlatform : "all";
}

// КАТАЛОГ С ПОИСКОМ И ФИЛЬТРАМИ
function renderCatalog() {
    const query = getElement("globalSearch").value.trim().toLowerCase();
    const genre = getElement("filterGenre").value;
    const platform = getElement("filterPlatform").value;
    const status = getElement("filterStatus").value;
    const sortBy = getElement("filterSort").value;
    let filteredGames = [];

    for (let game of games) {
        const info = getLibraryInfo(game.id);
        const matchesQuery = game.title.toLowerCase().includes(query) || game.developer.toLowerCase().includes(query);
        const matchesGenre = genre === "all" || game.genre === genre;
        const matchesPlatform = platform === "all" || game.platforms.includes(platform);
        const matchesStatus = status === "all" || info.status === status;

        if (matchesQuery && matchesGenre && matchesPlatform && matchesStatus) {
            filteredGames.push(game);
        }
    }

    // sort переставляет элементы массива. Сортируем копию, а не games.
    filteredGames.sort(function (a, b) {
        if (sortBy === "new") return b.year - a.year;
        if (sortBy === "old") return a.year - b.year;
        if (sortBy === "rating") return getLibraryInfo(b.id).rating - getLibraryInfo(a.id).rating;
        return a.title.localeCompare(b.title, "ru");
    });

    getElement("catalogTotal").firstChild.textContent = games.length + " ";
    getElement("catalogResults").textContent = filteredGames.length;
    showCardList("catalogGames", filteredGames.slice(0, catalogLimit));
    getElement("catalogEmpty").hidden = filteredGames.length > 0;
    getElement("loadMore").hidden = filteredGames.length <= catalogLimit;
}

// МОЯ БИБЛИОТЕКА
function renderLibrary() {
    let selected = [];
    let count = 0;
    for (let game of games) {
        const status = getLibraryInfo(game.id).status;
        if (status !== "none") {
            count++;
            if (libraryTab === "all" || status === libraryTab) {
                selected.push(game);
            }
        }
    }
    showCardList("libraryGames", selected);
    getElement("libraryEmpty").hidden = selected.length > 0;
    getElement("libraryTotal").firstChild.textContent = count + " ";
}

// ИЗБРАННОЕ
function renderFavorites() {
    let selected = [];
    for (let game of games) {
        if (getLibraryInfo(game.id).favorite) selected.push(game);
    }
    showCardList("favoriteGames", selected);
    getElement("favoritesTotal").firstChild.textContent = selected.length + " ";
    getElement("favoritesEmpty").hidden = selected.length > 0;
}

// Рисуем одну строку диаграммы — подпись и цветную полоску.
function createBar(label, amount, maximum, green) {
    const row = createElement("div", "bar-item");
    const heading = createElement("div", "bar-item-label");
    heading.appendChild(createElement("span", "", label));
    heading.appendChild(createElement("strong", "", amount));
    const track = createElement("div", "bar-track");
    const bar = createElement("div", "bar-fill" + (green ? " green-fill" : ""));
    bar.style.width = maximum === 0 ? "0%" : Math.round(amount / maximum * 100) + "%";
    track.appendChild(bar);
    row.appendChild(heading);
    row.appendChild(track);
    return row;
}

// СТАТИСТИКА
function renderStats() {
    const stats = calculateStats();
    const summary = getElement("statsSummary");
    summary.replaceChildren();
    summary.appendChild(createStatCard("В библиотеке", stats.myGames, "▣", "icon-violet"));
    summary.appendChild(createStatCard("Пройдено", stats.completed, "✓", "icon-green"));
    summary.appendChild(createStatCard("Сейчас прохожу", stats.playing, "◉", "icon-blue"));
    summary.appendChild(createStatCard("Средняя оценка", stats.average, "★", "icon-pink"));

    // Первая диаграмма — сколько игр с каждым статусом.
    const statusChart = getElement("statusChart");
    statusChart.replaceChildren();
    for (let code of ["wishlist", "playing", "completed", "paused"]) {
        let amount = 0;
        for (let game of games) {
            if (getLibraryInfo(game.id).status === code) amount++;
        }
        statusChart.appendChild(createBar(statusLabels[code], amount, Math.max(stats.myGames, 1), false));
    }

    // Вторая диаграмма — пять самых частых жанров в библиотеке.
    let genreCounts = {};
    for (let game of games) {
        if (getLibraryInfo(game.id).status !== "none") {
            if (!genreCounts[game.genre]) genreCounts[game.genre] = 0;
            genreCounts[game.genre]++;
        }
    }
    let genreEntries = Object.entries(genreCounts);
    genreEntries.sort(function (a, b) { return b[1] - a[1]; });
    genreEntries = genreEntries.slice(0, 5);
    const genreChart = getElement("genreChart");
    genreChart.replaceChildren();
    if (genreEntries.length === 0) {
        genreChart.appendChild(createElement("p", "empty-inline", "Добавь игры в библиотеку, чтобы появилась статистика по жанрам."));
    } else {
        for (let entry of genreEntries) {
            genreChart.appendChild(createBar(entry[0], entry[1], stats.myGames, true));
        }
    }
    renderActivity("allActivity", 12);
}

// История на главной и странице статистики.
function renderActivity(containerId, limit) {
    const container = getElement(containerId);
    container.replaceChildren();
    if (activities.length === 0) {
        container.appendChild(createElement("p", "empty-inline", "Здесь появятся действия с играми: добавления, оценки и изменения статусов."));
        return;
    }
    for (let activity of activities.slice(0, limit)) {
        const row = createElement("div", "activity-row");
        const icon = createElement("span", "activity-icon", activity.symbol || "✧");
        const textBox = createElement("div", "activity-copy");
        textBox.appendChild(createElement("strong", "", activity.message || "Изменение"));
        textBox.appendChild(createElement("span", "", "В личной коллекции"));
        const date = createElement("span", "activity-time", shortDate(activity.time));
        row.appendChild(icon);
        row.appendChild(textBox);
        row.appendChild(date);
        container.appendChild(row);
    }
}

// УПРАВЛЕНИЕ: таблица со всеми играми и двумя кнопками.
function renderManage() {
    getElement("manageCount").textContent = games.length;
    const container = getElement("manageList");
    container.replaceChildren();
    for (let game of games) {
        const row = createElement("div", "manage-row");
        const thumb = createElement("div", "manage-thumb", game.title.charAt(0));
        thumb.style.backgroundColor = game.color || "#555b89";
        addCoverImage(thumb, game);
        const text = createElement("div", "manage-meta");
        text.appendChild(createElement("strong", "", game.title));
        text.appendChild(createElement("span", "", game.genre + " · " + game.year + " · " + game.developer));
        const actions = createElement("div", "manage-actions");
        const editButton = createElement("button", "", "Изменить");
        editButton.type = "button";
        editButton.addEventListener("click", function () { openGameForm(game.id); });
        const deleteButton = createElement("button", "delete-button", "Удалить");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", function () { deleteGame(game.id); });
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        row.appendChild(thumb);
        row.appendChild(text);
        row.appendChild(actions);
        container.appendChild(row);
    }
}

// Переключение между разделами без перезагрузки страницы.
function showPage(pageName) {
    const page = getElement("page-" + pageName);
    if (!page) return;
    currentPage = pageName;

    // Прячем все разделы, затем показываем один.
    for (let section of document.querySelectorAll(".page-section")) {
        section.hidden = true;
    }
    page.hidden = false;

    // Подсвечиваем активную кнопку меню.
    for (let button of document.querySelectorAll("[data-page]")) {
        if (button.classList.contains("nav-link")) {
            button.classList.toggle("active", button.dataset.page === pageName);
        }
    }
    const pageNames = {
        home: "Обзор", catalog: "Каталог игр", library: "Моя библиотека",
        favorites: "Избранное", stats: "Статистика", manage: "Управление", profile: "Мой профиль"
    };
    getElement("currentBreadcrumb").textContent = "Панель управления / " + pageNames[pageName];
    window.scrollTo(0, 0);
}

// ============================================================
// 5. ИЗМЕНЕНИЕ ЛИЧНОЙ БИБЛИОТЕКИ
// ============================================================

function changeStatus(id, newStatus) {
    if (!statusLabels[newStatus]) return;
    const game = findGame(id);
    if (!game) return;
    const info = getLibraryInfo(id);
    if (info.status === newStatus) return;
    info.status = newStatus;
    setLibraryInfo(id, info);
    addActivity(game.title + ": " + statusLabels[newStatus], "▣");
    refreshEverything();
    // Если окно этой игры открыто, обновляем подпись статуса в нём.
    const detailBox = getElement("detailsContent");
    if (getElement("detailsDialog").open && detailBox.dataset.gameId === String(id)) {
        const values = detailBox.querySelectorAll(".detail-info-item strong");
        if (values[5]) values[5].textContent = statusLabels[newStatus];
    }
    showToast("Статус игры изменён.");
}

function toggleFavorite(id) {
    const game = findGame(id);
    if (!game) return;
    const info = getLibraryInfo(id);
    info.favorite = !info.favorite;
    setLibraryInfo(id, info);
    addActivity(game.title + (info.favorite ? " добавлена в избранное" : " убрана из избранного"), "♥");
    refreshEverything();
    showToast(info.favorite ? "Игра добавлена в избранное." : "Игра убрана из избранного.");
}

function changeRating(id, score) {
    const game = findGame(id);
    if (!game) return;
    const info = getLibraryInfo(id);
    info.rating = score;
    setLibraryInfo(id, info);
    addActivity("Оценка для «" + game.title + "»: " + score + "/5", "★");
    refreshEverything();
    const values = getElement("detailsContent").querySelectorAll(".detail-info-item strong");
    if (values[4]) values[4].textContent = score + " из 5";
    showToast("Оценка сохранена.");

    // Обновляем звёзды в открытом окне, не стирая введённую заметку.
    for (let button of getElement("detailsContent").querySelectorAll(".rating-star")) {
        button.classList.toggle("active", Number(button.dataset.rating) <= score);
    }
}

// ============================================================
// 6. ОКНО С ПОДРОБНОСТЯМИ ИГРЫ
// ============================================================

function openDetails(id) {
    const game = findGame(id);
    if (!game) return;
    const info = getLibraryInfo(id);
    const container = getElement("detailsContent");
    container.dataset.gameId = String(id);
    container.replaceChildren();

    // Верхняя обложка и заголовок.
    const header = createElement("div", "details-cover");
    header.style.setProperty("--detail-color", game.color || "#555b89");
    const url = getCoverUrl(game);
    if (url) {
        const image = document.createElement("img");
        image.src = url;
        image.alt = ""; // Изображение декоративное: название уже есть ниже.
        image.addEventListener("error", function () { image.remove(); });
        header.appendChild(image);
    }
    const headerText = createElement("div", "details-header-text");
    headerText.appendChild(createElement("span", "eyebrow", "КАРТОЧКА ИГРЫ"));
    headerText.appendChild(createElement("h2", "", game.title));
    headerText.appendChild(createElement("p", "", game.genre + " · " + game.year));
    header.appendChild(headerText);
    container.appendChild(header);

    const body = createElement("div", "details-body");
    const facts = createElement("div", "detail-info-grid");
    const factsData = [
        ["ГОД ВЫХОДА", game.year],
        ["РАЗРАБОТЧИК", game.developer],
        ["ЖАНР", game.genre],
        ["ПЛАТФОРМЫ", game.platforms.join(", ")],
        ["МОЯ ОЦЕНКА", info.rating ? info.rating + " из 5" : "Не оценено"],
        ["МОЙ СТАТУС", statusLabels[info.status]]
    ];
    for (let item of factsData) {
        const cell = createElement("div", "detail-info-item");
        cell.appendChild(createElement("span", "", item[0]));
        cell.appendChild(createElement("strong", "", item[1]));
        facts.appendChild(cell);
    }
    body.appendChild(facts);
    body.appendChild(createElement("p", "detail-description", game.description));
    body.appendChild(createElement("div", "detail-divider"));
    body.appendChild(createElement("h3", "detail-section-title", "Моя библиотека"));

    // Статус: выпадающий список + отдельная кнопка «Избранное».
    const statusRow = createElement("div", "detail-status-row");
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Статус игры");
    for (let code in statusLabels) {
        select.appendChild(new Option(statusLabels[code], code));
    }
    select.value = info.status;
    select.addEventListener("change", function () {
        changeStatus(game.id, select.value);
    });
    const heart = createElement("button", "detail-heart" + (info.favorite ? " selected" : ""), info.favorite ? "♥ В избранном" : "♡ В избранное");
    heart.type = "button";
    heart.addEventListener("click", function () {
        toggleFavorite(game.id);
        const freshInfo = getLibraryInfo(game.id);
        heart.textContent = freshInfo.favorite ? "♥ В избранном" : "♡ В избранное";
        heart.classList.toggle("selected", freshInfo.favorite);
    });
    statusRow.appendChild(select);
    statusRow.appendChild(heart);
    body.appendChild(statusRow);

    body.appendChild(createElement("div", "detail-divider"));
    body.appendChild(createElement("h3", "detail-section-title", "Моя оценка"));
    const stars = createElement("div", "rating-row");
    for (let score = 1; score <= 5; score++) {
        const star = createElement("button", "rating-star" + (score <= info.rating ? " active" : ""), "★");
        star.type = "button";
        star.dataset.rating = score;
        star.title = "Оценить на " + score + " из 5";
        star.setAttribute("aria-label", star.title);
        star.addEventListener("click", function () { changeRating(game.id, score); });
        stars.appendChild(star);
    }
    body.appendChild(stars);

    body.appendChild(createElement("h3", "detail-section-title", "Личная заметка / мини-отзыв"));
    const note = document.createElement("textarea");
    note.className = "details-note";
    note.rows = 4;
    note.maxLength = 1500;
    note.placeholder = "Что запомнилось? Что понравилось в игре?";
    note.value = info.note;
    const noteBottom = createElement("div", "details-save");
    noteBottom.appendChild(createElement("span", "detail-note-hint", "Заметка видна только в твоём браузере"));
    const saveNote = createElement("button", "button button-primary", "Сохранить заметку");
    saveNote.type = "button";
    saveNote.addEventListener("click", function () {
        const updatedInfo = getLibraryInfo(game.id);
        updatedInfo.note = note.value.trim();
        setLibraryInfo(game.id, updatedInfo);
        addActivity("Сохранена заметка к «" + game.title + "»", "✎");
        refreshEverything();
        showToast("Заметка сохранена.");
    });
    noteBottom.appendChild(saveNote);
    body.appendChild(note);
    body.appendChild(noteBottom);
    container.appendChild(body);
    getElement("detailsDialog").showModal();
}

// ============================================================
// 7. ДОБАВЛЕНИЕ, РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ ИГР
// ============================================================

// Одно окно используется и для новой игры, и для редактирования.
function openGameForm(id) {
    getElement("gameForm").reset();
    getElement("editGameId").value = "";
    getElement("gameYear").value = new Date().getFullYear();
    getElement("formHeading").textContent = "Добавить игру";

    // Если передан id существующей игры — заполняем поля её данными.
    if (id !== undefined) {
        const game = findGame(id);
        if (!game) return;
        getElement("formHeading").textContent = "Редактировать игру";
        getElement("editGameId").value = game.id;
        getElement("gameTitle").value = game.title;
        getElement("gameGenre").value = game.genre;
        getElement("gameYear").value = game.year;
        getElement("gameDeveloper").value = game.developer;
        getElement("gamePlatforms").value = game.platforms.join(", ");
        getElement("gameDescription").value = game.description;
        getElement("gameSteamId").value = game.steamId || "";
        getElement("gameColor").value = game.color;
    }
    getElement("gameDialog").showModal();
}

function saveGameFromForm(event) {
    event.preventDefault(); // Без этого браузер перезагрузит страницу.

    const oldId = getElement("editGameId").value;
    const title = getElement("gameTitle").value.trim();
    const genre = getElement("gameGenre").value;
    const year = Number(getElement("gameYear").value);
    const developer = getElement("gameDeveloper").value.trim();
    const platformText = getElement("gamePlatforms").value;
    const description = getElement("gameDescription").value.trim();
    const steamIdText = getElement("gameSteamId").value.trim();
    const color = getElement("gameColor").value;

    // Проверяем данные пользователя перед сохранением.
    if (!title || !developer || !description || year < 1970 || year > 2035) {
        showToast("Заполни обязательные поля правильно.", true);
        return;
    }
    for (let game of games) {
        if (game.title.toLowerCase() === title.toLowerCase() && game.id !== Number(oldId)) {
            showToast("Игра с таким названием уже есть в каталоге.", true);
            return;
        }
    }

    // Превращаем строку "PC, Xbox" в массив ["PC", "Xbox"].
    let platforms = platformText.split(",");
    platforms = platforms.map(function (item) { return item.trim(); });
    platforms = platforms.filter(function (item) { return item !== ""; });
    if (platforms.length === 0) platforms = ["PC"];

    let id;
    if (oldId) {
        id = Number(oldId);
    } else {
        // Новый id всегда больше максимального существующего.
        id = 1;
        for (let game of games) {
            if (game.id >= id) id = game.id + 1;
        }
    }

    const gameData = {
        id: id, title: title, genre: genre, year: year,
        developer: developer, platforms: platforms,
        description: description,
        steamId: steamIdText ? Number(steamIdText) : null,
        color: color
    };

    if (oldId) {
        // Ищем игру и заменяем её обновлённым объектом.
        for (let i = 0; i < games.length; i++) {
            if (games[i].id === id) {
                games[i] = gameData;
                break;
            }
        }
        addActivity("Изменена игра «" + title + "»", "✎");
        showToast("Изменения сохранены.");
    } else {
        games.push(gameData);
        addActivity("Добавлена игра «" + title + "»", "+");
        showToast("Новая игра добавлена в каталог!");
    }

    saveData(GAMES_KEY, games);
    getElement("gameDialog").close();
    refreshEverything();
    showPage("manage");
}

function deleteGame(id) {
    const game = findGame(id);
    if (!game) return;
    const accepted = confirm("Удалить «" + game.title + "» из каталога? Данные о прохождении и оценке также удалятся.");
    if (!accepted) return;

    // filter оставляет только игры, у которых id не совпадает.
    games = games.filter(function (item) { return item.id !== game.id; });
    delete library[id];
    saveData(GAMES_KEY, games);
    saveData(LIBRARY_KEY, library);
    addActivity("Удалена игра «" + game.title + "»", "−");
    refreshEverything();
    showToast("Игра удалена.");
}

// ============================================================
// 8. ЭКСПОРТ, ИМПОРТ И СБРОС ДАННЫХ
// ============================================================

// Экспорт — делаем файл .json, который пользователь скачает.
function exportData() {
    const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        games: games,
        library: library,
        activities: activities
    };
    const text = JSON.stringify(backup, null, 2);
    const file = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gamevault-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("Резервная копия подготовлена.");
}

// Проверяем импортируемые записи: это защита от неправильного формата.
function validateImportedGames(importedGames) {
    if (!Array.isArray(importedGames) || importedGames.length > 300) return null;
    let checked = [];
    let usedIds = [];
    for (let game of importedGames) {
        if (!game || !Number.isSafeInteger(game.id) || game.id < 1 || usedIds.includes(game.id)) return null;
        if (typeof game.title !== "string" || game.title.length < 1 || game.title.length > 80) return null;
        if (typeof game.genre !== "string" || game.genre.length > 40) return null;
        if (!Number.isInteger(game.year) || game.year < 1970 || game.year > 2035) return null;
        if (typeof game.developer !== "string" || game.developer.length > 80) return null;
        if (typeof game.description !== "string" || game.description.length > 500) return null;
        if (!Array.isArray(game.platforms) || game.platforms.length > 10) return null;
        if (game.platforms.some(function (item) { return typeof item !== "string" || item.length > 30; })) return null;
        const coverId = game.steamId ? Number(game.steamId) : null;
        if (coverId !== null && (!Number.isInteger(coverId) || coverId < 1 || coverId > 99999999)) return null;
        const color = /^#[0-9a-fA-F]{6}$/.test(game.color) ? game.color : "#5651a8";
        checked.push({
            id: game.id, title: game.title, genre: game.genre, year: game.year,
            developer: game.developer, description: game.description,
            platforms: game.platforms, steamId: coverId, color: color
        });
        usedIds.push(game.id);
    }
    return checked;
}

// Импорт: пользователь выбирает JSON, мы читаем и проверяем его.
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast("Файл слишком большой (максимум 2 МБ).", true);
        event.target.value = "";
        return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", function () {
        try {
            const imported = JSON.parse(reader.result);
            const checkedGames = validateImportedGames(imported.games);
            if (!checkedGames || !imported.library || typeof imported.library !== "object" || Array.isArray(imported.library)) {
                throw new Error("Неверный формат файла");
            }

            const accepted = confirm("Импорт заменит текущий каталог и библиотеку. Продолжить?");
            if (!accepted) return;

            // Переносим только известные поля. Неиспользуемые поля игнорируем.
            let checkedLibrary = {};
            for (let game of checkedGames) {
                const item = imported.library[game.id];
                if (item && typeof item === "object") {
                    checkedLibrary[game.id] = {
                        status: statusLabels[item.status] ? item.status : "none",
                        favorite: item.favorite === true,
                        rating: Number.isInteger(item.rating) && item.rating >= 0 && item.rating <= 5 ? item.rating : 0,
                        note: typeof item.note === "string" ? item.note.slice(0, 1500) : ""
                    };
                }
            }
            games = checkedGames;
            library = checkedLibrary;
            activities = []; // Историю начинаем заново после импорта.
            saveData(GAMES_KEY, games);
            saveData(LIBRARY_KEY, library);
            addActivity("Загружена резервная копия", "↑");
            refreshEverything();
            showToast("Резервная копия импортирована.");
        } catch (error) {
            showToast("Не получилось импортировать JSON. Проверь файл.", true);
        }
        event.target.value = "";
    });
    reader.addEventListener("error", function () {
        showToast("Не удалось прочитать файл.", true);
        event.target.value = "";
    });
    reader.readAsText(file);
}

function resetData() {
    const accepted = confirm("Сбросить ВСЕ данные GameVault? Будут удалены добавленные игры, статусы, оценки и заметки. Отменить это действие нельзя.");
    if (!accepted) return;
    games = JSON.parse(JSON.stringify(startingGames));
    library = {};
    activities = [];
    saveData(GAMES_KEY, games);
    saveData(LIBRARY_KEY, library);
    saveData(ACTIVITY_KEY, activities);
    getElement("globalSearch").value = "";
    getElement("filterStatus").value = "all";
    getElement("filterGenre").value = "all";
    getElement("filterPlatform").value = "all";
    getElement("filterSort").value = "title";
    libraryTab = "all";
    catalogLimit = 12;
    refreshEverything();
    showToast("Каталог возвращён к исходному состоянию.");
}


// ============================================================
// 9. ВХОД, РЕГИСТРАЦИЯ И РЕДАКТИРОВАНИЕ ПРОФИЛЯ
// ============================================================

// Аккаунты в этой версии существуют ТОЛЬКО на этом устройстве.
// Для настоящей авторизации потребуются сервер и база данных.
const ACCOUNTS_KEY = "gamevault_accounts_v1";
const SESSION_KEY = "gamevault_session_v1";

// Массив с локальными аккаунтами: логин, имя, хеш пароля и профиль.
let accounts = readSavedData(ACCOUNTS_KEY, []);
if (!Array.isArray(accounts)) accounts = [];
let currentUser = null; // Пока человек не вошёл, активного профиля нет.

// Находим пользователя по логину. Сравниваем без учёта регистра.
function findAccount(username) {
    for (let account of accounts) {
        if (account.username === String(username).toLowerCase()) return account;
    }
    return null;
}

// Ключ для сохранения данных конкретного человека.
// Пример: gamevault_user_ivan_library_v1.
function accountDataKey(username, part) {
    return "gamevault_user_" + username + "_" + part + "_v1";
}

// Создаём случайную соль. Она нужна, чтобы одинаковые пароли
// разных пользователей не давали одинаковое значение хеша.
function makeSalt() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    let result = "";
    for (let byte of bytes) {
        result += byte.toString(16).padStart(2, "0");
    }
    return result;
}

// В localStorage не сохраняем сам пароль.
// Сохраняем его SHA-256-хеш с солью — это лучше открытого текста,
// но НЕ делает локальный сайт защищённой системой авторизации.
// crypto.subtle работает на HTTPS и через Live Server (localhost).
async function hashPassword(password, salt) {
    if (!window.crypto || !crypto.subtle) {
        throw new Error("Открой сайт через Live Server (localhost) или HTTPS.");
    }
    const text = new TextEncoder().encode(salt + ":" + password);
    const buffer = await crypto.subtle.digest("SHA-256", text);
    let result = "";
    for (let byte of new Uint8Array(buffer)) {
        result += byte.toString(16).padStart(2, "0");
    }
    return result;
}

// Показываем нужную форму: вход или создание профиля.
function switchAuthTab(mode) {
    const isRegister = mode === "register";
    getElement("loginForm").hidden = isRegister;
    getElement("registerForm").hidden = !isRegister;
    getElement("showLogin").classList.toggle("active", !isRegister);
    getElement("showRegister").classList.toggle("active", isRegister);
    getElement("showLogin").setAttribute("aria-pressed", String(!isRegister));
    getElement("showRegister").setAttribute("aria-pressed", String(isRegister));
    getElement("authHeading").textContent = isRegister ? "Создай свой профиль" : "С возвращением!";
    getElement("authDescription").textContent = isRegister
        ? "Придумай логин и пароль, чтобы вести свою коллекцию."
        : "Войди, чтобы продолжить собирать свою коллекцию.";
    getElement("authMessage").textContent = "";
}

// Если пользователь ещё не вошёл, показываем только экран входа.
function showAuthScreen() {
    currentUser = null;
    getElement("authScreen").hidden = false;
    document.querySelector(".app-layout").hidden = true;
    switchAuthTab("login");
}

// При первом создании профиля можно сохранить данные из
// предыдущей версии сайта, чтобы они не потерялись.
function moveOldDataToFirstAccount(username) {
    if (accounts.length !== 1) return;
    const oldKeys = ["gamevault_games_v2", "gamevault_library_v2", "gamevault_activity_v2"];
    const parts = ["games", "library", "activity"];
    for (let i = 0; i < oldKeys.length; i++) {
        const value = localStorage.getItem(oldKeys[i]);
        if (value !== null) {
            localStorage.setItem(accountDataKey(username, parts[i]), value);
        }
    }
    // Статусы из самой первой версии сайта (если ещё остались).
    if (localStorage.getItem(accountDataKey(username, "library")) === null) {
        const oldStatuses = readSavedData("gameVaultStatuses", {});
        let converted = {};
        const names = {"Хочу пройти": "wishlist", "Прохожу": "playing", "Пройдена": "completed"};
        for (let id in oldStatuses) {
            if (names[oldStatuses[id]]) converted[id] = {status: names[oldStatuses[id]], favorite: false, rating: 0, note: ""};
        }
        if (Object.keys(converted).length > 0) {
            localStorage.setItem(accountDataKey(username, "library"), JSON.stringify(converted));
        }
    }
}

// Загружаем отдельную коллекцию выбранного аккаунта.
function loadAccountData(account) {
    GAMES_KEY = accountDataKey(account.username, "games");
    LIBRARY_KEY = accountDataKey(account.username, "library");
    ACTIVITY_KEY = accountDataKey(account.username, "activity");

    games = readSavedData(GAMES_KEY, JSON.parse(JSON.stringify(startingGames)));
    library = readSavedData(LIBRARY_KEY, {});
    activities = readSavedData(ACTIVITY_KEY, []);

    if (!Array.isArray(games)) games = JSON.parse(JSON.stringify(startingGames));
    if (!library || typeof library !== "object" || Array.isArray(library)) library = {};
    if (!Array.isArray(activities)) activities = [];
}

// Запоминаем вход, скрываем форму и обновляем страницы сайта.
function enterAccount(account) {
    currentUser = account;
    localStorage.setItem(SESSION_KEY, account.username);
    loadAccountData(account);
    getElement("authScreen").hidden = true;
    document.querySelector(".app-layout").hidden = false;
    getElement("loginPassword").value = "";
    getElement("registerForm").reset();
    getElement("globalSearch").value = "";
    getElement("filterGenre").value = "all";
    getElement("filterPlatform").value = "all";
    getElement("filterStatus").value = "all";
    getElement("filterSort").value = "title";
    libraryTab = "all";
    catalogLimit = 12;
    refreshEverything();
    showPage("home");
}

// Создание профиля после нажатия кнопки в форме регистрации.
async function registerAccount(event) {
    event.preventDefault(); // Не перезагружаем страницу.
    const username = getElement("registerUsername").value.trim().toLowerCase();
    const displayName = getElement("registerName").value.trim();
    const password = getElement("registerPassword").value;
    const repeat = getElement("registerRepeat").value;
    const message = getElement("authMessage");

    // Только буквы, цифры и подчёркивание. Пробелы запрещены.
    if (!/^[\p{L}0-9_]{3,20}$/u.test(username)) {
        message.textContent = "Логин: 3–20 символов, только буквы, цифры и _.";
        return;
    }
    if (displayName.length < 2 || displayName.length > 30) {
        message.textContent = "Имя должно содержать от 2 до 30 символов.";
        return;
    }
    if (findAccount(username)) {
        message.textContent = "Такой логин уже занят. Придумай другой.";
        return;
    }
    if (password.length < 8) {
        message.textContent = "Пароль должен содержать минимум 8 символов.";
        return;
    }
    if (password !== repeat) {
        message.textContent = "Пароли не совпадают.";
        return;
    }

    try {
        const salt = makeSalt();
        const hash = await hashPassword(password, salt);
        const newAccount = {
            username: username,
            displayName: displayName,
            passwordHash: hash,
            salt: salt,
            bio: "",
            avatarColor: "#8064d8",
            createdAt: new Date().toISOString()
        };
        accounts.push(newAccount);
        if (!saveData(ACCOUNTS_KEY, accounts)) {
            accounts.pop();
            message.textContent = "Не удалось сохранить профиль.";
            return;
        }
        moveOldDataToFirstAccount(username);
        enterAccount(newAccount);
        showToast("Профиль создан. Добро пожаловать в GameVault!");
    } catch (error) {
        message.textContent = error.message || "Не удалось создать профиль.";
    }
}

// Вход: сравниваем введённый пароль с сохранённым хешем.
async function loginAccount(event) {
    event.preventDefault();
    const username = getElement("loginUsername").value.trim().toLowerCase();
    const password = getElement("loginPassword").value;
    const message = getElement("authMessage");
    const account = findAccount(username);
    if (!account) {
        message.textContent = "Неверный логин или пароль.";
        return;
    }
    try {
        const hash = await hashPassword(password, account.salt);
        if (hash !== account.passwordHash) {
            message.textContent = "Неверный логин или пароль.";
            return;
        }
        enterAccount(account);
        showToast("С возвращением, " + account.displayName + "!");
    } catch (error) {
        message.textContent = error.message || "Не удалось войти.";
    }
}

// Две первые буквы имени показываются в круглой иконке.
function getInitials(name) {
    return name.trim().slice(0, 2).toUpperCase();
}

// Обновляем личный кабинет и маленький аватар в верхнем меню.
function renderProfile() {
    if (!currentUser) return;
    getElement("profileButton").textContent = getInitials(currentUser.displayName);
    getElement("profileButton").style.background = currentUser.avatarColor;
    getElement("profileBigAvatar").textContent = getInitials(currentUser.displayName);
    getElement("profileBigAvatar").style.background = currentUser.avatarColor;
    getElement("profileDisplayName").textContent = currentUser.displayName;
    getElement("profileUsername").textContent = "@" + currentUser.username;
    getElement("profileJoined").textContent = "С GameVault с " + shortDate(currentUser.createdAt);
    getElement("profileNameInput").value = currentUser.displayName;
    getElement("profileBioInput").value = currentUser.bio || "";
    getElement("profileAvatarColor").value = currentUser.avatarColor || "#8064d8";

    const stats = calculateStats();
    getElement("profileGamesCount").textContent = stats.myGames;
    getElement("profileCompletedCount").textContent = stats.completed;
    getElement("profileFavoriteCount").textContent = stats.favorites;
}

// Сохраняем изменения в профиле, не трогая игры и оценки.
function saveProfile(event) {
    event.preventDefault();
    if (!currentUser) return;
    const name = getElement("profileNameInput").value.trim();
    if (name.length < 2 || name.length > 30) {
        showToast("Имя должно содержать от 2 до 30 символов.", true);
        return;
    }
    currentUser.displayName = name;
    currentUser.bio = getElement("profileBioInput").value.trim().slice(0, 250);
    currentUser.avatarColor = getElement("profileAvatarColor").value;
    saveData(ACCOUNTS_KEY, accounts);
    renderProfile();
    showToast("Изменения в профиле сохранены.");
}

// Выходим, но не удаляем сохранённую библиотеку пользователя.
function logoutAccount() {
    localStorage.removeItem(SESSION_KEY);
    for (let dialog of document.querySelectorAll("dialog")) {
        if (dialog.open) dialog.close();
    }
    getElement("loginForm").reset();
    showAuthScreen();
}


// ============================================================
// 10. НАСТРАИВАЕМ КНОПКИ И ЗАПУСКАЕМ САЙТ
// ============================================================

// Все кнопки с data-page открывают соответствующий раздел.
// Например, data-page="catalog" открывает страницу каталога.
for (let button of document.querySelectorAll("[data-page]")) {
    button.addEventListener("click", function () {
        showPage(button.dataset.page);
    });
}

// Логотип (сбоку и на телефоне) возвращает пользователя на обзор.
getElement("brandHome").addEventListener("click", function () { showPage("home"); });
getElement("mobileBrandHome").addEventListener("click", function () { showPage("home"); });

// Аватар в верхней части сайта открывает страницу профиля.
getElement("profileButton").addEventListener("click", function () { showPage("profile"); });

// Переключение между входом и регистрацией.
getElement("showLogin").addEventListener("click", function () { switchAuthTab("login"); });
getElement("showRegister").addEventListener("click", function () { switchAuthTab("register"); });
getElement("registerForm").addEventListener("submit", registerAccount);
getElement("loginForm").addEventListener("submit", loginAccount);
getElement("profileForm").addEventListener("submit", saveProfile);
getElement("profileLogout").addEventListener("click", logoutAccount);

// Поиск в верхнем меню сразу открывает каталог.
getElement("globalSearch").addEventListener("input", function () {
    catalogLimit = 12;
    renderCatalog();
    if (currentPage !== "catalog") showPage("catalog");
});

// Фильтры каталога.
for (let id of ["filterGenre", "filterPlatform", "filterStatus", "filterSort"]) {
    getElement(id).addEventListener("change", function () {
        catalogLimit = 12;
        renderCatalog();
    });
}
getElement("clearFilters").addEventListener("click", function () {
    getElement("globalSearch").value = "";
    getElement("filterGenre").value = "all";
    getElement("filterPlatform").value = "all";
    getElement("filterStatus").value = "all";
    getElement("filterGenre").value = "all";
    getElement("filterPlatform").value = "all";
    getElement("filterSort").value = "title";
    catalogLimit = 12;
    renderCatalog();
});
getElement("loadMore").addEventListener("click", function () {
    catalogLimit += 12; // Показываем следующие 12 карточек.
    renderCatalog();
});

// Кнопки-вкладки личной библиотеки.
for (let button of document.querySelectorAll("#libraryTabs button")) {
    button.addEventListener("click", function () {
        libraryTab = button.dataset.status;
        for (let other of document.querySelectorAll("#libraryTabs button")) {
            other.classList.toggle("active", other === button);
        }
        renderLibrary();
    });
}

// Кнопки для открытия формы создания новой игры.
for (let id of ["topAddGame", "sideAddGame", "manageAddGame"]) {
    getElement(id).addEventListener("click", function () { openGameForm(); });
}
getElement("gameForm").addEventListener("submit", saveGameFromForm);
getElement("closeGameForm").addEventListener("click", function () { getElement("gameDialog").close(); });
getElement("cancelGameForm").addEventListener("click", function () { getElement("gameDialog").close(); });
getElement("closeDetails").addEventListener("click", function () { getElement("detailsDialog").close(); });

// Клик по полупрозрачному фону вокруг модального окна закрывает его.
for (let dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
    });
}

// Отдельная кнопка на главной для Hollow Knight.
getElement("featuredDetails").addEventListener("click", function () {
    if (findGame(featuredGameId)) openDetails(featuredGameId);
    else showPage("catalog");
});

// Управление резервными копиями.
getElement("exportData").addEventListener("click", exportData);
getElement("importData").addEventListener("click", function () { getElement("importFile").click(); });
getElement("importFile").addEventListener("change", importData);
getElement("resetData").addEventListener("click", resetData);

// Дополнение: клавиша / ставит курсор в поиск, Escape — убирает.
document.addEventListener("keydown", function (event) {
    const tag = document.activeElement.tagName;
    if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && !getElement("gameDialog").open && !getElement("detailsDialog").open) {
        event.preventDefault();
        getElement("globalSearch").focus();
    }
    if (event.key === "Escape" && document.activeElement === getElement("globalSearch")) {
        getElement("globalSearch").blur();
    }
});

// Если пользователь уже входил, восстановим его сессию.
// Иначе покажем экран входа/регистрации.
const savedLogin = localStorage.getItem(SESSION_KEY);
const savedAccount = savedLogin ? findAccount(savedLogin) : null;
if (savedAccount) {
    enterAccount(savedAccount);
} else {
    showAuthScreen();
}
