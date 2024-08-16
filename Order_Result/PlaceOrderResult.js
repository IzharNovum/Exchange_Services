import { DateTime } from "luxon";
import FetchOrderResultFactory from "./FetchOrderResultFactory.js";

/**
 * Class PlaceOrderResult
 * @module OkexService/Exchange/placeOrderResult
 *
 * This class is representing result when try to add new order in to the position
 * Object of this class is not immutable (there are some setters)
 */

class PlaceOrderResult {
  /**
   * @param {boolean} isSuccess
   * @param {string} msg
   * @param {?*} [orderId=null]
   * @param {?*} [status=null]
   * @param {?*} [time=null]
   * @param {?*} [apiresponse=null]
   * @todo some important properties still get from order => separate them so we ca use PlaceOrderResult as unified
   * @todo modal for all exchanges. order is just for ref
   */

    constructor(
        isSuccess,
        msg,
        orderId = null,
        status = null,
        time = null,
        errCode = null,
        apiResponse = null,
        filled = 0,
        cost = 0,
        average = 0,
        symbol = "",
        price = 0,
        executed = 0
    ) {
        if (typeof isSuccess === "boolean") {
        this.isSuccess = isSuccess;
        this.msg = msg;
        this.orderId = orderId;
        this.status = status;
        this.time = time ?? DateTime.now().toISO();
        this.errCode = errCode;
        this.apiResponse = apiResponse;
        this.filled = parseFloat(filled);
        this.cost = parseFloat(cost);
        this.average = parseFloat(average);
        this.symbol = String(symbol);
        this.price = parseFloat(price);
        this.executed = parseFloat(executed);
        } else {
        this.isSuccess = Boolean(isSuccess);
        this.msg = msg;
        this.orderId = orderId;
        this.status = status;
        this.time = time ?? DateTime.now().toISO();
        this.apiResponse = apiResponse;
        this.executed = 0;
        }
    }

  setErrcode(errCode) {
    this.errCode = errCode;
  }

  toArray() {
    return {
      order: this.apiResponse,
      msg: this.msg,
      isSuccess: this.isSuccess,
      filled: this.getFilled(),
      cost: this.getCost(),
      average: this.getAverage(),
      orderId: this.getOrderId(),
      executed: this.getExecuted(),
    };
  }

  isSuccess() {
    return this.isSuccess;
  }

  isFailed() {
    return !this.isSuccess;
  }

  getMsg() {
    return this.msg;
  }

  getOrderId() {
    return this.orderId;
  }

  getStatus() {
    return this.status;
  }

  getTime() {
    return this.time;
  }

  getErrCode() {
    return this.errCode;
  }

  getApiResponse() {
    return this.apiResponse;
  }

  getAverage() {
    return (
      this.average ?? FetchOrderResultFactory.getAverageFrom(this.apiResponse)
    );
  }

  getFilled() {
    return (
      this.average ?? FetchOrderResultFactory.getFilledFrom(this.apiResponse)
    );
  }

  getCost() {
    return (
      this.average ?? FetchOrderResultFactory.getCostFrom(this.apiResponse)
    );
  }

  getSymbol() {
    return this.symbol ?? this.apiResponse.symbol;
  }

  setFilled(filled) {
    this.filled = filled;
  }

  setCost(cost) {
    this.cost = cost;
  }

  setAverage(average) {
    this.average = average;
  }

  setSymbol(symbol) {
    this.symbol = symbol;
  }

  getPrice() {
    return this.price ?? this.apiResponse.price ?? 0;
  }

  setPrice(price) {
    this.price = price;
  }

  getFee() {
    return this.apiResponse.fee.cost ?? 0;
  }

  getFreeUnit() {
    return this.apiResponse.fee.currency ?? null;
  }

  getExecuted() {
    return this.executed;
  }

  setExecuted(executed) {
    this.executed = executed;
  }
}


export default PlaceOrderResult;