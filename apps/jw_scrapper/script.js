
function getElementByXpath(xp) {
    return document.evaluate(
        xp,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
}

function hasDesiredColor(element, desiredColor) {
    const computedStyle = window.getComputedStyle(element);
    const elementColor = computedStyle.getPropertyValue('color').toLowerCase();
    return elementColor === desiredColor;
}

function removeSpecialTranslatedCharacters(string) {
    const specialCharacters = ['&nbsp;', '&#8211;', '&#45;'];
    console.log('string removeSpecialTranslatedCharacters => ', string);
    return string.replace(new RegExp(specialCharacters.join('|'), 'g'), ' ');
}

function removeHyperText(string) {
    console.log('string removeHyperText => ', string);
    return string.replace(/<[^>]*>?/g, '');
}

function getYear() {
    const regexPattern = /(\d+)-mwb/;

    // Use the regex pattern to find the match in the URL
    const match = window.location.href.match(regexPattern);
    return match[1]
}

function getISOWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Months in Portuguese
const months = {
    janeiro: 0, fevereiro: 1, "março": 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
};

function getDate(dateString) {
    if (!dateString) {
        return null
    }
    // Split the input string into day, month, and year parts
    console.log('dateString => ', dateString);
    const sanitized = dateString.replace(/[^a-zA-Z0-9\sç]/g, '')
    const parts = sanitized.split(' ').filter(v => !!v && v !== 'de');
    if (parts && (parts.length === 3)) {
        // Extract day, month, and year from the parts
        const day = parseInt(parts[0], 10);
        const month = months[parts[1].toLowerCase()]; // Get the month index
        const year = parseInt(parts[2], 10);

        // Create a JavaScript Date object
        const dateObject = new Date(year, month, day);
        if (!isNaN(dateObject.getTime())) {
            return dateObject
        } else {
            return null;
        }
    } else {
        return null
    }
}
function handleWeekString(weekDate, year) {
    if (!weekDate) {
        return null
    }
    let startDate, endDate;
    if (weekDate.includes(String.fromCharCode(45))) {
        [startDate, endDate] = String(weekDate).split(String.fromCharCode(45));
    }
    if (weekDate.includes(String.fromCharCode(8211))) {
        [startDate, endDate] = String(weekDate).split(String.fromCharCode(8211));
    }
    if (weekDate.includes('-')) {
        [startDate, endDate] = String(weekDate).split('-');
    }
    if (!startDate) return null;
    if (!endDate) return null;
    const sanitized = endDate.replace(/[^a-zA-Z0-9\sç]/g, '')
    const parts = sanitized.split(' ').filter(v => !!v && v !== 'de');

    const month = parts[1].toLowerCase();
    const _year = parseInt(parts[2], 10) || year;

    const _startDate = handleDateString(startDate, month, _year)?.getTime()
    const _endDate = handleDateString(endDate, month, _year)?.getTime()

    return [
        _startDate,
        _endDate
    ]
}

function handleDateString(_dateString, month, year) {
    dateString = _dateString.replace('&nbsp;', ' ');
    if (!isNaN(Number(dateString))) {
        // When the week is from the same month
        const stringDate = dateString + ' de ' + month + ' de ' + year;
        const dateWithMonthAndYear = getDate(stringDate);
        if (!dateWithMonthAndYear) return null
        return dateWithMonthAndYear;
    } else {
        if (!getDate(dateString)) {
            // When the week is from different months e.g 30 de abril - 06 de maio
            const stringDate = dateString + ' de ' + year;
            const dateWithYear = getDate(stringDate)
            if (!dateWithYear) return null
            return dateWithYear
        } else {
            // When the week is from different months from different years e.g 29 de dezembro de 2022 - 01 de janeiro de 
            const date = getDate(dateString);
            if (date) return date;
            return null;
        }
    }
}

function jw_mwb_week_scrapper() {
    const breadCrumbInfo = Array.from(document.querySelectorAll(".breadcrumbItem")).find(el => el.innerHTML.includes("Apostila da"))
    const breadCrumbTagAInnerHTMLSplit = breadCrumbInfo.querySelector("a").innerHTML.split(" ")
    let year = breadCrumbTagAInnerHTMLSplit[breadCrumbTagAInnerHTMLSplit.length-1];
    const week = document.querySelector('h1[id*="p"]').innerHTML;
    console.log('week => ', week);
    const handledWeekString = handleWeekString(week, year);
    console.log('handledWeekString => ', handledWeekString);
    const [startDate, endDate] = handledWeekString;
    

    const treasuresHeader = getElementByXpath(`//h2[text()="TESOUROS DA PALAVRA DE DEUS"]`);
    console.log('treasuresHeader => ', treasuresHeader);
    const ministeryHeader = getElementByXpath(`//h2[text()="FAÇA SEU MELHOR NO MINISTÉRIO"]`);
    console.log('ministeryHeader => ', ministeryHeader);
    const christianLifeHeader = getElementByXpath(`//h2[text()="NOSSA VIDA CRISTÃ"]`);
    console.log('christianLifeHeader => ', christianLifeHeader);
    const treasuresHeaderColor = window.getComputedStyle(treasuresHeader).getPropertyValue('color');
    const ministerysHeaderColor = window.getComputedStyle(ministeryHeader).getPropertyValue('color');
    const christianLifesHeaderColor = window.getComputedStyle(christianLifeHeader).getPropertyValue('color');

    const songs = [];
    document.querySelectorAll('.pub-sjj').forEach(el => {
        let songValue = ""
        const strongEl = el.querySelector('strong');
        if (strongEl) {
            songValue = strongEl.innerHTML || ""
        } else {
            songValue = el.innerHTML || ""
        }
        songs.push(songValue)
    })

    console.log('songs => ', songs);

    const bibleReading = document.querySelector('header a strong');
    const startAtDate = new Date(startDate)
    const meeting = {
        "year": Number(year),
        "ref": "0_"+year+"_"+startAtDate.getMonth()+"_"+getISOWeekNumber(startAtDate),
        "month": startAtDate.getMonth(),
        "startAt": startAtDate,
        "meeting_week_ref": 0,
        "endAt": new Date(endDate),
        "yearWeek": getISOWeekNumber(startAtDate),
        "bibleReading": bibleReading.innerHTML,
        "songs": {
            "initial": songs[0],
            "transitional": removeSpecialTranslatedCharacters(songs[1]),
            "last": songs[2],
        },
        "treasures": {
            "title": treasuresHeader.textContent || treasuresHeader.innerText.replace('\n', '').trim(),
            "sections": []
        },
        "ministery": {
            "title": ministeryHeader.textContent || ministeryHeader.innerText.replace('\n', '').trim(),
            "sections": []
        },
        "christianLife": {
            "title": removeHyperText(christianLifeHeader.textContent || christianLifeHeader.innerText).replace('\n', '').trim(),
            "sections": []
        },
    }
    // const treasuresColor = window.getComputedStyle(getElementByXpath(`//h3[text()="1. Quando injustiças acontecem"]`)).getPropertyValue('color')
    document.querySelectorAll('h3').forEach(el => {
        const sectionColor = window.getComputedStyle(el).getPropertyValue('color');
        const sectionInfo = {
            "title": removeHyperText(el.innerHTML),
            "assigned_to": []
        }
        switch (sectionColor) {
            case treasuresHeaderColor:
                meeting.treasures.sections.push(sectionInfo)
                break;
            case ministerysHeaderColor:
                meeting.ministery.sections.push(sectionInfo)
                break;
            case christianLifesHeaderColor:
                meeting.christianLife.sections.push(sectionInfo)
                break;
            default:
                break;
        }
    })

    return meeting;
}

async function importCurrentMidweekMeeting() {
    const payload = jw_mwb_week_scrapper();
    const defaultApiUrl = localStorage.getItem('varjotapp.apiUrl') || 'http://localhost:3333';
    const apiUrl = window.prompt('URL da API do Varjotapp', defaultApiUrl);
    if (!apiUrl) throw new Error('Importacao cancelada: URL da API nao informada.');

    const apiKey = window.prompt('API key tecnica do Varjotapp');
    if (!apiKey) throw new Error('Importacao cancelada: API key nao informada.');

    localStorage.setItem('varjotapp.apiUrl', apiUrl.replace(/\/$/, ''));
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/script/import-midweek`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(responseBody.message || `Falha ao importar a semana (HTTP ${response.status}).`);
    }

    console.log('Semana importada no Varjotapp:', responseBody);
    return responseBody;
}

importCurrentMidweekMeeting().catch((error) => console.error(error));
