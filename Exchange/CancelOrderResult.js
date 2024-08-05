/**
 * Class representing the result of trying to cancel an order.
 */
class CancelOrderResult {
    /**
     * @param {boolean} isSuccess - Indicates if the cancellation was successful.
     * @param {string} msg - Message related to the result.
     * @param {Object|null} [exchangeApiResult=null] - Result from the API call.
     */
    constructor(isSuccess, msg, exchangeApiResult = null, response) {
        this.isSuccess = isSuccess;
        this.msg = msg;

        if (typeof exchangeApiResult === 'string') {
            this.exchangeApiResult = { msg: exchangeApiResult };
        } else {
            this.exchangeApiResult = exchangeApiResult ?? {};
        }
    }

    /**
     * Convert the result to a plain object.    
     * @return {Object} - The result as a plain object.
     */
    toArray() {
        return {
            isSuccess: this.isSuccess,
            msg: this.msg,
        };
    }
}


export default CancelOrderResult;

