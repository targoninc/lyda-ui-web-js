
export class Log {
    /** @var {number} orderId */
    orderId;
    /** @var {string|null} id */
    id = null;
    /** @var {string|null} time */
    time = null;
    /** @var {string|null} host */
    host = null;
    /** @var {string|null} scriptName */
    scriptName = null;
    /** @var {string|null} type */
    type = null;
    /** @var {string|null} message */
    message = null;
    /** @var {boolean|null} actionRequired */
    actionRequired = null;
    /** @var {string|null} scope */
    scope = null;
    /** @var {string|null} properties */
    properties = null;
    constructor(data) {
        this.orderId = data.orderId;
        this.id = data.id;
        this.time = data.time;
        this.host = data.host;
        this.scriptName = data.scriptName;
        this.type = data.type;
        this.message = data.message;
        this.actionRequired = data.actionRequired;
        this.scope = data.scope;
        this.properties = data.properties;
    }
}