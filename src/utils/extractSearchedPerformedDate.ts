import utcDateTime from './utcDateTime';

const extractSearchedPerformedDate = (rawText: string): (Date | null) => {
    const textContent = rawText.trim();
    const dateMatch = textContent.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);   
    if (dateMatch) {
        const parts = dateMatch[0].split(' ');
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');

        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        const hour = parseInt(timeParts[0]);
        const minute = parseInt(timeParts[1]);
        const seconds = parseInt(timeParts[2]);

        return new Date(Date.UTC(year, month, day, hour, minute, seconds));
    }
    return null;
}

export default extractSearchedPerformedDate