const originalTimezoneData = [
    { name: "Juizxe", timezone: "AEST", offset: 10 },
    { name: "Killer", timezone: "BST", offset: 1 },
    { name: "Home", timezone: "SGT", offset: 8 },
    { name: "Pixi", timezone: "CET", offset: 2 },
    { name: "Invalid", timezone: "EDT", offset: -4 },
    { name: "Parrot", timezone: "CET", offset: 2 },
    { name: "Book", timezone: "BST", offset: 1 },
    { name: "Helios", timezone: "CST", offset: -4 },
    { name: "Milo", timezone: "EST", offset: -5 },
    { name: "Malovent", timezone: "AEST", offset: 10 },
    { name: "Ailbhe", timezone: "EDT", offset: -4 },
    { name: "Tom", timezone: "BEST", offset: 1 },
    { name: "Satonix", timezone: "CET", offset: 2 },
    { name: "Moss", timezone: "CET", offset: 2 },
    { name: "Cave", timezone: "EDT", offset: -4 },
    { name: "Brother", timezone: "EST", offset: -5 },
    { name: "Hax", timezone: "EST", offset: -4 },
    { name: "Hbug", timezone: "CST", offset: -5 },
    { name: "Whib", timezone: "PST", offset: -7 },

];

let timezoneData = [];

const timezoneList = document.getElementById('timezoneList');

let updateInterval;
let isDragging = false;
let frozenTime = null;

function initializeData() {
    const storedData = JSON.parse(localStorage.getItem('timezoneData'));
    
    if (storedData) {
        timezoneData = storedData.map(item => {
            const originalItem = originalTimezoneData.find(original => original.name === item.name);
            return originalItem || item;
        });

        originalTimezoneData.forEach(item => {
            if (!timezoneData.some(stored => stored.name === item.name)) {
                timezoneData.push(item);
            }
        });
    } else {
        timezoneData = [...originalTimezoneData];
    }

    localStorage.setItem('timezoneData', JSON.stringify(timezoneData));
}

function updateTimes(baseTime = moment()) {
    timezoneList.innerHTML = '';
    const now = moment();
    timezoneData.forEach(item => {
        const li = document.createElement('li');
        const localTime = moment(baseTime).utcOffset(item.offset * 60);
        
        const timeString = localTime.format('hh:mm:ss A');
        const dayIndicator = getDayIndicator(now, localTime);
        
        li.innerHTML = `
            <span class="name">${item.name}</span>
            <span class="time">${timeString} <span class="day-indicator">${dayIndicator}</span></span>
            <span class="timezone">${item.timezone} GMT${item.offset >= 0 ? '+' : ''}${item.offset}</span>
        `;
        timezoneList.appendChild(li);
    });
}

function getDayIndicator(baseTime, localTime) {
    const dayDiff = localTime.date() - baseTime.date();
    if (dayDiff === 1 || (dayDiff === -30 && baseTime.date() === 31)) return '(tomorrow)';
    if (dayDiff === -1 || (dayDiff === 30 && baseTime.date() === 1)) return '(yesterday)';
    return '';
}

function updateTimesFromUserInput() {
    const userTimeInput = document.getElementById('userTime');
    const userTime = moment(userTimeInput.value);
    if (!userTime.isValid()) {
        alert('Please enter a valid date and time.');
        return;
    }
    frozenTime = userTime;
    stopUpdates();
    updateTimes(userTime);
}

function resetTimes() {
    frozenTime = null;
    startUpdates();
}

function resetOrder() {
    timezoneData = [...originalTimezoneData];
    saveAndUpdate();
}

function sortAlphabetically() {
    timezoneData.sort((a, b) => a.name.localeCompare(b.name));
    saveAndUpdate();
}

function sortByTimezone() {
    timezoneData.sort((a, b) => {
        if (a.offset !== b.offset) {
            return a.offset - b.offset;
        }
        return a.timezone.localeCompare(b.timezone);
    });
    saveAndUpdate();
}

function saveAndUpdate() {
    localStorage.setItem('timezoneData', JSON.stringify(timezoneData));
    updateTimes(frozenTime || moment());
}

function startUpdates() {
    updateTimes();
    updateInterval = setInterval(() => {
        if (!isDragging && !frozenTime) {
            updateTimes();
        }
    }, 1000);
}

function stopUpdates() {
    clearInterval(updateInterval);
}

// Initialize data and start updates
initializeData();
startUpdates();

// Make the list sortable
new Sortable(timezoneList, {
    animation: 150,
    ghostClass: 'blue-background-class',
    onStart: function() {
        isDragging = true;
    },
    onEnd: function(evt) {
        isDragging = false;
        const item = timezoneData.splice(evt.oldIndex, 1)[0];
        timezoneData.splice(evt.newIndex, 0, item);
        saveAndUpdate();
    }
});