import { DateTime } from "luxon";
import UserOrder from "./Models/UserOrder.js";
import FecthOrderResult from "./FetchOrderResult.js";


class FetchOrderResultFactory {
  /**
   * @param {*} ccxtRes
   * @return {FecthOrderResult}
   */

  createFromCcxtResponse(ccxtRes) {
    return this.createSuccessResult(
      this.getUserOrderStatusFrom(ccxtRes),
      this.getCostFrom(ccxtRes),
      this.getAverageFrom(ccxtRes),
      0,
      this.getFilledFrom(ccxtRes),
      this.getOrderTime(ccxtRes)
    );
  }

  /**
   * @param {*} failureMsg
   * @return {FecthOrderResult}
   */
  static createFalseResult(failureMsg) {
    const result = new FecthOrderResult(
      false,
      "",
      0,
      0,
      0,
      0,
      DateTime.now().toISO()
    );
    result.setFailure(failureMsg);
    return result;
  }

  /**
   * @param {*}  status
   * @param {*}   cost
   * @param {*}   average
   * @param {*}   fee
   * @param {*}   filled
   * @param {*}   time
   * @return {FecthOrderResult}
   */
  static createSuccessResult(
    status,
    cost,
    average,
    fee,
    filled,
    time,
    note = ""
  ) {
    return new FecthOrderResult(
      true,
      status,
      cost,
      average,
      fee,
      filled,
      time,
      note
    );
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////
  /// This unification logic code should be gathered here or belong to individual exchange ?

  /**
   * @return {number}
   * @todo pa order:check 24392 14 4804137 2957 spot: Stupid indodax return filled = 0 for filled order, plus wrong
   * time
   */

  static getFilledFrom(apiResponse) {
    const filledAmount =
      apiResponse.filled ??
      apiResponse.executedQty ??
      apiResponse.data.executedQty ??
      0.0;

    //For indodax issue //todo this logic should belong to exchanges
    if (
      filledAmount <= 0 &&
      apiResponse.status != null &&
      UserOrder.STATUS_FILLED_CCXT.includes(apiResponse.status) &&
      apiResponse.cost != null
    ) {
      const price = apiResponse.average ?? apiResponse.price ?? 0;
      if (price > 0) {
        return apiResponse.cost / price;
      }

      return apiResponse.amount ?? 0; //for kucion issue
    }
    return filledAmount;
  }

  /**
   * @param apiResponse
   * @return {number}
   */
  static getAverage(apiResponse){
    if(apiResponse.average !=null){
        return apiResponse.average;
    }
    if(UserOrder.STATUS_OPENS_CCXT.includes(apiResponse.status ?? null)){
        return 0.0;
    }
    if(apiResponse.cummulativeQuoteQty !=null && 
        apiResponse.executedQty !=null
    ){
        return apiResponse.executedQty === 0 ? 0 : apiResponse.cummulativeQuoteQty / apiResponse.executedQty; 
    }

    return apiResponse.price ?? 0.0; 
  }


  /**
   * Cost unit is always quote currency (USDT)
   * @param {*} apiResponse
   * @return {number}
   */
  static getCostFrom(apiResponse){
    if(apiResponse.cost !=null){
        return apiResponse.cost;
    }
    if(apiResponse.cummulativeQuoteQty !=null){
        return apiResponse.cummulativeQuoteQtyl;
    }

    return 0.0;
  }

  static getUserOrderStatusFrom(ccxtRes){
    const status = ccxtRes.status ?? UserOrder.STATUS_ONGOING;
    if (['closed', 'filled'].includes(status)) {
        return UserOrder.STATUS_FILLED;
    }

    if(UserOrder.STATUS_OPENS_CCXT.includes(status)){
        return UserOrder.STATUS_ONGOING;
    }

    if(UserOrder.STATUS_CANCELS_CCXT.includes(status)){
        return UserOrder.STATUS_CANCELLED;
    }

     new Error("Strange status: " + JSON.stringify(ccxtRes));
    return status;
}

static getOrderId(orderInfo){
    return orderInfo.id ?? orderInfo.orderId ?? orderInfo.order_id;
}

static getOrderTime(orderInfo) {

    // ccxt-based filled time issue
    if (orderInfo.info && orderInfo.info.updateTime) {
        return this.createDateFrom(orderInfo.info.updateTime);
    }

    // indodax filled time issue
    if ((orderInfo.info?.finish_time ?? 0) > 0) {
        return DateTime.fromSeconds(orderInfo.info.finish_time).toISO();
    }

    if (orderInfo.timestamp != null) {
        return this.createDateFrom(orderInfo.timestamp);
    }

    if (orderInfo.transactTime != null) {
        return DateTime.fromMillis(orderInfo.transactTime).toISO();
    }

    if (orderInfo.updateTime != null) {
        return DateTime.fromMillis(orderInfo.updateTime).toISO();
    }

    if (orderInfo.info && orderInfo.info.updateTime != null) {
        return DateTime.fromMillis(orderInfo.info.updateTime).toISO();
    }

    if (orderInfo.time != null) {
        return DateTime.fromISO(orderInfo.time).toISO();
    }

    return DateTime.now().toISO();
}

    static createDateFrom(ts){
        if(ts >= 99999999999){//11 digits of 9
            return DateTime.fromMillis(ts).toISO();
        }

        return DateTime.fromSeconds(ts).toISO();
    }


}


export default FetchOrderResultFactory;