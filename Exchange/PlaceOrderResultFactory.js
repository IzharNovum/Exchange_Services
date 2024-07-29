import { DateTime } from "luxon";
import PlaceOrderResult from "./PlaceOrderResult.js";

class PlaceOrderResultFactory{
    static FUND_ERR1 = 101;
    static FUND_ERR2 = 102;
    static FUND_ERRORS = [
        this.FUND_ERR1,
        this.FUND_ERR2,
    ];

    /**
     * @param {*} orderId 
     * @param {*} status
     * @param {*} time
     * @param {*} order
     * @return {PlaceOrderResult}
     */

    static createSuccessResult(orderId, status, time, order){
        return new PlaceOrderResult(true, "success", orderId, status, time, order);
    }

    /**
     * @param {string} msg
     * @param {*} [response=null]
     * @param {number|null} [errCode=null]
     * @return {PlaceOrderResult}
     */ 

    static createFalseResult(msg, response = null,errCode = null){
        const res = new PlaceOrderResult(false, msg, null, null, DateTime.now().toISO(), response);
        res.getErrCode(errCode);
        return res;
    }

}



export default PlaceOrderResultFactory;