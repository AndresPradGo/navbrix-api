
import { z } from "zod";

const isUtcDateFuture = (UtcDateString: string): boolean => {
    if (z.string().datetime().safeParse(UtcDateString).success) {
        const utcDate = new Date(UtcDateString)
        const utcNow = new Date((new Date()).toUTCString())
        return utcDate > utcNow
    }

    return false
}

export default isUtcDateFuture