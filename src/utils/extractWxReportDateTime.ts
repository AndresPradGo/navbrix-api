
const extractWxReportDateTime = (text: string, includesMinutes?: boolean, isPast?: boolean): Date => {
    const dayText = text.trim().slice(0,2)
    const hour = parseInt(text.trim().slice(2, 4));
    const minute = includesMinutes ? parseInt(text.trim().slice(4)) : 0;
    const day = parseInt(dayText.trim())

    // Get UTC day, month, and year
    const now = new Date();
    const utcDay = now.getUTCDate();
    const utcMonth = now.getUTCMonth();
    const utcYear = now.getUTCFullYear();

    let month: number
    let year: number
    if(!isPast) {
        month = day < utcDay ? utcMonth + 1 : utcMonth
        year = utcYear
        if (month >= 12) {
            month = 0
            year += 1
        }
    } else {
        month = day > utcDay ? utcMonth - 1 : utcMonth
        year = utcYear
        if (month < 0) {
            month = 11
            year -= 1
        }
    }

    return new Date(Date.UTC(year, month, day, hour, minute));
}

export default extractWxReportDateTime