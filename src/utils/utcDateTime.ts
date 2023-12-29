import { z } from "zod";

const utcDateTime = (rawDate?: string): (Date | undefined) => {
    
    if(rawDate === undefined) return undefined
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    if (dateFormatRegex.test(rawDate)) {
        const parts = rawDate.split(' ');
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');

        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        const hour = parseInt(timeParts[0]);
        const minute = parseInt(timeParts[1]);

        return new Date(Date.UTC(year, month, day, hour, minute));
    }

    if (z.string().datetime().safeParse(rawDate).success) return  new Date(Date.parse(rawDate));
    
    return undefined
}

export default utcDateTime