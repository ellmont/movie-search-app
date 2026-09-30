// ========================================
// TMDB CONFIGURATION
// ========================================

const API_KEY = "1e40a235a7cda17f781e6de62766e031";

const API_BASE_URL = "https://api.themoviedb.org/3";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";


// ========================================
// STATE
// ========================================

let currentPage = 1;
let totalPages = 1;

let currentQuery = "";

let currentMovies = [];

let currentSection = "discover";

let favorites = [];

try {
    favorites =
        JSON.parse(
            localStorage.getItem("movieFavorites")
        ) || [];
} catch (error) {
    favorites = [];
}


// ========================================
// DOM ELEMENTS
// ========================================

const movieGrid = document.getElementById("movieGrid");

const searchForm = document.getElementById("searchForm");

const searchInput = document.getElementById("searchInput");

const loading = document.getElementById("loading");

const errorMessage = document.getElementById("errorMessage");

const errorText = document.getElementById("errorText");

const emptyMessage = document.getElementById("emptyMessage");

const loadMoreWrapper =
    document.getElementById("loadMoreWrapper");

const loadMore =
    document.getElementById("loadMore");

const sectionTitle =
    document.getElementById("sectionTitle");

const sectionLabel =
    document.getElementById("sectionLabel");

const clearSearch =
    document.getElementById("clearSearch");

const movieModal =
    document.getElementById("movieModal");

const modalBody =
    document.getElementById("modalBody");

const modalClose =
    document.getElementById("modalClose");

const modalOverlay =
    document.getElementById("modalOverlay");

const toast =
    document.getElementById("toast");

const navButtons =
    document.querySelectorAll(".nav-btn");


// ========================================
// INITIALIZE
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    if (
        !API_KEY ||
        API_KEY === "MASUKKAN_TMDB_API_KEY_KAMU"
    ) {
        showError(
            "Masukkan TMDB API key kamu di file script.js terlebih dahulu."
        );

        return;
    }

    loadPopularMovies();
});


// ========================================
// API REQUEST
// ========================================

async function apiRequest(endpoint) {

    const separator =
        endpoint.includes("?") ? "&" : "?";

    const url =
        `${API_BASE_URL}${endpoint}${separator}` +
        `api_key=${API_KEY}&language=en-US`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `API request failed: ${response.status}`
        );
    }

    return await response.json();
}


// ========================================
// POPULAR MOVIES
// ========================================

async function loadPopularMovies(page = 1) {

    currentSection = "discover";

    if (page === 1) {
        showLoading();
        movieGrid.innerHTML = "";
    }

    try {

        const data = await apiRequest(
            `/movie/popular?page=${page}`
        );

        currentPage = data.page;
        totalPages = data.total_pages;

        if (page === 1) {
            currentMovies = data.results;
        } else {
            currentMovies = [
                ...currentMovies,
                ...data.results
            ];
        }

        renderMovies(
            page === 1 ? data.results : currentMovies
        );

        sectionLabel.textContent = "DISCOVER";
        sectionTitle.textContent = "Popular Movies";

        clearSearch.classList.add("hidden");

        hideLoading();
        hideMessages();

        updateLoadMore();

    } catch (error) {

        console.error(error);

        hideLoading();

        showError(
            "Unable to load popular movies. Check your API key or internet connection."
        );
    }
}


// ========================================
// SEARCH MOVIES
// ========================================

async function searchMovies(query, page = 1) {

    if (!query.trim()) {        currentQuery = "";

        searchInput.value = "";

        loadPopularMovies();

        return;
    }

    currentQuery = query.trim();

    currentSection = "search";

    // Reset the empty-state text that
    // renderFavorites() may have replaced
    document.querySelector(
        "#emptyMessage h3"
    ).textContent = "No movies found";

    document.querySelector(
        "#emptyMessage p"
    ).textContent =
        "Try searching with another movie title.";

    hideMessages();

    if (page === 1) {
        showLoading();
        movieGrid.innerHTML = "";
    }

    try {

        const data = await apiRequest(
            `/search/movie?query=${encodeURIComponent(
                currentQuery
            )}&page=${page}`
        );

        currentPage = data.page;
        totalPages = data.total_pages;

        if (page === 1) {
            currentMovies = data.results;
        } else {
            currentMovies = [
                ...currentMovies,
                ...data.results
            ];
        }

        sectionLabel.textContent = "SEARCH RESULT";

        sectionTitle.textContent =
            `Results for "${currentQuery}"`;

        clearSearch.classList.remove("hidden");

        hideLoading();
        hideMessages();

        if (data.results.length === 0) {

            showEmpty();

            loadMoreWrapper.classList.add("hidden");

            return;
        }

        renderMovies(
            page === 1 ? data.results : currentMovies
        );

        updateLoadMore();

    } catch (error) {

        console.error(error);

        hideLoading();

        showError(
            "Unable to search movies. Please try again."
        );
    }
}


// ========================================
// RENDER MOVIES
// ========================================

function renderMovies(movies) {

    const scrollTop = window.scrollY;

    movieGrid.innerHTML = "";

    movies.forEach(movie => {

        const card = createMovieCard(movie);

        movieGrid.appendChild(card);

    });

    window.scrollTo({ top: scrollTop });
}


// ========================================
// CREATE MOVIE CARD
// ========================================

function createMovieCard(movie) {

    const card = document.createElement("article");

    card.className = "movie-card";

    const poster = movie.poster_path
        ? `${IMAGE_BASE_URL}${movie.poster_path}`
        : createPlaceholder(movie.title);

    const year = movie.release_date
        ? movie.release_date.substring(0, 4)
        : "N/A";

    const rating =
        movie.vote_average
            ? movie.vote_average.toFixed(1)
            : "N/A";

    const isFavorite =
        favorites.some(item => item.id === movie.id);

    card.innerHTML = `

        <div class="poster-wrapper">

            <img
                class="poster"
                src="${poster}"
                alt="${escapeHTML(movie.title)}"
                loading="lazy"
            >

            <button
                class="favorite-btn ${isFavorite ? "active" : ""}"
                data-id="${movie.id}"
                title="Add to favorites"
            >
                ${isFavorite ? "♥" : "♡"}
            </button>

            <div class="rating">
                <span>★</span>
                ${rating}
            </div>

        </div>

        <div class="movie-info">

            <h3 class="movie-title">
                ${escapeHTML(movie.title)}
            </h3>

            <p class="movie-year">
                ${year}
            </p>

        </div>
    `;


    // Open detail
    card.addEventListener("click", event => {

        if (
            event.target.closest(".favorite-btn")
        ) {
            return;
        }

        openMovieDetails(movie.id);

    });


    // Favorite
    const favoriteButton =
        card.querySelector(".favorite-btn");

    favoriteButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            toggleFavorite(movie);

        }
    );


    return card;
}


// ========================================
// MOVIE DETAILS
// ========================================

async function openMovieDetails(movieId) {

    movieModal.classList.remove("hidden");

    document.body.style.overflow = "hidden";

    modalBody.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading movie details...</p>
        </div>
    `;

    try {

        const movie = await apiRequest(
            `/movie/${movieId}`
        );

        renderMovieDetails(movie);

    } catch (error) {

        console.error(error);

        modalBody.innerHTML = `
            <div class="message">
                <div class="message-icon">😕</div>
                <h3>Unable to load movie</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}


// ========================================
// RENDER DETAILS
// ========================================

function renderMovieDetails(movie) {

    const poster = movie.poster_path
        ? `${IMAGE_BASE_URL}${movie.poster_path}`
        : createPlaceholder(movie.title);

    const releaseYear = movie.release_date
        ? movie.release_date.substring(0, 4)
        : "N/A";

    const runtime = movie.runtime
        ? `${Math.floor(movie.runtime / 60)}h ${
            movie.runtime % 60
        }m`
        : "N/A";

    const genres = movie.genres || [];

    modalBody.innerHTML = `

        <div class="modal-movie">

            <img
                class="modal-poster"
                src="${poster}"
                alt="${escapeHTML(movie.title)}"
            >

            <div class="modal-info">

                <h2 class="modal-title">
                    ${escapeHTML(movie.title)}
                </h2>

                <div class="modal-meta">

                    <span>
                        ${releaseYear}
                    </span>

                    <span>•</span>

                    <span>
                        ${runtime}
                    </span>

                    <span>•</span>

                    <span class="modal-rating">
                        ★ ${movie.vote_average
                            ? movie.vote_average.toFixed(1)
                            : "N/A"}
                    </span>

                </div>

                <p class="modal-overview">
                    ${escapeHTML(
                        movie.overview ||
                        "No overview available."
                    )}
                </p>

                <div class="genre-list">

                    ${genres.map(
                        genre => `
                            <span class="genre">
                                ${escapeHTML(genre.name)}
                            </span>
                        `
                    ).join("")}

                </div>

            </div>

        </div>
    `;
}


// ========================================
// FAVORITES
// ========================================

function toggleFavorite(movie) {

    const existingIndex =
        favorites.findIndex(
            item => item.id === movie.id
        );

    if (existingIndex !== -1) {

        favorites.splice(existingIndex, 1);

        showToast(
            `${movie.title} removed from favorites`
        );

    } else {

        favorites.push({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average
        });

        showToast(
            `${movie.title} added to favorites ❤️`
        );
    }

    localStorage.setItem(
        "movieFavorites",
        JSON.stringify(favorites)
    );

    if (currentSection === "favorites") {

        renderFavorites();

    } else {

        renderMovies(currentMovies);

    }
}


// ========================================
// FAVORITES PAGE
// ========================================

function renderFavorites() {

    currentSection = "favorites";

    sectionLabel.textContent = "YOUR COLLECTION";

    sectionTitle.textContent = "Favorite Movies";

    clearSearch.classList.add("hidden");

    hideMessages();

    movieGrid.innerHTML = "";

    loadMoreWrapper.classList.add("hidden");

    if (favorites.length === 0) {

        document.querySelector(
            "#emptyMessage h3"
        ).textContent = "No favorites yet";

        document.querySelector(
            "#emptyMessage p"
        ).textContent =
            "Click the heart icon on a movie to save it here.";

        showEmpty();

        return;
    }

    renderMovies(favorites);
}


// ========================================
// SEARCH FORM
// ========================================

searchForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const query =
            searchInput.value.trim();

        if (!query) {
            return;
        }

        currentPage = 1;

        searchMovies(query, 1);

    }
);


// ========================================
// CLEAR SEARCH
// ========================================

clearSearch.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        currentQuery = "";

        currentPage = 1;

        loadPopularMovies();

    }
);


// ========================================
// LOAD MORE
// ========================================

loadMore.addEventListener(
    "click",
    () => {

        if (
            currentPage >= totalPages
        ) {
            return;
        }

        const nextPage =
            currentPage + 1;

        if (currentSection === "search") {

            searchMovies(
                currentQuery,
                nextPage
            );

        } else {

            loadPopularMovies(nextPage);

        }
    }
);


// ========================================
// NAVIGATION
// ========================================

navButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            navButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            const section =
                button.dataset.section;

            if (section === "favorites") {

                renderFavorites();

            } else {

                currentPage = 1;

                loadPopularMovies();

            }

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );
});


// ========================================
// MODAL
// ========================================

function closeModal() {

    movieModal.classList.add("hidden");

    document.body.style.overflow = "";

}

modalClose.addEventListener(
    "click",
    closeModal
);

modalOverlay.addEventListener(
    "click",
    closeModal
);

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            !movieModal.classList.contains("hidden")
        ) {
            closeModal();
        }

    }
);


// ========================================
// UI HELPERS
// ========================================

function showLoading() {

    loading.classList.remove("hidden");

    errorMessage.classList.add("hidden");

    emptyMessage.classList.add("hidden");

    loadMoreWrapper.classList.add("hidden");
}


function hideLoading() {

    loading.classList.add("hidden");

}


function hideMessages() {

    errorMessage.classList.add("hidden");

    emptyMessage.classList.add("hidden");

}


function showError(message) {

    errorMessage.classList.remove("hidden");

    errorText.textContent = message;

    emptyMessage.classList.add("hidden");

    movieGrid.innerHTML = "";

    loadMoreWrapper.classList.add("hidden");
}


function showEmpty() {

    emptyMessage.classList.remove("hidden");

    errorMessage.classList.add("hidden");

    movieGrid.innerHTML = "";

}


function updateLoadMore() {

    if (
        currentPage < totalPages &&
        currentMovies.length > 0
    ) {

        loadMoreWrapper.classList.remove(
            "hidden"
        );

    } else {

        loadMoreWrapper.classList.add(
            "hidden"
        );
    }
}


function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);
}


// ========================================
// PLACEHOLDER
// ========================================

function createPlaceholder(title) {

    return `https://placehold.co/500x750/18181b/ffffff?text=${encodeURIComponent(
        title || "No Poster"
    )}`;
}


// ========================================
// HTML ESCAPE
// ========================================

function escapeHTML(value) {

    if (!value) {
        return "";
    }

    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}