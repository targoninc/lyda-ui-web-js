
export class Report {
    /** @var {number|null} id */
    id = null;
    /** @var {number|null} trackid */
    trackid = null;
    /** @var {string|null} reason */
    reason = null;
    /** @var {string|null} message */
    message = null;
    /** @var {string|null} date */
    date = null;
    /** @var {string|null} status */
    status = null;
    /** @var {string|null} time */
    time = null;
    /** @var {number|null} userId */
    userId = null;
    constructor(data) {
        this.id = data.id;
        this.trackid = data.trackid;
        this.reason = data.reason;
        this.message = data.message;
        this.date = data.date;
        this.status = data.status;
        this.time = data.time;
        this.userId = data.userId;
    }
}