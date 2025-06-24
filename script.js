const quotes = [
    { text: "History is written by the victors.", author: "Winston Churchill" },
    { text: "Those who do not learn history are doomed to repeat it.", author: "George Santayana" },
    { text: "History will be kind to me for I intend to write it.", author: "Winston Churchill" },
    { text: "The more you know about the past, the better prepared you are for the future.", author: "Theodore Roosevelt" },
    "We are not makers of history. We are made by history. — Martin Luther King Jr."
];

function setDailyQuote() {
    const el = document.getElementById("dailyQuote");
    if (!el) return;
    const today = new Date().getDate();
     const quote = Array.isArray(quotes) && quotes.length
        ? quotes[today % quotes.length]
        : "";
    el.innerText = quote || "";
    }


document.addEventListener("DOMContentLoaded", setDailyQuote);

function checkSession() {
    if (typeof updateLoginUI === 'function') {
        updateLoginUI();
    }
}

document.addEventListener('DOMContentLoaded', checkSession);


// Simple slideshow functionality for the home page with fade effect
function initSlideshow() {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    if (!slides.length) return;
    let index = 0;

    slides.forEach((s, i) => {
        s.classList.toggle('active', i === 0);
    });

    function show(n) {
        slides[index].classList.remove('active');
        index = (n + slides.length) % slides.length;
        slides[index].classList.add('active');
    }

    
    setInterval(next, 5000);

    function next() { show(index + 1); }
    function prev() { show(index - 1); }

    let timer = setInterval(next, 5000);

    function reset() {
        clearInterval(timer);
        timer = setInterval(next, 5000);

    }

    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); reset(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); reset(); });
}

if (document.readyState !== 'loading') {
    initSlideshow();
} else {
    document.addEventListener('DOMContentLoaded', initSlideshow);
}

// Basic CSV row parser that respects quoted commas
function parseCSVRow(row) {
    row = row.trim();
    const cells = row.match(/("[^"]*"|[^,]+)/g) || [];
    return cells.map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
}

// Load a short list of upcoming assignments on the home page
async function loadUpcomingAssignments() {
    const list = document.getElementById('upcomingAssignments');
    if (!list) return;

    // clear any placeholder text while we fetch new data
    list.innerHTML = '';

    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRvXvy8Y8j4SKTGmgOTnuPNfKf2ZR0UThzEQ5LcUXw6HHtdvnY3JQdMxFmvyU0MjjF84O_i7hZ4Btf1/pub?output=csv';

    try {
        let text = '';
        try {
            const res = await fetch(sheetURL);
            if (!res.ok) throw new Error('Request failed');
            text = await res.text();
        } catch (_e) {
            // Fallback to local file when remote fetch fails (e.g. offline)
            const local = await fetch('assignments.csv');
            text = await local.text();
        }
        const rows = text.split('\n').slice(1);
        const now = new Date();
        const upcoming = [];

        rows.forEach(row => {
            const [title,, dueDate, dueTime] = parseCSVRow(row);
            if (title && dueDate && dueTime) {
                const time = dueTime.replace(/(am|pm)$/i, ' $1');
                let dt = new Date(`${dueDate} ${time}`);
                if (isNaN(dt)) dt = new Date(`${dueDate}T${time}`);
                if (!isNaN(dt) && dt > now) {
                    upcoming.push({ title, dt });
                }
            }
        });

        upcoming.sort((a,b) => a.dt - b.dt);
        list.innerHTML = '';
        const shown = upcoming.slice(0,3);
        if (!shown.length) {
            list.innerHTML = '<li>No upcoming assignments</li>';
        } else {
            shown.forEach(item => {
                const li = document.createElement('li');
                const date = item.dt.toLocaleDateString();
                const time = item.dt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
                li.textContent = `${item.title} - Due ${date} ${time}`;
                list.appendChild(li);
            });
        }
    } catch (e) {
        console.error('loadUpcomingAssignments failed', e);
        list.innerHTML = '<li>Error loading assignments</li>';
    }
}

document.addEventListener('DOMContentLoaded', loadUpcomingAssignments);