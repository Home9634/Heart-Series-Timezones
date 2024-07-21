const originalTimezoneData = [
    { name: "Juizxe", timezone: "AEST", offset: 10 },
    { name: "Killer", timezone: "BST", offset: 1 },
    { name: "Home", timezone: "SGT", offset: 8 },
    { name: "Pixi", timezone: "CET", offset: 2 },
    { name: "Invalid", timezone: "SGT", offset: 8 },
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
    { name: "H", timezone: "CST", offset: -5 },
    { name: "Whib", timezone: "PST", offset: -7 },

];

let timezoneData = [];

const timezoneList = document.getElementById('timezoneList');

let updateInterval;
let isDragging = false;
let frozenTime = null;

function initializeData() {
    const storedData = JSON.parse(localStorage.getItem('timezoneData'));
    
    if (storedData && areDataSetsEquivalent(originalTimezoneData, storedData)) {
        timezoneData = storedData;
    } else {
        timezoneData = [...originalTimezoneData];
        localStorage.setItem('timezoneData', JSON.stringify(timezoneData));
    }
}

function areDataSetsEquivalent(set1, set2) {
    if (set1.length !== set2.length) return false;
    
    const sortedSet1 = set1.slice().sort((a, b) => a.name.localeCompare(b.name));
    const sortedSet2 = set2.slice().sort((a, b) => a.name.localeCompare(b.name));
    
    return sortedSet1.every((item, index) => 
        item.name === sortedSet2[index].name &&
        item.timezone === sortedSet2[index].timezone &&
        item.offset === sortedSet2[index].offset
    );
}

function updateTimes(baseTime = new Date()) {
    timezoneList.innerHTML = '';
    const now = new Date();
    timezoneData.forEach(item => {
        const li = document.createElement('li');
        const utc = baseTime.getTime() + (baseTime.getTimezoneOffset() * 60000);
        const localTime = new Date(utc + (3600000 * item.offset));
        
        const timeString = localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dayIndicator = getDayIndicator(now, localTime);
        
        li.innerHTML = `
            <span class="name">${item.name}</span>
            <span class="time">${timeString} <span class="day-indicator">${dayIndicator}</span></span>
            <span class="timezone">${item.timezone} - GMT${item.offset >= 0 ? '+' : ''}${item.offset}</span>
        `;
        timezoneList.appendChild(li);
    });
}

function getDayIndicator(baseTime, localTime) {
    const dayDiff = localTime.getDate() - baseTime.getDate();
    if (dayDiff === 1 || (dayDiff === -30 && baseTime.getDate() === 31)) return '(tomorrow)';
    if (dayDiff === -1 || (dayDiff === 30 && baseTime.getDate() === 1)) return '(yesterday)';
    return '';
}

function updateTimesFromUserInput() {
    const userTimeInput = document.getElementById('userTime');
    const userTime = new Date(userTimeInput.value);
    if (isNaN(userTime.getTime())) {
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
    localStorage.setItem('timezoneData', JSON.stringify(timezoneData));
    updateTimes();
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
        localStorage.setItem('timezoneData', JSON.stringify(timezoneData));
        updateTimes(frozenTime || new Date());
    }
});