
const extractGFADateTime = (text: string): Date => {
    const [dayText, timeText] = text.split(' ');
    const hour = parseInt(timeText.trim().slice(0, 2));
    const minute = parseInt(timeText.trim().slice(2));
    const day = parseInt(dayText.trim())

    // Get UTC day, month, and year
    const now = new Date();
    const utcDay = now.getUTCDate();
    const utcMonth = now.getUTCMonth();
    const utcYear = now.getUTCFullYear();

    let month = day < utcDay ? utcMonth + 1 : utcMonth
    let year = utcYear
    if (month >= 12) {
        month = 0
        year += 1
    }

    return new Date(Date.UTC(year, month, day, hour, minute));
}

export default extractGFADateTime