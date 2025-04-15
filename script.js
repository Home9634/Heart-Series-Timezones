// script.js

// API endpoint
const API_URL = 'https://api.homespi.org/rng-api/api/hearters';
// New localStorage key for user order preference
const STORAGE_KEY = 'apiTimezoneUserDataOrder';

// Store the raw data fetched from API, unsorted initially
let rawApiData = [];
// This will hold the data, potentially reordered based on localStorage
let timezoneData = [];
// This will hold the currently displayed data (after filtering)
let filteredTimezoneData = [];

const timezoneList = document.getElementById('timezoneList');
const searchInput = document.getElementById('searchInput');
const userTimeInput = document.getElementById('userTime');

let updateInterval;
let isDragging = false;
let frozenTime = null;

/**
 * Fetches data from the API and transforms it.
 */
async function fetchApiData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const apiResult = await response.json();

        // Transform API data to the structure we need
        // Use userId if name is null
        // Ensure timezone is a number
        return apiResult
            .map(item => ({
                userId: item.userId,
                name: item.name || item.userId, // Use userId if name is null
                offset: typeof item.timezone === 'number' ? item.timezone : 0, // Default offset to 0 if invalid
            }))
            .filter(item => item.userId); // Ensure basic validity

    } catch (error) {
        console.error("Failed to fetch timezone data:", error);
        alert("Error fetching user data from the API. Please try again later.");
        return []; // Return empty array on error
    }
}

/**
 * Saves the current order of user IDs to localStorage.
 */
function saveUserOrder() {
    try {
        const currentOrder = timezoneData.map(item => item.userId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOrder));
    } catch (error) {
        console.error("Failed to save user order to localStorage:", error);
    }
}

/**
 * Initializes data: fetches from API, loads order from localStorage, merges.
 */
async function initializeData() {
    rawApiData = await fetchApiData();
    if (!rawApiData || rawApiData.length === 0) {
        console.warn("No data loaded from API.");
        timezoneData = [];
        filteredTimezoneData = [];
        updateTimes(); // Update display to show empty state or error
        return;
    }

    let storedOrder = [];
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            storedOrder = JSON.parse(storedData);
        }
    } catch (error) {
        console.error("Failed to load or parse stored order:", error);
        localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
    }


    // Create a map for quick lookup of API data by userId
    const apiDataMap = new Map(rawApiData.map(item => [item.userId, item]));

    // Reconstruct timezoneData based on stored order
    const orderedData = [];
    const seenUserIds = new Set();

    if (storedOrder.length > 0) {
        storedOrder.forEach(userId => {
            const userData = apiDataMap.get(userId);
            if (userData) { // Check if user still exists in API data
                orderedData.push(userData);
                seenUserIds.add(userId);
            }
        });
    }

    // Add any new users from the API that weren't in the stored order
    rawApiData.forEach(userData => {
        if (!seenUserIds.has(userData.userId)) {
            orderedData.push(userData);
        }
    });

    timezoneData = orderedData;
    filteredTimezoneData = [...timezoneData]; // Initialize filtered data

    saveUserOrder(); // Save the initial/merged order
    searchPeople(); // Apply any existing search term initially
    startUpdates(); // Start the time updates
}

/**
 * Updates the displayed list based on filteredTimezoneData.
 */
function updateTimes(baseTime = moment()) {
    timezoneList.innerHTML = ''; // Clear existing list
    const now = moment(); // Reference time for day indicator

    if (filteredTimezoneData.length === 0) {
        timezoneList.innerHTML = '<li>No users match the filter or no data available.</li>';
        return;
    }

    filteredTimezoneData.forEach(item => {
        const li = document.createElement('li');
        li.dataset.userId = item.userId; // Add userId for potential future use

        // Calculate local time based on the offset
        // Ensure offset is treated as hours
        const localTime = moment(baseTime).utcOffset(item.offset * 60); // moment.utcOffset expects minutes

        const timeString = localTime.format('hh:mm:ss A');
        const dayIndicator = getDayIndicator(now, localTime);

        // Display GMT offset correctly
        const offsetString = `GMT${item.offset >= 0 ? '+' : ''}${item.offset}`;

        li.innerHTML = `
            <span class="name">${item.name}</span>
            <span class="time">${timeString} <span class="day-indicator">${dayIndicator}</span></span>
            <span class="timezone">${offsetString}</span>
        `;
        timezoneList.appendChild(li);
    });
}

/**
 * Filters the timezoneData based on the search input.
 */
function searchPeople() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    filteredTimezoneData = timezoneData.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.userId.toLowerCase().includes(searchTerm) // Also search by userId
    );
    // Re-render the list with the filtered data, using frozen time if set
    updateTimes(frozenTime || moment());
}

/**
 * Calculates if the localTime is yesterday, today, or tomorrow relative to baseTime.
 */
function getDayIndicator(baseTime, localTime) {
    // Use startOf('day') for reliable date comparison across DST changes etc.
    const baseDay = baseTime.clone().startOf('day');
    const localDay = localTime.clone().startOf('day');
    const dayDiff = localDay.diff(baseDay, 'days');

    if (dayDiff === 1) return '(tomorrow)';
    if (dayDiff === -1) return '(yesterday)';
    return ''; // Today
}

/**
 * Freezes the time display based on user input.
 */
function updateTimesFromUserInput() {
    const userTimeValue = userTimeInput.value;
    if (!userTimeValue) {
        alert('Please select a date and time.');
        return;
    }
    const userTime = moment(userTimeValue);
    if (!userTime.isValid()) {
        alert('The selected date and time is invalid.');
        return;
    }
    frozenTime = userTime;
    stopUpdates(); // Stop live updates
    updateTimes(userTime); // Update display to show the frozen time
}

/**
 * Resets the time display to live updates.
 */
function resetTimes() {
    frozenTime = null;
    userTimeInput.value = ''; // Clear the input field
    startUpdates(); // Resume live updates
}

/**
 * Resets the order to the default API order and clears localStorage preference.
 */
async function resetOrder() {
    console.log("Resetting order...");
    // Refetch the data to get the original API order
    rawApiData = await fetchApiData();
    timezoneData = [...rawApiData]; // Reset to fetched order
    localStorage.removeItem(STORAGE_KEY); // Clear the stored order preference
    saveUserOrder(); // Save the new default order (optional, but consistent)
    applySortAndFilter(); // Update display
    alert("Order has been reset to the default.");
}

/**
 * Sorts the data alphabetically by name.
 */
function sortAlphabetically() {
    timezoneData.sort((a, b) => a.name.localeCompare(b.name));
    saveUserOrder(); // Save the new order
    applySortAndFilter();
}

/**
 * Sorts the data by timezone offset, then alphabetically by name.
 */
function sortByTimezone() {
    timezoneData.sort((a, b) => {
        if (a.offset !== b.offset) {
            return a.offset - b.offset; // Sort by offset first (ascending)
        }
        return a.name.localeCompare(b.name); // Then by name
    });
    saveUserOrder(); // Save the new order
    applySortAndFilter();
}

/**
 * Helper function to apply current filter and update display.
 */
function applySortAndFilter() {
    searchPeople(); // This re-applies the filter and calls updateTimes
}

/**
 * Starts the interval timer for live time updates.
 */
function startUpdates() {
    stopUpdates(); // Ensure no duplicate intervals
    if (!frozenTime) { // Only update if time isn't frozen
        updateTimes(); // Initial update
        updateInterval = setInterval(() => {
            if (!isDragging && !frozenTime) {
                updateTimes();
            }
        }, 1000);
    } else {
        // If time is frozen, just ensure the display is correct once
        updateTimes(frozenTime);
    }
}

/**
 * Stops the interval timer.
 */
function stopUpdates() {
    clearInterval(updateInterval);
    updateInterval = null;
}

// --- Initialization ---

// Add event listener for search input
searchInput.addEventListener('input', searchPeople);

// Initialize SortableJS
new Sortable(timezoneList, {
    animation: 150,
    ghostClass: 'blue-background-class', // Optional: Define this class in CSS for visual feedback
    onStart: function() {
        isDragging = true;
        stopUpdates(); // Pause updates while dragging for performance/consistency
    },
    onEnd: function(evt) {
        isDragging = false;
        // Reorder the timezoneData array
        const movedItem = timezoneData.splice(evt.oldIndex, 1)[0];
        timezoneData.splice(evt.newIndex, 0, movedItem);
        // Save the new order and update display
        saveUserOrder();
        applySortAndFilter(); // Re-apply filter (if any) and update display
        startUpdates(); // Resume updates if not frozen
    }
});

// Wrap initialization in an async function to handle API fetch
(async () => {
    await initializeData();
    // Initial display update is handled within initializeData/startUpdates
})();